const multer = require('multer');
const FormData = require('form-data');

// ১. মাল্টার মেমোরি স্টোরেজ কনফিগারেশন
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // ১০MB সাইজ লিমিট
}).single('reportImage'); // আপনার ফ্রন্টএন্ডের ইনপুট ফিল্ডের নাম 'reportImage'

// Vercel-এ এক্সপ্রেস মিডলওয়্যার (Multer) রান করার জন্য হেল্পার ফাংশন
function runMiddleware(req, res, fn) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) {
                return reject(result);
            }
            return resolve(result);
        });
    });
}

// ২. প্রধান সার্ভারলেস হ্যান্ডলার ফাংশন
module.exports = async function handler(req, res) {
    // শুধুমাত্র POST রিকোয়েস্ট অ্যালাউ করা হবে
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        // মাল্টার ফাইল পার্সিং রান করা
        await runMiddleware(req, res, upload);

        const { category, location, description } = req.body;
        const file = req.file;

        // ৩. এনভায়রনমেন্ট ভ্যারিয়েবল চেক (সেট করা না থাকলে আমাদের হার্ডকোডেড ভ্যালুটি কাজ করবে)
        const telegramToken = process.env.TELEGRAM_TOKEN || '8998013616:AAGkLJAEvgOvHJEcgh_AwBAJq_nWXYblFpc';
        const chatId = process.env.CHAT_ID || '8766925591';

        if (!telegramToken || !chatId) {
            return res.status(500).json({ error: "সার্ভার কনফিগারেশনে সমস্যা রয়েছে।" });
        }

        // ৪. 'form-data' প্যাকেজ ব্যবহার করে ডেটা প্রস্তুত করা
        const formData = new FormData();
        formData.append('chat_id', chatId);

        // মেসেজের ক্যাপশন সাজানো
        const messageCaption = `🚨 *নতুন মাদকবিরোধী রিপোর্ট প্রাপ্তি* 🚨\n\n` +
                               `📌 *অপরাধের ধরন:* ${category || 'দেওয়া হয়নি'}\n` +
                               `📍 *এলাকা/ঠিকানা:* ${location || 'দেওয়া হয়নি'}\n` +
                               `📝 *বিস্তারিত বিবরণ:* ${description || 'দেওয়া হয়নি'}`;

        formData.append('parse_mode', 'Markdown');

        let telegramUrl = '';

        // ৫. ছবি আপলোড করা হলে sendPhoto আর না হলে sendMessage ব্যবহার করা
        if (file) {
            telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendPhoto`;
            formData.append('caption', messageCaption);
            
            // blob এর বদলে সরাসরি file.buffer ব্যবহার
            formData.append('photo', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype
            });
        } else {
            telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
            formData.append('text', messageCaption);
        }

        // টেলিগ্রামে রিকোয়েস্ট পাঠানো
        const response = await fetch(telegramUrl, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });

        const result = await response.json();

        if (response.ok && result.ok) {
            return res.status(200).json({ success: true, message: "রিপোর্টটি সফলভাবে পাঠানো হয়েছে।" });
        } else {
            return res.status(500).json({ error: "টেলিগ্রামে ডেটা পাঠানো যায়নি।", details: result });
        }

    } catch (error) {
        console.error("Internal Error:", error);
        return res.status(500).json({ error: "অভ্যন্তরীণ সার্ভার ত্রুটি।", details: error.message });
    }
};

// ৬. Vercel-এর ডিফল্ট বডি পার্সার বন্ধ করার কনফিগারেশন (যাতে মাল্টার কাজ করতে পারে)
module.exports.config = {
    api: {
        bodyParser: false,
    },
};
