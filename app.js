var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors'); // Chỉ khai báo một lần!

// Load environment variables
dotenv.config();


var indexRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/index');
var usersRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/users');
var filmRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/film');
var cinemaRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/cinema')
var showTimeRoutes = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/showTime'); // Import routes suất chiếu
var genres = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/genres');
var vnpayRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/vnpayment');
var thongkeRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/thongke');

var roomRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/room');
var seatRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/seat'); // Import routes seat
var voucherRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/voucher'); // Import routes voucher
var comboRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/combo'); // Import routes combo
var ticketRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/ticket'); // Import routes ticket
var paymentRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/payment'); // Import routes payment
var reviewRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/review'); // Import routes review
var transactionRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/transaction'); // Import routes transaction

var bannerRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/banner'); // Import routes banner

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/vnpay', vnpayRouter);
app.use('/thongke', thongkeRouter);

app.use('/films', filmRouter);
app.use('/showtimes', showTimeRoutes); // Định nghĩa tiền tố URL
app.use('/genres', genres);
app.use('/cinema', cinemaRouter)
app.use('/banners', bannerRouter); // Định nghĩa tiền tố URL cho banner
app.use('/room', roomRouter);
app.use('/seats', seatRouter); // Định nghĩa tiền tố URL cho seat
app.use('/vouchers', voucherRouter); // Định nghĩa tiền tố URL cho voucher
app.use('/combos', comboRouter); // Định nghĩa tiền tố URL cho combo
app.use('/tickets', ticketRouter); // Định nghĩa tiền tố URL cho ticket
app.use('/payments', paymentRouter); // Định nghĩa tiền tố URL cho payment

app.use('/reviews', reviewRouter); // Định nghĩa tiền tố URL cho review
app.use('/transactions', transactionRouter); // Định nghĩa tiền tố URL cho transaction

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});


// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
