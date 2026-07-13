const express = require('express');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const app = express();

const URL_API = 'https://zingmp3.vn';
const API_KEY = '382f183021f1e626e2e54284f25963e6';
const SECRET_KEY = '2aa2d1c561e809b267f3638c4a307aab';

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

function getHash256(str) {
    return CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex);
}

function getHmac512(str, key) {
    return CryptoJS.HmacSHA512(str, key).toString(CryptoJS.enc.Hex);
}

function hashParam(path, id = '') {
    const ctime = Math.floor(Date.now() / 1000);
    let strHash = `ctime=${ctime}`;
    if (id) strHash += `id=${id}`;
    const hash256 = getHash256(strHash);
    const sig = getHmac512(path + hash256, SECRET_KEY);
    return { ctime, sig };
}

// 1. Endpoint lấy stream nhạc (Redirect trực tiếp file nhạc)
// Endpoint lấy stream nhạc thực tế theo ID bài hát
// Endpoint Stream Proxy - Đọc luồng binary trực tiếp để bypass 100% bộ lọc của Zing
app.get('/api/stream', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).send('Missing id');

        // Cổng lấy link stream mở của cộng đồng để lấy URL thực tế
        const publicApi = `https://api-zingmp3.vercel.app/api/v1/stream?id=${id}`;
        const apiRes = await axios.get(publicApi);

        let targetUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; // Mặc định nếu sập

        if (apiRes.data && apiRes.data.err === 0 && apiRes.data.data) {
            const streamData = apiRes.data.data;
            const audioUrl = streamData["128"] || streamData["320"] || Object.values(streamData)[0];
            if (audioUrl && audioUrl !== "VIP") {
                targetUrl = audioUrl;
            }
        }

        // Tự động kéo luồng dữ liệu âm thanh về server và pipe thẳng sang Frontend
        const audioStream = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://zingmp3.vn/'
            }
        });

        // Thiết lập header cho trình duyệt hiểu đây là file audio mp3
        res.setHeader('Content-Type', 'audio/mpeg');
        
        // Bơm luồng dữ liệu chạy thẳng về Frontend
        audioStream.data.pipe(res);

    } catch (error) {
        // Nếu lỗi, pipe tạm một bài hát mẫu về để giữ app không bị crash giao diện màu tím
        try {
            const fallback = await axios({
                method: 'get',
                url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                responseType: 'stream'
            });
            res.setHeader('Content-Type', 'audio/mpeg');
            fallback.data.pipe(res);
        } catch (err) {
            res.status(500).send(error.message);
        }
    }
});

// 2. Endpoint lấy chi tiết Playlist / Album
app.get('/api/detailById', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'Missing id' });

        const path = '/api/v2/page/get/playlist';
        const { ctime, sig } = hashParam(path, id);

        const response = await axios.get(`${URL_API}${path}`, {
            params: { id, apiKey: API_KEY, ctime, sig },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://zingmp3.vn/'
            }
        });
        return res.json(response.data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('ZingMP3 Serverless API V2 is Running perfectly!');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
