//const vnpay = require('../config/vnpayConfig.js');
const { ProductCode, VnpLocale, dateFormat, consoleLogger, IpnFailChecksum,
    IpnOrderNotFound,
    IpnInvalidAmount,
    InpOrderAlreadyConfirmed,
    IpnUnknownError,
    IpnSuccess } = require('vnpay');
const { VNPay, ignoreLogger } = require('vnpay');
const Ticket = require('../models/ticket');
const Payment = require('../models/payment');
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
        const { ticket_id, amount } = req.body;
        // Kiểm tra vé tồn tại và chưa thanh toán
        const ticket = await Ticket.findOne({
            _id: ticket_id,
            status: 'pending'
        });

        if (!ticket) {
            return res.status(400).json({
                success: false,
                message: 'Ticket not found or already processed'
            });
        }
        // Tạo payment_id duy nhất
        const payment_id = 'PAY' + Date.now();

        // Tạo payment record
        const payment = await Payment.create({
            payment_id,
            ticket_id: ticket._id,
            payment_method: 1, // 1 = VNPay
            status_order: 'pending'
        });
        const expireDate = new Date(Date.now() + 15 * 60 * 1000); // 15 phút hết hạn
        const formattedExpireDate = dateFormat(expireDate, 'yyyyMMddHHmmss');

        // Tạo URL thanh toán
        const paymentUrl = vnpay.buildPaymentUrl({
            vnp_Amount: amount,
            vnp_IpAddr:
                req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.ip,
            vnp_TxnRef: payment._id.toString(),
            vnp_OrderInfo: `Thanh toan ve xem phim #${ticket.ticket_id}`,
            vnp_OrderType: ProductCode.Other,
            vnp_ReturnUrl: 'http://localhost:4200/confirmVNPay',
            vnp_Locale: VnpLocale.VN,
            vnp_ExpireDate: formattedExpireDate
        });

        return res.json({
            success: true,
            paymentUrl,
            payment: {
                payment,
                orderInfo: `Thanh toan ve xem phim #${ticket.ticket_id}`,
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
exports.handleVNPayIpn = async (req, res) => {
    try {
        const verify = vnpay.verifyIpnCall(req.query);
        if (!verify.isVerified) {
            return res.json(IpnFailChecksum);
        }

        // Lấy payment từ database
        const payment = await Payment.findById(verify.vnp_TxnRef);

        if (!payment) {
            return res.json(IpnOrderNotFound);
        }
        // Lấy ticket tương ứng để so sánh số tiền
        const ticket = await Ticket.findById(payment.ticket_id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
        }
        // Nếu số tiền thanh toán không khớp
        if (verify.vnp_Amount !== ticket.total_amount) {
            return res.json(IpnInvalidAmount);
        }
        // Nếu payment đã completed trước đó
        if (payment.status_order === 'completed') {
            return res.json(InpOrderAlreadyConfirmed);
        }
        payment.vnp_TransactionNo = verify.vnp_TransactionNo;
        payment.vnp_ResponseCode = verify.vnp_ResponseCode;
        payment.vnp_BankCode = verify.vnp_BankCode;
        payment.vnp_PayDate = new Date(verify.vnp_PayDate);

        if (verify.isSuccess) {
            payment.status_order = 'completed';

            // Cập nhật trạng thái ticket
            await Ticket.findByIdAndUpdate(payment.ticket_id, {
                status: 'confirmed'
            });
        } else {
            payment.status_order = 'failed';
        }


        /**
         * Sau khi xác thực đơn hàng thành công,
         * bạn có thể cập nhật trạng thái đơn hàng trong cơ sở dữ liệu
         */
        await payment.save(); // Hàm cập nhật trạng thái đơn hàng, bạn cần tự triển khai

        // Sau đó cập nhật trạng thái trở lại cho VNPay để họ biết bạn đã xác nhận đơn hàng
        return res.json(IpnSuccess);
    } catch (error) {
        /**
         * Xử lý các ngoại lệ
         * Ví dụ: dữ liệu không đủ, dữ liệu không hợp lệ, lỗi cập nhật cơ sở dữ liệu
         */
        console.log(`verify error: ${error}`);
        return res.json(IpnUnknownError);
    }
};
exports.verifyPayment = async (req, res) => {
    debugger
    try {
        const verify = vnpay.verifyReturnUrl(req.query);
        if (!verify.isVerified) {
            return res.status(400).json({ success: false, message: 'Sai checksum' });
        }
        console.log("Verify result:", verify);


        const payment = await Payment.findById(verify.vnp_TxnRef);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thanh toán' });
        }

        // Lấy ticket tương ứng để so sánh số tiền
        const ticket = await Ticket.findById(payment.ticket_id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
        }


        if (verify.vnp_Amount !== ticket.total_amount) {
            return res.status(400).json({ success: false, message: 'Số tiền không khớp với ticket' });
        }

        // Nếu payment đã completed trước đó
        if (payment.status_order === 'completed') {
            return res.json({ success: true, message: 'Đã xác nhận thanh toán trước đó' });
        }

        // Gán thông tin từ VNPay
        payment.vnp_TransactionNo = verify.vnp_TransactionNo;
        payment.vnp_ResponseCode = verify.vnp_ResponseCode;
        payment.vnp_BankCode = verify.vnp_BankCode;
        const payDateStr = verify.vnp_PayDate; // "20250424210435"
        const payDate = new Date(
            payDateStr.substring(0, 4),          // year
            parseInt(payDateStr.substring(4, 6)) - 1, // month (zero-based)
            payDateStr.substring(6, 8),          // day
            payDateStr.substring(8, 10),         // hour
            payDateStr.substring(10, 12),        // minute
            payDateStr.substring(12, 14)         // second
        );
        payment.vnp_PayDate = payDate;


        if (verify.isSuccess) {
            payment.status_order = 'completed';

            // Cập nhật trạng thái vé
            ticket.status = 'confirmed';
            await ticket.save();
        } else {
            payment.status_order = 'failed';
        }

        await payment.save();

        return res.json({
            success: true,
            message: 'Cập nhật thành công',
            status: payment.status_order
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

