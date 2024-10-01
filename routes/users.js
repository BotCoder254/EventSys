const express = require('express');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const { isLoggedIn } = require('../middleware/auth');
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/profiles')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

router.get('/profile', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.user._id).populate('eventsCreated eventsAttending');
  res.render('users/profile', { title: 'My Profile', user });
});

router.post('/profile', isLoggedIn, upload.single('profilePicture'), async (req, res) => {
  const { name } = req.body;
  const updates = { name };
  if (req.file) {
    updates.profilePicture = `/uploads/profiles/${req.file.filename}`;
  }
  await User.findByIdAndUpdate(req.user._id, updates);
  res.redirect('/users/profile');
});

module.exports = router;