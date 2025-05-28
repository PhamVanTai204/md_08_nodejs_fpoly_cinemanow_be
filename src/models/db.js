const mongoose = require('mongoose');
require('dotenv').config(); // su dung thu vien doc file env:   npm install dotenv --save
const DB_NAME = process.env.DB_NAME;

mongoose.connect(
        'mongodb+srv://tpgzin36406:tai12345@cluster0.qjep0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0').then(
                () => {
                        console.log(DB_NAME);

                }
        )
        .catch((err) => {
                console.log("Loi ket noi CSDL");
                console.log(err);
        });

module.exports = { mongoose }
