const express = require('express');
const Zing = require('./modules/ZingMp3');
const app = express();

// Cho phép Frontend gọi API không bị lỗi CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Định nghĩa endpoint lấy stream nhạc giống như app cũ của bạn
app.get('/api/stream', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'Missing id param' });
        
        // Gọi hàm lấy link stream từ module có sẵn của repo
        const data = await Zing.getStreaming(id);
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Thêm một router gốc để check xem server sống hay chết
app.get('/', (req, res) => {
    res.send('ZingMP3 API Server is Running perfectly!');
});

// Lắng nghe cổng PORT do Railway cấp phát tự động
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
