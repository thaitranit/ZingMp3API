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

// Endpoint lấy stream nhạc bằng cổng Mobile - Bypass hoàn toàn hệ thống chữ ký sig
app.get('/api/stream', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'Missing id' });

        // Sử dụng cổng mobile API chính thức của Zing, chỉ cần truyền ID bài hát
        const mobileApiUrl = `http://api.mp3.zing.vn/api/mobile/song/getsonginfo?requestdata={"id":"${id}"}`;

        const response = await axios.get(mobileApiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
            }
        });

        // Kiểm tra cấu trúc dữ liệu trả về từ cổng Mobile
        if (response.data && response.data.source) {
            const sourceData = response.data.source;
            // Lấy link phát nhạc chất lượng chuẩn 128kbps trực tiếp từ CDN
            const audioUrl = sourceData["128"] || sourceData["320"] || Object.values(sourceData)[0];
            
            if (audioUrl) {
                // Trả về đúng cấu trúc object chứa url để Frontend của bạn tiếp nhận
                return res.json({ url: audioUrl });
            }
        }

        return res.status(404).json({ error: 'Bài hát dính bản quyền hoặc không tìm thấy nguồn phát' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
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
