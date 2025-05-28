const mongoose = require('mongoose');
require('dotenv').config(); // su dung thu vien doc file env:   npm install dotenv --save
const DB_NAME = process.env.DB_NAME;

mongoose.connect(
        'mongodb://localhost:27017/cinema'
).then(
        () => {
                console.log(DB_NAME);

                }
        )
        .catch((err) => {
                console.log("Loi ket noi CSDL");
                console.log(err);
        });

module.exports = { mongoose }
