const express = require('express');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const FormData = require('form-data');

const app = express();

// হেলমেট মিডলওয়্যার
app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// রেট লিমিটিং
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'অনেক বেশি রিকোয়েস্ট পাঠানো হয়েছে, ১৫ মিনিট পর পুনরায় চেষ্টা করুন' }
});

// মাল্টার কনফিগারেশন
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('শুধুমাত্র JPEG, PNG, WebP এবং PDF ফাইল গ্রহণযোগ্য'), false);
    }
    cb(null, true);
  }
}).single('reportImage');

// GET এন্ডপয়েন্ট
app.get('/api/submit-report', (req, res) => {
  res.status(200).json({ message: 'API is running successfully' });
});

// POST এন্ডপয়েন্ট
app.post('/api/submit-report', reportLimiter, upload, async (req, res) => {
  try {
    const { category, location, description } = req.body;
    const file = req.file;

    // ইনপুট ভ্যালিডেশন
    if (!category && !description) {
      return res.status(400).json({ error: 'অপরাধের ধরণ অথবা বিস্তারিত বিবরণ যেকোনো একটি আবশ্যক' });
    }

    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!telegramToken || !chatId) {
      return res.status(500).json({ error: 'সার্ভার কনফিগারেশনে সমস্যা রয়েছে (টোকেন বা চ্যাট আইডি অনুপস্থিত)' });
    }

    const messageCaption = `🚨 *নতুন সাইবার-নিরাপত্তা রিপোর্ট প্রাপ্তি* 🚨 \n\n` +
      `📌 *অপরাধের ধরণ:* ${category || 'উল্লেখ নেই'}\n` +
      `📍 *এলাকা/ঠিকানা:* ${location || 'উল্লেখ নেই'}\n` +
      `📝 *বিস্তারিত বিবরণ:* ${description || 'উল্লেখ নেই'}`;

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('parse_mode', 'Markdown');

    if (file) {
      // ফাইলসহ টেলিগ্রামে পাঠানো
      formData.append('caption', messageCaption);
      formData.append('photo', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
        knownLength: file.size
      });

      const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendPhoto`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        return res.status(200).json({ success: true, message: 'রিপোর্টটি সফলভাবে সেন্ড হয়েছে!' });
      } else {
        const errData = await response.json().catch(() => ({}));
        return res.status(500).json({ error: 'টেলিগ্রামে সেন্ড করতে ব্যর্থ', details: errData });
      }
    } else {
      // শুধুমাত্র টেক্সট মেসেজ
      formData.append('text', messageCaption);

      const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        return res.status(200).json({ success: true, message: 'রিপোর্টটি সফলভাবে সেন্ড হয়েছে!' });
      } else {
        const errData = await response.json().catch(() => ({}));
        return res.status(500).json({ error: 'টেলিগ্রামে সেন্ড করতে ব্যর্থ', details: errData });
      }
    }
  } catch (error) {
    console.error('Error submitting report:', error);
    
    // মাল্টার ফাইল এরর হ্যান্ডলিং
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'ফাইলের সাইজ ১০MB এর বেশি হতে পারবে না' });
      }
      return res.status(400).json({ error: 'ফাইল আপলোড ত্রুটি', details: error.message });
    }
    
    return res.status(500).json({ error: 'অভ্যন্তরীণ সার্ভার ত্রুটি', details: error.message });
  }
});

module.exports = app;
