//node "weather api/weather.js"
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');
const connect_MongoDB = new MongoClient(process.env.MONGO_URI);
const PORT = process.env.PORT || 3000;
let manipulateDB;
async function connectDB(){
    await connect_MongoDB.connect();
    const selectDB = connect_MongoDB.db("WeatherApp");
    manipulateDB = selectDB.collection("users");
    console.log("Connect MongoDB Successfully!");
}

app.use(express.json());
app.use(cors());

app.post('/RegisterHandler', async (req, res) => {
    const getData_Register = req.body;
    const find = await manipulateDB.findOne({username: getData_Register.username});
    if (find !== null){
        res.json({
            "status": false,
            "message": "Username has been already existed!"
        });
        return
    }
    else {
        const hashedPwd = await bcrypt.hash(getData_Register.password, 10);
        await manipulateDB.insertOne({
            "username": getData_Register.username,
            "password": hashedPwd,
            "email": getData_Register.email,
            "telephone": getData_Register.phonenumber
        });
        res.json({
            "status": true,
            "message": "Register successfully!"
        });
    }
});

app.post('/LoginHandler', async function(req, res){
    const get_loginData = req.body;
    const find = await manipulateDB.findOne({username: get_loginData.username});
    if (find != null){
        const checkPw = await bcrypt.compare(get_loginData.password, find.password);
        if (checkPw){
            res.json({
                "status": true,
                "message": "Log in successfully!",
                "name": find.username,
                "telephone": find.telephone,
                "email": find.email
            });
            return
        }
        else {
            res.json({
                "status": false,
                "message": "Password Incorrect!"
            });
        }
        return
    }
    else {
        res.json({
            "status": false,
            "message": "No user found!",
        });
        return
    }
});

app.delete('/DeleteAccoutHandler', async (req, res) => {
    const getAccoutDelete = req.body;
    const findToDelete = await manipulateDB.findOne({username: getAccoutDelete.username});
    if (findToDelete != null){
        await manipulateDB.deleteOne({username: getAccoutDelete.username});
        res.json({
            "status": true,
            "message": "Delete account successfully!"
        });
    }
    else{
        res.json({
            "status": false,
            "message": "Delete unsuccessfully!"
        });
    }
});
app.post('/FeedbackHandler', async (req, res) => {
    const get_Feedback_Request = req.body;
    const portMailing = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.USER,
            pass: process.env.PASS,
        }
    })
    try {
        await portMailing.sendMail({
        from: "tiennguyen03062006@gmail.com",
        to: "tiennguyen03062006@gmail.com",
        replyTo: get_Feedback_Request.clientSending,
        subject: "Feedback about Weather Forecast...",
        text: `
        From Client: ${get_Feedback_Request.nameClient}
        Email: ${get_Feedback_Request.clientSending}
        Message: ${get_Feedback_Request.messageSending}
        `,
        });
        res.json({
            "state": true,
            "message": "Email sent Successfully! Thank you for your feedback."
        });
    }
    catch(error){
        res.status(500).json({
            "state": false,
            "message": "Oops... Email sent Unsuccessfully! Please wait about 5-7 minutes and try again.",
        });
        console.log(error);
    }
    
})
connectDB().then(() => {
    app.listen(PORT, function(){
        console.log(`Server is working at ${PORT}`);
    });
});
