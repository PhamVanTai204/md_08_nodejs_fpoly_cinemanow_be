var express = require('express');
var router = express.Router();
const uc = require('../controllers/film.controller')

router.get('/getfilm', uc.getFilm)
router.post('/addfilm', uc.addFilm)
router.put('/editfilm/:id', uc.updateFilm)
router.delete('/deletefilm/:id', uc.deleteFilm)
module.exports = router;