const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const serverless = require('serverless-http');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer Configuration
const storage = multer.memoryStorage();

const upload = multer({
storage,
limits: {
fileSize: 10 * 1024 * 1024 // 10MB
}
});

// HTML Escape Function
function escapeHtml(text = '') {
return String(text)
.replace(/&/g, '&')
.replace(/</g, '<')
.replace(/>/g, '>');
}

// API Route
app.post('/api/submit-report', upload.single('reportImage'), async (req, res) => {
try {
const { category, location, description } = req.body;
const file = req.file;

const telegramToken =
  process.env.TELEGRAM_BOT_TOKEN ||
  process.env.TELEGRAM_TOKEN;

const chatId =
  process.env.TELEGRAM_CHAT_ID ||
  process.env.CHAT_ID;

if (!telegramToken || !chatId) {
  return res.status(500).json({
    success: false,
    error: 'Telegram configuration missing.'
  });
}

const messageCaption = `

🚨 <b>নতুন নাগরিক রিপোর্ট</b>

<b>📌 অপরাধের ধরন:</b> ${escapeHtml(category || 'উল্লেখ নেই')}
<b>📍 এলাকা:</b> ${escapeHtml(location || 'উল্লেখ নেই')}
<b>📝 বিস্তারিত:</b> ${escapeHtml(description || 'উল্লেখ নেই')}
`;

let response;
let result;

if (file) {
  const formData = new FormData();

  formData.append('chat_id', chatId);
  formData.append('caption', messageCaption);
  formData.append('parse_mode', 'HTML');

  formData.append('photo', file.buffer, {
    filename: file.originalname || 'image.jpg',
    contentType: file.mimetype || 'image/jpeg'
  });

  response = await fetch(
    `https://api.telegram.org/bot${telegramToken}/sendPhoto`,
    {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    }
  );

  result = await response.json();
} else {
  response = await fetch(
    `https://api.telegram.org/bot${telegramToken}/sendMessage`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageCaption,
        parse_mode: 'HTML'
      })
    }
  );

  result = await response.json();
}

if (!result.ok) {
  console.error('Telegram Error:', result);

  return res.status(500).json({
    success: false,
    error: result.description || 'Telegram API Error'
  });
}

return res.status(200).json({
  success: true,
  message: 'রিপোর্ট সফলভাবে পাঠানো হয়েছে।'
});

} catch (error) {
console.error('Server Error:', error);

return res.status(500).json({
  success: false,
  error: 'সার্ভারে অভ্যন্তরীণ ত্রুটি ঘটেছে।'
});

}
});

// Health Check
app.get('/', (req, res) => {
res.status(200).json({
success: true,
message: 'Citizen Report API চলছে।'
});
});

module.exports = serverless(app);
