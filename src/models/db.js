const mongoose = require('mongoose');
require('dotenv').config(); // su dung thu vien doc file env:   npm install dotenv --save
const DB_NAME = process.env.DB_NAME;

mongoose.connect(
        // `mongodb+srv://sanndph32936:sandapchai12@cluster0.cstvl.mongodb.net/Learning?retryWrites=true&w=majority&appName=Cluster0`
        'mongodb://127.0.0.1:27017/cinema'
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
