const express = require('express');
const multer = require('multer');
const path = require('path');
const Event = require('../models/Event');
const { isLoggedIn } = require('../middleware/auth');  // Ensure this is correctly defined and imported
const router = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/events');  // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));  // Append timestamp to filename
  }
});

const upload = multer({ storage: storage });

// Route to get all events
router.get('/', async (req, res) => {
  const { search, category } = req.query;
  let query = {};
  if (search) {
    query.$or = [
      { title: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') }
    ];
  }
  if (category) {
    query.categories = category;
  }
  const events = await Event.find(query).populate('creator');
  res.render('events/index', { title: 'Events', events, search, category });
});

// Route to create event (protected by isLoggedIn middleware)
router.get('/create', isLoggedIn, (req, res) => {
  res.render('events/create', { title: 'Create Event' });
});

// Create event with image upload
router.post('/', isLoggedIn, upload.single('image'), async (req, res) => {
  const { title, description, date, location, categories } = req.body;
  const newEvent = new Event({
    title,
    description,
    date,
    location,
    creator: req.user._id,
    categories: categories.split(',').map(cat => cat.trim()),
    image: req.file ? `/uploads/events/${req.file.filename}` : null
  });
  await newEvent.save();
  req.user.eventsCreated.push(newEvent._id);
  await req.user.save();
  res.redirect('/events');
});

// Route to get event by ID
router.get('/:id', async (req, res) => {
  const event = await Event.findById(req.params.id).populate('creator attendees');
  if (!event) {
    return res.status(404).send('Event not found');
  }
  res.render('events/details', { title: event.title, event });
});

// RSVP route (protected by isLoggedIn middleware)
router.post('/:id/rsvp', isLoggedIn, async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event.attendees.includes(req.user._id)) {
    event.attendees.push(req.user._id);
    await event.save();
    req.user.eventsAttending.push(event._id);
    await req.user.save();
  }
  res.redirect(`/events/${event._id}`);
});

module.exports = router;
