const mongoose = require('mongoose');
require('dotenv').config(); // su dung thu vien doc file env:   npm install dotenv --save
const DB_NAME = process.env.DB_NAME;

mongoose.connect(
        `mongodb://127.0.0.1:27017/${DB_NAME}`
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
