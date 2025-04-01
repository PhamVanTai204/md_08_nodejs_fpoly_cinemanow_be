const Combo = require('../models/combo');
const User = require('../models/user');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// Lấy tất cả combo
exports.getAllCombos = async (req, res) => {
    try {
        const combos = await Combo.find().populate('user_id');
        res.json(createResponse(200, null, combos));
    } catch (error) {
        console.error('Get all combos error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách combo', null));
    }
};

// Lấy combo theo ID
exports.getComboById = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID combo không hợp lệ', null));
        }

        const combo = await Combo.findById(id).populate('user_id');

        if (!combo) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy combo', null));
        }

        res.json(createResponse(200, null, combo));
    } catch (error) {
        console.error('Get combo by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin combo', null));
    }
};

// Tạo combo mới
exports.createCombo = async (req, res) => {
    try {
        const {
            combo_id,
            user_id,
            name_combo,
            price_combo,
            description_combo,
            image_combo
        } = req.body;

        // Kiểm tra đầy đủ thông tin
        if (!combo_id || !user_id || !name_combo || !price_combo || !description_combo || !image_combo) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // Kiểm tra combo_id đã tồn tại
        const existingCombo = await Combo.findOne({ combo_id });
        if (existingCombo) {
            return res.status(400).json(createResponse(400, 'Mã combo đã tồn tại', null));
        }

        // Kiểm tra user tồn tại
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json(createResponse(400, 'ID người dùng không hợp lệ', null));
        }
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng', null));
        }

        // Kiểm tra giá combo hợp lệ
        if (price_combo < 0) {
            return res.status(400).json(createResponse(400, 'Giá combo không được âm', null));
        }

        const newCombo = new Combo({
            combo_id,
            user_id,
            name_combo,
            price_combo,
            description_combo,
            image_combo
        });

        const savedCombo = await newCombo.save();
        const populatedCombo = await Combo.findById(savedCombo._id).populate('user_id');

        res.status(201).json(createResponse(201, 'Tạo combo thành công', populatedCombo));
    } catch (error) {
        console.error('Create combo error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo combo', null));
    }
};

// Cập nhật combo
exports.updateCombo = async (req, res) => {
    try {
        const {
            name_combo,
            price_combo,
            description_combo,
            image_combo
        } = req.body;
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID combo không hợp lệ', null));
        }

        const combo = await Combo.findById(id);
        if (!combo) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy combo', null));
        }

        // Cập nhật các trường nếu có
        if (name_combo) combo.name_combo = name_combo;
        if (price_combo) {
            if (price_combo < 0) {
                return res.status(400).json(createResponse(400, 'Giá combo không được âm', null));
            }
            combo.price_combo = price_combo;
        }
        if (description_combo) combo.description_combo = description_combo;
        if (image_combo) combo.image_combo = image_combo;

        const updatedCombo = await combo.save();
        const populatedCombo = await Combo.findById(updatedCombo._id).populate('user_id');

        res.json(createResponse(200, 'Cập nhật combo thành công', populatedCombo));
    } catch (error) {
        console.error('Update combo error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật combo', null));
    }
};

// Xóa combo
exports.deleteCombo = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID combo không hợp lệ', null));
        }

        const combo = await Combo.findById(id);
        if (!combo) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy combo', null));
        }

        await Combo.deleteOne({ _id: id });
        res.json(createResponse(200, 'Xóa combo thành công', null));
    } catch (error) {
        console.error('Delete combo error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa combo', null));
    }
}; 