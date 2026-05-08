const express = require('express');
const { google } = require('googleapis');
const User = require('../models/User');
const Config = require('../models/Config');

const router = express.Router();

function makeOAuth2Client(redirectUri) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri,
  );
}

// Callback for per-manager Google Calendar connection
router.get('/google/callback', async (req, res) => {
  const code = String(req.query.code || '').trim();
  const userId = String(req.query.state || '').trim();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code || !userId) {
    return res.redirect(`${frontendUrl}/people?gcal=error`);
  }

  try {
    const oauth2Client = makeOAuth2Client(process.env.GOOGLE_OAUTH_REDIRECT_URI);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return res.redirect(`${frontendUrl}/people?gcal=no_refresh_token`);
    }

    await User.updateOne(
      { id: userId },
      { $set: { googleRefreshToken: tokens.refresh_token, googleCalendarConnected: true } },
    );

    res.redirect(`${frontendUrl}/people?gcal=connected`);
  } catch (err) {
    console.error('Google OAuth callback error:', err.message);
    res.redirect(`${frontendUrl}/people?gcal=error`);
  }
});

// Callback for admin authorising the Gmail sender account
router.get('/gmail/callback', async (req, res) => {
  const code = String(req.query.code || '').trim();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${frontendUrl}/people?gmail=error`);
  }

  try {
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:4000'}/auth/gmail/callback`;
    const oauth2Client = makeOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return res.redirect(`${frontendUrl}/people?gmail=no_refresh_token`);
    }

    await Config.updateOne(
      { key: 'gmail_refresh_token' },
      { $set: { key: 'gmail_refresh_token', value: tokens.refresh_token } },
      { upsert: true },
    );
    await Config.updateOne(
      { key: 'gmail_sender_email' },
      { $set: { key: 'gmail_sender_email', value: tokens.id_token ? JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString()).email || '' : '' } },
      { upsert: true },
    );

    res.redirect(`${frontendUrl}/people?gmail=connected`);
  } catch (err) {
    console.error('Gmail OAuth callback error:', err.message);
    res.redirect(`${frontendUrl}/people?gmail=error`);
  }
});

module.exports = router;
