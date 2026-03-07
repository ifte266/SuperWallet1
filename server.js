const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());
app.use(express.static('.'));

app.post('/send', async (req, res) => {
    const { receiver, amount, method } = req.body;
    const message = `SuperWallet: ${amount} TK sent to ${receiver} via ${method}.`;
    
    // তোমার Cloud Token (স্ক্রিনশট ২৩৩১৪১ অনুযায়ী)
    const cloudToken = 'fQVi8OwFSUGIN6j8YKE...'; // পুরো বড় টোকেনটি এখানে বসাবে

    try {
        await axios.post('https://www.traccar.org/sms/', {
            to: receiver,
            message: message,
            token: cloudToken
        });
        res.json({ message: "সফল! ক্লাউড সার্ভারের মাধ্যমে মেসেজ পাঠানো হচ্ছে।" });
    } catch (error) {
        res.json({ message: "মেসেজ পাঠাতে সমস্যা হয়েছে। ক্লাউড টোকেন চেক করো।" });
    }
});

app.listen(process.env.PORT || 3000);
