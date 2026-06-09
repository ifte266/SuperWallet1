const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch'); // যদি প্রজেক্টে node-fetch ইন্সটল করা থাকে
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/submit-report', upload.single('reportImage'), async (req, res) => {
    try {
        const { category, location, description } = req.body;
        const file = req.file;

        // এখানে সরাসরি এনভায়রনমেন্ট ভ্যারিয়েবল ব্যবহার করছি
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!telegramToken || !chatId) {
            return res.status(500).json({ error: "সিস্টেম কনফিগারেশন ভুল আছে" });
        }

        const messageCaption = `🚨 নতুন নাগরিক রিপোর্ট প্রাপ্তি\n\n` +
                               `📍 অপরাধের ধরন: ${category}\n` +
                               `🎯 এলাকা: ${location}\n` +
                               `📝 বিস্তারিত: ${description}`;

        // ছবিসহ মেসেজ পাঠানোর লজিক
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('caption', messageCaption);
        formData.append('parse_mode', 'Markdown');
        
        if (file) {
            formData.append('photo', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
            const url = `https://api.telegram.org/bot${telegramToken}/sendPhoto`;
            const response = await fetch(url, { method: 'POST', body: formData });
            const result = await response.json();
            
            if (result.ok) return res.status(200).json({ message: "রিপোর্ট সফলভাবে পাঠানো হয়েছে!" });
            else return res.status(500).json({ error: "টেলিগ্রামে পাঠানো যায়নি", details: result });
        } else {
            // ছবি না থাকলে শুধু মেসেজ
            const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
            formData.append('text', messageCaption);
            const response = await fetch(url, { method: 'POST', body: JSON.stringify({ chat_id: chatId, text: messageCaption }), headers: { 'Content-Type': 'application/json' } });
            const result = await response.json();
            
            if (result.ok) return res.status(200).json({ message: "রিপোর্ট সফলভাবে পাঠানো হয়েছে!" });
            else return res.status(500).json({ error: "টেলিগ্রামে পাঠানো যায়নি", details: result });
        }

    } catch (error) {
        return res.status(500).json({ error: "সার্ভারে সমস্যা হয়েছে!" });
    }
});

module.exports = app;
