import createMollieClient from '@mollie/api-client';
import emailjs from '@emailjs/nodejs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing payment id' });

  try {
    const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });
    const payment = await mollie.payments.get(id);

    if (payment.status === 'paid') {
      const { email, city, lang } = payment.metadata;

      // Send confirmation email via EmailJS
      await emailjs.send(
        'service_btnh3o8',
        'template_ck7es5y',
        {
          name:     'Webshop bestelling (betaald)',
          reply_to: email,
          subject:  `✅ Betaling ontvangen – Bingo-Go ${city}`,
          message:  `Betaling geslaagd!\n\nStad: ${city}\nE-mail klant: ${email}\nBedrag: €19,95\nMollie ID: ${id}\nTaal: ${lang}`,
        },
        {
          publicKey: 'L3s4ke2xIu6huThMC',
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