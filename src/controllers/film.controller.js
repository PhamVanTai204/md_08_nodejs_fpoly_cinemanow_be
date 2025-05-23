const express = require('express');
const Film = require('../models/film');
const createResponse = require('../utils/responseHelper');

// Middleware kiểm tra ID hợp lệ
const validateId = (req, res, next) => {
    if (!req.params.id) {
        return res.status(400).json(createResponse(400, 'Thiếu ID phim', null));
    }
    next();
};

exports.searchFilm = async (req, res) => {
    try {
        const { title } = req.query;

        // Nếu không có title, trả về danh sách trống
        if (!title) {
            return res.status(400).json(createResponse(400, 'Vui lòng nhập tiêu đề phim để tìm kiếm', null));
        }

        // Tìm kiếm phim theo title chứa từ khóa (không phân biệt hoa thường)
        const query = { title: new RegExp(title, 'i') };
        const films = await Film.find(query).populate('genre_film');

        res.status(200).json(createResponse(200, null, films));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi tìm kiếm phim', error.message));
    }
};


// Lấy danh sách phim

exports.getFilm = async (req, res) => {
    try {
        let { page, limit, search } = req.query; // Thêm 'search' vào đây

        // Chuyển đổi giá trị thành số nguyên và đặt mặc định nếu không có giá trị
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // --- Phần thêm vào để lọc theo tên phim ---
        const filter = {}; // Tạo đối tượng lọc rỗng ban đầu

        if (search && search.trim() !== '') {
            // Nếu có tham số 'search' và không phải là chuỗi rỗng
            filter.title = { $regex: search.trim(), $options: 'i' };
            // Sử dụng $regex để tìm kiếm không phân biệt chữ hoa chữ thường ($options: 'i')
            // và tìm các phim có title chứa chuỗi 'search'
        }
        // --- Kết thúc phần thêm vào ---

        // Lấy danh sách phim với phân trang VÀ lọc (nếu có)
        const films = await Film.find(filter) // Áp dụng bộ lọc vào find()
            .populate('genre_film')
            .sort({ release_date: -1 }) // Optional: Sắp xếp phim mới nhất lên đầu
            .skip(skip)
            .limit(limit);

        // Đếm tổng số phim khớp với bộ lọc để tính tổng số trang
        const totalFilms = await Film.countDocuments(filter); // Áp dụng bộ lọc vào countDocuments()
        const totalPages = Math.ceil(totalFilms / limit);

        res.status(200).json(createResponse(200, null, {
            films,
            totalFilms,
            totalPages,
            currentPage: page,
            pageSize: limit
        }));
    } catch (error) {
        console.error("Error fetching films:", error); // Log lỗi chi tiết hơn ở server
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách phim', error.message));
    }
};






// Lấy phim theo ID
exports.getFilmId = async (req, res) => {
    try {
        const film = await Film.findById(req.params.id).populate('genre_film');
        if (!film) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phim', null));
        }
        res.status(200).json(createResponse(200, null, film));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy phim', error.message));
    }
};

// Thêm phim
const Genre = require('../models/genres'); // Import model Genre

exports.addFilm = async (req, res) => {
    const {
        status_film,
        genre_film,
        trailer_film,
        duration,
        release_date,
        end_date,
        image_film,
        title,
        describe,
        cast,
        ratings,
        box_office,
        director,
        age_limit,
        language
    } = req.body;

    if (status_film === undefined || status_film === null || !genre_film || !title || !describe || !cast || ratings === undefined || box_office === undefined || !director || !age_limit || !language) {
        return res.status(400).json(createResponse(400, 'Thiếu thông tin bắt buộc', null));
    }

    try {
        const existingGenres = await Genre.find({ _id: { $in: genre_film } });
        if (existingGenres.length !== genre_film.length) {
            return res.status(400).json(createResponse(400, 'Một hoặc nhiều thể loại không tồn tại', null));
        }

        const film = new Film({
            status_film,
            genre_film,
            trailer_film,
            duration,
            release_date,
            end_date,
            image_film,
            title,
            describe,
            cast,
            ratings,
            box_office,
            director,
            age_limit,
            language
        });

        await film.save();
        res.status(201).json(createResponse(201, null, 'Thêm phim thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi thêm phim', error.message));
    }
};



// Cập nhật phim
exports.updateFilm = async (req, res) => {
    try {
        const { genre_film } = req.body;

        // Kiểm tra thể loại hợp lệ nếu có cập nhật
        if (genre_film) {
            const existingGenres = await Genre.find({ _id: { $in: genre_film } });
            if (existingGenres.length !== genre_film.length) {
                return res.status(400).json(createResponse(400, 'Một hoặc nhiều thể loại không tồn tại', null));
            }
        }

        const updatedFilm = await Film.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('genre_film');

        if (!updatedFilm) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phim', null));
        }

        res.status(200).json(createResponse(200, null, 'Cập nhật phim thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật phim', error.message));
    }
};


// Xóa phim
exports.deleteFilm = async (req, res) => {
    try {
        const deletedFilm = await Film.findByIdAndDelete(req.params.id);
        if (!deletedFilm) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phim', null));
        }

        res.status(200).json(createResponse(200, null, 'Xóa phim thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi xóa phim', error.message));
    }
};
exports.getFilmsByGenre = async (req, res) => {
    try {
        const { genreId } = req.params;
        let { page, limit } = req.query;

        // Chuyển đổi giá trị thành số nguyên và đặt mặc định nếu không có giá trị
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // Kiểm tra thể loại có tồn tại không
        const genreExists = await Genre.findById(genreId);
        if (!genreExists) {
            return res.status(404).json(createResponse(404, 'Thể loại không tồn tại', null));
        }

        // Lấy danh sách phim có chứa thể loại này (có phân trang)
        const films = await Film.find({ genre_film: genreId })
            .populate("genre_film")
            .skip(skip)
            .limit(limit);

        // Đếm tổng số phim để tính tổng số trang
        const totalFilms = await Film.countDocuments({ genre_film: genreId });
        const totalPages = Math.ceil(totalFilms / limit);

        res.status(200).json(createResponse(200, null, {
            films,
            pagination: {
                totalFilms,
                totalPages,
                currentPage: page,
                pageSize: limit
            }
        }));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy phim theo thể loại', error.message));
    }
};

