const express = require('express');
const multer = require('multer');

const app = express();
const storage = multer.memoryStorage();
const upload = multer.single('reportImage');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/submit-report', upload, async (req, res) => {
  try {
    const { category, location, description } = req.body;
    const file = req.file;

    const telegramToken = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.CHAT_ID;

    if (!telegramToken || !chatId) {
      return res.status(500).json({ error: "সার্ভার কনফিগারেশনে সমস্যা রয়েছে।" });
    }

    const formData = new FormData();
    formData.append('chat_id', chatId);
    
    const messageCaption = `🚨 *নতুন মাদকবিরোধী রিপোর্ট প্রাপ্তি* 🚨\n\n` +
                           `📌 *অপরাধের ধরন:* ${category}\n` +
                           `📍 *এলাকা/ঠিকানা:* ${location}\n` +
                           `📝 *বিস্তারিত বিবরণ:* ${description}`;
    
    formData.append('caption', messageCaption);
    formData.append('parse_mode', 'Markdown');

    if (file) {
      const blob = new Blob([file.buffer], { type: file.mimetype });
      formData.append('photo', blob, file.originalname);
    }

    const telegramUrl = file 
      ? `https://api.telegram.org/bot${telegramToken}/sendPhoto`
      : `https://api.telegram.org/bot${telegramToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(messageCaption)}&parse_mode=Markdown`;

    const response = await fetch(telegramUrl, {
      method: 'POST',
      body: file ? formData : undefined
    });

    if (response.ok) {
      return res.status(200).json({ success: true, message: "রিপোর্টটি সফলভাবে এবং নিরাপদে পাঠানো হয়েছে।" });
    } else {
      const errData = await response.json();
      return res.status(500).json({ error: "টেলিগ্রামে ডেটা পাঠানো যায়নি।", details: errData });
    }

  } catch (error) {
    return res.status(500).json({ error: "অভ্যন্তরীণ সার্ভার ত্রুটি।" });
  }
});

module.exports = app;
