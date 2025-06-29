const FriendshipModel = require("../models/FriendshipModel_updated");
const ProfileModels = require("../models/ProfileModels");
const NotificationModel = require("../models/NotificationModel");
const jwt = require("jsonwebtoken");

class FriendshipController {
  // عرض صفحة الأصدقاء
  static async showFriendsPage(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) return res.redirect("/login");

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;

      const friends = await FriendshipModel.getAcceptedFriends(userId, 0, 10);
      const friendRequests = await FriendshipModel.getFriendRequests(userId);
      const blockedFriends = await FriendshipModel.getBlockedFriends(userId);
      const allUsers = await FriendshipModel.getAllUsersExceptCurrent(userId, 0, 10);
      const unreadCount = await NotificationModel.getUnreadCount(userId);

      const enrichedFriends = friends.map(friend => ({
        ...friend,
        avatar: friend.avatar ? (friend.avatar.includes('/uploads/avatars/') ? friend.avatar : `/uploads/avatars/${friend.avatar}`) : '/uploads/images/pngwing.com.png',
        online: friend.last_active ? (Date.now() - new Date(friend.last_active).getTime() < 5 * 60 * 1000) : false,
        isActive: friend.is_active
      }));

      const enrichedFriendRequests = friendRequests.map(request => ({
        ...request,
        sender_avatar: request.sender_avatar ? (request.sender_avatar.includes('/uploads/avatars/') ? request.sender_avatar : `/uploads/avatars/${request.sender_avatar}`) : '/uploads/images/pngwing.com.png'
      }));

      const enrichedBlockedFriends = blockedFriends.map(blocked => ({
        ...blocked,
        avatar: blocked.avatar ? (blocked.avatar.includes('/uploads/avatars/') ? blocked.avatar : `/uploads/avatars/${blocked.avatar}`) : '/uploads/images/pngwing.com.png'
      }));

      const enrichedUsers = allUsers.map(user => ({
        ...user,
        avatar: user.avatar ? (user.avatar.includes('/uploads/avatars/') ? user.avatar : `/uploads/avatars/${user.avatar}`) : '/uploads/images/pngwing.com.png',
        isActive: user.is_active,
        country: user.country || 'غير محدد',
        age: user.age || 'غير محدد',
        language: user.language || 'غير محدد'
      }));

      await FriendshipModel.updateLastActive(userId);

