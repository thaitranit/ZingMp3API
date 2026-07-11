let request = require('request-promise');
const { FileCookieStore } = require('tough-cookie-file-store');
const fs = require('fs');
const crypto = require('crypto');

const URL_API = 'https://zingmp3.vn';
// Bộ Key đồng bộ đi kèm với thuật toán mã hóa v2 mới nhất của Zing
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
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

    getHash256(str) {
        return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
    }

    getHmac512(str, key) {
        return crypto.createHmac('sha512', key).update(str, 'utf8').digest('hex');
    }

    // Logic sinh sig chuẩn cho riêng mục Stream (Bắt buộc gom id vào chuỗi băm SHA256)
    hashParam(path, id = '') {
        this.time = Math.floor(Date.now() / 1000);
        let strHash = `ctime=${this.time}`;
        if (id) {
            strHash += `id=${id}`;
        }
        let hash256 = this.getHash256(strHash);
        return this.getHmac512(path + hash256, SECRET_KEY);
    }

    async getCookie() {
        if (!cookiejar._jar.store.idx['zingmp3.vn']) {
            await request.get('/');
        }
    }

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

                // Nếu Zing trả về cấu trúc lỗi, gửi chi tiết về để tránh crash 500 rỗng
                if (data.err !== 0) return reject(data);
                resolve(data.data);
            } catch (error) {
                reject(error);
            }
        });
    }

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
