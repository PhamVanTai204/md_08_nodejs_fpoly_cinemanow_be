// SECTION: Cấu hình và khởi tạo VNPay

// LINK: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html - Tài liệu API VNPay
const { ProductCode, VnpLocale, dateFormat, consoleLogger, IpnFailChecksum,
    IpnOrderNotFound,
    IpnInvalidAmount,
    InpOrderAlreadyConfirmed,
    IpnUnknownError,
    IpnSuccess } = require('vnpay');
const { VNPay, ignoreLogger } = require('vnpay');
const Ticket = require('../models/ticket');
const Payment = require('../models/payment');
const ShowTime = require('../models/showTime');
const Seat = require('../models/seat');
const pusher = require('../utils/pusher');
// ANCHOR: Khởi tạo VNPay với thông tin cấu hình
const vnpay = new VNPay({
    // IMPORTANT: Thông tin xác thực VNPay
    tmnCode: 'HKN8S09W', // Mã TMN do VNPay cấp
    secureSecret: 'X3K9G4X8MJR4XGHMNR6YVUNUYIFJ9CPA', // Chuỗi bí mật bảo mật
    vnpayHost: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', // Đổi thành production khi deploy
    
    // WARNING: Đổi thành false khi triển khai production
    testMode: true, // Để true khi test, false khi chạy thật
    
    hashAlgorithm: 'SHA512',
    enableLog: true,
    loggerFn: console.log, // Ghi log ra console, có thể dùng ignoreLogger để tắt log

    // NOTE: Các endpoint API của VNPay
    endpoints: {
        paymentEndpoint: 'paymentv2/vpcpay.html',
        queryDrRefundEndpoint: 'merchant_webapi/api/transaction',
        getBankListEndpoint: 'qrpayauth/api/merchant/get_bank_list',
    },
});

// END-SECTION

// SECTION: API thanh toán VNPay

// ANCHOR: Lấy danh sách ngân hàng hỗ trợ
exports.getBankList = async (req, res) => {
    try {
        // NOTE: Gọi API của VNPay để lấy danh sách ngân hàng
        const bankList = await vnpay.getBankList();
        res.json(bankList);
    } catch (error) {
        // ERROR: Xử lý lỗi khi không thể lấy danh sách ngân hàng
        console.error('Lỗi lấy danh sách ngân hàng:', error);
        res.status(500).json({ error: 'Không thể lấy danh sách ngân hàng' });
    }
};

// STUB: Tạo biến ngày mai dùng cho API
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

// ANCHOR: Tạo URL thanh toán VNPay
exports.createPaymentUrl = async (req, res) => {
    try {
        // Lấy dữ liệu từ body của request
        const { ticket_id, amount } = req.body;
        
        // IMPORTANT: Kiểm tra vé tồn tại và chưa thanh toán
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
        
        // NOTE: Tạo payment_id duy nhất
        const payment_id = 'PAY' + Date.now();

        // NOTE: Tạo payment record trong database
        const payment = await Payment.create({
            payment_id,
            ticket_id: ticket._id,
            payment_method: 1, // 1 = VNPay
            status_order: 'pending'
        });
        
        // IMPORTANT: Tạo thời gian hết hạn cho URL thanh toán (15 phút)
        const expireDate = new Date(Date.now() + 15 * 60 * 1000); // 15 phút hết hạn
        const formattedExpireDate = dateFormat(expireDate, 'yyyyMMddHHmmss');

        // NOTE: Xác định Return URL dựa trên User-Agent của request
        let returnUrl = 'http://localhost:4200/confirmVNPay'; // Default for web

        // IMPORTANT: Kiểm tra User-Agent để phát hiện mobile app
        const userAgent = req.headers['user-agent'] || '';
        if (userAgent.toLowerCase().includes('mobile') || req.query.platform === 'mobile') {
            // URL ảo mà app mobile có thể xử lý, hoặc URL trên web mà webview mobile có thể xử lý
            returnUrl = 'https://cinemanow.vn/payment-success';
            console.log('Detected mobile client, using mobile return URL');
        }

        // DEBUG: Hiển thị URL trả về đang sử dụng
        console.log(`Using return URL: ${returnUrl} for user agent: ${userAgent.substring(0, 50)}...`);

        // IMPORTANT: Tạo URL thanh toán từ VNPay
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

        // NOTE: Trả về URL thanh toán cho client
        return res.json({
            success: true,
            paymentUrl,
            payment: {
                payment,
                orderInfo: `Thanh toan ve xem phim #${ticket.ticket_id}`,
                returnUrl: returnUrl,
            },
        });
    } catch (error) {
        // ERROR: Xử lý lỗi khi không thể tạo URL thanh toán
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo URL thanh toán VNPAY',
            error: error.message,
        });
    }
};

