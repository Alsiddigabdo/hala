const express = require("express");
const router = express.Router();
const JobController = require("../controllers/jobControllers");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const verifyToken = require("../middleware/verifyToken");

// استخدام الذاكرة المؤقتة بدلاً من القرص لتجنب مشكلة نظام الملفات للقراءة فقط على Vercel
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // حد أقصى 5 ميجابايت
  }
});

router.post("/jobs/add", verifyToken, upload.single("logo"), JobController.addJob);
router.post("/apply-job", verifyToken, JobController.applyJob);
router.get("/jobPage/all", JobController.getAllJobs);
router.get("/applications/:jobId", verifyToken, JobController.getApplications);
router.get("/jobs", (req, res) => res.render("jobs"));
router.get("/add-job", verifyToken, (req, res) => res.render("add-job"));
router.get("/listing-job", JobController.renderAllJobs);
router.get("/jobapplications", verifyToken, JobController.renderAllApplications);
router.get("/job/:jobId", verifyToken, JobController.renderJobDetail);

module.exports = router;

