const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/banner.controller');

// Lấy danh sách banner
router.get('/getAllBanner', bannerController.getBanners);

// Lấy banner theo ID
router.get('/getBannerById/:id', bannerController.getBannerById);

// Thêm banner mới
router.post('/addBanner', bannerController.addBanner);

// Cập nhật banner
router.put('/updateBanner/:id', bannerController.updateBanner);

// Xóa banner
router.delete('/deleteBanner/:id', bannerController.deleteBanner);

module.exports = router; 