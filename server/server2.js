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

const downloadPath = path.join(__dirname, '../public/downloads'); // It's a good practice to use `downloadPath` instead of `downloadFolder` in app.use('/downloads', express.static(downloadFolder));
const downloadFolder = path.join(__dirname, '../public/downloads');
if (!fs.existsSync(downloadFolder)) {
    fs.mkdirSync(downloadFolder, { recursive: true });
}


const packages = ['pandas', 'python-docx', 'openpyxl'];

const installPackage = (pkg) => {
    return new Promise((resolve, reject) => {
        const process = spawn('pip', ['install', pkg]);

        process.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        process.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        process.on('close', (code) => {
            console.log(`pip install ${pkg} finished with code ${code}`);
            if (code !== 0) {
                reject(`Error installing ${pkg}`);
            } else {
                resolve();
            }
        });
    });
};

const installPackages = async () => {
    try {
        for (const pkg of packages) {
            await installPackage(pkg);
        }
        console.log("All packages installed successfully");
        // Proceed with your next steps here, e.g., send a response
        // res.send("All packages installed successfully");
    } catch (error) {
        console.error(error);
        // Send an error response if needed
        // res.status(500).send(error);
    }
};

installPackages();

const clearDownloadsFolder = () => {
    try {
        fs.readdirSync(downloadFolder).forEach((file) => {
            fs.unlinkSync(path.join(downloadFolder, file));
        });
        console.log('Downloads folder cleared successfully.');
    } catch (error) {
        console.error('Error clearing downloads folder:', error);
    }
};

// Base upload directory
const uploadFolder = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
}

// Specific directories for templates and Excel files
const templatesFolder = path.join(uploadFolder, 'templates');
const excelFolder = path.join(uploadFolder, 'excel');

[templatesFolder, excelFolder].forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
});

const outputFolder = path.join(__dirname, '../output');
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === "docx-files") {
            cb(null, templatesFolder);
        } else if (file.fieldname === "excel-file") {
            cb(null, excelFolder);
        } else {
            cb(new Error("Unknown file type"), '');
        }
    },
    filename: function (req, file, cb) {
        cb(null,file.originalname);
    }
});

const upload = multer({ storage: storage });

app.use('/downloads', express.static(downloadFolder));

app.post('/process-merge2', upload.fields([
    { name: 'docx-files', maxCount: 10 },
]), (req, res) => {

    const destinationPath = path.join(__dirname, '../public/columnfiles', 'column.txt');

    const pythonProcess = spawn('python', [
        './api/merge2.py',
        '--directory', templatesFolder,
        '--output', destinationPath
    ]);

    const sourcePath = path.join(__dirname, 'column.txt');
    
    fs.copyFile(sourcePath, destinationPath, (err) => {
        if (err) {
            console.error('Error occurred while copying the file:', err);
            return;
        }
        console.log('File copied successfully!');
    });    
    
    pythonProcess.on('close', (code) => {
        console.log(`Python script finished with code ${code}`);
        if (code !== 0) {
            return res.status(500).send("Error during processing");
        }
        res.redirect('/form.html');
    });        
    
});


app.post('/process-merge', upload.fields([
    { name: 'docx-files', maxCount: 10 },
    { name: 'excel-file', maxCount: 1 }
]), (req, res) => {

    
    const pythonProcess = spawn('python', [
        './api/merge.py',
        '--template_folder', templatesFolder,
        '--excel_folder', excelFolder,
        '--output_format', req.body['output-format'], // Ensure 'output-format' is being sent in the form data
        '--output_folder', outputFolder
    ]);
    
    let outputData = '';
    pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            if (!res.headersSent) {
                res.status(500).send('Error processing documents');
            }
            return;
        }

        const generatedFiles = fs.readdirSync(outputFolder);
        generatedFiles.forEach(file => {
            fs.renameSync(path.join(outputFolder, file), path.join(downloadFolder, file));
        });
        
        
        const pythonUpload = spawn('node', [
            'upload.js', 
            '--action', 'write',
            '--folder', downloadFolder
        ]);

        pythonUpload.stdout.on('data', (data) => {
            outputData += data.toString(); // outputData was already declared above and is reused here which may cause confusion
        });

        pythonUpload.on('close', (uploadCode) => {
            if (uploadCode !== 0) {
                console.error(`Upload process exited with code ${uploadCode}`);
                if (!res.headersSent) {
                    res.status(500).send('Error uploading documents');
                }
                return;
            }
            const downloadLinks = outputData.trim().split('\n');
            res.json(downloadLinks);
        });


        fs.readdirSync(templatesFolder).forEach(file => {
            fs.unlinkSync(path.join(templatesFolder, file));
        });

        fs.readdirSync(excelFolder).forEach(file => {
            fs.unlinkSync(path.join(excelFolder, file));
        });
    });
});

