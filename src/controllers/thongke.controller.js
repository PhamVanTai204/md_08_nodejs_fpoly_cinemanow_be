const Ticket = require('../models/ticket');
const Payment = require('../models/payment');
const mongoose = require('mongoose');

const revenueController = {
    // Get revenue by movie
    getRevenueByMovie: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            const payments = await Payment.find({
                vnp_PayDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
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

            const movieStats = {};

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

    // Get revenue by cinema
    getRevenueByCinema: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            const payments = await Payment.find({
                vnp_PayDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                },
                status_order: 'completed'
            }).populate({
                path: 'ticket_id',
                populate: {
                    path: 'showtime_id',
                    populate: { path: 'cinema_id' }
                }
            });

            const cinemaStats = {};

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

    // Get revenue by date range
    getRevenueByDateRange: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            const payments = await Payment.find({
                vnp_PayDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                },
                status_order: 'completed'
            }).populate('ticket_id');

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

    // Get revenue by day
    getRevenueByDay: async (req, res) => {
        try {
            const { year, month, day } = req.query;

            if (!year || !month || !day) {
                return res.status(400).json({ message: 'Year, month and day are required' });
            }

            const startDate = new Date(year, month - 1, day);
            const endDate = new Date(year, month - 1, day, 23, 59, 59);

            const payments = await Payment.find({
                vnp_PayDate: {
                    $gte: startDate,
                    $lte: endDate
                },
                status_order: 'completed'
            }).populate('ticket_id');

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

    // Get revenue by month
    getRevenueByMonth: async (req, res) => {
        try {
            const { year, month } = req.query;

            if (!year || !month) {
                return res.status(400).json({ message: 'Year and month are required' });
            }

            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            const payments = await Payment.find({
                vnp_PayDate: {
                    $gte: startDate,
                    $lte: endDate
                },
                status_order: 'completed'
            }).populate('ticket_id');

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

    // Get revenue by year
    getRevenueByYear: async (req, res) => {
        try {
            const { year } = req.query;

            if (!year) {
                return res.status(400).json({ message: 'Year is required' });
            }

            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31, 23, 59, 59);

            const payments = await Payment.find({
                vnp_PayDate: {
                    $gte: startDate,
                    $lte: endDate
                },
                status_order: 'completed'
            }).populate('ticket_id');

            const totalRevenue = payments.reduce((sum, payment) => {
                return sum + (payment.ticket_id?.total_amount || 0);
            }, 0);

            // Group by month
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

    // Get detailed revenue statistics
    getDetailedRevenueStats: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            const payments = await Payment.find({
                vnp_PayDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
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

            // Calculate total revenue
            const totalRevenue = payments.reduce((sum, payment) => {
                return sum + (payment.ticket_id?.total_amount || 0);
            }, 0);

            // Group by movie
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

            // Group by payment method
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

            // Get top users
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

            const topUsers = Object.values(users)
                .sort((a, b) => b.spending - a.spending)
                .slice(0, 10);

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

module.exports = revenueController;