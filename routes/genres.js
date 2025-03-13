var express = require('express');
var router = express.Router();
const uc = require('../controllers/genres.controller')
router.post('/create', uc.createGenre)

module.exports = router;