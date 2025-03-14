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

// Lấy danh sách phim
exports.getFilm = async (req, res) => {
    try {
        let { page, limit } = req.query;

        // Chuyển đổi giá trị thành số nguyên và đặt mặc định nếu không có giá trị
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // Lấy danh sách phim với phân trang
        const films = await Film.find()
            .populate('genre_film')
            .skip(skip)
            .limit(limit);

        // Đếm tổng số phim để tính tổng số trang
        const totalFilms = await Film.countDocuments();
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
    const { status_film, genre_film, trailer_film, duration, release_date, end_date, image_film, title, describe } = req.body;

    if (!status_film || !genre_film || !title || !describe) {
        return res.status(400).json(createResponse(400, 'Thiếu thông tin bắt buộc', null));
    }

    try {
        // Kiểm tra xem tất cả ID thể loại có hợp lệ không
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
            describe
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

//Tìm kiếm phim theo tên 
exports.searchFilmsByTitle = async (req, res) => {
    try {
        let { title, page, limit } = req.query;

        if (!title) {
            return res.status(400).json(createResponse(400, 'Vui lòng nhập tên phim để tìm kiếm', null));
        }

        // Giải mã URL và ghi log để debug
        title = decodeURIComponent(title);
        console.log("Title received:", title);

        // Chuyển đổi giá trị thành số nguyên và đặt mặc định nếu không có giá trị
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // Hàm chuyển đổi tiếng Việt có dấu thành không dấu
        const removeVietnameseAccents = (str) => {
            return str.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd').replace(/Đ/g, 'D');
        };

        // Tách từ khóa tìm kiếm thành các từ riêng lẻ
        const keywords = title.split(' ').filter(word => word.length > 1);
        console.log("Keywords:", keywords);

        // Tạo các điều kiện tìm kiếm
        const searchConditions = [];
        
        // 1. Tìm kiếm chính xác (không phân biệt hoa thường)
        searchConditions.push({ title: new RegExp(title, 'i') });
        
        // 2. Tìm kiếm mềm với các từ không liền kề
        searchConditions.push({ title: new RegExp(title.split(' ').join('.*'), 'i') });
        
        // 3. Tìm kiếm từng từ khóa riêng lẻ (nếu có ít nhất 2 từ)
        if (keywords.length >= 2) {
            // Tìm kiếm các phim có chứa ít nhất 2 từ khóa
            const keywordConditions = keywords.map(keyword => ({ title: new RegExp(keyword, 'i') }));
            searchConditions.push({ $and: keywordConditions });
        }
        
        // 4. Tìm kiếm không dấu (nếu tiêu đề có dấu)
        const titleWithoutAccents = removeVietnameseAccents(title);
        if (titleWithoutAccents !== title) {
            searchConditions.push({ 
                $expr: { 
                    $regexMatch: { 
                        input: { $toLower: "$title" }, 
                        regex: titleWithoutAccents.toLowerCase() 
                    } 
                } 
            });
        }

        console.log("Search conditions:", JSON.stringify(searchConditions));

        // Tìm kiếm phim với các điều kiện đã tạo
        const films = await Film.find({ $or: searchConditions })
            .populate('genre_film')
            .skip(skip)
            .limit(limit);

        // Đếm tổng số phim tìm được
        const totalFilms = await Film.countDocuments({ $or: searchConditions });
        const totalPages = Math.ceil(totalFilms / limit);

        console.log(`Found ${films.length} films matching the search criteria`);
        
        // Log các phim tìm thấy để debug
        if (films.length > 0) {
            console.log("Films found:", films.map(film => film.title));
        }

        if (films.length === 0) {
            // Thử tìm kiếm đơn giản nhất để kiểm tra dữ liệu
            const allFilms = await Film.find().limit(5);
            console.log("Sample films in DB:", allFilms.map(film => film.title));
            
            return res.status(200).json(createResponse(200, 'Không tìm thấy phim nào phù hợp', {
                films: [],
                pagination: {
                    totalFilms: 0,
                    totalPages: 0,
                    currentPage: page,
                    pageSize: limit
                }
            }));
        }

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
        console.error("Search error:", error);
        res.status(500).json(createResponse(500, 'Lỗi khi tìm kiếm phim', error.message));
    }
};
