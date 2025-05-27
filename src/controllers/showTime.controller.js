const express = require('express');
const ShowTime = require('../models/showTime'); // Import model suất chiếu
const Film = require('../models/film'); // Import model phim
const Room = require('../models/room');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');
const Cinema = require('../models/cinema');

// SECTION: API quản lý suất chiếu phim
// LINK: https://mongoosejs.com/docs/populate.html - Tham khảo cách sử dụng populate trong Mongoose

exports.getShowTimesByMovieAndCinemaGroupedByDate = async (req, res) => {
    try {
        const { movie_id, cinema_id } = req.query;

        if (!mongoose.Types.ObjectId.isValid(movie_id) || !mongoose.Types.ObjectId.isValid(cinema_id)) {
            return res.status(400).json(createResponse(400, 'ID phim hoặc ID rạp không hợp lệ', null));
        }

        const now = new Date();

        // Lấy tất cả suất chiếu
        const showTimes = await ShowTime.find({
            movie_id,
            cinema_id
        })

            .sort({ show_date: 1, start_time: 1 });

        // Lọc theo end_time
        const validShowTimes = showTimes.filter(show => {
            const showEndDateTime = new Date(show.show_date);
            const [endHour, endMinute] = show.end_time.split(':').map(Number);
            showEndDateTime.setHours(endHour, endMinute, 0, 0);

            return showEndDateTime > now;
        });

        if (!validShowTimes.length) {
            return res.status(404).json(createResponse(404, 'Không có suất chiếu nào còn hiệu lực', null));
        }

        // Nhóm theo ngày
        const grouped = {};
        for (const show of validShowTimes) {
            const dateKey = show.show_date.toISOString().split('T')[0];
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(show);
        }

        const result = Object.keys(grouped).map(date => ({
            date,
            showtimes: grouped[date]
        }));

        res.json(createResponse(200, null, result));
    } catch (error) {
        console.error('Lỗi khi lấy suất chiếu:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách suất chiếu theo ngày', null));
    }
};


// ANCHOR: Lấy tất cả suất chiếu
exports.getAllShowTimes = async (req, res) => {
    try {
        // NOTE: Sử dụng populate để lấy thông tin phim và phòng chiếu
        const showTimes = await ShowTime.find()
            .populate('movie_id')
            .populate('room_id');
        res.json(createResponse(200, null, showTimes));
    } catch (error) {
        console.error('Get all show times error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách suất chiếu', null));
    }
};

// ANCHOR: Lấy suất chiếu theo ID
exports.getShowTimeById = async (req, res) => {
    try {
        const id = req.params.id;

        // IMPORTANT: Kiểm tra tính hợp lệ của ID trước khi truy vấn
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID suất chiếu không hợp lệ', null));
        }

        const showTime = await ShowTime.findById(id)
            .populate('movie_id')
            .populate('room_id');

        // NOTE: Kiểm tra nếu không tìm thấy suất chiếu
        if (!showTime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }

        res.json(createResponse(200, null, showTime));
    } catch (error) {
        console.error('Get show time by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin suất chiếu', null));
    }
};

// ANCHOR: API Mobile - Lấy suất chiếu theo ID phim
exports.getShowTimesByMovieId = async (req, res) => {
    try {
        const movie_id = req.params.movie_id;

        // IMPORTANT: Kiểm tra tính hợp lệ của ID phim
        if (!mongoose.Types.ObjectId.isValid(movie_id)) {
            return res.status(400).json(createResponse(400, 'ID phim không hợp lệ', null));
        }

        // NOTE: Sử dụng populate để lấy thông tin chi tiết và sắp xếp theo thời gian bắt đầu
        const showTimes = await ShowTime.find({ movie_id })
            .populate('movie_id')
            .populate('room_id')
            .populate('cinema_id')
            .sort({ start_time: 1 }); // Sắp xếp theo thời gian bắt đầu

        if (!showTimes.length) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu cho phim này', null));
        }

        res.json(createResponse(200, null, showTimes));
    } catch (error) {
        console.error('Get show times by movie id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách suất chiếu theo phim', null));
    }
};

