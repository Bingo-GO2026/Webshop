// ── TIJDELIJK TESTBESTAND — verwijder dit als alles werkt ──
// Gebruik: https://jouw-vercel-url.vercel.app/api/test-email?city=delft&email=jouw@email.nl

import crypto from 'crypto';

function generateToken(city, email) {
  const expiry  = Date.now() + 72 * 60 * 60 * 1000;
  const payload = `${city}:${email}:${expiry}`;
  const sig     = crypto
    .createHmac('sha256', process.env.TOKEN_SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(payload).toString('base64url') + '.' + sig;
}

async function stuurEmail({ to_email, name, reply_to, subject, message }) {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id:  'service_btnh3o8',
      template_id: 'template_ck7es5y',
      user_id:     'L3s4ke2xIu6huThMC',
      accessToken: process.env.EMAILJS_PRIVATE_KEY,
      template_params: { to_email, name, reply_to, subject, message },
    }),
  });
  if (!res.ok) {
    const tekst = await res.text();
    throw new Error(`EmailJS fout (${res.status}): ${tekst}`);
  }
}

export default async function handler(req, res) {
  const city  = (req.query.city  || 'delft').toLowerCase();
  const email = req.query.email;

  if (!email) {
    return res.status(400).send(
      '<p style="font-family:sans-serif">Gebruik: <code>/api/test-email?city=delft&email=jouw@email.nl</code></p>'
    );
  }

  try {
    const token   = generateToken(city, email);
    const gameUrl = `${process.env.SITE_URL}/indexgame.html?token=${token}`;

    await stuurEmail({
      to_email: email,
      name:     'Bingo-Go speler',
      reply_to: 'BingoGo015@gmail.com',
      subject:  `🧪 TEST — Jouw Bingo-Go ${city} link`,
      message:  `Dit is een testmail.\n\nStad: ${city}\nGame link (72u geldig):\n${gameUrl}`,
    });

    return res.status(200).send(`
      <html><body style="font-family:sans-serif;padding:32px;max-width:600px">
        <h2>✅ Testmail verstuurd!</h2>
        <p>Email gestuurd naar: <strong>${email}</strong></p>
        <p>Stad: <strong>${city}</strong></p>
        <p>Game link (klik om direct te testen):<br>
          <a href="${gameUrl}" style="word-break:break-all">${gameUrl}</a>
        </p>
        <hr>
        <p style="color:grey;font-size:0.85rem">
          Vergeet api/test-email.js te verwijderen zodra alles werkt!
        </p>
      </body></html>
    `);
  } catch (err) {
    return res.status(500).send(`
      <html><body style="font-family:sans-serif;padding:32px">
        <h2>❌ Fout</h2>
        <pre>${err.message}</pre>
      </body></html>
    `);
  }
}
