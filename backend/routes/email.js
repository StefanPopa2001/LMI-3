const express = require('express');
const { Client } = require('node-mailjet');
const { verifyAdminToken } = require('../middleware/auth');

const router = express.Router();

const mailjet = new Client({
  apiKey: process.env.MJ_APIKEY_PUBLIC,
  apiSecret: process.env.MJ_APIKEY_PRIVATE
});

// Send test email
router.post('/test', verifyAdminToken, async (req, res) => {
  const { to, subject, text, html } = req.body || {};
  if (!to || !subject || (!text && !html)) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, (text or html)' });
  }
  if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
    return res.status(500).json({ error: 'Mailjet API keys not configured' });
  }
  try {
    const fromMatch = (process.env.MAIL_FROM || 'no-reply@example.com').match(/^(.+?)\s*<(.+)>$/);
    const fromName = fromMatch ? fromMatch[1].trim() : 'LMI App';
    const fromEmail = fromMatch ? fromMatch[2] : process.env.MAIL_FROM || 'no-reply@example.com';

    const request = mailjet
      .post("send", {'version': 'v3.1'})
      .request({
        "Messages":[
          {
            "From": {
              "Email": fromEmail,
              "Name": fromName
            },
            "To": [
              {
                "Email": to,
                "Name": to // or extract name if available
              }
            ],
            "Subject": subject,
            "TextPart": text || undefined,
            "HTMLPart": html || undefined
          }
        ]
      });

    const result = await request;
    res.json({ message: 'Email sent via Mailjet', id: result.body.Messages[0]?.To[0]?.MessageID || 'unknown' });
  } catch (e) {
    console.error('Email send error', e);
    res.status(500).json({ error: 'Failed to send email', details: e.message });
  }
});

module.exports = router;