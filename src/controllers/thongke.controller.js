const Ticket = require('../models/ticket');
const Payment = require('../models/payment');
const mongoose = require('mongoose');

const revenueController = {
    // Get revenue by date range
    getRevenueByDateRange: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            const payments = await Payment.find({
                payment_time: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                },
                status_order: 'completed'
            }).populate('ticket_id');

            const ticketIds = payments.map(payment => payment.ticket_id._id);
            const tickets = await Ticket.find({
                _id: { $in: ticketIds }
            });

            const totalRevenue = tickets.reduce((sum, ticket) => sum + ticket.total_amount, 0);

            res.json({
                startDate,
                endDate,
                totalRevenue,
                paymentCount: payments.length,
                ticketCount: tickets.length
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
                payment_time: {
                    $gte: startDate,
                    $lte: endDate
                },
                status_order: 'completed'
            }).populate('ticket_id');

            const ticketIds = payments.map(payment => payment.ticket_id._id);
            const tickets = await Ticket.find({
                _id: { $in: ticketIds }
            });

            const totalRevenue = tickets.reduce((sum, ticket) => sum + ticket.total_amount, 0);

            res.json({
                date: `${day}/${month}/${year}`,
                totalRevenue,
                paymentCount: payments.length,
                ticketCount: tickets.length
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
                payment_time: {
                    $gte: startDate,
                    $lte: endDate
                },
                status_order: 'completed'
            }).populate('ticket_id');

            const ticketIds = payments.map(payment => payment.ticket_id._id);
            const tickets = await Ticket.find({
                _id: { $in: ticketIds }
            });

            const totalRevenue = tickets.reduce((sum, ticket) => sum + ticket.total_amount, 0);

            res.json({
                year,
                month,
                totalRevenue,
                paymentCount: payments.length,
                ticketCount: tickets.length
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
                payment_time: {
                    $gte: startDate,
                    $lte: endDate
                },
                status_order: 'completed'
            }).populate('ticket_id');

            const totalRevenue = payments.reduce((sum, payment) => sum + payment.ticket_id.total_amount, 0);

            // Group by month
            const monthlyData = Array(12).fill(0).map((_, index) => {
                const monthPayments = payments.filter(payment =>
                    payment.payment_time.getMonth() === index
                );

                const monthRevenue = monthPayments.reduce((sum, payment) => sum + payment.ticket_id.total_amount, 0);

                return {
                    month: index + 1,
                    revenue: monthRevenue,
                    paymentCount: monthPayments.length,
                    ticketCount: monthPayments.length // Assuming one payment corresponds to one ticket in this context
                };
            });

            res.json({
                year,
                totalRevenue,
                paymentCount: payments.length,
                ticketCount: payments.length, // Assuming one payment corresponds to one ticket
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
                payment_time: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                },
                status_order: 'completed'
            }).populate({
                path: 'ticket_id',
                populate: [
                    { path: 'showtime_id', populate: { path: 'movie_id' } },
                    { path: 'user_id' }
                ]
            });

            const ticketIds = payments.map(payment => payment.ticket_id?._id).filter(id => id);
            const tickets = await Ticket.find({
                _id: { $in: ticketIds }
            }).populate('seats.seat_id user_id showtime_id') // Populate showtime_id trước
                .populate({ // Sau đó populate movie_id thông qua showtime_id
                    path: 'showtime_id',
                    populate: { path: 'movie_id' }
                });
            // Calculate total revenue
            const totalRevenue = tickets.reduce((sum, ticket) => sum + (ticket?.total_amount || 0), 0);

            // Group by movie
            const movies = {};
            tickets.forEach(ticket => {
                const movieId = ticket?.showtime_id?.movie_id?._id;
                if (movieId) {
                    if (!movies[movieId]) {
                        movies[movieId] = {
                            movie: ticket.showtime_id.movie_id,
                            revenue: 0,
                            ticketCount: 0
                        };
                    }
                    movies[movieId].revenue += ticket.total_amount;
                    movies[movieId].ticketCount += 1;
                }
            });

            // Group by payment method
            const paymentMethods = {};
            payments.forEach(payment => {
                const methodId = payment.payment_method_id?.toString();
                if (methodId) {
                    if (!paymentMethods[methodId]) {
                        paymentMethods[methodId] = {
                            methodId,
                            revenue: 0,
                            paymentCount: 0
                        };
                    }
                    const ticket = tickets.find(t => t?._id?.equals(payment.ticket_id?._id));
                    if (ticket) {
                        paymentMethods[methodId].revenue += ticket.total_amount;
                        paymentMethods[methodId].paymentCount += 1;
                    }
                }
            });

            // Get top users
            const users = {};
            tickets.forEach(ticket => {
                const userId = ticket?.user_id?._id?.toString();
                if (userId) {
                    if (!users[userId]) {
                        users[userId] = {
                            user: ticket.user_id,
                            spending: 0,
                            ticketCount: 0
                        };
                    }
                    users[userId].spending += ticket.total_amount;
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
                totalTickets: tickets.length,
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