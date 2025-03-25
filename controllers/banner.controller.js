const express = require('express');
const Banner = require('../models/banner');
const createResponse = require('../utils/responseHelper');
const Film = require('../models/film');

// Lấy danh sách banner
exports.getBanners = async (req, res) => {
    try {
        let { page, limit } = req.query;

        // Chuyển đổi giá trị thành số nguyên và đặt mặc định nếu không có giá trị
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // Lấy danh sách banner với phân trang
        const banners = await Banner.find()
            .populate('movie_id')
            .skip(skip)
            .limit(limit);

        res.status(200).json(createResponse(200, null, banners));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách banner', error.message));
    }
};

// Lấy banner theo ID
exports.getBannerById = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id).populate('movie_id');
        if (!banner) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy banner', null));
        }
        res.status(200).json(createResponse(200, null, banner));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin banner', error.message));
    }
};

// Thêm banner mới
exports.addBanner = async (req, res) => {
    try {
        const { banner_id, movie_id, image_url } = req.body;

        // Kiểm tra thông tin bắt buộc
        if (!banner_id || !movie_id || !image_url) {
            return res.status(400).json(createResponse(400, 'Thiếu thông tin bắt buộc', null));
        }

        // Kiểm tra banner_id đã tồn tại chưa
        const existingBanner = await Banner.findOne({ banner_id });
        if (existingBanner) {
            return res.status(400).json(createResponse(400, 'Banner ID đã tồn tại', null));
        }

        // Kiểm tra movie_id có tồn tại không
        const existingMovie = await Film.findById(movie_id);
        if (!existingMovie) {
            return res.status(400).json(createResponse(400, 'Phim không tồn tại', null));
        }

        // Tạo banner mới
        const newBanner = new Banner({
            banner_id,
            movie_id,
            image_url
        });

        await newBanner.save();
        res.status(201).json(createResponse(201, 'Thêm banner thành công', newBanner));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi thêm banner', error.message));
    }
};

// Cập nhật banner
exports.updateBanner = async (req, res) => {
    try {
        const { movie_id, image_url } = req.body;
        const bannerId = req.params.id;

        // Kiểm tra banner có tồn tại không
        const banner = await Banner.findById(bannerId);
        if (!banner) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy banner', null));
        }

        // Kiểm tra movie_id có tồn tại không (nếu cập nhật)
        if (movie_id) {
            const existingMovie = await Film.findById(movie_id);
            if (!existingMovie) {
                return res.status(400).json(createResponse(400, 'Phim không tồn tại', null));
            }
        }

        // Cập nhật banner
        const updatedBanner = await Banner.findByIdAndUpdate(
            bannerId,
            { movie_id, image_url },
            { new: true, runValidators: true }
        ).populate('movie_id');

        res.status(200).json(createResponse(200, 'Cập nhật banner thành công', updatedBanner));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật banner', error.message));
    }
};


// Xóa banner
exports.deleteBanner = async (req, res) => {
    try {
        const bannerId = req.params.id;
        // Kiểm tra banner có tồn tại không
        const banner = await Banner.findById(bannerId);
        console.log(banner);
        
        if (!banner) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy banner', null));
        }

        // Xóa banner
        await Banner.findByIdAndDelete(bannerId);
        res.status(200).json(createResponse(200, 'Xóa banner thành công', null));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi xóa banner', error.message));
    }
};