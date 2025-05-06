const Cinema = require('../models/cinema');
const ShowTime = require('../models/showTime');
const Film = require('../models/film');
const Seat = require('../models/seat');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// Middleware kiểm tra ID hợp lệ
const validateId = (req, res, next) => {
    if (!req.params.id) {
        return res.status(400).json(createResponse(400, 'Thiếu ID rạp phim', null));
    }
    next();
};

// Tìm kiếm rạp phim theo tên hoặc địa điểm
exports.searchCinema = async (req, res) => {
    try {
        const { query } = req.query;

        // Nếu không có query, trả về danh sách trống
        if (!query) {
            return res.status(400).json(createResponse(400, 'Vui lòng nhập tên hoặc địa điểm rạp phim để tìm kiếm', null));
        }

        // Tìm kiếm rạp phim theo tên hoặc địa điểm chứa từ khóa (không phân biệt hoa thường)
        const searchQuery = {
            $or: [
                { cinema_name: new RegExp(query, 'i') },
                { location: new RegExp(query, 'i') }
            ]
        };
        const cinemas = await Cinema.find(searchQuery);

        res.status(200).json(createResponse(200, null, cinemas));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi tìm kiếm rạp phim', error.message));
    }
};

// Lấy danh sách rạp phim
exports.getCinema = async (req, res) => {
    try {
        let { page, limit } = req.query;

        // Chuyển đổi giá trị thành số nguyên và đặt mặc định nếu không có giá trị
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // Lấy danh sách rạp phim với phân trang
        const cinemas = await Cinema.find()
            .skip(skip)
            .limit(limit);

        // Đếm tổng số rạp phim để tính tổng số trang
        const totalCinemas = await Cinema.countDocuments();
        const totalPages = Math.ceil(totalCinemas / limit);

        res.status(200).json(createResponse(200, null, {
            cinemas,
            totalCinemas,
            totalPages,
            currentPage: page,
            pageSize: limit
        }));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách rạp phim', error.message));
    }
};

// Lấy rạp phim theo ID
exports.getCinemaId = async (req, res) => {
    try {
        const cinema = await Cinema.findById(req.params.id);
        if (!cinema) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp phim', null));
        }
        res.status(200).json(createResponse(200, null, cinema));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy rạp phim', error.message));
    }
};

// Thêm rạp phim
exports.addCinema = async (req, res) => {
    const { cinema_name, location } = req.body;

    if (!cinema_name || !location) {
        return res.status(400).json(createResponse(400, 'Thiếu thông tin bắt buộc', null));
    }

    try {
        const cinema = new Cinema({
            cinema_name,
            location
        });

        await cinema.save();
        res.status(201).json(createResponse(201, null, 'Thêm rạp phim thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi thêm rạp phim', error.message));
    }
};

exports.updateCinema = async (req, res) => {
    try {
        const { cinema_name, location } = req.body;

        const updateFields = {};
        if (cinema_name !== undefined) updateFields.cinema_name = cinema_name;
        if (location !== undefined) updateFields.location = location;

        const updatedCinema = await Cinema.findByIdAndUpdate(
            req.params.id,
            updateFields,
            { new: true, runValidators: true }
        );

        if (!updatedCinema) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp phim', null));
        }

        res.status(200).json(createResponse(200, null, 'Cập nhật rạp phim thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật rạp phim', error.message));
    }
};


// Xóa rạp phim
exports.deleteCinema = async (req, res) => {
    try {
        const deletedCinema = await Cinema.findByIdAndDelete(req.params.id);
        if (!deletedCinema) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp phim', null));
        }

        res.status(200).json(createResponse(200, null, 'Xóa rạp phim thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi xóa rạp phim', error.message));
    }
};

