const express = require("express");
const router = express.Router();
const ForumController = require("../controllers/ForumController");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const verifyToken = require("../middleware/verifyToken");

// استخدام الذاكرة المؤقتة بدلاً من القرص لتجنب مشكلة نظام الملفات للقراءة فقط على Vercel
const postStorage = multer.memoryStorage();
const postUpload = multer({ 
  storage: postStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // حد أقصى 10 ميجابايت
  }
});

const adStorage = multer.memoryStorage();
const adUpload = multer({ 
  storage: adStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // حد أقصى 5 ميجابايت
  }
});

router.get("/", ForumController.getAllPosts);
router.post("/post", verifyToken, postUpload.array("postImages", 4), ForumController.addPost);
router.get("/post/:postId/edit", verifyToken, ForumController.editPostForm);
router.post("/post/:postId/edit", verifyToken, postUpload.array("postImages", 4), ForumController.updatePost);
router.post("/post/:id/delete", verifyToken, ForumController.deletePost);
router.post("/toggle-like/:id", verifyToken, ForumController.toggleLike);
router.post("/post/:id/share", verifyToken, ForumController.sharePost);
router.post("/post/:id/hide", verifyToken, ForumController.hidePost);
router.post("/comments/:postId/add", verifyToken, ForumController.addComment);
router.get("/comments/:postId", ForumController.getComments);
router.post("/comments/:commentId/like", verifyToken, ForumController.toggleLikeComment);
router.get("/post/:postId", ForumController.getPostDetails);
router.post("/ad", verifyToken, adUpload.single("image"), ForumController.addAd);
router.get("/my-posts", verifyToken, ForumController.getUserPosts);

module.exports = router;

