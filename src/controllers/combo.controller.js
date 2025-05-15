const Combo = require('../models/combo');
const User = require('../models/user');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// SECTION: API quản lý combo đồ ăn/đồ uống

// ANCHOR: Lấy tất cả combo
exports.getAllCombos = async (req, res) => {
    try {
        // NOTE: Populate thông tin người tạo combo
        const combos = await Combo.find().populate('user_id');
        res.json(createResponse(200, null, combos));
    } catch (error) {
        console.error('Get all combos error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách combo', null));
    }
};

// ANCHOR: Lấy combo theo ID
exports.getComboById = async (req, res) => {
    try {
        const id = req.params.id;

        // IMPORTANT: Kiểm tra tính hợp lệ của ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID combo không hợp lệ', null));
        }

        // NOTE: Tìm combo và populate thông tin người tạo
        const combo = await Combo.findById(id).populate('user_id');

        // WARNING: Kiểm tra nếu không tìm thấy combo
        if (!combo) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy combo', null));
        }

        res.json(createResponse(200, null, combo));
    } catch (error) {
        console.error('Get combo by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin combo', null));
    }
};

// ANCHOR: Tạo combo mới
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

        // IMPORTANT: Kiểm tra đầy đủ thông tin đầu vào
        if (!combo_id || !user_id || !name_combo || !price_combo || !description_combo || !image_combo) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // WARNING: Kiểm tra combo_id đã tồn tại chưa
        const existingCombo = await Combo.findOne({ combo_id });
        if (existingCombo) {
            return res.status(400).json(createResponse(400, 'Mã combo đã tồn tại', null));
        }

        // SECTION: Kiểm tra thông tin liên quan
        // NOTE: Kiểm tra user tồn tại
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json(createResponse(400, 'ID người dùng không hợp lệ', null));
        }
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng', null));
        }

        // IMPORTANT: Kiểm tra giá combo hợp lệ
        if (price_combo < 0) {
            return res.status(400).json(createResponse(400, 'Giá combo không được âm', null));
        }

        // NOTE: Tạo đối tượng combo mới
        const newCombo = new Combo({
            combo_id,
            user_id,
            name_combo,
            price_combo,
            description_combo,
            image_combo
        });

        // DONE: Lưu combo vào cơ sở dữ liệu
        const savedCombo = await newCombo.save();
        
        // NOTE: Populate thông tin người tạo
        const populatedCombo = await Combo.findById(savedCombo._id).populate('user_id');

        res.status(201).json(createResponse(201, 'Tạo combo thành công', populatedCombo));
    } catch (error) {
        console.error('Create combo error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo combo', null));
    }
};

// ANCHOR: Cập nhật thông tin combo
exports.updateCombo = async (req, res) => {
    try {
        const {
            name_combo,
            price_combo,
            description_combo,
            image_combo
        } = req.body;
        const id = req.params.id;

        // IMPORTANT: Kiểm tra tính hợp lệ của ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID combo không hợp lệ', null));
        }

        // NOTE: Tìm combo cần cập nhật
        const combo = await Combo.findById(id);
        if (!combo) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy combo', null));
        }

        // SECTION: Cập nhật các trường nếu được cung cấp
        // NOTE: Cập nhật tên combo
        if (name_combo) combo.name_combo = name_combo;
        
        // NOTE: Cập nhật giá combo
        if (price_combo) {
            // WARNING: Kiểm tra giá combo hợp lệ
            if (price_combo < 0) {
                return res.status(400).json(createResponse(400, 'Giá combo không được âm', null));
            }
            combo.price_combo = price_combo;
        }
        
        // NOTE: Cập nhật mô tả combo
        if (description_combo) combo.description_combo = description_combo;
        
        // NOTE: Cập nhật hình ảnh combo
        if (image_combo) combo.image_combo = image_combo;

        // DONE: Lưu thông tin đã cập nhật
        const updatedCombo = await combo.save();
        
        // NOTE: Populate thông tin người tạo
        const populatedCombo = await Combo.findById(updatedCombo._id).populate('user_id');

        res.json(createResponse(200, 'Cập nhật combo thành công', populatedCombo));
    } catch (error) {
        console.error('Update combo error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật combo', null));
    }
};

// ANCHOR: Xóa combo
exports.deleteCombo = async (req, res) => {
    try {
        const id = req.params.id;

        // IMPORTANT: Kiểm tra tính hợp lệ của ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID combo không hợp lệ', null));
        }

        // NOTE: Tìm combo cần xóa
        const combo = await Combo.findById(id);
        if (!combo) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy combo', null));
        }

        // DONE: Xóa combo
        await Combo.deleteOne({ _id: id });
        res.json(createResponse(200, 'Xóa combo thành công', null));
    } catch (error) {
        console.error('Delete combo error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa combo', null));
    }
};

// TODO: Thêm API lấy combo theo danh mục (đồ ăn, đồ uống, v.v.)
// TODO: Thêm API lấy combo theo mức giá
// IDEA: Thêm tính năng combo khuyến mãi theo ngày/sự kiện
// OPTIMIZE: Cần thêm validation chi tiết cho các thành phần của combo