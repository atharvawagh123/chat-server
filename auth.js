const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Username = require('./models/Username'); // Import the Username model
const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // Check if the user already exists
        const existingUser = await Username.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        // Hash the password before saving
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create a new user and save it to the database
        const newUser = new Username({ username, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Find the user by email
        const user = await Username.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid email or password' });

        // Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid email or password' });

        // Generate JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        // Optionally set token in a cookie (or send it in response)
        res.cookie('token', token, { httpOnly: true, secure: true }); // Optional
        res.json({ token, message: 'Login successful',user });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout user (clears token from client-side)
router.post('/logout', (req, res) => {
    // Optionally clear the token cookie
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
