const express = require('express');
const app = express();
const cors = require('cors');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
const connect_MongoDB = new MongoClient(process.env.MONGO_URI);
const PORT = process.env.PORT || 3000;
const { Resend } = require('resend');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
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
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'tiennguyen03062006@gmail.com',
            reply_to: get_Feedback_Request.clientSending,
            subject: 'Feedback about Weather Forecast...',
            text: `
                From Client: ${get_Feedback_Request.nameClient}
                Email: ${get_Feedback_Request.clientSending}
                Message: ${get_Feedback_Request.messageSending}
            `,
        });
        res.json({ state: true, message: "Email sent Successfully! Thank you for your feedback." });
    } catch (error) {
        console.log(error);
        res.status(500).json({ state: false, message: "Oops... Email sent Unsuccessfully!" });
    }
});
app.post('/WeatherAI', async (req, res) => {
    const { message, city, history = [] } = req.body;
    try {
        const weatherRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
            params: { q: city || 'Ho Chi Minh City', appid: process.env.OPENWEATHER_API_KEY, units: 'metric', lang: 'vi' }
        });
        const w = weatherRes.data;
        const weatherContext = `Thời tiết hiện tại tại ${w.name}: Nhiệt độ ${w.main.temp}°C (cảm giác ${w.main.feels_like}°C), ${w.weather[0].description}, độ ẩm ${w.main.humidity}%, gió ${w.wind.speed} m/s.`;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: `Bạn là trợ lý thời tiết thông minh tên là WeatherAI. Chỉ trả lời các câu hỏi liên quan đến thời tiết, khí hậu, trang phục phù hợp, hoặc hoạt động ngoài trời. Trả lời ngắn gọn, thân thiện bằng tiếng Việt. Dữ liệu thời tiết thực tế: ${weatherContext}`,
        });
        const chatHistory = history.slice(0, -1).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({ history: chatHistory });
        const result = await chat.sendMessage(message);

        res.json({ state: true, reply: result.response.text() });
    } catch (error) {
        console.log(error);
        res.status(500).json({ state: false, message: 'Lỗi xử lý yêu cầu!' });
    }
});
connectDB().then(() => {
    app.listen(PORT, function(){
        console.log(`Server is working at ${PORT}`);
    });
});


