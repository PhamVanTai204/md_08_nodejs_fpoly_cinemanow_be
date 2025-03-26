const express = require('express');
const Banner = require('../models/banner');
const createResponse = require('../utils/responseHelper');
const Film = require('../models/film');

// Lấy toàn bộ danh sách banner (KHÔNG PHÂN TRANG)
exports.getBanners = async (req, res) => {
    try {
        const banners = await Banner.find();
        res.status(200).json(createResponse(200, null, banners));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách banner', error.message));
    }
};

// Lấy banner theo ID
exports.getBannerById = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
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
        const { image_url } = req.body;

        if (!image_url) {
            return res.status(400).json(createResponse(400, 'Thiếu thông tin image_url', null));
        }

        const newBanner = new Banner({ image_url });
        await newBanner.save();

        res.status(201).json(createResponse(201, 'Thêm banner thành công', newBanner));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi thêm banner', error.message));
    }
};

// Cập nhật banner
exports.updateBanner = async (req, res) => {
    try {
        const { image_url } = req.body;
        const bannerId = req.params.id;

        const banner = await Banner.findById(bannerId);
        if (!banner) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy banner', null));
        }

        if (image_url) {
            banner.image_url = image_url;
        }

        await banner.save();
        res.status(200).json(createResponse(200, 'Cập nhật banner thành công', banner));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật banner', error.message));
    }
};

// Xóa banner
exports.deleteBanner = async (req, res) => {
    try {
        const bannerId = req.params.id;

        const banner = await Banner.findById(bannerId);
        if (!banner) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy banner', null));
        }

        await Banner.findByIdAndDelete(bannerId);
        res.status(200).json(createResponse(200, 'Xóa banner thành công', null));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi xóa banner', error.message));
    }
};