// STUB: Hàm tạo mã suất chiếu ngẫu nhiên
// NOTE: Sử dụng Math.random() để tạo mã ngẫu nhiên dạng ST + 5 ký tự
function generateShowTimeId() {
    const random = Math.random().toString(36).substr(2, 5).toUpperCase(); // VD: "9A7C1"
    return `ST${random}`;
}

// ANCHOR: Tạo suất chiếu mới
// ANCHOR: Tạo suất chiếu mới với validation nâng cao
exports.createShowTime = async (req, res) => {
    try {
        const { movie_id, room_id, cinema_id, start_time, end_time, show_date } = req.body;

        // NOTE: Tự động sinh showtime_id
        const showtime_id = generateShowTimeId();

        // IMPORTANT: Kiểm tra đầy đủ thông tin đầu vào
        if (!movie_id || !room_id || !cinema_id || !start_time || !end_time || !show_date) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // FIXME: Cần xử lý trường hợp sinh mã trùng lặp
        // NOTE: Kiểm tra showtime_id đã tồn tại
        const existingShowTime = await ShowTime.findOne({ showtime_id });
        if (existingShowTime) {
            return res.status(400).json(createResponse(400, 'Mã suất chiếu đã tồn tại', null));
        }

        // IMPORTANT: Xử lý định dạng ngày tháng
        // NOTE: Chuyển đổi định dạng ngày DD/MM/YYYY thành YYYY-MM-DD
        let formattedDate;
        try {
            const [day, month, year] = show_date.split('/');
            formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

            // WARNING: Kiểm tra ngày hợp lệ
            if (!isValidDate(formattedDate)) {
                return res.status(400).json(createResponse(400, 'Ngày tháng không hợp lệ', null));
            }
        } catch (error) {
            return res.status(400).json(createResponse(400, 'Định dạng ngày tháng không hợp lệ. Vui lòng sử dụng định dạng DD/MM/YYYY', null));
        }

        // IMPORTANT: Kiểm tra tính hợp lệ của các ID
        // NOTE: Kiểm tra movie_id hợp lệ
        if (!mongoose.Types.ObjectId.isValid(movie_id)) {
            return res.status(400).json(createResponse(400, 'ID phim không hợp lệ', null));
        }

        // NOTE: Kiểm tra room_id hợp lệ
        if (!mongoose.Types.ObjectId.isValid(room_id)) {
            return res.status(400).json(createResponse(400, 'ID phòng chiếu không hợp lệ', null));
        }

        // NOTE: Kiểm tra cinema_id hợp lệ
        if (!mongoose.Types.ObjectId.isValid(cinema_id)) {
            return res.status(400).json(createResponse(400, 'ID rạp không hợp lệ', null));
        }

        // FEATURE: Validation thời gian start_time và end_time
        // NOTE: Kiểm tra end_time phải sau start_time
        if (!isValidTimeRange(start_time, end_time)) {
            return res.status(400).json(createResponse(400, 'Thời gian kết thúc phải sau thời gian bắt đầu', null));
        }

        // FEATURE: Kiểm tra trùng lịch suất chiếu
        // NOTE: Tìm các suất chiếu cùng phòng, cùng ngày
        // const conflictingShowTimes = await ShowTime.find({
        //     room_id: room_id,
        //     show_date: formattedDate,
        //     // OPTIMIZE: Chỉ tìm các suất chiếu có thời gian trùng lặp
        //     $or: [
        //         // Trường hợp 1: start_time mới nằm trong khoảng thời gian của suất chiếu cũ
        //         {
        //             $and: [
        //                 { start_time: { $lte: start_time } },
        //                 { end_time: { $gt: start_time } }
        //             ]
        //         },
        //         // Trường hợp 2: end_time mới nằm trong khoảng thời gian của suất chiếu cũ
        //         {
        //             $and: [
        //                 { start_time: { $lt: end_time } },
        //                 { end_time: { $gte: end_time } }
        //             ]
        //         },
        //         // Trường hợp 3: suất chiếu mới bao trùm suất chiếu cũ
        //         {
        //             $and: [
        //                 { start_time: { $gte: start_time } },
        //                 { end_time: { $lte: end_time } }
        //             ]
        //         }
        //     ]
        // });

        // // WARNING: Nếu có trùng lịch thì báo lỗi
        // if (conflictingShowTimes.length > 0) {
        //     return res.status(400).json(createResponse(400, 'Suất chiếu bị trùng lịch với suất chiếu khác trong cùng phòng', null));
        // }

        // NOTE: Tạo đối tượng suất chiếu mới
        const newShowTime = new ShowTime({
            showtime_id,
            movie_id,
            room_id,
            cinema_id,
            start_time,
            end_time,
            show_date: formattedDate
        });

        // DONE: Lưu suất chiếu vào cơ sở dữ liệu
        const savedShowTime = await newShowTime.save();

        // NOTE: Trả về suất chiếu đã được populate đầy đủ thông tin
        const populatedShowTime = await ShowTime.findById(savedShowTime._id)
            .populate('movie_id')
            .populate('room_id')
            .populate('cinema_id');

        res.status(201).json(createResponse(201, 'Tạo suất chiếu thành công', populatedShowTime));
    } catch (error) {
        console.error('Create show time error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo suất chiếu', null));
    }
};

