const express = require('express')
const mqtt = require('mqtt')
const mongoose = require('mongoose')
const cors = require("cors")
const Data = require('./models/data');

let connection = null

// Subscribe variables
let sub_topic = 'intellify/pub';
let sub_options = { qos: 0 };

const app = express();
const client = mqtt.connect("mqtt://10.90.0.42", { port: 1883, username: 'admin', password: 'hivemq' })
const connect = () => {
    mongoose.connect("mongodb://10.90.0.42:27017/intellify")
        .then(() => console.log("connected"))
        .catch((err) => { throw new Error(err) })
}


// middlewares
app.use(cors())
app.use(express.json());

app.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Keep-Alive", "max=100")
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader("Vary", "Origin")
    connection = res

    req.on("close", () => {
        connection = null
    })
})

app.get("/hello", (req, res) => {
    res.send("hello world!")
})


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

    client.on("message", async function (topic, payload) {
        const data = JSON.parse(payload.toString())
        console.log(data)
        const newData = new Data({
            temperature: data.temp,
            humidity: data.hum,
            soilMoisture: data.soil
        });
        await newData.save();
        if (connection != null) {
            connection.write(`data: ${payload.toString()}\n\n`)
        }
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
    connect()
    console.log('Server is running on port 3000');
});