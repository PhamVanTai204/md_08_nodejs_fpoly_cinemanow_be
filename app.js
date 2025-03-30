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


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var filmRouter = require('./routes/film');
var cinemaRouter = require('./routes/cinema')
var showTimeRoutes = require('./routes/showTime'); // Import routes suất chiếu
var genres = require('./routes/genres');
var roomRouter = require('./routes/room');
var seatRouter = require('./routes/seat'); // Import routes seat
var voucherRouter = require('./routes/voucher'); // Import routes voucher
var comboRouter = require('./routes/combo'); // Import routes combo
var ticketRouter = require('./routes/ticket'); // Import routes ticket
var paymentRouter = require('./routes/payment'); // Import routes payment
var paymentMethodRouter = require('./routes/paymentMethod'); // Import routes payment method
var paymentStatusRouter = require('./routes/paymentStatus'); // Import routes payment status
var reviewRouter = require('./routes/review'); // Import routes review
var transactionRouter = require('./routes/transaction'); // Import routes transaction

var bannerRouter = require('./routes/banner'); // Import routes banner

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
app.use('/payment-methods', paymentMethodRouter); // Định nghĩa tiền tố URL cho payment method
app.use('/payment-statuses', paymentStatusRouter); // Định nghĩa tiền tố URL cho payment status
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
