const Ticket = require('../models/ticket');
const User = require('../models/user');
const ShowTime = require('../models/showTime');
const Voucher = require('../models/voucher');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// Lấy tất cả ticket
exports.getAllTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find()
            .populate('user_id')
            .populate('showtime_id')
            .populate('voucher_id');
        res.json(createResponse(200, null, tickets));
    } catch (error) {
        console.error('Get all tickets error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách vé', null));
    }
};

// Lấy ticket theo ID
exports.getTicketById = async (req, res) => {
    try {
        const id = req.params.id;

        // Kiểm tra ID hợp lệ
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID vé không hợp lệ', null));
        }

        const ticket = await Ticket.findById(id)
            .populate('user_id')
            .populate('showtime_id')
            .populate('voucher_id');

        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé', null));
        }

        res.json(createResponse(200, null, ticket));
    } catch (error) {
        console.error('Get ticket by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin vé', null));
    }
};

// Tạo ticket mới
exports.createTicket = async (req, res) => {
    try {
        const { ticket_id, user_id, showtime_id, voucher_id, total_amount } = req.body;

        // Kiểm tra đầy đủ thông tin
        if (!ticket_id || !user_id || !showtime_id || !total_amount) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // Kiểm tra ticket_id đã tồn tại
        const existingTicket = await Ticket.findOne({ ticket_id });
        if (existingTicket) {
            return res.status(400).json(createResponse(400, 'Mã vé đã tồn tại', null));
        }

        // Kiểm tra user tồn tại
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json(createResponse(400, 'ID người dùng không hợp lệ', null));
        }
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng', null));
        }

        // Kiểm tra showtime tồn tại
        if (!mongoose.Types.ObjectId.isValid(showtime_id)) {
            return res.status(400).json(createResponse(400, 'ID suất chiếu không hợp lệ', null));
        }
        const showtime = await ShowTime.findById(showtime_id);
        if (!showtime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }

        // Kiểm tra voucher tồn tại nếu có
        if (voucher_id && !mongoose.Types.ObjectId.isValid(voucher_id)) {
            return res.status(400).json(createResponse(400, 'ID voucher không hợp lệ', null));
        }

        const newTicket = new Ticket({
            ticket_id,
            user_id,
            showtime_id,
            voucher_id,
            total_amount
        });

        const savedTicket = await newTicket.save();
        const populatedTicket = await Ticket.findById(savedTicket._id)
            .populate('user_id')
            .populate('showtime_id')
            .populate('voucher_id');

        res.status(201).json(createResponse(201, 'Tạo vé thành công', populatedTicket));
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo vé', null));
    }
};

// Cập nhật ticket
exports.updateTicket = async (req, res) => {
    try {
        const { voucher_id, total_amount, status } = req.body;
        const id = req.params.id;

        // Kiểm tra ID hợp lệ
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID vé không hợp lệ', null));
        }

        // Kiểm tra ticket tồn tại
        const ticket = await Ticket.findById(id);
        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé', null));
        }

        // Kiểm tra voucher nếu có cập nhật
        if (voucher_id) {
            if (!mongoose.Types.ObjectId.isValid(voucher_id)) {
                return res.status(400).json(createResponse(400, 'ID voucher không hợp lệ', null));
            }
            ticket.voucher_id = voucher_id;
        }

        if (total_amount !== undefined) {
            ticket.total_amount = total_amount;
        }

        // Kiểm tra status nếu có cập nhật
        if (status) {
            const validStatuses = ['pending', 'confirmed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json(createResponse(400, 'Trạng thái vé không hợp lệ', null));
            }
            ticket.status = status;
        }

        const updatedTicket = await ticket.save();

        // Populate thông tin liên quan
        const populatedTicket = await Ticket.findById(updatedTicket._id)
            .populate('user_id')
            .populate('showtime_id')
            .populate('voucher_id');

        res.json(createResponse(200, 'Cập nhật vé thành công', populatedTicket));
    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật vé', null));
    }
};

// Xóa ticket
exports.deleteTicket = async (req, res) => {
    try {
        const id = req.params.id;

        // Kiểm tra ID hợp lệ
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID vé không hợp lệ', null));
        }

        const ticket = await Ticket.findById(id);
        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé', null));
        }

        await Ticket.deleteOne({ _id: id });
        res.json(createResponse(200, 'Xóa vé thành công', null));
    } catch (error) {
        console.error('Delete ticket error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa vé', null));
    }
}; 