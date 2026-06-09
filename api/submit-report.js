const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Vercel Serverless-এর জন্য রুট হ্যান্ডলার
app.post('/api/submit-report', upload.single('reportImage'), async (req, res) => {
    try {
        const { category, location, description } = req.body;
        const file = req.file;

        const telegramToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID || process.env.CHAT_ID;

        if (!telegramToken || !chatId) {
            return res.status(500).json({ error: "টেলিগ্রাম কনফিগারেশন পাওয়া যায়নি।" });
        }

        const messageCaption = `🚨 <b>নতুন নাগরিক রিপোর্ট প্রাপ্তি</b>\n\n` +
                               `<b>📌 অপরাধের ধরন:</b> ${category || 'উল্লেখ নেই'}\n` +
                               `<b>📍 সুনির্দিষ্ট এলাকা:</b> ${location || 'উল্লেখ নেই'}\n` +
                               `<b>📝 বিস্তারিত বিবরণ:</b> ${description || 'উল্লেখ নেই'}`;

        if (file) {
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('caption', messageCaption);
            formData.append('parse_mode', 'HTML');
            formData.append('photo', file.buffer, {
                filename: file.originalname || 'image.jpg',
                contentType: file.mimetype || 'image/jpeg'
            });

            const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendPhoto`, {
                method: 'POST',
                body: formData,
                headers: formData.getHeaders()
            });

            const result = await response.json();
            if (result.ok) {
                return res.status(200).json({ message: "রিপোর্ট সফলতার সাথে পাঠানো হয়েছে!" });
            } else {
                return res.status(500).json({ error: "টেলিগ্রামে পাঠানো যায়নি।" });
            }
        } else {
            const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: messageCaption,
                    parse_mode: 'HTML'
                })
            });

            const result = await response.json();
            if (result.ok) {
                return res.status(200).json({ message: "রিপোর্ট সফলতার সাথে পাঠানো হয়েছে!" });
            } else {
                return res.status(500).json({ error: "বার্তা পাঠানো যায়নি।" });
            }
        }
    } catch (error) {
        return res.status(500).json({ error: "সার্ভারে অভ্যন্তরীণ ত্রুটি ঘটেছে।" });
    }
});

module.exports = app;
