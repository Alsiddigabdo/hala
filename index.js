const express = require("express");
const http = require("http");
const path = require("path");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const compression = require("compression");
const minify = require("express-minify");
const cron = require("node-cron");
const NotificationModel = require("./models/NotificationModel");
const logger = require("./config/logger");
const expressStatusMonitor = require("express-status-monitor");

// استيراد الراوترات
const userRouter = require("./router/UsersRouter");
const forumRouter = require("./router/forumRoutes");
const MessagesProjectRoutes = require("./router/messagesProjectRoutes");
const friendshipRoutes = require("./routes/friends");
const notificationRouter = require("./router/notificationRoutes");
const chatRoutes = require("./router/chatRoutes");
const jobRoutes = require("./router/jobRoutes");
const profileRouter = require("./router/profileRouter");
const ProjectRoutes = require("./router/ProjectRoutes");
const contactRoutes = require("./router/contactRoutes");
const adminMessageRoutes = require("./router/adminMessageRoutes");
const adminDashboardRoutes = require("./router/adminDashboardRoutes");
const adminStatisticsRoutes = require("./router/adminStatisticsRoutes");
const adminSiteStatsRoutes = require("./router/adminSiteStatsRoutes");
const adminRolesPermissionsRoutes = require("./router/adminRolesPermissionsRoutes");
const adminForumSettingsRoutes = require("./router/adminForumSettingsRoutes");
const adminJobProjectSettingsRoutes = require("./router/adminJobProjectSettingsRoutes");
const adminUsersRoutes = require("./router/adminUsersRoutes");
const changePasswordRoutes = require("./router/changePasswordRoutes");
const storeRoutes = require("./router/StoreRoutes");
const errorHandler = require("./middleware/errorHandler");
const GlobalRoleController = require("./controllers/GlobalRoleController");
const ForumController = require("./controllers/ForumController");

// استيراد الميدلوير الجديد للميتا الديناميكية
const dynamicMetaMiddleware = require("./middleware/dynamicMetaMiddleware");

const app = express();
const server = http.createServer(app);
// تفعيل الضغط
app.use(compression());
// تفعيل تصغير الملفات (CSS, JS)
app.use(minify());
app.use(expressStatusMonitor());
// إعداد التخزين للملفات المرفوعة - استخدام الذاكرة المؤقتة لتجنب مشكلة نظام الملفات للقراءة فقط على Vercel
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // حد أقصى 10 ميجابايت
  }
});
// إعدادات البرامج الوسيطة
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: "your_jwt_secret",
    resave: true,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);
// إعداد محرك العرض
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// تحسين تقديم الملفات الثابتة مع تفعيل التخزين المؤقت
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: '1d', // تخزين مؤقت لمدة يوم واحد
  etag: true
}));
// تم إزالة مسار uploads لتجنب مشكلة نظام الملفات للقراءة فقط على Vercel
// يجب استخدام خدمة تخزين سحابية للملفات المرفوعة

// إضافة الميدلوير الجديد للميتا الديناميكية
app.use(dynamicMetaMiddleware);

// Middleware لحساب unreadCount وتمريره إلى جميع الصفحات
app.use(async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const unreadCount = await NotificationModel.getUnreadCount(req.session.userId);
      res.locals.unreadCount = unreadCount || 0;
    } catch (err) {
      logger.error("حدث خطأ أثناء حساب unreadCount:", err);
    }
  } else {
    res.locals.unreadCount = 0;
  }
  next();
});
// تطبيق Middleware عالمي للتحقق من الدور
app.use(GlobalRoleController.setGlobalRole);
// جعل صفحة المنتدى هي الصفحة الرئيسية
app.get("/", ForumController.getAllPosts);
// دمج الراوترات
app.use("/", userRouter);
app.use("/", changePasswordRoutes);
app.use("/friends", friendshipRoutes);
app.use(notificationRouter);
app.use("/forum", forumRouter);
app.use("/", chatRoutes);
app.use("/", jobRoutes);
app.use("/", profileRouter);
app.use("/projects", ProjectRoutes);
app.use("/", MessagesProjectRoutes);
app.use("/", contactRoutes);
app.use("/stores", storeRoutes);
app.use("/admin", adminMessageRoutes);
app.use("/admin", adminDashboardRoutes);
app.use("/admin", adminStatisticsRoutes);
app.use("/admin", adminSiteStatsRoutes);
app.use("/admin", adminRolesPermissionsRoutes);
app.use("/admin", adminForumSettingsRoutes);
app.use("/admin", adminJobProjectSettingsRoutes);
app.use("/admin", adminUsersRoutes);
app.use("/", require("./router/GlobalRoleRouter"));
// مسارات ثابتة للصفحات
app.get('/about', (req, res) => {
  // إضافة بيانات الصفحة للميتا الديناميكية
  res.locals.pageName = 'about';
  res.render('about', { 
    unreadCount: res.locals.unreadCount,
    userId: res.locals.userId,
    isAdmin: res.locals.isAdmin 
  });
});

app.get('/privacy', (req, res) => {
  // إضافة بيانات الصفحة للميتا الديناميكية
  res.locals.pageName = 'privacy';
  res.render('privacy', { 
    unreadCount: res.locals.unreadCount,
    userId: res.locals.userId,
    isAdmin: res.locals.isAdmin 
  });
});

// مسار مستقل لـ /ProjectSpace
app.get("/ProjectSpace", (req, res) => {
  // إضافة بيانات الصفحة للميتا الديناميكية
  res.locals.pageName = 'ProjectSpace';
  res.render("ProjectSpace", {
    errorMessage: null,
    successMessage: null,
    userId: res.locals.userId,
    isAdmin: res.locals.isAdmin,
    unreadCount: res.locals.unreadCount
  });
});
// جدولة حذف الإعلانات القديمة
cron.schedule('0 0 * * *', async () => {
  try {
    const forumModel = require("./models/forumModel"); // تصحيح حالة الأحرف في اسم الملف
    await forumModel.deleteOldAds();
    console.log('Scheduled deletion of old ads completed.');
  } catch (err) {
    logger.error("Error in scheduled deletion:", err);
  }
}, {
  scheduled: true,
  timezone: "Asia/Riyadh"
});

// Middleware لمعالجة الأخطاء (يجب أن يكون في النهاية)
app.use(errorHandler);
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

