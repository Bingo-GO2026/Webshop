import { createMollieClient } from '@mollie/api-client';
import emailjs from '@emailjs/nodejs';
import crypto from 'crypto';

// ── Genereer een gesigneerde token (geldig 72 uur) ──
function generateToken(city, email) {
  const expiry  = Date.now() + 72 * 60 * 60 * 1000; // 72 uur in ms
  const payload = `${city}:${email}:${expiry}`;
  const sig     = crypto
    .createHmac('sha256', process.env.TOKEN_SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(payload).toString('base64url') + '.' + sig;
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

      // ── Genereer de unieke game-link ──
      const token   = generateToken(city.toLowerCase(), email);
      const gameUrl = `${process.env.SITE_URL}/indexgame.html?token=${token}`;

      // ── Email 1: Bevestiging + game-link naar de KLANT ──
      const klantSubject = taal === 'en'
        ? `Your Bingo-Go ${city} link is ready!`
        : `Jouw Bingo-Go ${city} link staat klaar!`;

      const klantMessage = taal === 'en'
        ? `Hi!\n\nThank you for your purchase of Bingo-Go ${city}.\n\nYour unique game link (valid for 72 hours):\n${gameUrl}\n\nHave fun!\n\nBingo-Go team\nBingoGo015@gmail.com`
        : `Hoi!\n\nBedankt voor je aankoop van Bingo-Go ${city}!\n\nJouw unieke spellink (72 uur geldig):\n${gameUrl}\n\nVeel plezier!\n\nHet Bingo-Go team\nBingoGo015@gmail.com`;

      await emailjs.send(
        'service_btnh3o8',
        'template_ck7es5y',
        {
          to_email: email,
          name:     taal === 'en' ? 'Bingo-Go player' : 'Bingo-Go speler',
          reply_to: 'BingoGo015@gmail.com',
          subject:  klantSubject,
          message:  klantMessage,
        },
        {
          publicKey:  'L3s4ke2xIu6huThMC',
          privateKey: process.env.EMAILJS_PRIVATE_KEY,
        }
      );

      // ── Email 2: Notificatie naar de WINKEL (jullie zelf) ──
      await emailjs.send(
        'service_btnh3o8',
        'template_ck7es5y',
        {
          to_email: 'BingoGo015@gmail.com',
          name:     'Bingo-Go Webshop',
          reply_to: email,
          subject:  `✅ Nieuwe betaling ontvangen – Bingo-Go ${city}`,
          message:  `Betaling geslaagd!\n\nStad: ${city}\nKlant e-mail: ${email}\nBedrag: €19,95\nMollie ID: ${id}\nTaal: ${taal}\n\nGame link (72u):\n${gameUrl}`,
        },
        {
          publicKey:  'L3s4ke2xIu6huThMC',
          privateKey: process.env.EMAILJS_PRIVATE_KEY,
        }
      );
    }

    return res.status(200).send('OK');

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).send('Error');
  }
}
