const StoreModel = require("../models/StoreModel");
const cloudinary = require("../config/cloudinaryConfig");
const path = require("path");
const fs = require("fs");

class StoreController {
  static async requestStore(req, res) {
    try {
      const { storeName, storeDescription } = req.body;
      const userId = req.user.id;

      if (!storeName || !storeDescription) {
        return res.status(400).json({
          success: false,
          message: "اسم المتجر والوصف مطلوبان"
        });
      }

      const hasPendingRequest = await StoreModel.hasPendingStoreRequest(userId);
      if (hasPendingRequest) {
        return res.status(400).json({
          success: false,
          message: "لديك طلب متجر معلق بالفعل"
        });
      }

      const requestId = await StoreModel.createStoreRequest(userId, storeName, storeDescription);

      res.status(201).json({
        success: true,
        message: "تم إرسال طلب إنشاء المتجر بنجاح",
        requestId: requestId
      });

    } catch (error) {
      console.error("خطأ في إنشاء طلب المتجر:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ في الخادم"
      });
    }
  }

  static async getStoreRequests(req, res) {
    try {
      const { status } = req.query;
      const requests = await StoreModel.getStoreRequestsByStatus(status);

      res.json({
        success: true,
        requests: requests
      });

    } catch (error) {
      console.error("خطأ في جلب طلبات المتاجر:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ في الخادم"
      });
    }
  }

  static async processStoreRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { action, adminNotes } = req.body;
      const adminId = req.user.id;

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "عملية غير صحيحة"
        });
      }

      const request = await StoreModel.getStoreRequestById(requestId);
      if (!request) {
        return res.status(404).json({
          success: false,
          message: "الطلب غير موجود"
        });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: "تم معالجة هذا الطلب مسبقاً"
        });
      }

      const status = action === 'approve' ? 'approved' : 'rejected';

      await StoreModel.updateStoreRequestStatus(requestId, status, adminId, adminNotes);

      if (action === 'approve') {
        await StoreModel.createStore(
          request.user_id,
          request.store_name,
          request.store_description
        );
      }

      res.json({
        success: true,
        message: action === 'approve' ? "تمت الموافقة على المتجر" : "تم رفض الطلب"
      });

    } catch (error) {
      console.error("خطأ في معالجة طلب المتجر:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ في الخادم"
      });
    }
  }

  static async listStores(req, res) {
    try {
      const stores = await StoreModel.getAllApprovedStores();

      res.render('stores', {
        title: 'المتاجر',
        stores: stores,
        user: req.user
      });

    } catch (error) {
      console.error("خطأ في جلب المتاجر:", error);
      res.status(500).render('404', {
        message: "حدث خطأ في جلب المتاجر"
      });
    }
  }

  static async getStorePage(req, res) {
    try {
      const { storeId } = req.params;
      const store = await StoreModel.getStoreById(storeId);

      if (!store || store.status !== 'approved') {
        return res.status(404).render('404', {
          message: "المتجر غير موجود"
        });
      }

      const products = await StoreModel.getStoreProducts(storeId);
      const stats = await StoreModel.getStoreStats(storeId);

      res.render('store', {
        title: store.name,
        store: store,
        products: products,
        stats: stats,
        user: req.user,
        req
      });

    } catch (error) {
      console.error("خطأ في جلب صفحة المتجر:", error);
      res.status(500).render('404', {
        message: "حدث خطأ في جلب المتجر"
      });
    }
  }

  static async getStoreDashboard(req, res) {
    try {
      const { storeId } = req.params;
      const userId = req.user.id;

      const isOwner = await StoreModel.isStoreOwner(storeId, userId);
      if (!isOwner) {
        return res.status(403).render('404', {
          message: "غير مصرح لك بالوصول لهذا المتجر"
        });
      }

      const store = await StoreModel.getStoreById(storeId);
      const products = await StoreModel.getStoreProducts(storeId);
      const stats = await StoreModel.getStoreStats(storeId);

      res.render('store-dashboard', {
        title: `إدارة متجر ${store.name}`,
        store: store,
        products: products,
        stats: stats,
        user: req.user
      });

    } catch (error) {
      console.error("خطأ في جلب لوحة تحكم المتجر:", error);
      res.status(500).render('404', {
        message: "حدث خطأ في جلب لوحة التحكم"
      });
    }
  }

  static async updateStore(req, res) {
    try {
      const { storeId } = req.params;
      const { name, description, whatsapp_number, currency } = req.body;
      const userId = req.user.id;

      const isOwner = await StoreModel.isStoreOwner(storeId, userId);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "غير مصرح لك بتعديل هذا المتجر"
        });
      }

      let coverImage = null;
      if (req.file) {
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          folder: "store_covers",
          public_id: `store-${Date.now()}`,
        });
        coverImage = uploadResult.secure_url;
        fs.unlinkSync(req.file.path);
      }

      await StoreModel.updateStore(storeId, name, description, coverImage, whatsapp_number, currency);

      res.json({
        success: true,
        message: "تم تحديث المتجر بنجاح"
      });

    } catch (error) {
      console.error("خطأ في تحديث المتجر:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ في الخادم"
      });
    }
  }

  static async getUserStores(req, res) {
    try {
      const userId = req.user.id;
      const stores = await StoreModel.getStoresByUserId(userId);

      res.json({
        success: true,
        stores: stores
      });
    } catch (error) {
      console.error("خطأ في جلب متاجر المستخدم:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ في الخادم"
      });
    }
  }
}

module.exports = StoreController;
