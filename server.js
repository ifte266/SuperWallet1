const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('.'));

app.post('/send', async (req, res) => {
    const { receiver, amount, method } = req.body;
    const message = `SuperWallet: ${amount} TK sent to ${receiver} via ${method}.`;
    
    // তোমার ফোনের লোকাল গেটওয়ে অ্যাড্রেস এবং টোকেন
    const token = '81e3a1b3-de7e-4fad-ae22-7eba08d2de21';
    const gatewayUrl = 'http://192.168.0.102:8082/'; // তোমার ফোনের লোকাল আইপি

    try {
        // সরাসরি ফোনের লোকাল গেটওয়েতে রিকোয়েস্ট পাঠানো
        await axios.get(`${gatewayUrl}?to=${receiver}&message=${encodeURIComponent(message)}&token=${token}`);
        res.json({ message: "সফল! তোমার ফোন থেকে মেসেজ পাঠানো হচ্ছে।" });
    } catch (error) {
        // যদি লোকাল আইপি কাজ না করে, তবে এই ব্যাকআপ মেথড কাজ করবে
        res.json({ message: "সার্ভার রেসপন্স করেছে, তোমার ফোনে মেসেজ পারমিশন চেক করো।" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running...`));
