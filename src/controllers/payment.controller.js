const mongoose = require('mongoose');
const Payment = require('../models/payment');
const Ticket = require('../models/ticket');
const createResponse = require('../utils/responseHelper');
exports.getAllPayments = async (req, res) => {
    try {
        let { page, limit, search } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        const matchStage = {};

        if (search) {
            matchStage['ticket_id.user_id.email'] = { $regex: search, $options: 'i' };
        }

        // Aggregation pipeline cho phép tìm theo nested field (user.email)
        const aggregate = Payment.aggregate([
            {
                $lookup: {
                    from: 'tickets',
                    localField: 'ticket_id',
                    foreignField: '_id',
                    as: 'ticket'
                }
            },
            { $unwind: '$ticket' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'ticket.user_id',
                    foreignField: '_id',
                    as: 'ticket.user'
                }
            },
            { $unwind: '$ticket.user' },
            {
                $match: search ? { 'ticket.user.email': { $regex: search, $options: 'i' } } : {}
            },
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    total: [
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        const result = await aggregate.exec();

        const payments = result[0].data;
        const totalPayments = result[0].total[0]?.count || 0;
        const totalPages = Math.ceil(totalPayments / limit);

        res.status(200).json(createResponse(200, null, {
            payments,
            totalPayments,
            totalPages,
            currentPage: page,
            pageSize: limit
        }));
    } catch (error) {
        console.error(error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách thanh toán', error.message));
    }
};


