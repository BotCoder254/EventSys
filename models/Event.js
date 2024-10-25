const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    image: { type: String },
    media: [{ type: String }],
    categories: [{ type: String }],
    maxAttendees: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);