const express = require('express')
const mqtt = require('mqtt')
const mongoose = require('mongoose')
const cors = require("cors")
const fetch = require("node-fetch")
const Data = require('./models/data');

let connection = null

// Subscribe variables
let sub_topic = 'intellify/pub';
let sub_options = { qos: 0 };

let mail

// Publisher variables
let pub_topic = 'intellify/sub';
let pub_options = { qos: 0, retain: false };

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

app.get("/set_mail", (req, res) => {
    mail = req.query.mail;
    res.send(mail)
})

app.get("/set_threshold", (req, res) => {
    let message = req.query.threshold
    if (message == undefined) {
        res.status(400).send("please provide value")
        return
    }
    client.publish(pub_topic, message, pub_options, (err) => {
        if (err) {
            console.log("An error occurred during publish")
            res.status(400).send(err)
        } else {
            console.log("Published successfully to " + pub_topic.toString() + " " + message)
            res.send("Done")
        }
    })
})

app.get("/get_suggestion", async (req, res) => {

    try {

        let npkph = await fetch(`https://super-rugby-shirt-eel.cyclic.app/farm/getNPKpH/?email=${mail}`)
        npkph = await npkph.json()

        let n = npkph.Nitrogen
        let p = npkph.Phosphorus
        let k = npkph.Potassium
        let ph = npkph.pH
        let rain = 80

        let data = await Data.aggregate([
            { $sort: { createdAt: -1 } },
            { "$limit": 10000 },
            {
                "$group": {
                    "_id": null,
                    "temperature": { "$avg": "$temperature" },
                    "humidity": { "$avg": "$humidity" }
                }
            }
        ])

        let temp = data[0].temperature
        let hum = data[0].humidity

        let url = `http://127.0.0.1:5000/predict?n=${n}&p=${p}&k=${k}&temp=${temp}&hum=${hum}&ph=${ph}&rain=${rain}`;
        let result = await fetch(url)
        result = await result.json()

        res.send({ result: result.result, n, p, k, ph, rain, temp, hum })
    } catch (error) {
        res.status(400).send("something went wrong " + error)
    }

})

app.get("/hello", (req, res) => {
    res.send("hello world!")
})

// Subscribe
client.on('connect', async () => {
    console.log('Connection successful');

    client.subscribe(sub_topic, sub_options, (err) => {
        if (err) {
            console.log("An error occurred while subscribing")
        } else {
            console.log("Subscribed successfully to " + sub_topic.toString())
        }
    })

    client.on("message", async (topic, payload) => {
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
client.on("error", (error) => {
    console.log("Error occurred: " + error);
});

// Notify reconnection
client.on("reconnect", () => {
    console.log("Reconnection starting");
});

// Notify offline status
client.on("offline", () => {
    console.log("Currently offline. Please check internet!");
});

app.listen(3000, () => {
    connect()
    console.log('Server is running on port 3000');
});