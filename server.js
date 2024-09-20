require('dotenv').config(); // For loading environment variables from .env file
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors'); // Import the cors package
const mongoose = require('mongoose');
const authRoutes = require('./auth');
const Username = require('./models/Username')

const app = express();
const port = 8000; // You can choose any port

// Middleware to parse JSON bodies
app.use(express.json());
// Use CORS middleware
app.use(cors());
// Initialize the GoogleGenerativeAI instance
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes); // Authentication routes

// Endpoint to handle content generation requests
app.post('/generate', async (req, res) => {
    const { email,prompt } = req.body;
    // Save the prompt in the database for the specified email
    
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        // Generate content using the model
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        console.log(result);
        // Function to parse special formatting
        const formatText = (text) => {
            // Replace ## with <h2> tags
            let formattedText = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');

            // Replace **text** with <strong> tags
            formattedText = formattedText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

            // Replace * text with <li> tags inside a <ul>
            formattedText = formattedText
                .split('\n') // Split the content into lines
                .filter(line => line.trim()) // Remove empty lines
                .map(line => {
                    if (line.startsWith('* ')) {
                        // Replace * with <li> tag
                        return `<li>${line.substring(2).trim()}</li>`;
                    }
                    // Return plain text
                    return line.trim();
                })
                .reduce((acc, line) => {
                    // Wrap all list items in a <ul> tag
                    if (line.startsWith('<li>')) {
                        if (!acc.endsWith('</ul>') && acc.includes('<ul>')) {
                            return acc + line;
                        }
                        return acc + (acc.includes('<ul>') ? line : `<ul>${line}`);
                    }
                    return acc + `<p>${line}</p>`; // Wrap non-list items in <p> tags
                }, '')
                .concat('</ul>'); // Close the <ul> tag

            return `<div style="padding: 10px; line-height: 1.6;">${formattedText}</div>`;
        };

        // Structure the response into a more organized HTML format
        const htmlResponse = formatText(responseText);
        // Find the user by email
        let user = await Username.findOne({ email });

        if (user) {
            // Add the new prompt to the prompts array
            user.prompts.push(prompt); // Push the new prompt to the array
            await user.save(); // Save the updated user
        } else {
            // Create a new user with the email and the first prompt
            user = new Username({ email, username: 'DefaultUsername', password: 'hashedpassword', prompts: [prompt] });
            await user.save();
        }

        console.log('Prompt saved to the database:', user);
        // Send the structured HTML response
        res.json({ text: htmlResponse });
    } catch (error) {
        // Handle errors
        console.error('Error generating content:', error);
        res.status(500).json({ error: 'Error generating content' });
    }


});
app.post('/get-prompts', async (req, res) => {
    const { email } = req.body;

    try {
        // Find the user by email
        const user = await Username.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Return the user's prompts
        res.json({ prompts: user.prompts });

    } catch (error) {
        // Handle errors
        console.error('Error fetching prompts:', error);
        res.status(500).json({ error: 'Error fetching prompts' });
    }
});
app.delete('/delete-prompt', async (req, res) => {
    const { email, index } = req.body;

    if (!email || index === undefined) {
        return res.status(400).json({ error: 'Email and index are required' });
    }

    try {
        // Find the user by email
        const user = await Username.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if the index is valid
        if (index < 0 || index >= user.prompts.length) {
            return res.status(400).json({ error: 'Invalid index' });
        }

        // Remove the prompt at the specified index
        user.prompts.splice(index, 1);
        await user.save(); // Save the updated user data

        // Return the updated list of prompts
        res.json({ message: 'Prompt deleted successfully', prompts: user.prompts });

    } catch (error) {
        // Handle errors
        console.error('Error deleting prompt:', error);
        res.status(500).json({ error: 'Error deleting prompt' });
    }
});




// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
