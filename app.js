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
app.use('/room', roomRouter)

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
