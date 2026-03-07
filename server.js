const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());
app.use(express.static('.'));

app.post('/send', async (req, res) => {
    const { receiver, amount, method } = req.body;
    const message = `SuperWallet: ${amount} TK sent to ${receiver} via ${method}.`;
    
    // তোমার আসল ক্লাউড টোকেন (স্ক্রিনশট ২৩৩১৪১ অনুযায়ী)
    const cloudToken = 'fQVi8OwFSUGIN6j8YKECG:APA91bGV0_4T8zN7I3-elr-eHKw8BTbYgxjTwuPHuERNvcOYLlQrmnNbdU154czCZKLo29accJkeukWxN4x2UIrKPY4DGsCSFFZni2sG2lERnllV91LZAN0';

    try {
        await axios.post('https://www.traccar.org/sms/', {
            to: receiver,
            message: message,
            token: cloudToken
        });
        res.json({ message: "সফল! মেসেজ পাঠানো হচ্ছে।" });
    } catch (error) {
        res.json({ message: "এরর! টোকেন বা ইন্টারনেট চেক করো।" });
    }
});

app.listen(process.env.PORT || 3000);
