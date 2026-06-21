const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isAdmin: {
        type: Boolean,
        required: true,
        default: false // அட்மின் (நீங்கள்) லாகின் செய்ய இது பயன்படும்
    }
}, { timestamps: true }); // எப்போது அக்கவுண்ட் ஓபன் செய்தார்கள் என்ற நேரத்தை குறித்துக்கொள்ளும்

module.exports = mongoose.model('User', userSchema);
