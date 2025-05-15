const express = require('express');
const Film = require('../models/film');
const createResponse = require('../utils/responseHelper');
const Genre = require('../models/genres'); // Import model Genre

// STUB: Middleware kiểm tra ID hợp lệ
const validateId = (req, res, next) => {
    if (!req.params.id) {
        return res.status(400).json(createResponse(400, 'Thiếu ID phim', null));
    }
    next();
};

// SECTION: API quản lý phim

// ANCHOR: Tìm kiếm phim theo tiêu đề
exports.searchFilm = async (req, res) => {
    try {
        const { title } = req.query;

        // IMPORTANT: Kiểm tra từ khóa tìm kiếm
        if (!title) {
            return res.status(400).json(createResponse(400, 'Vui lòng nhập tiêu đề phim để tìm kiếm', null));
        }

        // NOTE: Tìm kiếm phim theo title chứa từ khóa (không phân biệt hoa thường)
        const query = { title: new RegExp(title, 'i') };
        const films = await Film.find(query).populate('genre_film');

        res.status(200).json(createResponse(200, null, films));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi tìm kiếm phim', error.message));
    }
};


// ANCHOR: Lấy danh sách phim với phân trang và tìm kiếm
exports.getFilm = async (req, res) => {
    try {
        let { page, limit, search } = req.query; 

        // NOTE: Chuyển đổi tham số phân trang thành số nguyên
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // SECTION: Xây dựng điều kiện lọc
        const filter = {}; // NOTE: Tạo đối tượng lọc rỗng ban đầu

        // HIGHLIGHT: Lọc theo tên phim nếu có tham số tìm kiếm
        if (search && search.trim() !== '') {
            filter.title = { $regex: search.trim(), $options: 'i' };
            // NOTE: Sử dụng $regex để tìm kiếm không phân biệt chữ hoa chữ thường
        }

        // NOTE: Lấy danh sách phim với phân trang và lọc
        const films = await Film.find(filter)
            .populate('genre_film')
            .sort({ release_date: -1 }) // HIGHLIGHT: Sắp xếp phim mới nhất lên đầu
            .skip(skip)
            .limit(limit);

        // STATS: Đếm tổng số phim và tính tổng số trang
        const totalFilms = await Film.countDocuments(filter);
        const totalPages = Math.ceil(totalFilms / limit);

        res.status(200).json(createResponse(200, null, {
            films,
            totalFilms,
            totalPages,
            currentPage: page,
            pageSize: limit
        }));
    } catch (error) {
        console.error("Error fetching films:", error); // DEBUG: Log lỗi chi tiết hơn ở server
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách phim', error.message));
    }
};

// ANCHOR: Lấy phim theo ID
exports.getFilmId = async (req, res) => {
    try {
        // NOTE: Tìm phim theo ID và populate thông tin thể loại
        const film = await Film.findById(req.params.id).populate('genre_film');
        if (!film) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phim', null));
        }
        res.status(200).json(createResponse(200, null, film));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy phim', error.message));
    }
};

// ANCHOR: Thêm phim mới

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

    // IMPORTANT: Kiểm tra các trường bắt buộc
    if (status_film === undefined || status_film === null || !genre_film || !title || !describe || !cast || ratings === undefined || box_office === undefined || !director || !age_limit || !language) {
        return res.status(400).json(createResponse(400, 'Thiếu thông tin bắt buộc', null));
    }

    try {
        // IMPORTANT: Kiểm tra thể loại có tồn tại trong cơ sở dữ liệu
        const existingGenres = await Genre.find({ _id: { $in: genre_film } });
        if (existingGenres.length !== genre_film.length) {
            return res.status(400).json(createResponse(400, 'Một hoặc nhiều thể loại không tồn tại', null));
        }

        // NOTE: Tạo đối tượng phim mới
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

        // DONE: Lưu phim vào cơ sở dữ liệu
        await film.save();
        res.status(201).json(createResponse(201, null, 'Thêm phim thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi thêm phim', error.message));
    }
};

// ANCHOR: Cập nhật thông tin phim
exports.updateFilm = async (req, res) => {
    try {
        const { genre_film } = req.body;

        // IMPORTANT: Kiểm tra thể loại hợp lệ nếu có cập nhật
        if (genre_film) {
            const existingGenres = await Genre.find({ _id: { $in: genre_film } });
            if (existingGenres.length !== genre_film.length) {
                return res.status(400).json(createResponse(400, 'Một hoặc nhiều thể loại không tồn tại', null));
            }
        }

        // NOTE: Cập nhật thông tin phim và trả về phim đã cập nhật
        const updatedFilm = await Film.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true } // HIGHLIGHT: Trả về document sau khi cập nhật và chạy validator
        ).populate('genre_film');

        if (!updatedFilm) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phim', null));
        }

        res.status(200).json(createResponse(200, null, 'Cập nhật phim thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật phim', error.message));
    }
};

// ANCHOR: Xóa phim
exports.deleteFilm = async (req, res) => {
    try {
        // NOTE: Tìm và xóa phim theo ID
        const deletedFilm = await Film.findByIdAndDelete(req.params.id);
        if (!deletedFilm) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phim', null));
        }

        res.status(200).json(createResponse(200, null, 'Xóa phim thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi xóa phim', error.message));
    }
};

// ANCHOR: Lấy phim theo thể loại
exports.getFilmsByGenre = async (req, res) => {
    try {
        const { genreId } = req.params;
        let { page, limit } = req.query;

        // NOTE: Chuyển đổi tham số phân trang thành số nguyên
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // IMPORTANT: Kiểm tra thể loại có tồn tại không
        const genreExists = await Genre.findById(genreId);
        if (!genreExists) {
            return res.status(404).json(createResponse(404, 'Thể loại không tồn tại', null));
        }

        // NOTE: Lấy danh sách phim theo thể loại với phân trang
        const films = await Film.find({ genre_film: genreId })
            .populate("genre_film")
            .skip(skip)
            .limit(limit);

        // STATS: Đếm tổng số phim và tính tổng số trang
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

// TODO: Thêm API lọc phim theo nhiều tiêu chí (năm, đánh giá, v.v.)
// TODO: Thêm API lấy phim đang chiếu/sắp chiếu
// IDEA: Thêm tính năng gợi ý phim tương tự dựa trên thể loại
// OPTIMIZE: Cải thiện hiệu suất tìm kiếm với index