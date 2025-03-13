var express = require('express');
var router = express.Router();
const uc = require('../controllers/genres.controller')
router.post('/create', uc.createGenre)
router.get('/getAll', uc.getAllGenres)
router.get('/getById/:id', uc.getGenreById)

router.put('/update/:id', uc.updateGenre)
router.delete('/delete/:id', uc.deleteGenre)

module.exports = router;