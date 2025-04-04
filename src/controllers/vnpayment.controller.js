//const vnpay = require('../config/vnpayConfig.js');
const { ProductCode, VnpLocale, dateFormat, consoleLogger } = require('vnpay');
const { VNPay, ignoreLogger } = require('vnpay');
const Payment = require('../models/payment');
const Ticket = require('../models/ticket');
const PaymentStatus = require('../models/paymentStatus');
const PaymentMethod = require('../models/paymentMethod');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');
const crypto = require('crypto');
const moment = require('moment');
const querystring = require('qs');
const axios = require('axios');
const config = require('../config');
const VNPayTransaction = require('../models/vnpayTransaction');

// Địa chỉ frontend thực tế - cần thay đổi theo môi trường
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const vnpay = new VNPay({
    tmnCode: 'HKN8S09W', // Mã TMN do VNPay cấp
    secureSecret: 'X3K9G4X8MJR4XGHMNR6YVUNUYIFJ9CPA', // Chuỗi bí mật bảo mật
    vnpayHost: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', // Đổi thành production khi deploy
    testMode: true, // Để true khi test, false khi chạy thật
    hashAlgorithm: 'SHA512',
    enableLog: true,
    loggerFn: console.log, // Ghi log ra console, có thể dùng ignoreLogger để tắt log

    endpoints: {
        paymentEndpoint: 'paymentv2/vpcpay.html',
        queryDrRefundEndpoint: 'merchant_webapi/api/transaction',
        getBankListEndpoint: 'qrpayauth/api/merchant/get_bank_list',
    },
});

// Danh sách ngân hàng hỗ trợ VNPAY
const BANK_LIST = [
    { id: 'VNPAYQR', name: 'Thanh toán qua ứng dụng hỗ trợ VNPAYQR' },
    { id: 'VNBANK', name: 'Thanh toán qua ATM-Tài khoản ngân hàng nội địa' },
    { id: 'INTCARD', name: 'Thanh toán qua thẻ quốc tế' },
    { id: 'VISA', name: 'Thanh toán qua thẻ VISA' },
    { id: 'MASTERCARD', name: 'Thanh toán qua thẻ MasterCard' },
    { id: 'JCB', name: 'Thanh toán qua thẻ JCB' },
    { id: 'NCB', name: 'Ngân hàng NCB' },
    { id: 'SACOMBANK', name: 'Ngân hàng SacomBank' },
    { id: 'EXIMBANK', name: 'Ngân hàng EximBank' },
    { id: 'MBBANK', name: 'Ngân hàng MBBank' },
    { id: 'VIETINBANK', name: 'Ngân hàng VietinBank' },
    { id: 'VIETCOMBANK', name: 'Ngân hàng VietcomBank' },
    { id: 'HDBANK', name: 'Ngân hàng HDBank' },
    { id: 'DONGABANK', name: 'Ngân hàng Đông Á' },
    { id: 'TPBANK', name: 'Ngân hàng TPBank' },
    { id: 'BIDV', name: 'Ngân hàng BIDV' },
    { id: 'TECHCOMBANK', name: 'Ngân hàng Techcombank' },
    { id: 'VPBANK', name: 'Ngân hàng VPBank' },
    { id: 'AGRIBANK', name: 'Ngân hàng Agribank' },
    { id: 'MARITIMEBANK', name: 'Ngân hàng Maritime Bank' },
    { id: 'PAMEXBANK', name: 'Ngân hàng PamexBank' },
    { id: 'VIB', name: 'Ngân hàng VIB' },
    { id: 'SCB', name: 'Ngân hàng SCB' },
    { id: 'ACB', name: 'Ngân hàng ACB' },
    { id: 'OCB', name: 'Ngân hàng OCB' },
    { id: 'MSBANK', name: 'Ngân hàng MSBANK' },
    { id: 'SHB', name: 'Ngân hàng SHB' },
    { id: 'CAKE', name: 'CAKE by VPBank' },
    { id: 'UBANK', name: 'UBANK by VPBank' }
];

// Tạo chữ ký số cho VNPAY
const createVNPaySignature = (secretKey, data) => {
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(data, 'utf-8').digest('hex');
    return signed;
};

// Tạo URL thanh toán VNPAY
const createPayment = async (req, res) => {
    try {
        const { amount, orderInfo, userId, bookingId, redirectUrl } = req.body;

        if (!amount || !orderInfo || !userId) {
            return res.status(400).json({ 
                success: false, 
                msg: 'Thiếu thông tin thanh toán',
                data: null 
            });
        }

        // Tạo mã đơn hàng
        const orderId = moment().format('YYYYMMDDHHmmss') + '-' + Math.floor(Math.random() * 1000);
        const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        
        // Tạo запись giao dịch trong DB
        const transaction = new VNPayTransaction({
            orderId: orderId,
            amount: amount,
            orderInfo: orderInfo,
            userId: userId,
            bookingId: bookingId || null,
            status: 'pending'
        });
        
        await transaction.save();

        // Tạo request data
        const vnpUrl = config.vnpay.vnpUrl;
        const returnUrl = config.vnpay.returnUrl || redirectUrl;
        
        const date = new Date();
        const createDate = moment(date).format('YYYYMMDDHHmmss');
        
        const requestData = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: config.vnpay.vnpTmnCode,
            vnp_Locale: 'vn',
            vnp_CurrCode: 'VND',
            vnp_TxnRef: orderId,
            vnp_OrderInfo: orderInfo,
            vnp_OrderType: 'other',
            vnp_Amount: amount * 100, // Số tiền * 100
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: ipAddr,
            vnp_CreateDate: createDate
        };
        
        // Sắp xếp theo thứ tự key
        const sortedParams = sortObject(requestData);
        
        // Tạo chuỗi ký
        const signData = querystring.stringify(sortedParams, { encode: false });
        const secureHash = createVNPaySignature(config.vnpay.vnpHashSecret, signData);
        
        // Thêm chữ ký vào data
        sortedParams['vnp_SecureHash'] = secureHash;
        
        // Tạo payment URL
        const paymentUrl = vnpUrl + '?' + querystring.stringify(sortedParams, { encode: false });
        
        // Trả về URL thanh toán
        return res.status(200).json({
            success: true,
            msg: 'Tạo URL thanh toán thành công',
            data: {
                paymentUrl: paymentUrl,
                orderId: orderId
            }
        });
    } catch (error) {
        console.error('Lỗi tạo thanh toán:', error);
        return res.status(500).json({
            success: false,
            msg: 'Lỗi tạo thanh toán: ' + error.message,
            data: null
        });
    }
};

