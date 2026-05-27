import { createMollieClient } from '@mollie/api-client';
import crypto from 'crypto';

// ── Genereer een gesigneerde token (geldig 72 uur) ──
function generateToken(city, email) {
  const expiry  = Date.now() + 72 * 60 * 60 * 1000;
  const payload = `${city}:${email}:${expiry}`;
  const sig     = crypto
    .createHmac('sha256', process.env.TOKEN_SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(payload).toString('base64url') + '.' + sig;
}

// ── Verstuur email via EmailJS REST API (geen SDK nodig) ──
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing payment id' });

  try {
    const mollie  = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });
    const payment = await mollie.payments.get(id);

    if (payment.status === 'paid') {
      const { email, city, lang } = payment.metadata;
      const taal = lang || 'nl';

      const token   = generateToken(city.toLowerCase(), email);
      const gameUrl = `${process.env.SITE_URL}/indexgame.html?token=${token}`;

      // Email 1 → klant (bevestiging + game-link)
      await stuurEmail({
        to_email: email,
        name:     taal === 'en' ? 'Bingo-Go player' : 'Bingo-Go speler',
        reply_to: 'BingoGo015@gmail.com',
        subject:  taal === 'en'
          ? `Your Bingo-Go ${city} link is ready!`
          : `Jouw Bingo-Go ${city} link staat klaar!`,
        message: taal === 'en'
          ? `Hi!\n\nThank you for your purchase of Bingo-Go ${city}.\n\nYour unique game link (valid 72 hours):\n${gameUrl}\n\nHave fun!\n\nBingo-Go team\nBingoGo015@gmail.com`
          : `Hoi!\n\nBedankt voor je aankoop van Bingo-Go ${city}!\n\nJouw unieke spellink (72 uur geldig):\n${gameUrl}\n\nVeel plezier!\n\nHet Bingo-Go team\nBingoGo015@gmail.com`,
      });

      // Email 2 → winkel (notificatie)
      await stuurEmail({
        to_email: 'BingoGo015@gmail.com',
        name:     'Bingo-Go Webshop',
        reply_to: email,
        subject:  `✅ Nieuwe betaling – Bingo-Go ${city}`,
        message:  `Betaling geslaagd!\n\nStad: ${city}\nKlant: ${email}\nBedrag: €19,95\nMollie ID: ${id}\nTaal: ${taal}\n\nGame link:\n${gameUrl}`,
      });
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).send('Error');
  }
}
