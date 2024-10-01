const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Register' });
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    const user = new User({ username, email, name });
    await User.register(user, password);
    passport.authenticate('local')(req, res, () => {
      res.redirect('/');
    });
  } catch (error) {
    res.render('auth/register', { title: 'Register', error: error.message });
  }
});

router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login' });
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/auth/login',
  failureFlash: true
}));

router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

module.exports = router;
