const mongoose = require('mongoose');

// Define the schema for your Username collection with an array of prompts
const usernameSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    prompts: [{ type: String }], // Store multiple prompts as an array
}, { timestamps: true }); // Optional: adds createdAt and updatedAt fields

// Export the model
module.exports = mongoose.model('Username', usernameSchema, 'Username');