      res.render("friends", {
        friends: enrichedFriends,
        friendRequests: enrichedFriendRequests,
        blockedFriends: enrichedBlockedFriends,
        searchResults: null,
        users: enrichedUsers,
        unreadCount,
        errorMessage: null,
        successMessage: null
      });
    } catch (error) {
      logger.error("Error in showFriendsPage:", error);
      res.status(500).render("friends", {
        friends: [],
        friendRequests: [],
        blockedFriends: [],
        searchResults: null,
        users: [],
        unreadCount: 0,
        errorMessage: "حدث خطأ أثناء تحميل بيانات الأصدقاء",
        successMessage: null
      });
    }
  }

  // البحث عن الأصدقاء
  static async searchFriends(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) return res.redirect("/login");

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;
      const searchQuery = req.query.q?.trim();

      if (!searchQuery) {
        return res.redirect("/friends");
      }

      const searchResults = await FriendshipModel.searchUsers(userId, searchQuery);
      const friends = await FriendshipModel.getAcceptedFriends(userId, 0, 10);
      const friendRequests = await FriendshipModel.getFriendRequests(userId);
      const blockedFriends = await FriendshipModel.getBlockedFriends(userId);
      const unreadCount = await NotificationModel.getUnreadCount(userId);

      const enrichedFriends = friends.map(friend => ({
        ...friend,
        avatar: friend.avatar ? (friend.avatar.includes('/uploads/avatars/') ? friend.avatar : `/uploads/avatars/${friend.avatar}`) : '/uploads/images/pngwing.com.png',
        online: friend.last_active ? (Date.now() - new Date(friend.last_active).getTime() < 5 * 60 * 1000) : false,
        isActive: friend.is_active
      }));

      const enrichedFriendRequests = friendRequests.map(request => ({
        ...request,
        sender_avatar: request.sender_avatar ? (request.sender_avatar.includes('/uploads/avatars/') ? request.sender_avatar : `/uploads/avatars/${request.sender_avatar}`) : '/uploads/images/pngwing.com.png'
      }));

      const enrichedBlockedFriends = blockedFriends.map(blocked => ({
        ...blocked,
        avatar: blocked.avatar ? (blocked.avatar.includes('/uploads/avatars/') ? blocked.avatar : `/uploads/avatars/${blocked.avatar}`) : '/uploads/images/pngwing.com.png'
      }));

      const enrichedSearchResults = searchResults.map(result => ({
        ...result,
        avatar: result.avatar ? (result.avatar.includes('/uploads/avatars/') ? result.avatar : `/uploads/avatars/${result.avatar}`) : '/uploads/images/pngwing.com.png',
        isActive: result.is_active,
        country: result.country || 'غير محدد',
        age: result.age || 'غير محدد',
        language: result.language || 'غير محدد'
      }));

      await FriendshipModel.updateLastActive(userId);

      res.render("friends", {
        friends: enrichedFriends,
        friendRequests: enrichedFriendRequests,
        blockedFriends: enrichedBlockedFriends,
        searchResults: enrichedSearchResults,
        users: [],
        unreadCount,
        errorMessage: searchResults.length === 0 ? "لم يتم العثور على نتائج مطابقة" : null,
        successMessage: null
      });
    } catch (error) {
      logger.error("Error in searchFriends:", error);
      res.status(500).render("friends", {
        friends: [],
        friendRequests: [],
        blockedFriends: [],
        searchResults: [],
        users: [],
        unreadCount: 0,
        errorMessage: "حدث خطأ أثناء البحث عن الأصدقاء",
        successMessage: null
      });
    }
  }

  // إرسال طلب صداقة (API)
  static async sendFriendRequest(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ success: false, message: "يرجى تسجيل الدخول أولاً" });
      }

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;
      const friendId = parseInt(req.body.friendId);

      if (!friendId || isNaN(friendId)) {
        return res.status(400).json({ success: false, message: "معرف المستخدم غير صحيح" });
      }

      if (userId === friendId) {
        return res.status(400).json({ success: false, message: "لا يمكنك إرسال طلب صداقة لنفسك" });
      }

      // التحقق من عدد الأصدقاء
      const friendCount = await FriendshipModel.getFriendsCount(userId);
      if (friendCount >= 20) {
        return res.status(400).json({ 
          success: false, 
          message: "لا يمكنك إضافة المزيد من الأصدقاء. لقد وصلت للحد الأقصى (20)" 
        });
      }

      // التحقق من وجود المستخدم المستهدف
      const friendProfile = await FriendshipModel.getUserProfile(friendId);
      if (!friendProfile) {
        return res.status(404).json({ success: false, message: "المستخدم المطلوب غير موجود" });
      }

      if (!friendProfile.is_active) {
        return res.status(400).json({ success: false, message: "لا يمكنك إرسال طلب صداقة لمستخدم غير نشط" });
      }

      try {
        await FriendshipModel.sendFriendRequest(userId, friendId);

        // إرسال إشعار للمستخدم المستهدف
        const senderName = (await FriendshipModel.getUserProfile(userId)).name || "مستخدم";
        await NotificationModel.createNotification(
          friendId,
          userId,
          "friend_request",
          `${senderName} أرسل لك طلب صداقة`
        );

        return res.status(200).json({ 
          success: true, 
          message: "تم إرسال طلب الصداقة بنجاح"
        });
      } catch (error) {
        // معالجة أخطاء الصداقة بشكل خاص
        if (error.message.includes("صديقان بالفعل")) {
          return res.status(400).json({ 
            success: false, 
            message: "أنتما صديقان بالفعل",
            isFriend: true
          });
        } else if (error.message.includes("طلب صداقة لهذا المستخدم بالفعل")) {
          return res.status(400).json({ 
            success: false, 
            message: "لقد أرسلت طلب صداقة لهذا المستخدم بالفعل",
            hasPendingRequest: true
          });
        } else if (error.message.includes("طلب صداقة معلق من هذا المستخدم")) {
          return res.status(400).json({ 
            success: false, 
            message: "لديك طلب صداقة معلق من هذا المستخدم",
            hasIncomingRequest: true
          });
        } else if (error.message.includes("مستخدم محظور")) {
          return res.status(400).json({ 
            success: false, 
            message: "لا يمكن إرسال طلب صداقة لمستخدم محظور أو قام بحظرك",
            isBlocked: true
          });
        }
        throw error; // إعادة رمي الأخطاء الأخرى
      }
    } catch (error) {
      logger.error("Error in sendFriendRequest:", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "حدث خطأ في الخادم أثناء إرسال طلب الصداقة" 
      });
    }
  }

  // قبول طلب صداقة (API)
  static async acceptFriendRequest(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ success: false, message: "يرجى تسجيل الدخول أولاً" });
      }

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;
      const requestId = parseInt(req.body.requestId);

      if (!requestId || isNaN(requestId)) {
        return res.status(400).json({ success: false, message: "معرف الطلب غير صحيح" });
      }

      try {
        const result = await FriendshipModel.acceptFriendRequest(requestId, userId);

        // إرسال إشعار للمرسل
        const receiverName = (await FriendshipModel.getUserProfile(userId)).name || "مستخدم";
        await NotificationModel.createNotification(
          result.senderId,
          userId,
          "friend_accepted",
          `${receiverName} قبل طلب صداقتك`
        );

        return res.status(200).json({ 
          success: true, 
          message: "تم قبول طلب الصداقة بنجاح" 
        });
      } catch (error) {
        // معالجة أخطاء الصداقة بشكل خاص
        if (error.message.includes("طلب الصداقة غير موجود")) {
          return res.status(404).json({ 
            success: false, 
            message: "طلب الصداقة غير موجود أو ليس لك",
            notFound: true
          });
        } else if (error.message.includes("صديقان بالفعل")) {
          return res.status(400).json({ 
            success: false, 
            message: "أنتما صديقان بالفعل",
            alreadyFriends: true
          });
        } else if (error.message.includes("الحد الأقصى")) {
          return res.status(400).json({ 
            success: false, 
            message: error.message,
            maxFriendsReached: true
          });
        }
        throw error; // إعادة رمي الأخطاء الأخرى
      }
    } catch (error) {
      logger.error("Error in acceptFriendRequest:", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "حدث خطأ أثناء قبول طلب الصداقة" 
      });
    }
  }

  // رفض طلب صداقة (API)
  static async rejectFriendRequest(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ success: false, message: "يرجى تسجيل الدخول أولاً" });
      }

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;
      const requestId = parseInt(req.body.requestId);

      if (!requestId || isNaN(requestId)) {
        return res.status(400).json({ success: false, message: "معرف الطلب غير صحيح" });
      }

      await FriendshipModel.rejectFriendRequest(requestId, userId);

      return res.status(200).json({ 
        success: true, 
        message: "تم رفض طلب الصداقة" 
      });
    } catch (error) {
      logger.error("Error in rejectFriendRequest:", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "حدث خطأ أثناء رفض طلب الصداقة" 
      });
    }
  }

  // إلغاء طلب صداقة (API)
  static async cancelFriendRequest(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ success: false, message: "يرجى تسجيل الدخول أولاً" });
      }

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;
      const friendId = parseInt(req.body.friendId);

      if (!friendId || isNaN(friendId)) {
        return res.status(400).json({ success: false, message: "معرف المستخدم غير صحيح" });
      }

      await FriendshipModel.cancelFriendRequest(userId, friendId);

      return res.status(200).json({ 
        success: true, 
        message: "تم إلغاء طلب الصداقة" 
      });
    } catch (error) {
      logger.error("Error in cancelFriendRequest:", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "حدث خطأ أثناء إلغاء طلب الصداقة" 
      });
    }
  }

  // حظر مستخدم (API)
  static async blockFriend(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ success: false, message: "يرجى تسجيل الدخول أولاً" });
      }

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;
      const friendId = parseInt(req.body.friendId);

      if (!friendId || isNaN(friendId)) {
        return res.status(400).json({ success: false, message: "معرف المستخدم غير صحيح" });
      }

      if (userId === friendId) {
        return res.status(400).json({ success: false, message: "لا يمكنك حظر نفسك" });
      }

      // التحقق من وجود المستخدم
      const friendProfile = await FriendshipModel.getUserProfile(friendId);
      if (!friendProfile) {
        return res.status(404).json({ success: false, message: "المستخدم المطلوب غير موجود" });
      }

      await FriendshipModel.blockFriend(userId, friendId);

      return res.status(200).json({ 
        success: true, 
        message: "تم حظر المستخدم بنجاح" 
      });
    } catch (error) {
      logger.error("Error in blockFriend:", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "حدث خطأ أثناء حظر المستخدم" 
      });
    }
  }

  // إلغاء حظر مستخدم (API)
  static async unblockFriend(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ success: false, message: "يرجى تسجيل الدخول أولاً" });
      }

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;
      const friendId = parseInt(req.body.friendId);

      if (!friendId || isNaN(friendId)) {
        return res.status(400).json({ success: false, message: "معرف المستخدم غير صحيح" });
      }

      await FriendshipModel.unblockFriend(userId, friendId);

      return res.status(200).json({ 
        success: true, 
        message: "تم إلغاء حظر المستخدم بنجاح" 
      });
    } catch (error) {
      logger.error("Error in unblockFriend:", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "حدث خطأ أثناء إلغاء حظر المستخدم" 
      });
    }
  }

  // إزالة صديق (API)
  static async removeFriend(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ success: false, message: "يرجى تسجيل الدخول أولاً" });
      }

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;
      const friendId = parseInt(req.body.friendId);

      if (!friendId || isNaN(friendId)) {
        return res.status(400).json({ success: false, message: "معرف المستخدم غير صحيح" });
      }

      await FriendshipModel.removeFriend(userId, friendId);

      return res.status(200).json({ 
        success: true, 
        message: "تم إزالة الصديق بنجاح" 
      });
    } catch (error) {
      logger.error("Error in removeFriend:", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "حدث خطأ أثناء إزالة الصديق" 
      });
    }
  }

  // تبديل الإعجاب (API)
  static async toggleLike(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ success: false, message: "يرجى تسجيل الدخول أولاً" });
      }

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;
      const friendId = parseInt(req.body.friendId);

      if (!friendId || isNaN(friendId)) {
        return res.status(400).json({ success: false, message: "معرف المستخدم غير صحيح" });
      }

      if (userId === friendId) {
        return res.status(400).json({ success: false, message: "لا يمكنك إعطاء إعجاب لنفسك" });
      }

      const result = await FriendshipModel.toggleLike(userId, friendId);

      return res.status(200).json(result);
    } catch (error) {
      logger.error("Error in toggleLike:", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "حدث خطأ أثناء تبديل الإعجاب" 
      });
    }
  }

  // جلب حالة العلاقة (API)
  static async getRelationshipStatus(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ success: false, message: "يرجى تسجيل الدخول أولاً" });
      }

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;
      const targetUserId = parseInt(req.params.userId);

      if (!targetUserId || isNaN(targetUserId)) {
        return res.status(400).json({ success: false, message: "معرف المستخدم غير صحيح" });
      }

      const status = await FriendshipModel.getRelationshipStatus(userId, targetUserId);

      return res.status(200).json({ 
        success: true, 
        status: status.relationship_status,
        requestId: status.request_id
      });
    } catch (error) {
      logger.error("Error in getRelationshipStatus:", error);
      return res.status(500).json({ 
        success: false, 
        message: "حدث خطأ أثناء جلب حالة العلاقة" 
      });
    }
  }

  // جلب عدد طلبات الصداقة غير المقروءة (API)
  static async getUnreadRequestsCount(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ success: false, message: "يرجى تسجيل الدخول أولاً" });
      }

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;

      const count = await FriendshipModel.getUnreadFriendRequestsCount(userId);

      return res.status(200).json({ 
        success: true, 
        count: count
      });
    } catch (error) {
      logger.error("Error in getUnreadRequestsCount:", error);
      return res.status(500).json({ 
        success: false, 
        message: "حدث خطأ أثناء جلب عدد الطلبات غير المقروءة" 
      });
    }
  }

  // معالجة إجراءات الصداقة
  static async handleFriendAction(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ success: false, message: "يرجى تسجيل الدخول أولاً" });
      }

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;
      const { action, friendId } = req.body;

      if (!action || !friendId) {
        return res.status(400).json({ success: false, message: "بيانات غير صحيحة" });
      }

      switch (action) {
        case 'accept':
          await FriendshipController.acceptFriendRequest(req, res);
          break;
        case 'reject':
          await FriendshipController.rejectFriendRequest(req, res);
          break;
        case 'block':
          await FriendshipController.blockFriend(req, res);
          break;
        case 'unblock':
          await FriendshipController.unblockFriend(req, res);
          break;
        case 'remove':
          await FriendshipController.removeFriend(req, res);
          break;
        default:
          return res.status(400).json({ success: false, message: "إجراء غير صالح" });
      }
    } catch (error) {
      logger.error("Error in handleFriendAction:", error);
      return res.status(500).json({ success: false, message: "حدث خطأ أثناء معالجة الإجراء" });
    }
  }

  // عرض ملف صديق
  static async viewFriendProfile(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) return res.redirect("/login");

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;
      const friendId = parseInt(req.params.friendId);

      if (!friendId || isNaN(friendId)) {
        return res.status(400).render("error", { message: "معرف المستخدم غير صحيح" });
      }

      const friendProfile = await FriendshipModel.getUserProfile(friendId);
      if (!friendProfile) {
        return res.status(404).render("error", { message: "المستخدم غير موجود" });
      }

      const relationship = await FriendshipModel.getRelationshipStatus(userId, friendId);
      const unreadCount = await NotificationModel.getUnreadCount(userId);

      res.render("friend-profile", {
        friend: {
          ...friendProfile,
          avatar: friendProfile.avatar ? (friendProfile.avatar.includes('/uploads/avatars/') ? friendProfile.avatar : `/uploads/avatars/${friendProfile.avatar}`) : '/uploads/images/pngwing.com.png',
          isActive: friendProfile.is_active,
          country: friendProfile.country || 'غير محدد',
          age: friendProfile.age || 'غير محدد',
          language: friendProfile.language || 'غير محدد'
        },
        relationship,
        unreadCount
      });
    } catch (error) {
      logger.error("Error in viewFriendProfile:", error);
      res.status(500).render("error", { message: "حدث خطأ أثناء تحميل الملف الشخصي" });
    }
  }

  // عرض ملف صديق باستخدام المعرف من الجلسة
  static async viewFriendProfileBySession(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) return res.redirect("/login");

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;
      const friendId = parseInt(req.params.id);

      if (!friendId || isNaN(friendId)) {
        return res.status(400).render("error", { message: "معرف المستخدم غير صحيح" });
      }

      const friendProfile = await FriendshipModel.getUserProfile(friendId);
      if (!friendProfile) {
        return res.status(404).render("error", { message: "المستخدم غير موجود" });
      }

      const relationship = await FriendshipModel.getRelationshipStatus(userId, friendId);
      const unreadCount = await NotificationModel.getUnreadCount(userId);

      res.render("friend-profile", {
        friend: {
          ...friendProfile,
          avatar: friendProfile.avatar ? (friendProfile.avatar.includes('/uploads/avatars/') ? friendProfile.avatar : `/uploads/avatars/${friendProfile.avatar}`) : '/uploads/images/pngwing.com.png',
          isActive: friendProfile.is_active,
          country: friendProfile.country || 'غير محدد',
          age: friendProfile.age || 'غير محدد',
          language: friendProfile.language || 'غير محدد'
        },
        relationship,
        unreadCount
      });
    } catch (error) {
      logger.error("Error in viewFriendProfileBySession:", error);
      res.status(500).render("error", { message: "حدث خطأ أثناء تحميل الملف الشخصي" });
    }
  }
}

module.exports = FriendshipController;

