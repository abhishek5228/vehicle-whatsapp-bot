const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const moment = require('moment');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
app.use(cors());
app.use(express.json());

let vehicleDatabase = [];
let latestQRCode = '';

// WhatsApp Client Config
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
    console.log('👉 Naya QR Code Generate Ho Gaya!');
    latestQRCode = qr;
});

client.on('ready', () => {
    console.log('🚀 WHATSAPP BOT READY & ONLINE!');
    latestQRCode = 'CONNECTED';
});

client.initialize();

// 🟢 ROOT ROUTE (Homepage Check)
app.get('/', (req, res) => {
    res.send('<h1>Vehicle Alert Backend Server is Running Live!</h1><p>Go to <a href="/qr">/qr</a> to scan WhatsApp QR Code.</p>');
});

// 🖼️ CLEAN HD QR CODE PAGE (Isi route se QR dikhega)
app.get('/qr', (req, res) => {
    if (latestQRCode === 'CONNECTED') {
        return res.send(`
            <div style="text-align:center; padding:50px; font-family:sans-serif; background:#0f172a; color:#fff; min-height:100vh;">
                <h1 style="color:#10b981;">✅ WhatsApp Successfully Connected!</h1>
                <p>Aapka WhatsApp Bot Active hai aur alerts bhejne ke liye ready hai.</p>
            </div>
        `);
    }

    if (!latestQRCode) {
        return res.send(`
            <div style="text-align:center; padding:50px; font-family:sans-serif;">
                <h2>⏳ QR Code generate ho raha hai...</h2>
                <p>Kripya 15-20 seconds wait karke page Refresh (F5) karein.</p>
            </div>
        `);
    }

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(latestQRCode)}`;
    
    res.send(`
        <div style="text-align:center; padding:40px; font-family:sans-serif; background-color:#0f172a; color:#fff; min-height:100vh;">
            <h2 style="color:#38bdf8;">📱 Scan This QR Code on WhatsApp</h2>
            <div style="margin:20px auto; background:#fff; padding:15px; display:inline-block; border-radius:16px;">
                <img src="${qrImageUrl}" alt="WhatsApp QR Code" style="width:280px; height:280px; display:block;" />
            </div>
            <p style="color:#94a3b8; font-size:14px;">WhatsApp > Linked Devices > Link a Device par jaakar scan karein.</p>
        </div>
    `);
});

// API Route for Frontend
app.post('/api/vehicles', (req, res) => {
    const vehicle = req.body;
    vehicleDatabase.push(vehicle);
    console.log(`✅ Vehicle Saved: ${vehicle.vehNo}`);
    res.json({ success: true, message: 'Vehicle saved successfully!' });
});

// Daily Morning 8:00 AM Cron Job
cron.schedule('0 8 * * *', async () => {
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
