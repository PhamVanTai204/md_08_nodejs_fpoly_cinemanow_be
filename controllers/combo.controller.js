const Combo = require('../models/combo');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// Lấy tất cả combo
exports.getAllCombos = async (req, res) => {
    try {
        const combos = await Combo.find();
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

        // Kiểm tra ID hợp lệ
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID combo không hợp lệ', null));
        }

        const combo = await Combo.findById(id);
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
        const { combo_id, name_combo, price_combo, description_combo, image_combo } = req.body;

        // Kiểm tra đầy đủ thông tin
        if (!combo_id || !name_combo || !price_combo || !description_combo || !image_combo) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // Kiểm tra combo_id đã tồn tại
        const existingCombo = await Combo.findOne({ combo_id });
        if (existingCombo) {
            return res.status(400).json(createResponse(400, 'Mã combo đã tồn tại', null));
        }

        // Kiểm tra giá combo
        if (price_combo <= 0) {
            return res.status(400).json(createResponse(400, 'Giá combo phải lớn hơn 0', null));
        }

        const newCombo = new Combo({
            combo_id,
            name_combo,
            price_combo,
            description_combo,
            image_combo
        });

        const savedCombo = await newCombo.save();
        res.status(201).json(createResponse(201, 'Tạo combo thành công', savedCombo));
    } catch (error) {
        console.error('Create combo error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo combo', null));
    }
};

// Cập nhật combo
exports.updateCombo = async (req, res) => {
    try {
        const { name_combo, price_combo, description_combo, image_combo } = req.body;
        const id = req.params.id;

        // Kiểm tra ID hợp lệ
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID combo không hợp lệ', null));
        }

        // Kiểm tra combo tồn tại
        const combo = await Combo.findById(id);
        if (!combo) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy combo', null));
        }

        // Cập nhật thông tin
        if (name_combo) combo.name_combo = name_combo;
        
        if (price_combo !== undefined) {
            if (price_combo <= 0) {
                return res.status(400).json(createResponse(400, 'Giá combo phải lớn hơn 0', null));
            }
            combo.price_combo = price_combo;
        }
        
        if (description_combo) combo.description_combo = description_combo;
        if (image_combo) combo.image_combo = image_combo;

        const updatedCombo = await combo.save();
        res.json(createResponse(200, 'Cập nhật combo thành công', updatedCombo));
    } catch (error) {
        console.error('Update combo error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật combo', null));
    }
};

// Xóa combo
exports.deleteCombo = async (req, res) => {
    try {
        const id = req.params.id;

        // Kiểm tra ID hợp lệ
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