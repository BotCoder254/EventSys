const express = require('express');

const multer = require('multer');

const path = require('path');

const Event = require('../models/Event');

const User = require('../models/User');

const { isLoggedIn } = require('../middleware/auth');

const router = express.Router();

const nodemailer = require('nodemailer');

const Notification = require('../models/Notification');

const emailTemplate = require('../utils/emailTemplate'); // Ensure this is imported



// Nodemailer transporter setup (replace with your email service details)

const transporter = nodemailer.createTransport({

    service: 'Gmail',

    auth: {

        user: process.env.EMAIL_USERNAME,

        pass: process.env.EMAIL_PASSWORD

    }

});



// Multer setup for file uploads

const storage = multer.diskStorage({

    destination: function(req, file, cb) {

        cb(null, 'public/uploads/events');

    },

    filename: function(req, file, cb) {

        cb(null, Date.now() + path.extname(file.originalname));

    }

});



const upload = multer({ storage: storage });



// Route to get all events

router.get('/', async(req, res) => {

    try {

        const events = await Event.find().sort('-createdAt').populate('creator');

        res.render('events/index', {

            title: 'Events',

            events,

            breadcrumbs: [{ label: 'Events', url: '/events' }],

            search: req.query.search || '',

            category: req.query.category || '',

            currentPage: 1,

            totalPages: 1

        });

    } catch (error) {

        console.error('Error fetching events:', error);

        res.status(500).render('error', { message: 'Error fetching events' });

    }

});



// Route to create event (protected by isLoggedIn middleware)

router.get('/create', isLoggedIn, (req, res) => {

    res.render('events/create', { title: 'Create Event' });

});



// Create event with image upload

router.post('/', isLoggedIn, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'media', maxCount: 5 }]), async(req, res) => {

    const { title, description, date, location, categories, maxAttendees, price, isPublic } = req.body;

    const newEvent = new Event({

        title,

        description,

        date,

        location,

        creator: req.user._id,

        categories: Array.isArray(categories) ? categories : [categories], // Handle multiple categories

        image: req.files.image ? `/uploads/events/${req.files.image[0].filename}` : null,

        media: req.files.media ? req.files.media.map(file => `/uploads/events/${file.filename}`) : [],

        maxAttendees: maxAttendees || 0,

        price: price || 0,

        isPublic: isPublic === 'on'

    });

    await newEvent.save();

    req.user.eventsCreated.push(newEvent._id);

    await req.user.save();

    req.flash('success', 'Event created successfully!');

    res.redirect('/events');

});



// Route to get event by ID

router.get('/:id', async(req, res) => {

    const event = await Event.findById(req.params.id).populate('creator attendees');

    if (!event) {

        return res.status(404).render('404', { title: 'Event Not Found' });

    }

    res.render('events/details', {

        title: event.title,

        event,

        host: req.headers.host

    });

});



// Route to edit event

router.get('/:id/edit', isLoggedIn, async(req, res) => {

    const event = await Event.findById(req.params.id);

    if (!event) {

        return res.status(404).send('Event not found');

    }

    if (event.creator.toString() !== req.user._id.toString()) {

        return res.status(403).send('You are not authorized to edit this event');

    }

    res.render('events/edit', { title: 'Edit Event', event });

});



// Update event

router.put('/:id', isLoggedIn, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'media', maxCount: 5 }]), async(req, res) => {

    const { title, description, date, location, categories, maxAttendees, price, isPublic } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {

        return res.status(404).send('Event not found');

    }

    if (event.creator.toString() !== req.user._id.toString()) {

        return res.status(403).send('You are not authorized to edit this event');

    }

    event.title = title;

    event.description = description;

    event.date = date;

    event.location = location;

    event.categories = categories.split(',').map(cat => cat.trim());

    event.maxAttendees = maxAttendees || 0;

    event.price = price || 0;

    event.isPublic = isPublic === 'on';

    if (req.files.image) {

        event.image = `/uploads/events/${req.files.image[0].filename}`;

    }

    if (req.files.media) {

        event.media = req.files.media.map(file => `/uploads/events/${file.filename}`);

    }

    await event.save();

    res.redirect(`/events/${event._id}`);

});



// Delete event

router.delete('/:id', isLoggedIn, async(req, res) => {

    const event = await Event.findById(req.params.id);

    if (!event) {

        return res.status(404).send('Event not found');

    }

    if (event.creator.toString() !== req.user._id.toString()) {

        return res.status(403).send('You are not authorized to delete this event');

    }

    await Event.findByIdAndDelete(req.params.id);

    res.redirect('/events');

});



// RSVP route (protected by isLoggedIn middleware)

