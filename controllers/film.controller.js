const express = require('express');
const Film = require('../models/film');


//Lấy danh sách phim
exports.getFilm = async (req, res) => {

    try {
        const films = await Film.find()
        res.json(films);


    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server' + error });
    }
}


// Lấy film theo id 
exports.getFilmId = async (req, res) => {
    const { id } = req.params

    try {
        const films = await Film.findById({ _id: id })
        res.json(films);


    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server' + error });
    }
}

// Add film 
exports.addFilm = async (req, res) => {

    const { status_film, genre_film, trailer_film, duration, release_date, end_date, image, title, describe } = req.body


    try {

        // Tạo film mới
        const film = new Film({
            status_film, genre_film, trailer_film, duration, release_date, end_date, image, title, describe
        });
        await film.save();
        res.status(201).json({ msg: 'Thêm thành công thành công' });

    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server' + error });
    }
}


//Update film 

exports.updateFilm = async (req, res) => {


    try {
        const { id } = req.params
        const { status_film, genre_film, trailer_film, duration, release_date, end_date, image, title, describe } = req.body
        const updateFilm = await Film.findOneAndUpdate(
            { _id: id },
            { status_film, genre_film, trailer_film, duration, release_date, end_date, image, title, describe },
            { new: true }
        );
        if (!updateFilm) {
            return res.status(404).json({ message: 'Không tìm thấy film' }).send();
        }


        return res.status(200).json({ message: 'Đã cập nhật film' }).send();



    } catch (error) {

        return res.status(404).json({ message: 'Lỗi server' }).send();

    }
}


//Delete film 

exports.deleteFilm = async (req, res) => {
    try {
        const { id } = req.params;
        const deleteFilm = await Film.findByIdAndDelete({ _id: id })

        if (!deleteFilm) {
            return res.status(404).send();
        }

        return res.status(200).send(deletedMovie);
    } catch (error) {
        res.status(500).send(error);
    }
}

