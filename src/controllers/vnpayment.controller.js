//const vnpay = require('../config/vnpayConfig.js');
const { ProductCode, VnpLocale, dateFormat, consoleLogger } = require('vnpay');
const { VNPay, ignoreLogger } = require('vnpay');

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


// API lấy danh sách ngân hàng
exports.getBankList = async (req, res) => {
    try {
        const bankList = await vnpay.getBankList(); // Gọi API lấy danh sách ngân hàng
        res.json(bankList); // Trả về danh sách ngân hàng cho frontend
    } catch (error) {
        console.error('Lỗi lấy danh sách ngân hàng:', error);
        res.status(500).json({ error: 'Không thể lấy danh sách ngân hàng' });
    }
};

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);


exports.createPaymentUrl = async (req, res) => {
    try {
        // Lấy dữ liệu từ body của request
        const { amount, orderId, orderInfo } = req.body;

        // Tạo URL thanh toán
        const paymentUrl = vnpay.buildPaymentUrl({
            vnp_Amount: amount,
            vnp_IpAddr:
                req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.ip,
            vnp_TxnRef: orderId,
            vnp_OrderInfo: orderInfo,
            vnp_OrderType: ProductCode.Other,
            vnp_ReturnUrl: 'http://localhost:4200/confirmVNPay',
            vnp_Locale: VnpLocale.VN,
        });

        return res.json({
            success: true,
            paymentUrl,
            order: {
                amount: amount,
                id: orderId,
                orderInfo: orderInfo,
                returnUrl: 'http://localhost:4200/confirmVNPay',
            }, // Tạo đối tượng order để trả về
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo URL thanh toán VNPAY',
            error: error.message,
        });
    }
};