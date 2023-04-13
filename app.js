const express = require('express')
const mqtt = require('mqtt')
const mongoose = require('mongoose')
const Data = require('./models/data');


const app = express();
app.use(express.json());

const client = mqtt.connect("mqtt://10.90.0.42", { port: 1883, username: 'admin', password: 'hivemq' })

const connectDB = mongoose.connect("mongodb://10.90.0.42:27017/intellify", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("connected"))
    .catch((err) => console.log(err));



// Subscribe variables
let sub_topic = 'intellify/pub';
let sub_options = { qos: 0 };


// Subscribe
client.on('connect', async function () {
    console.log('Connection successful');

    client.subscribe(sub_topic, sub_options, function (err) {
        if (err) {
            console.log("An error occurred while subscribing")
        } else {
            console.log("Subscribed successfully to " + sub_topic.toString())
        }
    })

    client.on("message", function (topic, payload) {
        const data = JSON.parse(payload.toString())
        const newData = new Data({
            temperature: data.temp,
            humidity: data.hum,
            soilMoisture: data.soil
        });
        newData.save();
    })
})

// Handle errors
client.on("error", function (error) {
    console.log("Error occurred: " + error);
});

// Notify reconnection
client.on("reconnect", function () {
    console.log("Reconnection starting");
});

// Notify offline status
client.on("offline", function () {
    console.log("Currently offline. Please check internet!");
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});