// FUNCTIONALITY: Hàm kiểm tra thời gian hợp lệ
// NOTE: So sánh start_time và end_time (định dạng HH:MM)
function isValidTimeRange(startTime, endTime) {
    try {
        // NOTE: Chuyển đổi thời gian thành phút để so sánh
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        
        // NOTE: end_time phải lớn hơn start_time
        return endMinutes > startMinutes;
    } catch (error) {
        // DEBUG: Log lỗi nếu định dạng thời gian không hợp lệ
        console.error('Invalid time format:', error);
        return false;
    }
}

// FUNCTIONALITY: Chuyển đổi thời gian HH:MM thành phút
// NOTE: Ví dụ: "07:30" -> 450 phút
function timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // SECURITY: Kiểm tra định dạng thời gian hợp lệ
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error('Invalid time format');
    }
    
    return hours * 60 + minutes;
}

// STUB: Hàm kiểm tra ngày hợp lệ
// NOTE: Sử dụng Date constructor để kiểm tra tính hợp lệ của ngày tháng
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// ANCHOR: Cập nhật suất chiếu
exports.updateShowTime = async (req, res) => {
    try {
        const {
            showtime_id,
            movie_id,
            room_id,
            cinema_id,
            start_time,
            end_time,
            show_date
        } = req.body;

        const id = req.params.id;

        // IMPORTANT: Kiểm tra tính hợp lệ của ID suất chiếu
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID suất chiếu không hợp lệ', null));
        }

        // NOTE: Tìm kiếm suất chiếu cần cập nhật
        const showTime = await ShowTime.findById(id);
        if (!showTime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }

        // NOTE: Cập nhật các trường nếu được truyền lên
        // FIXME: Cần kiểm tra tính hợp lệ của từng trường trước khi cập nhật
        if (showtime_id) showTime.showtime_id = showtime_id;
        if (movie_id) showTime.movie_id = movie_id;
        if (room_id) showTime.room_id = room_id;
        if (cinema_id) showTime.cinema_id = cinema_id;
        if (start_time) showTime.start_time = start_time;
        if (end_time) showTime.end_time = end_time;
        if (show_date) {
            try {
                const [day, month, year] = show_date.split('/');
                const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

                if (!isValidDate(formattedDate)) {
                    return res.status(400).json(createResponse(400, 'Ngày tháng không hợp lệ', null));
                }

                showTime.show_date = formattedDate;
            } catch (error) {
                return res.status(400).json(createResponse(400, 'Định dạng ngày tháng không hợp lệ. Vui lòng sử dụng định dạng DD/MM/YYYY', null));
            }
        }

        // DONE: Lưu thông tin đã cập nhật
        const updatedShowTime = await showTime.save();

        // NOTE: Trả về suất chiếu đã được populate đầy đủ thông tin
        const populated = await ShowTime.findById(updatedShowTime._id)
            .populate('movie_id')
            .populate('room_id')
            .populate('cinema_id');

        res.json(createResponse(200, 'Cập nhật suất chiếu thành công', populated));
    } catch (error) {
        console.error('Update show time error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật suất chiếu', null));
    }
};

