const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const nodemailer = require('nodemailer');
const emailTemplate = require('../utils/emailTemplate');

router.get('/', async(req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/events');
    }
    const events = await Event.find()
        .sort('-createdAt')
        .limit(20)
        .populate('creator');
    res.render('index', { title: 'Home', events });
});

router.get('/about', (req, res) => {
    res.render('about', { title: 'About Us' });
});

router.get('/contact', (req, res) => {
    res.render('contact', { title: 'Contact Us' });
});

router.post('/contact', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USERNAME,
            to: process.env.ADMIN_EMAIL,
            subject: 'New Contact Form Submission',
            html: emailTemplate(`
                <h1>New Contact Form Submission</h1>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `)
        });
        req.flash('success', 'Your message has been sent successfully!');
    } catch (error) {
        console.error('Error sending contact form:', error);
        req.flash('error', 'There was an error sending your message. Please try again later.');
    }
    res.redirect('/#contact');
});

module.exports = router;
