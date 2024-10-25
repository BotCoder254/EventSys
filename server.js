// server.js

const express = require('express');

const http = require('http');

const socketIo = require('socket.io');

const mongoose = require('mongoose');

const path = require('path');

const session = require('express-session');

const passport = require('passport');

const LocalStrategy = require('passport-local').Strategy;

const multer = require('multer');

const expressLayouts = require('express-ejs-layouts');

const methodOverride = require('method-override');

const flash = require('connect-flash');

const User = require('./models/User');

require('dotenv').config();



const app = express();

const server = http.createServer(app);

const io = socketIo(server);



// Connect to MongoDB

 
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Telvin:soulmind254@cluster0.b9jnw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {

    useNewUrlParser: true,

    useUnifiedTopology: true,

});



// Set up EJS as the view engine

app.use(expressLayouts);

app.set('layout', 'layouts/main');

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));



// Middleware

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));

app.use(express.json());

app.use(methodOverride('_method'));

app.use(session({

    secret: process.env.SESSION_SECRET || 'your_session_secret',

    resave: false,

    saveUninitialized: false,

}));

app.use(flash());

app.use(passport.initialize());

app.use(passport.session());



// Multer configuration for file uploads

const storage = multer.diskStorage({

    destination: function(req, file, cb) {

        cb(null, 'public/uploads/')

    },

    filename: function(req, file, cb) {

        cb(null, Date.now() + path.extname(file.originalname))

    }

});

const upload = multer({ storage: storage });



// Passport configuration

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());

passport.deserializeUser(User.deserializeUser());



// Make user data and flash messages available to all templates

app.use((req, res, next) => {

    res.locals.currentUser = req.user;

    res.locals.messages = req.flash();

    next();

});



// Routes

app.use('/', require('./routes/index'));

app.use('/auth', require('./routes/auth'));

app.use('/events', require('./routes/events'));

app.use('/users', require('./routes/users'));



// 404 handler

app.use((req, res, next) => {

    res.status(404).render('404', { title: 'Page Not Found' });

});



// Error handling middleware

app.use((err, req, res, next) => {

    console.error(err.stack);

    res.status(500).render('error', { title: 'Error', message: 'Something went wrong!' });

});



// Socket.io setup

io.on('connection', (socket) => {

    console.log('A user connected');

    socket.on('disconnect', () => {

        console.log('User disconnected');

    });

});



// Start the server

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {

    console.log(`Server is running on port ${PORT}`);

});


