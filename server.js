const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const moment = require('moment');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors());
app.use(express.json());

let vehicleDatabase = [];

// Puppeteer configuration - Auto-detect installed Chrome
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('====================================================');
    console.log('👉 SCAN THIS QR CODE ON WHATSAPP:');
    qrcode.generate(qr, { small: true });
    console.log('====================================================');
});

client.on('ready', () => {
    console.log('🚀 WHATSAPP BOT READY & ONLINE ON RENDER!');
});

client.initialize();

// API Route for Frontend
app.post('/api/vehicles', (req, res) => {
    const vehicle = req.body;
    vehicleDatabase.push(vehicle);
    console.log(`✅ Vehicle Saved: ${vehicle.vehNo}`);
    res.json({ success: true, message: 'Vehicle saved successfully!' });
});

// Daily Morning 8:00 AM Cron Job
cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Checking 2-Day Expiries...');
    const targetDate = moment().add(2, 'days').format('YYYY-MM-DD');

    for (let v of vehicleDatabase) {
        let expiringDocs = [];
        if (v.docs) {
            for (let [docName, expDate] of Object.entries(v.docs)) {
                if (expDate && moment(expDate).format('YYYY-MM-DD') === targetDate) {
                    expiringDocs.push(docName);
                }
            }
        }

        if (expiringDocs.length > 0) {
            const docList = expiringDocs.map(d => `• *${d}*`).join('\n');
            const message = `⚠️ *VEHICLE EXPIRY ALERT (2 DAYS LEFT)* ⚠️\n\n` +
                            `Namaste *${v.ownerName}* ji,\n` +
                            `Aapki gaadi *${v.vehNo}* ke yeh documents 2 din me expire hone wale hain:\n\n` +
                            `${docList}\n\n` +
                            `Kripya isse samay par renew karwayein. 🙏`;

            const cleanNo = v.waNo.replace(/[^0-9]/g, '');
            const chatId = (cleanNo.startsWith('91') ? cleanNo : `91${cleanNo}`) + '@c.us';

            try {
                await client.sendMessage(chatId, message);
                console.log(`✅ Alert sent to ${v.ownerName} (${v.vehNo})`);
            } catch (err) {
                console.error(`❌ Error sending to ${v.vehNo}:`, err);
            }
        }
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