// ANCHOR: Xử lý callback IPN từ VNPay
exports.handleVNPayIpn = async (req, res) => {
    try {
        // IMPORTANT: Xác thực thông tin từ VNPay
        const verify = vnpay.verifyIpnCall(req.query);
        if (!verify.isVerified) {
            return res.json(IpnFailChecksum);
        }
        
        // NOTE: Tìm payment trong database
        const payment = await Payment.findById(verify.vnp_TxnRef);
        if (!payment) {
            return res.json(IpnOrderNotFound);
        }
        
        // NOTE: Tìm ticket tương ứng
        const ticket = await Ticket.findById(payment.ticket_id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
        }
        
        // WARNING: Kiểm tra số tiền thanh toán
        if (verify.vnp_Amount !== ticket.total_amount) {
            return res.json(IpnInvalidAmount);
        }
        
        // WARNING: Kiểm tra trạng thái payment
        if (payment.status_order === 'completed') {
            return res.json(InpOrderAlreadyConfirmed);
        }
        
        // NOTE: Cập nhật thông tin payment từ kết quả VNPay
        payment.vnp_TransactionNo = verify.vnp_TransactionNo;
        payment.vnp_ResponseCode = verify.vnp_ResponseCode;
        payment.vnp_BankCode = verify.vnp_BankCode;
        
        // IMPORTANT: Xử lý chuyển đổi định dạng ngày từ VNPay
        const payDateStr = verify.vnp_PayDate; // "20250424210435"
        let payDate = new Date(
            payDateStr.substring(0, 4),           // year
            parseInt(payDateStr.substring(4, 6)) - 1, // month (zero-based)
            payDateStr.substring(6, 8),           // day
            payDateStr.substring(8, 10),          // hour
            payDateStr.substring(10, 12),         // minute
            payDateStr.substring(12, 14)          // second
        );

        // NOTE: Chuyển sang giờ VN bằng cách cộng thêm 7 giờ
        payDate = new Date(payDate.getTime() + 7 * 60 * 60 * 1000);

        payment.vnp_PayDate = payDate;
        
        // IMPORTANT: Xử lý khi thanh toán thành công
        if (verify.isSuccess) {
            payment.status_order = 'completed';

            // Cập nhật trạng thái ticket
            await Ticket.findByIdAndUpdate(payment.ticket_id, {
                status: 'confirmed'
            });

            // ANCHOR: Cập nhật trạng thái ghế thành 'booked'
            if (ticket.seats && ticket.seats.length > 0) {
                const Seat = require('../models/seat');

                // Lấy danh sách ID ghế từ ticket
                const seatIds = ticket.seats.map(seat => seat.seat_id);

                // IMPORTANT: Cập nhật trạng thái ghế thành 'booked'
                await Seat.updateMany(
                    { _id: { $in: seatIds } },
                    { $set: { seat_status: 'booked', selected_by: null, selection_time: null } }
                );

                // DEBUG: Ghi log kết quả cập nhật ghế
                console.log(`IPN: Đã cập nhật ${seatIds.length} ghế thành 'booked'`);

                // IMPORTANT: Thông báo qua Pusher về việc cập nhật trạng thái ghế
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

                    // DEBUG: Ghi log kết quả gửi thông báo pusher
                    console.log(`IPN: Đã gửi thông báo Pusher để cập nhật trạng thái ghế cho phòng ${roomId}`);
                }
            }
        } else {
            payment.status_order = 'failed';
        }

        // NOTE: Lưu thông tin payment vào database
        await payment.save();

        // Trả về kết quả thành công cho VNPay
        return res.json(IpnSuccess);
    } catch (error) {
        // ERROR: Xử lý lỗi không xác định
        console.log(`verify error: ${error}`);
        return res.json(IpnUnknownError);
    }
};