router.post('/:id/rsvp', isLoggedIn, async(req, res) => {

    const event = await Event.findById(req.params.id).populate('creator');

    if (!event) {

        return res.status(404).send('Event not found');

    }

    if (event.attendees.includes(req.user._id)) {

        return res.status(400).send('You have already RSVP\'d to this event');

    }

    if (event.maxAttendees > 0 && event.attendees.length >= event.maxAttendees) {

        return res.status(400).send('This event is already full');

    }

    event.attendees.push(req.user._id);

    await event.save();

    req.user.eventsAttending.push(event._id);

    await req.user.save();



    // Send email to event creator

    const mailOptions = {

        from: process.env.EMAIL_USERNAME,

        to: event.creator.email,

        subject: `New RSVP for your event: ${event.title}`,

        html: emailTemplate(`

            <h1>New RSVP for your event</h1>

            <p><strong>${req.user.name}</strong> has RSVP'd to your event "${event.title}".</p>

            <p>Event details:</p>

            <ul>

                <li>Date: ${event.date.toLocaleDateString()}</li>

                <li>Location: ${event.location}</li>

            </ul>

            <p>You can view the full attendee list on the event page.</p>

        `)

    };



    transporter.sendMail(mailOptions, (error, info) => {

        if (error) {

            console.log('Error sending email:', error);

        } else {

            console.log('Email sent:', info.response);

        }

    });



    // Create a notification for the event creator

    const notification = new Notification({

        user: event.creator._id,

        message: `${req.user.name} has RSVP'd to your event "${event.title}".`,

        link: `/events/${event._id}`

    });

    await notification.save();



    res.redirect(`/events/${event._id}`);

});



// Clone an event

router.post('/:id/clone', isLoggedIn, async(req, res) => {

    const originalEvent = await Event.findById(req.params.id);

    if (!originalEvent) {

        return res.status(404).send('Event not found');

    }



    const newEvent = new Event({

        title: `Copy of ${originalEvent.title}`,

        description: originalEvent.description,

        date: originalEvent.date,

        location: originalEvent.location,

        creator: req.user._id,

        categories: originalEvent.categories,

        image: originalEvent.image,

        maxAttendees: originalEvent.maxAttendees,

        price: originalEvent.price,

        isPublic: originalEvent.isPublic

    });



    await newEvent.save();

    req.user.eventsCreated.push(newEvent._id);

    await req.user.save();



    res.redirect(`/events/${newEvent._id}/edit`);

});



// Cancel an event

router.post('/:id/cancel', isLoggedIn, async(req, res) => {

    const event = await Event.findById(req.params.id);

    if (!event) {

        return res.status(404).send('Event not found');

    }

    if (event.creator.toString() !== req.user._id.toString()) {

        return res.status(403).send('You are not authorized to cancel this event');

    }



    event.isCancelled = true;

    await event.save();



    // Notify attendees

    event.attendees.forEach(async(attendeeId) => {

        const notification = new Notification({

            user: attendeeId,

            message: `The event "${event.title}" has been cancelled.`,

            link: `/events/${event._id}`

        });

        await notification.save();

    });



    res.redirect(`/events/${event._id}`);

});



router.get('/search', async(req, res) => {

    const { q } = req.query;

    const events = await Event.find({

        $or: [

            { title: new RegExp(q, 'i') },

            { description: new RegExp(q, 'i') }

        ]

    }).limit(5);

    res.json(events.map(event => ({ title: event.title, url: `/events/${event._id}` })));

});



// Undo RSVP route

router.post('/:id/undo-rsvp', isLoggedIn, async (req, res) => {

    const event = await Event.findById(req.params.id);

    if (!event) {

        return res.status(404).send('Event not found');

    }

    const attendeeIndex = event.attendees.indexOf(req.user._id);

    if (attendeeIndex > -1) {

        event.attendees.splice(attendeeIndex, 1);

        await event.save();

        req.user.eventsAttending = req.user.eventsAttending.filter(eventId => eventId.toString() !== event._id.toString());

        await req.user.save();

    }

    res.redirect(`/events/${event._id}`);

});



// Route to get paginated attendees

router.get('/:id/attendees', async(req, res) => {

    const eventId = req.params.id;

    const page = parseInt(req.query.page) || 1;

    const limit = 10;

    const skip = (page - 1) * limit;



    try {

        const event = await Event.findById(eventId).populate('attendees', 'name profilePicture');

        const attendees = event.attendees.slice(skip, skip + limit);

        res.json({ attendees });

    } catch (error) {

        res.status(500).json({ error: 'An error occurred while fetching attendees' });

    }

});



module.exports = router;



