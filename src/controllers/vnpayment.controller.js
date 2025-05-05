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

        // Xác định Return URL dựa trên User-Agent của request
        let returnUrl = 'http://localhost:4200/confirmVNPay'; // Default for web
        
        // Kiểm tra User-Agent để phát hiện mobile app
        const userAgent = req.headers['user-agent'] || '';
        if (userAgent.toLowerCase().includes('mobile') || req.query.platform === 'mobile') {
            // URL ảo mà app mobile có thể xử lý, hoặc URL trên web mà webview mobile có thể xử lý
            returnUrl = 'https://cinemanow.vn/payment-success';
            console.log('Detected mobile client, using mobile return URL');
        }

        console.log(`Using return URL: ${returnUrl} for user agent: ${userAgent.substring(0, 50)}...`);

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
            vnp_ReturnUrl: returnUrl,
            vnp_Locale: VnpLocale.VN,
            vnp_ExpireDate: formattedExpireDate
        });

        return res.json({
            success: true,
            paymentUrl,
            payment: {
                payment,
                orderInfo: `Thanh toan ve xem phim #${ticket.ticket_id}`,
                returnUrl: returnUrl,
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
        const payDateStr = verify.vnp_PayDate; // "20250424210435"
        const payDate = new Date(
            payDateStr.substring(0, 4),          // year
            parseInt(payDateStr.substring(4, 6)) - 1, // month (zero-based)
            payDateStr.substring(6, 8),          // day
            payDateStr.substring(8, 10),         // hour
            payDateStr.substring(10, 12),        // minute
            payDateStr.substring(12, 14)         // second
        );
        if (verify.isSuccess) {
            payment.status_order = 'completed';

            // Cập nhật trạng thái ticket
            await Ticket.findByIdAndUpdate(payment.ticket_id, {
                status: 'confirmed'
            });
            
            // Cập nhật trạng thái ghế thành 'booked'
            if (ticket.seats && ticket.seats.length > 0) {
                const Seat = require('../models/seat');
                
                // Lấy danh sách ID ghế từ ticket
                const seatIds = ticket.seats.map(seat => seat.seat_id);
                
                // Cập nhật trạng thái ghế thành 'booked'
                await Seat.updateMany(
                    { _id: { $in: seatIds } },
                    { $set: { seat_status: 'booked', selected_by: null, selection_time: null } }
                );
                
                console.log(`IPN: Đã cập nhật ${seatIds.length} ghế thành 'booked'`);
                
                // Thông báo qua Pusher về việc cập nhật trạng thái ghế
                const pusher = require('../utils/pusher');
                const showtime = await require('../models/showTime').findById(ticket.showtime_id);
                
                if (showtime && showtime.room_id) {
                    // Lấy room_id từ showtime
                    const roomId = showtime.room_id;
                    
                    // Gửi thông báo cập nhật nhiều ghế qua Pusher
                    pusher.trigger(`room-${roomId}`, 'seat-status-changed', {
                        type: 'multiple',
                        data: {
                            seat_ids: seatIds,
                            status: 'booked'
                        }
                    });
                    
                    console.log(`IPN: Đã gửi thông báo Pusher để cập nhật trạng thái ghế cho phòng ${roomId}`);
                }
            }
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
            return res.json({ success: true, message: 'Đã xác nhận thanh toán trước đó', status: 'completed' });
        }

        // Xử lý cập nhật khi thanh toán thành công
        if (verify.vnp_ResponseCode === '00') {
            payment.status_order = 'completed';
            payment.vnp_TransactionNo = verify.vnp_TransactionNo;
            payment.vnp_BankCode = verify.vnp_BankCode;
            payment.vnp_CardType = verify.vnp_CardType;
            payment.vnp_PayDate = verify.vnp_PayDate;
            payment.vnp_ResponseCode = verify.vnp_ResponseCode;
            await payment.save();

            // Cập nhật trạng thái vé
            ticket.status = 'confirmed';
            await ticket.save();

            console.log("Đang cập nhật trạng thái ghế từ selecting thành booked...");
            
            // Lấy danh sách seat_ids từ ticket
            const seatIds = ticket.seats.map(seat => seat.seat_id);
            
            // Lấy room_id từ showtime vì ticket không có trực tiếp room_id
            let roomId = null;
            try {
                const ShowTime = require('../models/showTime');
                const showtime = await ShowTime.findById(ticket.showtime_id);
                if (showtime) {
                    roomId = showtime.room_id;
                }
            } catch (err) {
                console.error("Lỗi khi lấy thông tin showtime:", err);
            }

            if (!roomId) {
                console.error("Không thể lấy được room_id từ showtime");
                return res.status(400).json({ 
                    success: false, 
                    message: 'Không thể cập nhật ghế do thiếu thông tin phòng'
                });
            }

            // Gọi hàm cập nhật trạng thái ghế thành "booked"
            try {
                const Seat = require('../models/seat');
                const pusher = require('../utils/pusher');
                
                // In ra log để xác định giá trị seatIds là gì
                console.log("Thông tin seat_ids cần cập nhật:", seatIds);
                
                // Cập nhật trạng thái ghế thành "booked" dựa trên _id thay vì seat_id
                const updateResult = await Seat.updateMany(
                    { _id: { $in: seatIds } },
                    { seat_status: 'booked', selected_by: null, selection_time: null }
                );
                
                console.log(`Đã cập nhật ${updateResult.modifiedCount} ghế thành booked`);
                
                // Gửi thông báo qua Pusher về việc cập nhật ghế
                pusher.trigger(`room-${roomId}`, 'seats-booked', {
                    seat_ids: seatIds,
                    status: 'booked'
                });
            } catch (updateError) {
                console.error("Lỗi khi cập nhật trạng thái ghế:", updateError);
            }

            return res.json({
                success: true, 
                message: 'Thanh toán thành công', 
                status: 'completed',
                data: ticket
            });
        }

        // Lưu thông tin payment
        await payment.save();

        // Trả về kết quả
        return res.json({ 
            success: true, 
            message: 'Thanh toán thất bại',
            status: 'failed',
            payment: {
                id: payment._id,
                status_order: payment.status_order,
                payment_method: payment.payment_method,
                ticket_id: payment.ticket_id
            }
        });
    } catch (error) {
        console.error(`Lỗi khi xác thực thanh toán: ${error.message}`);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi xác thực thanh toán',
            error: error.message 
        });
    }
};

