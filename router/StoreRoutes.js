const express = require("express");
const router = express.Router();
const StoreController = require("../controllers/StoreController");
const multer = require("multer");
const verifyToken = require("../middleware/verifyToken");

// استخدام الذاكرة المؤقتة بدلاً من القرص لتجنب مشكلة نظام الملفات للقراءة فقط على Vercel
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("يُسمح برفع الصور فقط"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// التحقق من تسجيل الدخول
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "يجب تسجيل الدخول أولاً" });
  }
  next();
};

// التحقق من صلاحيات الأدمن
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ success: false, message: "غير مصرح لك بالوصول" });
  }
  next();
};

// ===== عرض الصفحات =====

router.get("/", StoreController.listStores);
router.get("/:storeId/dashboard", verifyToken, requireAuth, StoreController.getStoreDashboard);
router.get("/:storeId", StoreController.getStorePage);

// ===== طلبات المتاجر =====

router.post("/request", verifyToken, requireAuth, StoreController.requestStore);
router.get("/admin/requests", verifyToken, requireAuth, requireAdmin, StoreController.getStoreRequests);
router.post("/admin/requests/:requestId/process", verifyToken, requireAuth, requireAdmin, StoreController.processStoreRequest);

// ===== إدارة المتاجر =====

router.put("/:storeId", verifyToken, requireAuth, upload.single("coverImage"), StoreController.updateStore);
router.get("/user/my-stores", verifyToken, requireAuth, StoreController.getUserStores); // تأكد أنها معرفة فعليًا

// ===== إدارة المنتجات =====

router.post("/:storeId/products", verifyToken, requireAuth, upload.array("images", 5), StoreController.addProduct);
router.put("/products/:productId", verifyToken, requireAuth, StoreController.updateProduct);
router.delete("/products/:productId", verifyToken, requireAuth, StoreController.deleteProduct);
router.patch("/products/:productId/toggle-status", verifyToken, requireAuth, StoreController.toggleProductStatus);

// ===== إدارة صور المنتجات =====

router.post("/products/:productId/images", verifyToken, requireAuth, upload.single("image"), StoreController.addProductImage);
router.delete("/products/images/:imageId", verifyToken, requireAuth, StoreController.deleteProductImage);
router.patch("/products/:productId/images/:imageId/set-primary", verifyToken, requireAuth, StoreController.setPrimaryImage);

// ===== الإحصائيات =====

router.get("/admin/stats", verifyToken, requireAuth, requireAdmin, StoreController.getSystemStats);

// ===== معالجة أخطاء multer =====

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "حجم الملف كبير جداً (الحد الأقصى 5MB)" });
  }

  if (error.message === "يُسمح برفع الصور فقط") {
    return res.status(400).json({ success: false, message: error.message });
  }

  next(error);
});

module.exports = router;
