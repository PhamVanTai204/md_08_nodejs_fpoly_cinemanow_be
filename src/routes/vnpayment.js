const express = require('express');
const router = express.Router();
const vnpaymnetControllers = require('../controllers/vnpayment.controller');
router.post('/createvnpayurl', vnpaymnetControllers.createPaymentUrl);


module.exports = router; 