// Lấy rạp theo phim
exports.getCinemasByMovie = async (req, res) => {
    try {
        const { movie_id } = req.params;

        // Kiểm tra movie_id hợp lệ
        if (!mongoose.Types.ObjectId.isValid(movie_id)) {
            return res.status(400).json(createResponse(400, 'ID phim không hợp lệ', null));
        }

        // Kiểm tra phim tồn tại
        const movie = await Film.findById(movie_id);
        if (!movie) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phim', null));
        }

        // Tìm tất cả suất chiếu của phim và populate thông tin rạp
        const showtimes = await ShowTime.find({ movie_id })
            .populate({
                path: 'cinema_id',
                select: 'cinema_name location'
            });

        if (!showtimes || showtimes.length === 0) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu cho phim này', null));
        }

        // Lọc ra các rạp duy nhất và thêm thông tin suất chiếu
        const uniqueCinemas = [...new Map(
            showtimes
                .filter(showtime => showtime.cinema_id) // Lọc bỏ các suất chiếu không có thông tin rạp
                .map(showtime => {
                    const cinema = showtime.cinema_id;
                    return [cinema._id.toString(), {
                        _id: cinema._id,
                        cinema_name: cinema.cinema_name,
                        location: cinema.location,
                        showtimes: showtimes
                            .filter(st => st.cinema_id &&
                                st.cinema_id._id.toString() === cinema._id.toString())
                            .map(st => ({
                                _id: st._id,
                                showtime_id: st.showtime_id,
                                room_id: st.room_id,
                                start_time: st.start_time,
                                end_time: st.end_time,
                                show_date: st.show_date
                            }))
                    }];
                })
        ).values()];

        res.json(createResponse(200, null, uniqueCinemas));
    } catch (error) {
        console.error('Get cinemas by movie error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin rạp theo phim', null));
    }
};

// Lấy suất chiếu theo rạp
exports.getShowtimesByCinema = async (req, res) => {
    try {
        const { cinema_id } = req.params;

        // Kiểm tra cinema_id hợp lệ
        if (!mongoose.Types.ObjectId.isValid(cinema_id)) {
            return res.status(400).json(createResponse(400, 'ID rạp không hợp lệ', null));
        }

        // Kiểm tra rạp tồn tại
        const cinema = await Cinema.findById(cinema_id);
        if (!cinema) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp phim', null));
        }

        // Tìm tất cả suất chiếu của rạp và populate thông tin phim và phòng
        const showtimes = await ShowTime.find({ cinema_id })
            .populate([
                {
                    path: 'movie_id',
                    select: 'title duration poster_url'
                },
                {
                    path: 'room_id',
                    select: 'room_name room_type capacity'
                }
            ])
            .sort({ show_date: 1, start_time: 1 });

        if (!showtimes || showtimes.length === 0) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu tại rạp này', null));
        }

        // Nhóm suất chiếu theo phim và ngày
        const showtimesByMovie = showtimes.reduce((acc, showtime) => {
            const movieId = showtime.movie_id._id.toString();
            if (!acc[movieId]) {
                acc[movieId] = {
                    movie_info: {
                        movie_id: showtime.movie_id._id,
                        title: showtime.movie_id.title,
                        duration: showtime.movie_id.duration,
                        poster_url: showtime.movie_id.poster_url
                    },
                    dates: {}
                };
            }

            const date = new Date(showtime.show_date).toISOString().split('T')[0];
            if (!acc[movieId].dates[date]) {
                acc[movieId].dates[date] = [];
            }

            acc[movieId].dates[date].push({
                showtime_id: showtime.showtime_id,
                start_time: showtime.start_time,
                end_time: showtime.end_time,
                room: {
                    room_id: showtime.room_id._id,
                    room_name: showtime.room_id.room_name,
                    room_type: showtime.room_id.room_type,
                    capacity: showtime.room_id.capacity
                }
            });

            return acc;
        }, {});

        const response = {
            cinema_info: {
                cinema_id: cinema._id,
                cinema_name: cinema.cinema_name,
                location: cinema.location
            },
            movies: Object.values(showtimesByMovie).map(movieData => ({
                ...movieData.movie_info,
                showtimes: Object.entries(movieData.dates).map(([date, times]) => ({
                    show_date: date,
                    times: times
                }))
            }))
        };

        res.json(createResponse(200, null, response));
    } catch (error) {
        console.error('Get showtimes by cinema error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin suất chiếu', null));
    }
};

