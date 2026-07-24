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

// WhatsApp Setup
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Render par chalne ke liye zaroori
    }
});

client.on('qr', (qr) => {
    console.log('--- SCAN THIS QR CODE ON WHATSAPP ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('🚀 WhatsApp Bot Client Ready & Online on Render!');
});

client.initialize();

// Frontend/CodePen se data lene ka route
app.post('/api/vehicles', (req, res) => {
    const vehicle = req.body;
    vehicleDatabase.push(vehicle);
    console.log(`✅ Vehicle Added: ${vehicle.vehNo}`);
    res.json({ success: true, message: 'Saved successfully!' });
});

// Daily Morning 8:00 AM Cron Job
cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Checking 2-Day Expiries...');
    const targetDate = moment().add(2, 'days').format('YYYY-MM-DD');

    for (let v of vehicleDatabase) {
        let expiringDocs = [];
        if (v.docs) {
            for (let [docName, expDate] of Object.entries(v.docs)) {
                if (moment(expDate).format('YYYY-MM-DD') === targetDate) {
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
                console.log(`✅ Alert sent to ${v.ownerName}`);
            } catch (err) {
                console.error(`❌ Error sending to ${v.vehNo}:`, err);
            }
        }
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
