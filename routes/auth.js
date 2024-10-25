const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Nodemailer transporter setup (replace with your email service details)
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
});

const emailTemplate = (content) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://yourdomain.com/images/logo.png" alt="EventSys Logo" style="max-width: 150px;">
        </div>
        ${content}
        <div style="text-align: center; margin-top: 20px; color: #888;">
            &copy; 2024 EventSys. All rights reserved.
        </div>
    </div>
`;

// Add this route at the beginning of the file
router.get('/login', (req, res) => {
    res.render('auth/login', { title: 'Login' });
});

router.get('/register', (req, res) => {
    res.render('auth/register', { title: 'Register' });
});

router.post('/register', async(req, res) => {
    try {
        const { username, email, password, name } = req.body;
        const user = new User({ username, email, name });
        user.createVerificationToken();
        await User.register(user, password);

        // Send verification email
        const verificationUrl = `http://${req.headers.host}/auth/verify/${user.verificationToken}`;
        await transporter.sendMail({
            to: user.email,
            subject: 'Verify your account',
            html: emailTemplate(`
                <h1>Welcome to EventSys!</h1>
                <p>Please click this link to verify your account:</p>
                <p><a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Account</a></p>
            `)
        });

        res.render('auth/verification-sent', { title: 'Verification Email Sent' });
    } catch (error) {
        res.render('auth/register', { title: 'Register', error: error.message });
    }
});

router.get('/verify/:token', async(req, res) => {
    try {
        const user = await User.findOne({
            verificationToken: req.params.token,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('auth/verification-error', { title: 'Verification Error' });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        req.login(user, (err) => {
            if (err) return next(err);
            res.redirect('/');
        });
    } catch (error) {
        res.render('auth/verification-error', { title: 'Verification Error' });
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.render('auth/login', { title: 'Login', error: info.message });
        if (!user.isVerified) return res.render('auth/login', { title: 'Login', error: 'Please verify your email first.' });

        req.login(user, (err) => {
            if (err) return next(err);
            return res.redirect('/');
        });
    })(req, res, next);
});

router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

router.get('/forgot-password', (req, res) => {
    res.render('auth/forgot-password', { title: 'Forgot Password' });
});

router.post('/forgot-password', async(req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.render('auth/forgot-password', { title: 'Forgot Password', error: 'No account with that email address exists.' });
        }

        user.createPasswordResetToken();
        await user.save();

        const resetUrl = `http://${req.headers.host}/auth/reset-password/${user.resetPasswordToken}`;
        await transporter.sendMail({
            to: user.email,
            subject: 'Password Reset',
            html: emailTemplate(`
                <h1>Password Reset</h1>
                <p>Please click this link to reset your password:</p>
                <p><a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            `)
        });

        res.render('auth/reset-password-sent', { title: 'Reset Password Email Sent' });
    } catch (error) {
        res.render('auth/forgot-password', { title: 'Forgot Password', error: error.message });
    }
});

router.get('/reset-password/:token', async(req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('auth/reset-password-error', { title: 'Reset Password Error' });
        }

        res.render('auth/reset-password', { title: 'Reset Password', token: req.params.token });
    } catch (error) {
        res.render('auth/reset-password-error', { title: 'Reset Password Error' });
    }
});

router.post('/reset-password/:token', async(req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('auth/reset-password-error', { title: 'Reset Password Error' });
        }

        await user.setPassword(req.body.password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        req.login(user, (err) => {
            if (err) return next(err);
            res.redirect('/');
        });
    } catch (error) {
        res.render('auth/reset-password', { title: 'Reset Password', token: req.params.token, error: error.message });
    }
});

module.exports = router;