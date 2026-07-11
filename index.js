const express = require('express');
const Zing = require('./modules/ZingMp3');
const app = express();

// CORS Middleware cho phép Frontend kết nối công khai
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// 1. Route lấy stream nhạc (Đã có từ trước)
app.get('/api/stream', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'Missing id' });
        const data = await Zing.getStreaming(id);
        return res.json(data);
    } catch (error) {
        // Thay vì chỉ gửi error.message, trả về toàn bộ object lỗi để xem Zing báo gì
        return res.status(500).json({ 
            message: error.message || "Internal Server Error", 
            details: error 
        });
    }
});

// 2. Route lấy chi tiết Album / Playlist (Sửa lỗi trang Album hiện tại)
app.get('/api/detailById', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'Missing id' });
        const data = await Zing.getDetailPlaylist(id);
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// 3. Route lấy thông tin bài hát
app.get('/api/song', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'Missing id' });
        const data = await Zing.getSong(id);
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// 4. Route lấy Trang Chủ (Home / New Release)
app.get('/api/home', async (req, res) => {
    try {
        const data = await Zing.getHome();
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// 5. Route lấy Top 100
app.get('/api/top100', async (req, res) => {
    try {
        const data = await Zing.getTop100();
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// 6. Route Tìm kiếm
app.get('/api/search', async (req, res) => {
    try {
        const keyword = req.query.keyword;
        if (!keyword) return res.status(400).json({ error: 'Missing keyword' });
        const data = await Zing.search(keyword);
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('ZingMP3 API Server Full Routes is Running!');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
