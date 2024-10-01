const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

router.get('/', async (req, res) => {
  const events = await Event.find().sort('-createdAt').limit(5).populate('creator');
  res.render('index', { title: 'Home', events });
});

module.exports = router;