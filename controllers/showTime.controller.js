const express = require('express');
const ShowTime = require('../models/showTime'); // Import model suất chiếu
const Film = require('../models/film'); // Import model phim
const createResponse = require('../utils/responseHelper');

// Lấy danh sách suất chiếu
exports.getShowTimes = async (req, res) => {
    try {
        const showTimes = await ShowTime.find(); // Lấy thông tin phim kèm theo
        res.status(200).json(createResponse(200, null, showTimes));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách suất chiếu', error.message));
    }
};


// Lấy suất chiếu theo ID
exports.getShowTimeById = async (req, res) => {
    try {
        const showTime = await ShowTime.findById(req.params.id).populate('movieId');
        if (!showTime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }
        res.status(200).json(createResponse(200, null, showTime));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy suất chiếu', error.message));
    }
};

