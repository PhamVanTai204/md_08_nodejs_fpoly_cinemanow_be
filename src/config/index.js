/**
 * Cấu hình ứng dụng
 */

require('dotenv').config();

module.exports = {
    // Cấu hình VNPAY
    vnpay: {
        vnpTmnCode: process.env.VNP_TMN_CODE || 'YOUR_MERCHANT_CODE',
        vnpHashSecret: process.env.VNP_HASH_SECRET || 'YOUR_SECRET_KEY',
        vnpUrl: process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        returnUrl: process.env.VNP_RETURN_URL || 'http://localhost:3000/api/vnpay/payment-callback',
    },
    
    // Cấu hình frontend
    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:8000',
    },
    
    // Cấu hình môi trường
    env: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
    },
    
    // Cấu hình cơ sở dữ liệu
    database: {
        mongo: {
            uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cinemanow',
        },
    },
    
    // Cấu hình JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
}; 