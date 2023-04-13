const { timeLog, timeStamp } = require('console');
const mongoose = require('mongoose');

const data = new mongoose.Schema({
    temperature : {
        type: Number,
        required: true
    },
    humidity : {
        type: Number,
        required: true
    },
    soilMoisture : {
        type: Number,
        required: true
    }
},
{timestamps: true}
);


module.exports = mongoose.model('data', data);

