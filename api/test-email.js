import crypto from 'crypto';

function generateToken(city, email) {
  const expiry  = Date.now() + 72 * 60 * 60 * 1000;
  const payload = `${city}:${email}:${expiry}`;
  const sig     = crypto
    .createHmac('sha256', process.env.TOKEN_SECRET)
    .update(payload)
    .digest('hex');
  return {
    token:  Buffer.from(payload).toString('base64url') + '.' + sig,
    expiry,
    now:    Date.now(),
  };
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
  const { city, email } = req.query;

  if (!city || !email) {
    return res.status(400).json({ error: 'city en email zijn verplicht' });
  }

  try {
    const { token, expiry, now } = generateToken(city.toLowerCase(), email);
    const gameUrl = `https://play.bingo-go.com/index.html?token=${token}`;

    await stuurEmail({
      to_email: email,
      name:     'Bingo-Go speler',
      reply_to: 'BingoGo015@gmail.com',
      subject:  `[TEST] Jouw Bingo-Go ${city} link staat klaar!`,
      message:  `Hoi!\n\nDit is een TEST e-mail.\n\nJouw unieke spellink (72 uur geldig):\n${gameUrl}\n\nVeel plezier!\n\nHet Bingo-Go team\nBingoGo015@gmail.com`,
    });

    return res.status(200).json({ ok: true, gameUrl, debug_expiry: expiry, debug_now: now });
  } catch (err) {
    console.error('test-email error:', err);
    return res.status(500).json({ error: err.message });
  }
}