// Lấy danh sách ngân hàng
const getBankList = (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            msg: 'Lấy danh sách ngân hàng thành công',
            data: BANK_LIST
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách ngân hàng:', error);
        return res.status(500).json({
            success: false,
            msg: 'Lỗi lấy danh sách ngân hàng: ' + error.message,
            data: null
        });
    }
};

// Xử lý callback từ VNPAY
const paymentCallback = async (req, res) => {
    try {
        // Lấy các tham số từ VNPay trả về
        const vnpParams = req.query;
        
        // Kiểm tra chữ ký trả về
        const secureHash = vnpParams['vnp_SecureHash'];
        
        // Xóa các tham số không cần kiểm tra chữ ký
        delete vnpParams['vnp_SecureHash'];
        delete vnpParams['vnp_SecureHashType'];
        
        // Sắp xếp các tham số
        const sortedParams = sortObject(vnpParams);
        
        // Tạo chuỗi ký
        const signData = querystring.stringify(sortedParams, { encode: false });
        const checkSignature = createVNPaySignature(config.vnpay.vnpHashSecret, signData);
        
        // Kiểm tra chữ ký từ VNPay
        if (secureHash !== checkSignature) {
            return res.status(400).json({
                success: false,
                msg: 'Chữ ký không hợp lệ',
                data: null
            });
        }
        
        // Lấy thông tin đơn hàng từ DB
        const orderId = vnpParams['vnp_TxnRef'];
        const transaction = await VNPayTransaction.findOne({ orderId: orderId });
        
        if (!transaction) {
            return res.status(404).json({
                success: false,
                msg: 'Không tìm thấy giao dịch',
                data: null
            });
        }
        
        // Kiểm tra trạng thái thanh toán
        const responseCode = vnpParams['vnp_ResponseCode'];
        
        // Cập nhật thông tin giao dịch
        transaction.transactionId = vnpParams['vnp_TransactionNo'];
        transaction.bankCode = vnpParams['vnp_BankCode'];
        transaction.bankTranNo = vnpParams['vnp_BankTranNo'];
        transaction.cardType = vnpParams['vnp_CardType'];
        transaction.payDate = moment(vnpParams['vnp_PayDate'], 'YYYYMMDDHHmmss').toDate();
        transaction.responseCode = responseCode;
        
        // Cập nhật trạng thái thanh toán
        if (responseCode === '00') {
            transaction.status = 'completed';
        } else {
            transaction.status = 'failed';
        }
        
        await transaction.save();
        
        // Frontend URL
        const frontendUrl = config.frontend.url;
        
        // Chuyển hướng về trang frontend
        if (responseCode === '00') {
            return res.redirect(`${frontendUrl}/payment-success?orderId=${orderId}`);
        } else {
            return res.redirect(`${frontendUrl}/payment-failed?orderId=${orderId}`);
        }
    } catch (error) {
        console.error('Lỗi xử lý callback thanh toán:', error);
        return res.status(500).json({
            success: false,
            msg: 'Lỗi xử lý callback thanh toán: ' + error.message,
            data: null
        });
    }
};

// Kiểm tra trạng thái thanh toán
const checkPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        if (!orderId) {
            return res.status(400).json({
                success: false,
                msg: 'Thiếu mã đơn hàng',
                data: null
            });
        }
        
        // Lấy thông tin giao dịch từ DB
        const transaction = await VNPayTransaction.findOne({ orderId: orderId });
        
        if (!transaction) {
            return res.status(404).json({
                success: false,
                msg: 'Không tìm thấy giao dịch',
                data: null
            });
        }
        
        return res.status(200).json({
            success: true,
            msg: 'Lấy trạng thái thanh toán thành công',
            data: {
                orderId: transaction.orderId,
                amount: transaction.amount,
                status: transaction.status,
                transactionId: transaction.transactionId,
                payDate: transaction.payDate
            }
        });
    } catch (error) {
        console.error('Lỗi kiểm tra trạng thái thanh toán:', error);
        return res.status(500).json({
            success: false,
            msg: 'Lỗi kiểm tra trạng thái thanh toán: ' + error.message,
            data: null
        });
    }
};

// Hàm sắp xếp object để tạo chữ ký
function sortObject(obj) {
    let sorted = {};
    let keys = Object.keys(obj).sort();
    for (let i = 0; i < keys.length; i++) {
        sorted[keys[i]] = obj[keys[i]];
    }
    return sorted;
}

module.exports = {
    createPayment,
    getBankList,
    paymentCallback,
    checkPaymentStatus
};