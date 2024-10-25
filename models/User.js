const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    profilePicture: { type: String, default: '/images/default-profile.png' },
    eventsCreated: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    eventsAttending: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationTokenExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, { timestamps: true });

UserSchema.methods.createVerificationToken = function() {
    this.verificationToken = crypto.randomBytes(32).toString('hex');
    this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
};

UserSchema.methods.createPasswordResetToken = function() {
    this.resetPasswordToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
};

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);