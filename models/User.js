const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  profilePicture: { type: String, default: '/images/default-profile.png' },
  eventsCreated: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  eventsAttending: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }]
}, { timestamps: true });

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);