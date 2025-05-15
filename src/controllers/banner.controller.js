const express = require('express');
const Banner = require('../models/banner');
const createResponse = require('../utils/responseHelper');
const Film = require('../models/film');

// SECTION: API quản lý banner quảng cáo

// ANCHOR: Lấy toàn bộ danh sách banner (KHÔNG PHÂN TRANG)
exports.getBanners = async (req, res) => {
    try {
        // NOTE: Lấy tất cả banner không phân trang
        const banners = await Banner.find();
        res.status(200).json(createResponse(200, null, banners));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách banner', error.message));
    }
};

// ANCHOR: Lấy banner theo ID
exports.getBannerById = async (req, res) => {
    try {
        // NOTE: Tìm banner theo ID
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy banner', null));
        }
        res.status(200).json(createResponse(200, null, banner));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin banner', error.message));
    }
};

// ANCHOR: Thêm banner mới
exports.addBanner = async (req, res) => {
    try {
        const { image_url } = req.body;

        // IMPORTANT: Kiểm tra trường bắt buộc
        if (!image_url) {
            return res.status(400).json(createResponse(400, 'Thiếu thông tin image_url', null));
        }

        // NOTE: Tạo đối tượng banner mới
        const newBanner = new Banner({ image_url });
        
        // DONE: Lưu banner vào cơ sở dữ liệu
        await newBanner.save();

        res.status(201).json(createResponse(201, 'Thêm banner thành công', newBanner));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi thêm banner', error.message));
    }
};

// ANCHOR: Cập nhật thông tin banner
exports.updateBanner = async (req, res) => {
    try {
        const { image_url } = req.body;
        const bannerId = req.params.id;

        // NOTE: Tìm banner cần cập nhật
        const banner = await Banner.findById(bannerId);
        if (!banner) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy banner', null));
        }

        // NOTE: Cập nhật URL hình ảnh nếu được cung cấp
        if (image_url) {
            banner.image_url = image_url;
        }

        // DONE: Lưu thông tin đã cập nhật
        await banner.save();
        res.status(200).json(createResponse(200, 'Cập nhật banner thành công', banner));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật banner', error.message));
    }
};

// ANCHOR: Xóa banner
exports.deleteBanner = async (req, res) => {
    try {
        const bannerId = req.params.id;

        // NOTE: Kiểm tra banner tồn tại
        const banner = await Banner.findById(bannerId);
        if (!banner) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy banner', null));
        }

        // DONE: Xóa banner khỏi cơ sở dữ liệu
        await Banner.findByIdAndDelete(bannerId);
        res.status(200).json(createResponse(200, 'Xóa banner thành công', null));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi xóa banner', error.message));
    }
};

// TODO: Thêm API liên kết banner với phim
// TODO: Thêm API quản lý trạng thái hiển thị banner
// IDEA: Thêm tính năng banner theo vị trí hiển thị (trang chủ, trang chi tiết phim...)
// OPTIMIZE: Cần thêm kiểm tra định dạng URL hình ảnh