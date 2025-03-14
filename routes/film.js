var express = require('express');
var router = express.Router();
const uc = require('../controllers/film.controller')

//Lấy hết phim
router.get('/getfilm', uc.getFilm)
//Lấy phim theo id 
router.get('/getfilmById/:id', uc.getFilmId)
router.post('/addfilm', uc.addFilm)
router.put('/editfilm/:id', uc.updateFilm)
router.delete('/deletefilm/:id', uc.deleteFilm)
router.get('/genre/:genreId', uc.getFilmsByGenre);
router.get('/search', uc.searchFilmsByTitle);
module.exports = router;