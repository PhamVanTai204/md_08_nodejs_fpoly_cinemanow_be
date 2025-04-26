var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors'); // Chỉ khai báo một lần!
const bodyParser = require('body-parser');
const cron = require('node-cron');
const Seat = require('./src/models/seat');
const pusher = require('./src/utils/pusher');

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
var paymentMethodRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/paymentMethod'); // Import routes payment method
var paymentStatusRouter = require('../md_08_nodejs_fpoly_cinemanow_be/src/routes/paymentStatus'); // Import routes payment status
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
app.use('/payment-methods', paymentMethodRouter); // Định nghĩa tiền tố URL cho payment method
app.use('/payment-statuses', paymentStatusRouter); // Định nghĩa tiền tố URL cho payment status
app.use('/reviews', reviewRouter); // Định nghĩa tiền tố URL cho review
app.use('/transactions', transactionRouter); // Định nghĩa tiền tố URL cho transaction

// Kết nối MongoDB
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Kết nối MongoDB thành công'))
  .catch(err => console.error('Lỗi kết nối MongoDB:', err));

// Setup cron job để tự động giải phóng ghế bị stuck
cron.schedule('*/5 * * * *', async () => {
  console.log('Đang chạy cron job giải phóng ghế bị stuck...');
  try {
    const timeThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 phút trước
    
    // Tìm tất cả ghế đang ở trạng thái selecting và quá thời gian
    const stuckSeats = await Seat.find({
      seat_status: 'selecting',
      selection_time: { $lt: timeThreshold }
    });
    
    if (stuckSeats.length > 0) {
      console.log(`Tìm thấy ${stuckSeats.length} ghế bị stuck, đang giải phóng...`);
      
      // Nhóm ghế theo phòng để gửi thông báo Pusher
      const seatsByRoom = {};
      stuckSeats.forEach(seat => {
        const roomId = seat.room_id.toString();
        if (!seatsByRoom[roomId]) {
          seatsByRoom[roomId] = [];
        }
        seatsByRoom[roomId].push(seat.seat_id);
      });
      
      // Cập nhật trạng thái ghế về available
      await Seat.updateMany(
        { _id: { $in: stuckSeats.map(seat => seat._id) } },
        { 
          seat_status: 'available',
          selected_by: null,
          selection_time: null
        }
      );
      
      // Gửi thông báo qua Pusher cho từng phòng
      for (const roomId in seatsByRoom) {
        pusher.trigger(`room-${roomId}`, 'seats-released', {
          seat_ids: seatsByRoom[roomId],
          status: 'available'
        });
        console.log(`Đã gửi thông báo giải phóng ${seatsByRoom[roomId].length} ghế cho phòng ${roomId}`);
      }
    } else {
      console.log('Không tìm thấy ghế nào bị stuck');
    }
  } catch (error) {
    console.error('Lỗi khi giải phóng ghế bị stuck:', error);
  }
});

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
