const express = require('express');
const router = express.Router();
const vnpaymnetControllers = require('../controllers/vnpayment.controller');
router.post('/createvnpayurl', vnpaymnetControllers.createPaymentUrl);
router.get('/vnpay-ipn', vnpaymnetControllers.handleVNPayIpn); // IPN callback URL
router.get('/verifypayment', vnpaymnetControllers.verifyPayment); // IPN callback URL

module.exports = router;