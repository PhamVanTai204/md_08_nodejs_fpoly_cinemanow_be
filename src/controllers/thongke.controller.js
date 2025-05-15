const Ticket = require('../models/ticket');
const Payment = require('../models/payment');
const mongoose = require('mongoose');

// SECTION: Controller quản lý thống kê doanh thu
const revenueController = {
    // ANCHOR: Lấy doanh thu theo phim
    getRevenueByMovie: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            // NOTE: Kiểm tra tham số đầu vào bắt buộc
            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            // IMPORTANT: Điều chỉnh ngày kết thúc để bao gồm cả ngày cuối trong khoảng thời gian
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            // NOTE: Truy vấn dữ liệu thanh toán và populate thông tin liên quan
            const payments = await Payment.find({
                vnp_PayDate: {
                    $gte: start,
                    $lte: end
                },
                status_order: 'completed'
            }).populate({
                path: 'ticket_id',
                populate: {
                    path: 'showtime_id',
                    populate: {
                        path: 'movie_id'
                    }
                }
            });

            // NOTE: Cấu trúc dữ liệu để thống kê theo phim
            const movieStats = {};

            // FIXME: Cần xử lý các trường hợp dữ liệu null/undefined tốt hơn
            payments.forEach(payment => {
                const ticket = payment.ticket_id;
                const showtime = ticket?.showtime_id;
                const movie = showtime?.movie_id;

                if (movie) {
                    const movieId = movie._id.toString();
                    if (!movieStats[movieId]) {
                        movieStats[movieId] = {
                            movie,
                            revenue: 0,
                            ticketCount: 0
                        };
                    }
                    movieStats[movieId].revenue += ticket.total_amount;
                    movieStats[movieId].ticketCount += 1;
                }
            });

            // STATS: Tính tổng doanh thu từ kết quả thống kê
            const result = Object.values(movieStats);
            const totalRevenue = result.reduce((sum, m) => sum + m.revenue, 0);

            res.json({
                dateRange: { startDate, endDate },
                totalRevenue,
                movieStats: result
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // ANCHOR: Lấy doanh thu theo rạp chiếu phim
    getRevenueByCinema: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            // NOTE: Kiểm tra tham số đầu vào bắt buộc
            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            // IMPORTANT: Điều chỉnh ngày kết thúc để bao gồm cả ngày cuối
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            // NOTE: Truy vấn dữ liệu thanh toán và populate thông tin rạp
            const payments = await Payment.find({
                vnp_PayDate: {
                    $gte: start,
                    $lte: end
                },
                status_order: 'completed'
            }).populate({
                path: 'ticket_id',
                populate: {
                    path: 'showtime_id',
                    populate: { path: 'cinema_id' }
                }
            });

            // NOTE: Cấu trúc dữ liệu để thống kê theo rạp
            const cinemaStats = {};

            // FIXME: Cần xử lý trường hợp dữ liệu null/undefined tốt hơn
            payments.forEach(payment => {
                const ticket = payment.ticket_id;
                const showtime = ticket?.showtime_id;
                const cinema = showtime?.cinema_id;

                if (cinema) {
                    const cinemaId = cinema._id.toString();
                    if (!cinemaStats[cinemaId]) {
                        cinemaStats[cinemaId] = {
                            cinema,
                            revenue: 0,
                            ticketCount: 0
                        };
                    }
                    cinemaStats[cinemaId].revenue += ticket.total_amount;
                    cinemaStats[cinemaId].ticketCount += 1;
                }
            });

            // STATS: Tính tổng doanh thu từ kết quả thống kê
            const result = Object.values(cinemaStats);
            const totalRevenue = result.reduce((sum, c) => sum + c.revenue, 0);

            res.json({
                dateRange: { startDate, endDate },
                totalRevenue,
                cinemaStats: result
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // ANCHOR: Lấy doanh thu theo khoảng thời gian
    getRevenueByDateRange: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            // NOTE: Kiểm tra tham số đầu vào bắt buộc
            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            // IMPORTANT: Điều chỉnh ngày kết thúc để bao gồm cả ngày cuối
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            // NOTE: Truy vấn dữ liệu thanh toán trong khoảng thời gian
            const payments = await Payment.find({
                vnp_PayDate: {
                    $gte: start,
                    $lte: end
                },
                status_order: 'completed'
            }).populate('ticket_id');

            // STATS: Tính tổng doanh thu từ các thanh toán
            const totalRevenue = payments.reduce((sum, payment) => {
                return sum + (payment.ticket_id?.total_amount || 0);
            }, 0);

            res.json({
                startDate,
                endDate,
                totalRevenue,
                paymentCount: payments.length,
                ticketCount: payments.length
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // ANCHOR: Lấy doanh thu theo ngày
    getRevenueByDay: async (req, res) => {
        try {
            const { year, month, day } = req.query;

            // NOTE: Kiểm tra tham số đầu vào bắt buộc
            if (!year || !month || !day) {
                return res.status(400).json({ message: 'Year, month and day are required' });
            }

            // IMPORTANT: Thiết lập khoảng thời gian cho một ngày cụ thể
            const startDate = new Date(year, month - 1, day);
            const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

            // NOTE: Truy vấn dữ liệu thanh toán trong ngày
            const payments = await Payment.find({
                vnp_PayDate: {
                    $gte: startDate,
                    $lte: endDate
                },
                status_order: 'completed'
            }).populate('ticket_id');

            // STATS: Tính tổng doanh thu cho ngày cụ thể
            const totalRevenue = payments.reduce((sum, payment) => {
                return sum + (payment.ticket_id?.total_amount || 0);
            }, 0);

            res.json({
                date: `${day}/${month}/${year}`,
                totalRevenue,
                paymentCount: payments.length,
                ticketCount: payments.length
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // ANCHOR: Lấy doanh thu theo tháng
    getRevenueByMonth: async (req, res) => {
        try {
            const { year, month } = req.query;

            // NOTE: Kiểm tra tham số đầu vào bắt buộc
            if (!year || !month) {
                return res.status(400).json({ message: 'Year and month are required' });
            }

            // IMPORTANT: Thiết lập khoảng thời gian cho một tháng cụ thể
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59, 999);

            // NOTE: Truy vấn dữ liệu thanh toán trong tháng
            const payments = await Payment.find({
                vnp_PayDate: {
                    $gte: startDate,
                    $lte: endDate
                },
                status_order: 'completed'
            }).populate('ticket_id');

            // STATS: Tính tổng doanh thu cho tháng cụ thể
            const totalRevenue = payments.reduce((sum, payment) => {
                return sum + (payment.ticket_id?.total_amount || 0);
            }, 0);

            res.json({
                year,
                month,
                totalRevenue,
                paymentCount: payments.length,
                ticketCount: payments.length
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // ANCHOR: Lấy doanh thu theo năm
    getRevenueByYear: async (req, res) => {
        try {
            const { year } = req.query;

            // NOTE: Kiểm tra tham số đầu vào bắt buộc
            if (!year) {
                return res.status(400).json({ message: 'Year is required' });
            }

            // IMPORTANT: Thiết lập khoảng thời gian cho một năm cụ thể
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

            // NOTE: Truy vấn dữ liệu thanh toán trong năm
            const payments = await Payment.find({
                vnp_PayDate: {
                    $gte: startDate,
                    $lte: endDate
                },
                status_order: 'completed'
            }).populate('ticket_id');

            // STATS: Tính tổng doanh thu cho năm cụ thể
            const totalRevenue = payments.reduce((sum, payment) => {
                return sum + (payment.ticket_id?.total_amount || 0);
            }, 0);

            // HIGHLIGHT: Phân tích doanh thu theo từng tháng trong năm
            const monthlyData = Array(12).fill(0).map((_, index) => {
                const monthPayments = payments.filter(payment =>
                    payment.vnp_PayDate.getMonth() === index
                );

                const monthRevenue = monthPayments.reduce((sum, payment) =>
                    sum + (payment.ticket_id?.total_amount || 0), 0);

                return {
                    month: index + 1,
                    revenue: monthRevenue,
                    paymentCount: monthPayments.length,
                    ticketCount: monthPayments.length
                };
            });

            res.json({
                year,
                totalRevenue,
                paymentCount: payments.length,
                ticketCount: payments.length,
                monthlyData
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // ANCHOR: Lấy thống kê doanh thu chi tiết
    // REVIEW: Phương thức này khá phức tạp, cần xem xét lại hiệu suất
    getDetailedRevenueStats: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            // NOTE: Kiểm tra tham số đầu vào bắt buộc
            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            // IMPORTANT: Điều chỉnh ngày kết thúc để bao gồm cả ngày cuối
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            // OPTIMIZE: Có thể tối ưu hóa truy vấn này để giảm độ phức tạp và tăng hiệu suất
            const payments = await Payment.find({
                vnp_PayDate: {
                    $gte: start,
                    $lte: end
                },
                status_order: 'completed'
            }).populate({
                path: 'ticket_id',
                populate: [
                    {
                        path: 'showtime_id',
                        populate: [
                            { path: 'movie_id' },
                            { path: 'cinema_id' }
                        ]
                    },
                    { path: 'user_id' }
                ]
            });

            // STATS: Tính tổng doanh thu
            const totalRevenue = payments.reduce((sum, payment) => {
                return sum + (payment.ticket_id?.total_amount || 0);
            }, 0);

            // SECTION: Nhóm dữ liệu theo phim
            const movies = {};
            payments.forEach(payment => {
                const ticket = payment.ticket_id;
                const movie = ticket?.showtime_id?.movie_id;

                if (movie) {
                    const movieId = movie._id.toString();
                    if (!movies[movieId]) {
                        movies[movieId] = {
                            movie,
                            revenue: 0,
                            ticketCount: 0
                        };
                    }
                    movies[movieId].revenue += ticket.total_amount;
                    movies[movieId].ticketCount += 1;
                }
            });

            // SECTION: Nhóm dữ liệu theo phương thức thanh toán
            const paymentMethods = {
                '0': { method: 'Tiền mặt', revenue: 0, paymentCount: 0 },
                '1': { method: 'Chuyển khoản', revenue: 0, paymentCount: 0 }
            };

            payments.forEach(payment => {
                const methodKey = payment.payment_method.toString();
                if (paymentMethods[methodKey]) {
                    paymentMethods[methodKey].revenue += payment.ticket_id?.total_amount || 0;
                    paymentMethods[methodKey].paymentCount += 1;
                }
            });

            // SECTION: Lấy danh sách người dùng chi tiêu nhiều nhất
            // TODO: Thêm bộ lọc để người dùng có thể tùy chỉnh số lượng người dùng hiển thị
            const users = {};
            payments.forEach(payment => {
                const user = payment.ticket_id?.user_id;
                if (user) {
                    const userId = user._id.toString();
                    if (!users[userId]) {
                        users[userId] = {
                            user,
                            spending: 0,
                            ticketCount: 0
                        };
                    }
                    users[userId].spending += payment.ticket_id.total_amount;
                    users[userId].ticketCount += 1;
                }
            });

            // HIGHLIGHT: Lấy 10 người dùng chi tiêu nhiều nhất
            const topUsers = Object.values(users)
                .sort((a, b) => b.spending - a.spending)
                .slice(0, 10);

            // IDEA: Có thể thêm phân tích theo thời gian trong ngày để xác định khung giờ bán vé cao điểm

            res.json({
                dateRange: { startDate, endDate },
                totalRevenue,
                totalPayments: payments.length,
                totalTickets: payments.length,
                movies: Object.values(movies),
                paymentMethods: Object.values(paymentMethods),
                topUsers
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

// WARNING: Đảm bảo các controller đã được kiểm tra kỹ trước khi triển khai production
module.exports = revenueController;