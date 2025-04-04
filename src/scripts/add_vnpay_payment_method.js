/**
 * Script thêm phương thức thanh toán VNPAY
 * 
 * Cách chạy:
 * node src/scripts/add_vnpay_payment_method.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PaymentMethod = require('../models/paymentMethod');
const PaymentStatus = require('../models/paymentStatus');

// Load biến môi trường
dotenv.config();

// Kết nối đến MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cinemanow')
  .then(() => console.log('Đã kết nối tới MongoDB'))
  .catch(err => {
    console.error('Lỗi kết nối MongoDB:', err);
    process.exit(1);
  });

async function addVNPayPaymentMethod() {
  try {
    // Kiểm tra xem phương thức thanh toán VNPAY đã tồn tại chưa
    const existingMethod = await PaymentMethod.findOne({ method_name: 'VNPAY' });
    if (existingMethod) {
      console.log('Phương thức thanh toán VNPAY đã tồn tại:', existingMethod);
      return;
    }

    // Tạo phương thức thanh toán VNPAY
    const vnpayMethod = new PaymentMethod({
      payment_method_id: 'VNPAY' + Date.now(),
      method_name: 'VNPAY'
    });

    await vnpayMethod.save();
    console.log('Đã thêm phương thức thanh toán VNPAY:', vnpayMethod);
  } catch (error) {
    console.error('Lỗi khi thêm phương thức thanh toán VNPAY:', error);
  }
}

async function addPaymentStatuses() {
  try {
    // Các trạng thái thanh toán cơ bản
    const statuses = [
      { name: 'pending', description: 'Chờ thanh toán' },
      { name: 'processing', description: 'Đang xử lý' },
      { name: 'completed', description: 'Hoàn thành' },
      { name: 'failed', description: 'Thất bại' },
      { name: 'cancelled', description: 'Đã hủy' }
    ];

    for (const status of statuses) {
      // Kiểm tra xem trạng thái đã tồn tại chưa
      const existingStatus = await PaymentStatus.findOne({ name: status.name });
      if (existingStatus) {
        console.log(`Trạng thái thanh toán ${status.name} đã tồn tại.`);
        continue;
      }

      // Tạo trạng thái mới
      const newStatus = new PaymentStatus({
        name: status.name,
        description: status.description
      });

      await newStatus.save();
      console.log(`Đã thêm trạng thái thanh toán ${status.name}`);
    }
  } catch (error) {
    console.error('Lỗi khi thêm trạng thái thanh toán:', error);
  }
}

async function run() {
  try {
    // Thêm phương thức thanh toán VNPAY
    await addVNPayPaymentMethod();

    // Thêm các trạng thái thanh toán
    await addPaymentStatuses();

    console.log('Hoàn thành!');
  } catch (error) {
    console.error('Lỗi:', error);
  } finally {
    // Ngắt kết nối MongoDB
    await mongoose.disconnect();
    console.log('Đã ngắt kết nối MongoDB');
  }
}

// Chạy script
run(); 