// ANCHOR: Xóa suất chiếu
exports.deleteShowTime = async (req, res) => {
    try {
        const id = req.params.id;

        // IMPORTANT: Kiểm tra tính hợp lệ của ID suất chiếu
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID suất chiếu không hợp lệ', null));
        }

        // NOTE: Tìm kiếm suất chiếu cần xóa
        const showTime = await ShowTime.findById(id);
        if (!showTime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }

        // DONE: Xóa suất chiếu
        await ShowTime.deleteOne({ _id: id });
        res.json(createResponse(200, 'Xóa suất chiếu thành công', null));
    } catch (error) {
        console.error('Delete show time error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa suất chiếu', null));
    }
};

// ANCHOR: API Mobile - Lấy suất chiếu theo phim và location
// HIGHLIGHT: API này phức tạp hơn vì cần kết hợp nhiều collection
exports.getShowTimesByMovieLocation = async (req, res) => {
    try {
        const movie_id = req.params.movie_id;
        const { location } = req.query;

        // IMPORTANT: Kiểm tra tính hợp lệ của ID phim
        if (!mongoose.Types.ObjectId.isValid(movie_id)) {
            return res.status(400).json(createResponse(400, 'ID phim không hợp lệ', null));
        }

        // SECTION: Lấy danh sách rạp theo location
        // NOTE: Tìm các rạp theo địa điểm
        const cinemas = await Cinema.find({ location });
        if (!cinemas.length) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp tại địa điểm này', null));
        }

        const cinemaIds = cinemas.map(cinema => cinema._id);

        // SECTION: Lấy danh sách phòng theo rạp
        // NOTE: Tìm các phòng thuộc các rạp đã lọc
        const rooms = await Room.find({ cinema_id: { $in: cinemaIds } });
        const roomIds = rooms.map(room => room._id);

        // SECTION: Lấy suất chiếu theo phim và phòng
        // NOTE: Tìm các suất chiếu của phim trong các phòng đã lọc
        const showTimes = await ShowTime.find({
            movie_id,
            room_id: { $in: roomIds }
        })
            .populate('movie_id')
            .populate({
                path: 'room_id',
                populate: {
                    path: 'cinema_id'
                }
            })
            .sort({ start_time: 1 });

        if (!showTimes.length) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu tại địa điểm này', null));
        }

        // HIGHLIGHT: Nhóm suất chiếu theo rạp để dễ hiển thị
        // OPTIMIZE: Có thể cải thiện hiệu suất bằng cách sử dụng aggregation framework
        const result = cinemas.map(cinema => ({
            cinema_id: cinema._id,
            cinema_name: cinema.name,
            cinema_address: cinema.address,
            showtimes: showTimes.filter(
                showtime => showtime.room_id.cinema_id._id.toString() === cinema._id.toString()
            )
        })).filter(item => item.showtimes.length > 0);

        res.json(createResponse(200, null, result));
    } catch (error) {
        console.error('Get show times by location error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách suất chiếu', null));
    }
};

// TODO: Bổ sung API lấy suất chiếu theo ngày
// IDEA: Thêm tính năng đề xuất suất chiếu phổ biến dựa trên lịch sử đặt vé
// IDEA: Thêm kiểm tra trùng lịch khi tạo suất chiếu mới
// OPTIMIZE: Cần tối ưu hóa truy vấn khi hệ thống có nhiều dữ liệu