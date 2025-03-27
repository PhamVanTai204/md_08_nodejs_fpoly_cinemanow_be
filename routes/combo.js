const express = require('express');
const router = express.Router();
const comboController = require('../controllers/combo.controller');

// Lấy tất cả combo
router.get('/get-all', comboController.getAllCombos);

// Lấy combo theo ID
router.get('/get-by-id/:id', comboController.getComboById);

// Tạo combo mới
router.post('/create', comboController.createCombo);

// Cập nhật combo
router.put('/update/:id', comboController.updateCombo);

// Xóa combo
router.delete('/delete/:id', comboController.deleteCombo);

module.exports = router; 