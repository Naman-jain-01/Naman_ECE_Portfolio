const { spawn } = require('child_process');
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser'); // Optional if using express built-in middleware

const app = express();
const port =4004;

app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(bodyParser.json()); // For parsing application/json

app.use(express.static('../public'));

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
