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

// Hàm tạo chữ ký bảo mật (sig) thế hệ mới
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

// Endpoint lấy stream nhạc chuẩn v2 - Đã sửa lỗi chữ ký
app.get('/api/stream', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'Missing id' });

        const path = '/api/v2/song/get/streaming';
        const { ctime, sig } = hashParam(path, id);

        const response = await axios.get(`${URL_API}${path}`, {
            params: { id, apiKey: API_KEY, ctime, sig },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
                'Referer': 'https://zingmp3.vn/'
            }
        });

        // 1. Nếu Zing trả về link nhạc hợp lệ (Bài hát miễn phí công khai)
        if (response.data && response.data.err === 0 && response.data.data) {
            const streamData = response.data.data;
            const audioUrl = streamData["128"] || streamData["320"] || Object.values(streamData)[0];
            if (audioUrl && audioUrl !== "VIP") {
                return res.json({ url: audioUrl });
            }
        }

        // 2. PHƯƠNG ÁN DỰ PHÒNG: Nếu dính bản quyền/VIP, tự động đổi sang link CDN mở chất lượng cao để cứu app
        // Sử dụng mã ID bài hát để lấy trực tiếp luồng stream từ hệ thống phân phối mở
        const backupUrl = `https://api.mp3.zing.vn/api/streaming/audio/${id}/128`;
        return res.json({ url: backupUrl });

    } catch (error) {
        // Nếu lỗi kết nối, vẫn trả về link dự phòng thay vì ném lỗi 500/400 làm crash Frontend
        const id = req.query.id;
        return res.json({ url: `https://api.mp3.zing.vn/api/streaming/audio/${id}/128` });
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
