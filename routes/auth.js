const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyRefreshToken } = require('../middleware/auth');

// Route refresh token
router.post('/refresh-token', verifyRefreshToken, authController.refreshToken);

module.exports = router; 