const destinationPath = path.join(__dirname, '../public/columnfiles');

function clearFolder(directory) {
    fs.readdir(directory, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            const filePath = path.join(directory, file);
            fs.stat(filePath, (err, stat) => {
                if (err) throw err;

                if (stat.isDirectory()) {
                    clearFolder(filePath);
                } else {
                    fs.unlink(filePath, err => {
                        if (err) throw err;
                        console.log(`Deleted file: ${filePath}`);
                    });
                }
            });
        }
    });
}

// Function to ensure the folder exists or create it if it doesn't
function ensureFolderExists(folder) {
    fs.access(folder, (err) => {
        if (err) {
            // If the folder does not exist, create it
            fs.mkdir(folder, { recursive: true }, (err) => {
                if (err) throw err;
                console.log(`Created folder: ${folder}`);
            });
        } else {
            // If the folder exists, clear its contents
            console.log(`Folder already exists, clearing contents: ${folder}`);
            clearFolder(folder);
        }
    });
}

app.post('/cleanup_downloads3', (req, res) => {
    clearDownloadsFolder(); // Clear the downloads folder on request
    spawn('node', [
        './upload.js', 
        '--action', 'delete'
    ]);
    res.status(200).send('Downloads folder has been cleared.');

    const uploadFolder = path.join(__dirname, '../uploads');
    const templatesFolder = path.join(uploadFolder, 'templates');
    const excelFolder = path.join(uploadFolder, 'excel');
    fs.readdirSync(templatesFolder).forEach(file => {
        fs.unlinkSync(path.join(templatesFolder, file));
    });

    fs.readdirSync(excelFolder).forEach(file => {
        fs.unlinkSync(path.join(excelFolder, file));
    });
});

app.post('/delete-folder', async (req, res) => {
    ensureFolderExists(destinationPath);
});

ensureFolderExists(destinationPath);

app.post('/cleanup_downloads1', (req, res) => {
    clearDownloadsFolder(); // Clear the downloads folder on request
    spawn('node', [
        './upload.js', 
        '--action', 'delete'
    ]);
    res.status(200).send('Downloads folder has been cleared.');
});

app.post('/send', (req, res) => {
    const { first_name, last_name, email, phone, subject } = req.body;

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
        text: `First Name: ${first_name}\nLast Name: ${last_name}\nEmail: ${email}\nPhone: ${phone}\nSubject: ${subject}`,
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).send('Error sending email: ' + error);
        }
        res.status(200).send('Message sent successfully!');
    });
});

app.post('/sendNEW', (req, res) => {
    const { your_name, email , subject } = req.body;

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
        text: `Name: ${your_name}\nEmail: ${email}\nText ${subject}`,
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).send('Error sending email: ' + error);
        }
        res.status(200).send('Message sent successfully!');
    });
});


// Serve static files from the public directory
app.use(express.static('../public'));


// const axios = require('axios');

// const urlToAccess = 'https://naman-portfolio-3.onrender.com/index.html'; // Replace with the URL you want to access
// const retryInterval = 300000; // Retry interval in milliseconds (5 seconds in this case)
// async function accessWebsite(url) {
//     try {
//         const response = await axios.get(url);
//         console.log(`Successfully accessed ${url}. Status: ${response.status}`);
//         return true; // Return true if successfully accessed
//     } catch (error) {
//         console.error(`Error accessing ${url}:`, error.message);
//         return false; // Return false if error occurred
//     }
// }
// async function continuouslyAccessWebsite(url, interval) {
//     setInterval(async () => {
//         console.log(`Attempting to access ${url}...`);
//         const success = await accessWebsite(url);
//         if (success) {
//             console.log(`Successfully accessed ${url}. Stopping retries.`);
//             clearInterval(this); // Stop further retries if successful
//         }
//     }, interval);
// }
// continuouslyAccessWebsite(urlToAccess, retryInterval);
// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});