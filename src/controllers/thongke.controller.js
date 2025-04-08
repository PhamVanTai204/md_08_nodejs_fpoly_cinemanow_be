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

};

module.exports = revenueController;