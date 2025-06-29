require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const usersModels = require("../models/UsersModels");
const db = require("../config/db");
const cloudinary = require("../config/cloudinaryConfig");
const fs = require("fs");

// إعدادات OAuth 2.0 مع بيانات الاعتماد من .env
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000/oauth2callback"
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

class UsersControllers {
  static findById(userId) {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM users WHERE id = ?", [userId], (err, results) => {
        if (err) return reject(err);
        resolve(results[0]);
      });
    });
  }

  static async signUpControllers(req, res) {
    try {
      const { name, age, gender, country, language, occupation, phone, email, portfolio, password } = req.body;
      let avatarUrl = null;

      if (req.file) {
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          folder: "user_avatars",
          public_id: `avatar-${Date.now()}`,
        });
        avatarUrl = uploadResult.secure_url;
        fs.unlinkSync(req.file.path);
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const userId = await usersModels.createUser(
        name,
        avatarUrl,
        age,
        gender,
        country,
        language,
        occupation,
        phone,
        email,
        portfolio,
        hashedPassword
      );

      const isJson = req.headers["content-type"] && req.headers["content-type"].includes("application/json");
      if (isJson) {
        return res.json({ success: true, message: "تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول." });
      }
      // إذا كان الطلب عادي (form)
      res.render("login", { successMessage: "تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول." });
    } catch (error) {
      console.error("خطأ عند تسجيل مستخدم جديد:", error);
      const isJson = req.headers["content-type"] && req.headers["content-type"].includes("application/json");
      const msg = error.code === "ER_DUP_ENTRY" ? "البريد الإلكتروني مسجل بالفعل، الرجاء استخدام بريد آخر." : "حدث خطأ أثناء التسجيل، حاول مرة أخرى.";
      if (isJson) {
        return res.json({ success: false, message: msg });
      }
      res.render("signup", { errorMessage: msg });
    }
  }

  static async loginControllers(req, res) {
    try {
      const { email, password } = req.body;
      const user = await usersModels.loginModel(email);

      // تحديد إذا كان الطلب من fetch/ajax أو form عادي
      const isJson = req.headers["content-type"] && req.headers["content-type"].includes("application/json");

      if (!user) {
        if (isJson) {
          return res.json({ success: false, message: "هذا البريد الإلكتروني غير مسجل، الرجاء التسجيل أولاً." });
        } else {
          return res.render("login", { errorMessage: "هذا البريد الإلكتروني غير مسجل، الرجاء التسجيل أولاً." });
        }
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        if (isJson) {
          return res.json({ success: false, message: "كلمة المرور أو البريد الإلكتروني غير صحيح، حاول مرة أخرى." });
        } else {
          return res.render("login", { errorMessage: "كلمة المرور أو البريد الإلكتروني غير صحيح، حاول مرة أخرى." });
        }
      }

      const token = jwt.sign({ id: user.id }, "your_jwt_secret", { expiresIn: "30d" });
      res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 30 * 24 * 60 * 60 * 1000 });
      req.session.userId = user.id;
      if (isJson) {
        return res.json({ success: true, message: "تم تسجيل الدخول بنجاح" });
      } else {
        res.redirect("/profile");
      }
    } catch (error) {
      if (req.headers["content-type"] && req.headers["content-type"].includes("application/json")) {
        return res.json({ success: false, message: "حدث خطأ أثناء تسجيل الدخول، حاول مرة أخرى لاحقًا." });
      } else {
        res.render("login", { errorMessage: "حدث خطأ أثناء تسجيل الدخول، حاول مرة أخرى لاحقًا." });
      }
    }
  }

  static async logoutControllers(req, res) {
    try {
      res.clearCookie("token");
      res.redirect("/login");
    } catch (error) {
      res.status(500).render("profile", { errorMessage: "حدث خطأ أثناء تسجيل الخروج، حاول مرة أخرى.", successMessage: null });
    }
  }

  static async forgotPasswordControllers(req, res) {
    const { email } = req.body;
  
    try {
      const user = await usersModels.loginModel(email);
      if (!user) {
        return res.render("forgotPassword", { errorMessage: "البريد الإلكتروني غير مسجل لدينا، تحقق منه مرة أخرى." });
      }
  
      const token = jwt.sign({ id: user.id }, "your_jwt_secret", { expiresIn: "15m" });
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log("OTP sent to user:", otp);
      await usersModels.saveOTP(user.id, otp);
  
      const accessToken = await oAuth2Client.getAccessToken();
      if (!accessToken.token) throw new Error("فشل الحصول على Access Token");
  
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          type: "OAuth2",
          user: process.env.EMAIL_USER,
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
          accessToken: accessToken.token,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
  
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "إعادة تعيين كلمة المرور",
        text: `رمز OTP الخاص بك هو: ${otp}. استخدم هذا الرابط للتحقق: http://localhost:3000/verify-otp?token=${token}`,
      };
  
      await transporter.sendMail(mailOptions);
  
      res.render("forgotPassword", {
        successMessage: "تم إرسال رابط التحقق مع رمز OTP إلى بريدك الإلكتروني.",
      });
    } catch (error) {
      res.render("forgotPassword", {
        errorMessage: "مشكلة في الاتصال، تحقق من الشبكة أو حاول مرة أخرى.",
      });
    }
  }

  static async resetPasswordControllers(req, res) {
    const { token, newPassword } = req.body;

    try {
      const decoded = jwt.verify(token, "your_jwt_secret");
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await usersModels.updatePassword(decoded.id, hashedPassword);

      res.render("login", {
        successMessage: "تم إعادة تعيين كلمة المرور بنجاح، يمكنك تسجيل الدخول الآن.",
      });
    } catch (error) {
      res.render("resetPassword", {
        errorMessage: error.name === "TokenExpiredError" ? "انتهت صلاحية الرابط، اطلب رابطًا جديدًا." : "الرابط غير صالح أو منتهي الصلاحية، حاول مرة أخرى.",
        token,
      });
    }
  }

  static async updateProfileAjaxControllers(req, res) {
    try {
      const { name, age, gender, country, language, occupation, phone, portfolio } = req.body;
      const userId = req.user.id;
      let avatarUrl = null;

      if (req.file) {
        // حذف الصورة القديمة من Cloudinary إذا كانت موجودة
        const oldUser = await usersModels.findById(userId);
        if (oldUser && oldUser.avatar && oldUser.avatar.includes("res.cloudinary.com")) {
          const publicId = oldUser.avatar.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`user_avatars/${publicId}`);
        }

        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          folder: "user_avatars",
          public_id: `avatar-${Date.now()}`,
        });
        avatarUrl = uploadResult.secure_url;
        fs.unlinkSync(req.file.path);
      }

      await usersModels.updateUser(userId, name, avatarUrl, age, gender, country, language, occupation, phone, portfolio);
      res.status(200).json({ message: "تم تحديث المعلومات بنجاح" });
    } catch (error) {
      console.error("خطأ في تحديث الملف الشخصي:", error);
      res.status(500).json({ error: "حدث خطأ أثناء تحديث البيانات، حاول مرة أخرى." });
    }
  }

  static async deleteAvatar(req, res) {
    try {
      const userId = req.user.id;
      const user = await usersModels.findById(userId);

      if (user && user.avatar && user.avatar.includes("res.cloudinary.com")) {
        const publicId = user.avatar.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`user_avatars/${publicId}`);
      }

      await usersModels.updateUser(userId, user.name, null, user.age, user.gender, user.country, user.language, user.occupation, user.phone, user.portfolio);
      res.status(200).json({ message: "تم حذف الصورة الرمزية بنجاح" });
    } catch (error) {
      console.error("خطأ في حذف الصورة الرمزية:", error);
      res.status(500).json({ error: "حدث خطأ أثناء حذف الصورة الرمزية، حاول مرة أخرى." });
    }
  }
}

module.exports = UsersControllers;


