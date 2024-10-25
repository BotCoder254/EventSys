const express = require('express');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const { isLoggedIn } = require('../middleware/auth');
const router = express.Router();
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const moment = require('moment');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/profiles')
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

router.get('/profile', isLoggedIn, async(req, res) => {
    const user = await User.findById(req.user._id).populate('eventsCreated eventsAttending');
    res.render('users/profile', { title: 'My Profile', user });
});

router.post('/profile', isLoggedIn, upload.single('profilePicture'), async(req, res) => {
    const { name } = req.body;
    const updates = { name };
    if (req.file) {
        updates.profilePicture = `/uploads/profiles/${req.file.filename}`;
    }
    await User.findByIdAndUpdate(req.user._id, updates);
    res.redirect('/users/profile');
});

router.get('/dashboard', isLoggedIn, async(req, res) => {
    const user = await User.findById(req.user._id);
    const eventsCreated = await Event.find({ creator: user._id });
    const eventsAttending = await Event.find({ attendees: user._id });
    const notifications = await Notification.find({ user: req.user._id, isRead: false });

    // Prepare data for charts
    const categories = ['Music', 'Sports', 'Technology', 'Art', 'Food', 'Other'];
    const categoryData = categories.map(category =>
        eventsCreated.filter(e => e.categories.includes(category)).length
    );

    const attendeesData = eventsCreated.map(event => ({
        date: moment(event.date).format('YYYY-MM-DD'),
        attendees: event.attendees.length
    }));

    res.render('users/dashboard', {
        title: 'Dashboard',
        user,
        eventsCreated,
        eventsAttending,
        categoryData: JSON.stringify(categoryData),
        attendeesData: JSON.stringify(attendeesData),
        notifications
    });
});

router.get('/notifications', isLoggedIn, async(req, res) => {
    const notifications = await Notification.find({ user: req.user._id }).sort('-createdAt').limit(20);
    res.render('users/notifications', { title: 'Notifications', notifications });
});

router.get('/settings', isLoggedIn, (req, res) => {
    res.render('users/settings', { title: 'Account Settings' });
});

router.post('/notifications/:id/read', isLoggedIn, async (req, res) => {
    const notification = await Notification.findById(req.params.id);
    if (notification && notification.user.equals(req.user._id)) {
        notification.isRead = true;
        await notification.save();
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

module.exports = router;