// Lấy thông tin phòng chiếu theo ID suất chiếu
exports.getRoomByShowtime = async (req, res) => {
    try {
        const { showtime_id } = req.params;

        // Kiểm tra showtime_id hợp lệ
        if (!showtime_id) {
            return res.status(400).json(createResponse(400, 'ID suất chiếu không hợp lệ', null));
        }

        // Tìm suất chiếu bằng cả showtime_id hoặc _id
        let showtime = null;
        if (mongoose.Types.ObjectId.isValid(showtime_id)) {
            showtime = await ShowTime.findOne({
                $or: [
                    { showtime_id: showtime_id },
                    { _id: showtime_id }
                ]
            }).populate({
                path: 'room_id',
                select: 'room_name room_type capacity seats'
            });
        } else {
            showtime = await ShowTime.findOne({ showtime_id: showtime_id })
                .populate({
                    path: 'room_id',
                    select: 'room_name room_type capacity seats'
                });
        }

        console.log('Showtime found:', showtime); // Log để debug

        if (!showtime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }

        if (!showtime.room_id) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy thông tin phòng chiếu', null));
        }

        const response = {
            room_id: showtime.room_id._id,
            room_name: showtime.room_id.room_name,
            room_type: showtime.room_id.room_type || 'Unknown',
            capacity: showtime.room_id.capacity || 0,
            seats: []
        };

        // Chỉ xử lý seats nếu có dữ liệu
        if (showtime.room_id.seats && Array.isArray(showtime.room_id.seats)) {
            response.seats = showtime.room_id.seats.map(seat => ({
                seat_id: seat._id,
                seat_name: seat.seat_name,
                row: seat.row,
                column: seat.column
            })).sort((a, b) => {
                if (a.row !== b.row) {
                    return a.row.localeCompare(b.row);
                }
                return a.column - b.column;
            });
        }

        res.json(createResponse(200, null, response));
    } catch (error) {
        console.error('Get room by showtime error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin phòng chiếu', null));
    }
};

// Lấy danh sách ghế theo ID phòng
exports.getSeatsByRoom = async (req, res) => {
    try {
        const { room_id } = req.params;

        // Kiểm tra room_id hợp lệ
        if (!mongoose.Types.ObjectId.isValid(room_id)) {
            return res.status(400).json(createResponse(400, 'ID phòng không hợp lệ', null));
        }

        const seats = await Seat.find({ room_id }).sort({ row_of_seat: 1, column_of_seat: 1 });

        if (!seats || seats.length === 0) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy ghế trong phòng này', null));
        }

        res.json(createResponse(200, null, seats));
    } catch (error) {
        console.error('Get seats by room error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách ghế', null));
    }
};

// Lấy danh sách ghế theo ID phòng và ID suất chiếu
exports.getSeatsByRoomAndShowTime = async (req, res) => {
    try {
        const { room_id, showtime_id } = req.params;

        // Kiểm tra các tham số hợp lệ
        if (!mongoose.Types.ObjectId.isValid(room_id)) {
            return res.status(400).json(createResponse(400, 'ID phòng không hợp lệ', null));
        }

        if (!mongoose.Types.ObjectId.isValid(showtime_id) && !showtime_id.match(/^[A-Za-z0-9-_]+$/)) {
            return res.status(400).json(createResponse(400, 'ID suất chiếu không hợp lệ', null));
        }

        // Kiểm tra xem suất chiếu có tồn tại không và có đúng là trong phòng này không
        const showtime = await ShowTime.findById(showtime_id);
        if (!showtime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }

        if (showtime.room_id.toString() !== room_id) {
            return res.status(400).json(createResponse(400, 'Suất chiếu này không diễn ra tại phòng được chỉ định', null));
        }

        // Lấy danh sách ghế của phòng
        const seats = await Seat.find({ room_id }).sort({ row_of_seat: 1, column_of_seat: 1 });

        if (!seats || seats.length === 0) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy ghế trong phòng này', null));
        }

        // Lấy danh sách vé đã đặt cho suất chiếu này
        const Ticket = require('../models/ticket');
        const bookedTickets = await Ticket.find({
            showtime_id: showtime_id,
            status: { $in: ['pending', 'completed'] }
        });

        // Danh sách ID ghế đã được đặt trong suất chiếu này
        const bookedSeatIds = new Set();

        bookedTickets.forEach(ticket => {
            if (ticket.seats && Array.isArray(ticket.seats)) {
                ticket.seats.forEach(seat => {
                    if (seat.seat_id) {
                        bookedSeatIds.add(seat.seat_id);
                    }
                });
            }
        });

        console.log(`Suất chiếu ${showtime_id} có ${bookedSeatIds.size} ghế đã đặt`);

        // Cập nhật trạng thái ghế theo dữ liệu đặt vé
        const updatedSeats = seats.map(seat => {
            // Tạo bản sao ghế để tránh thay đổi trực tiếp đối tượng Mongoose
            const seatObj = seat.toObject();

            // Nếu ghế này đã được đặt trong suất chiếu hiện tại
            if (bookedSeatIds.has(seat.seat_id)) {
                seatObj.seat_status = 'booked';
            }

            return seatObj;
        });

        res.json(createResponse(200, null, updatedSeats));
    } catch (error) {
        console.error('Get seats by room and showtime error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách ghế theo suất chiếu', error.message));
    }
};