// ANCHOR: Xác thực kết quả thanh toán
exports.verifyPayment = async (req, res) => {
    try {
        // IMPORTANT: Xác thực thông tin từ VNPay
        const verify = vnpay.verifyReturnUrl(req.query);
        if (!verify.isVerified) {
            return res.status(400).json({ success: false, message: 'Sai checksum' });
        }
        
        // DEBUG: Ghi log kết quả xác thực
        console.log("Verify result:", verify);

        // NOTE: Tìm payment trong database
        const payment = await Payment.findById(verify.vnp_TxnRef);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thanh toán' });
        }

        // NOTE: Tìm ticket tương ứng
        const ticket = await Ticket.findById(payment.ticket_id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
        }

        // WARNING: Kiểm tra số tiền
        if (verify.vnp_Amount !== ticket.total_amount) {
            return res.status(400).json({ success: false, message: 'Số tiền không khớp với ticket' });
        }

        // NOTE: Kiểm tra trạng thái payment
        if (payment.status_order === 'completed') {
            return res.json({ success: true, message: 'Đã xác nhận thanh toán trước đó', status: 'completed' });
        }

        // IMPORTANT: Xử lý cập nhật khi thanh toán thành công (code 00)
        if (verify.vnp_ResponseCode === '00') {
            payment.status_order = 'completed';
            payment.vnp_TransactionNo = verify.vnp_TransactionNo;
            payment.vnp_BankCode = verify.vnp_BankCode;
            payment.vnp_CardType = verify.vnp_CardType;
            payment.vnp_PayDate = verify.vnp_PayDate;
            payment.vnp_ResponseCode = verify.vnp_ResponseCode;
            await payment.save();

            // NOTE: Cập nhật trạng thái vé
            ticket.status = 'confirmed';
            await ticket.save();

            // DEBUG: Ghi log quá trình cập nhật ghế
            console.log("Đang cập nhật trạng thái ghế từ selecting thành booked...");

            // NOTE: Lấy danh sách seat_ids từ ticket
            const seatIds = ticket.seats.map(seat => seat.seat_id);

            // IMPORTANT: Lấy room_id từ showtime vì ticket không có trực tiếp room_id
            let roomId = null;
            try {
                
                const showtime = await ShowTime.findById(ticket.showtime_id);
                if (showtime) {
                    roomId = showtime.room_id;
                }
            } catch (err) {
                // ERROR: Ghi log lỗi khi lấy thông tin showtime
                console.error("Lỗi khi lấy thông tin showtime:", err);
            }

            // WARNING: Kiểm tra roomId có tồn tại không
            if (!roomId) {
                console.error("Không thể lấy được room_id từ showtime");
                return res.status(400).json({
                    success: false,
                    message: 'Không thể cập nhật ghế do thiếu thông tin phòng'
                });
            }

            // ANCHOR: Cập nhật trạng thái ghế và gửi thông báo
            try {
               

                // DEBUG: Ghi log thông tin seatIds
                console.log("Thông tin seat_ids cần cập nhật:", seatIds);

                // IMPORTANT: Cập nhật trạng thái ghế thành "booked"
                const updateResult = await Seat.updateMany(
                    { _id: { $in: seatIds } },
                    { seat_status: 'booked', selected_by: null, selection_time: null }
                );

                // DEBUG: Ghi log kết quả cập nhật ghế
                console.log(`Đã cập nhật ${updateResult.modifiedCount} ghế thành booked`);

                // IMPORTANT: Gửi thông báo qua Pusher về việc cập nhật ghế
                pusher.trigger(`room-${roomId}`, 'seats-booked', {
                    seat_ids: seatIds,
                    status: 'booked'
                });
            } catch (updateError) {
                // ERROR: Ghi log lỗi khi cập nhật trạng thái ghế
                console.error("Lỗi khi cập nhật trạng thái ghế:", updateError);
            }

            // NOTE: Trả về kết quả thành công
            return res.json({
                success: true,
                message: 'Thanh toán thành công',
                status: 'completed',
                data: ticket
            });
        }

        // NOTE: Lưu thông tin payment
        await payment.save();

        // NOTE: Trả về kết quả thất bại
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
        // ERROR: Xử lý lỗi khi xác thực thanh toán
        console.error(`Lỗi khi xác thực thanh toán: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi xác thực thanh toán',
            error: error.message
        });
    }
};

// IDEA: Thêm chức năng hoàn tiền cho vé đã thanh toán
// TODO: Thêm chức năng lấy lịch sử thanh toán của người dùng
// OPTIMIZE: Cải thiện cách xử lý và lưu trữ thông tin thanh toán 

// END-SECTION