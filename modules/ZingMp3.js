let request = require('request-promise');
const { FileCookieStore } = require('tough-cookie-file-store');
const fs = require('fs');
const crypto = require('crypto'); // Sử dụng thư viện crypto thuần của Node.js để băm hmac nhanh hơn

const URL_API = 'https://zingmp3.vn';
// Cập nhật API KEY và SECRET KEY mới nhất của hệ thống Zing MP3
const API_KEY = 'X5051a9fa73c49d115490175bfa65910';
const SECRET_KEY = 'uYwrite49h9aY6403WAsFixscbHwbb2i';

const cookiePath = 'ZingMp3.json';
if (!fs.existsSync(cookiePath)) fs.closeSync(fs.openSync(cookiePath, 'w'));

let cookiejar = request.jar(new FileCookieStore(cookiePath));

request = request.defaults({
    baseUrl: URL_API,
    qs: {
        apiKey: API_KEY,
    },
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Referer': 'https://zingmp3.vn/',
    },
    gzip: true,
    json: true,
    jar: cookiejar,
});

class ZingMp3 {
    constructor() {
        this.time = null;
    }

    // Hàm băm chuẩn SHA256 và HMAC512 theo cơ chế bảo mật mới của Zing
    getHash256(str) {
        return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
    }

    getHmac512(str, key) {
        return crypto.createHmac('sha512', key).update(str, 'utf8').digest('hex');
    }

    hashParam(path, id = '', version = '') {
        this.time = Math.floor(Date.now() / 1000);
        
        // Thuật toán tạo chữ ký: Băm SHA256 các tham số query bắt buộc trước
        let strHash = `ctime=${this.time}`;
        if (id) strHash += `id=${id}`;
        if (version) strHash += `version=${version}`;
        
        let hash256 = this.getHash256(strHash);
        
        // Sau đó băm tiếp HMAC512 kèm với Endpoint Path và SECRET_KEY
        return this.getHmac512(path + hash256, SECRET_KEY);
    }

    async getCookie() {
        if (!cookiejar._jar.store.idx['zingmp3.vn']) {
            await request.get('/');
        }
    }

    // Route lấy luồng stream nhạc (.mp3)
    getStreaming(id) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.getCookie();
                const path = '/api/v2/song/get/streaming';
                const sig = this.hashParam(path, id);

                const data = await request({
                    uri: path,
                    qs: {
                        id: id,
                        ctime: this.time,
                        sig: sig,
                    },
                });

                if (data.err !== 0) return reject(data);
                resolve(data.data);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Route lấy chi tiết Playlist / Album
    getDetailPlaylist(id) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.getCookie();
                const path = '/api/v2/page/get/playlist';
                const sig = this.hashParam(path, id);

                const data = await request({
                    uri: path,
                    qs: {
                        id: id,
                        ctime: this.time,
                        sig: sig,
                    },
                });

                if (data.err !== 0) return reject(data);
                resolve(data.data);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Route lấy thông tin bài hát đơn lẻ
    getSong(id) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.getCookie();
                const path = '/api/v2/song/get/info';
                const sig = this.hashParam(path, id);

                const data = await request({
                    uri: path,
                    qs: {
                        id: id,
                        ctime: this.time,
                        sig: sig,
                    },
                });

                if (data.err !== 0) return reject(data);
                resolve(data.data);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Route lấy dữ liệu trang chủ
    getHome() {
        return new Promise(async (resolve, reject) => {
            try {
                await this.getCookie();
                const path = '/api/v2/page/get/home';
                const sig = this.hashParam(path);

                const data = await request({
                    uri: path,
                    qs: {
                        page: 1,
                        segmentId: -1,
                        ctime: this.time,
                        sig: sig,
                    },
                });

                if (data.err !== 0) return reject(data);
                resolve(data.data);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Route lấy danh sách Top 100
    getTop100() {
        return new Promise(async (resolve, reject) => {
            try {
                await this.getCookie();
                const path = '/api/v2/page/get/top-100';
                const sig = this.hashParam(path);

                const data = await request({
                    uri: path,
                    qs: {
                        ctime: this.time,
                        sig: sig,
                    },
                });

                if (data.err !== 0) return reject(data);
                resolve(data.data);
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = new ZingMp3();
