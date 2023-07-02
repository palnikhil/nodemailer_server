const express = require('express');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;
app.use(express.json())
// Load client credentials
const credentials = require('./credentials.json');
const token = require('./token.json')

// // Create OAuth2 client
// const oAuth2Client = new OAuth2Client(
//   credentials.installed.client_id,
//   credentials.installed.client_secret,
//   credentials.installed.redirect_uris[0]
// );

// Set up the OAuth2 client
oAuth2Client.setCredentials({
  refresh_token: token.refresh_token,
});

// Create a transport for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    // type: 'OAuth2',
    user: 'your_email',
    // clientId: credentials.installed.client_id,
    // clientSecret: credentials.installed.client_secret,
    refreshToken: token.refresh_token,
    // accessToken: oAuth2Client.getAccessToken(),accessToken: oAuth2Client.getAccessToken(),
    pass: "your_password"
  },
});

// Store replied emails
const repliedEmails = new Set();

// Gmail API client
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

// Create a label if it doesn't exist
async function createLabel() {
  const labelName = 'Vacation Auto-Reply'; // Specify the label name

  try {
    const response = await gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name: labelName,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      },
    });

    console.log(`Label '${labelName}' created with ID: ${response.data.id}`);
  } catch (error) {
    console.error('Error creating label:', error);
  }
}

// Apply the label to the email
async function applyLabel(emailId, labelId) {
  try {
    await gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        addLabelIds: [labelId],
      },
    });

    console.log(`Label applied to email ID ${emailId}`);
  } catch (error) {
    console.error('Error applying label to email:', error);
  }
}

// Handle incoming email webhook notifications
app.post('/webhook', async (req, res) => {
  // Process the email payload here
  const email = req.body; // Example payload format

  // Check if the email has already been replied to
  if (repliedEmails.has(email.id)) {
    console.log(`Email ${email.id} has already been replied to.`);
    res.sendStatus(200);
    return;
  }

  // Send an automated response
  const mailOptions = {
    from: 'mazedtechnologies@gmail.com',
    to: email.from,
    subject: 'Auto-Reply',
    text: 'Thank you for your email. I am currently out on vacation and will respond to you as soon as possible.',
  };

  transporter.sendMail(mailOptions, async (error, info) => {
    if (error) {
      console.error(error);
    } else {
      console.log('Email sent:', info.response);
      repliedEmails.add(email.id); // Add the email ID to the replied set

      // Create the label if it doesn't exist
      await createLabel();

      // Apply the label to the replied email
      await applyLabel(email.id, 'LABEL_ID'); // Replace 'LABEL_ID' with the actual label ID
}
});

res.sendStatus(200);
});

// Start the server
app.listen(port, () => {
console.log(`Server running on http://localhost:${port}`);
});
