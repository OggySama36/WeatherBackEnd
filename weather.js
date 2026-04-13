//node "weather api/weather.js"
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const { MongoClient } = require('mongodb');
const { get } = require('mongoose');
const connect_MongoDB = new MongoClient('mongodb://localhost:27017');
let manipulateDB;
async function connectDB(){
    await connect_MongoDB.connect();
    const selectDB = connect_MongoDB.db("WeatherApp");
    manipulateDB = selectDB.collection("users");
    console.log("Connect MongoDB Successfully!");
}

app.use(express.json());
app.use(express.static(path.resolve('D:/MyFrontend')));
app.get('/weather', function(req, res){
    res.sendFile(path.resolve('D:/MyFrontend/Weather Forecast/weather.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.resolve('D:/MyFrontend/Weather Forecast/weatherLogin.html'));
});
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
connectDB().then(() => {
    const PORT = 3000;
    app.listen(PORT, function(){
        console.log(`Server is working at ${PORT}`);
    });
});
