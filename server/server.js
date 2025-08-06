
// const { spawn } = require('child_process');
const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const app = express();
const port = 9000;

app.use(express.static('../public'));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));




app.post('/sendtech', (req, res) => {
    const { name, email, subject , message } = req.body;

    // Check if req.body is not undefined and contains the expected properties
    if (!req.body) {
        return res.status(400).send('Request body is missing');
    }

    // Create a transporter object using SMTP transport
    const transporter = nodemailer.createTransport({
        service: 'Gmail', // You can use other services like 'Yahoo', 'Outlook', etc.
        auth: {
            user: 'namanjain2004.in@gmail.com', // Replace with your email
            pass: 'crvv bmzs iqkw fphu', // Replace with your email password
        },
    });

    // Setup email data
    const mailOptions = {
        from: email,
        to: 'naman.jain22b@iiitg.ac.in', // Replace with your email
        subject: 'New Contact Form Submission',
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}`,
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).send('Error sending email: ' + error);
        }
        res.status(200).send('Message sent successfully!');
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});