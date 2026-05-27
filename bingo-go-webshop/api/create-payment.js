import createMollieClient from '@mollie/api-client';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, city, lang } = req.body;

  // Basic validation
  if (!email || !city) {
    return res.status(400).json({ error: 'Email and city are required' });
  }

  try {
    const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

    const payment = await mollie.payments.create({
      amount: {
        currency: 'EUR',
        value: '19.95',
      },
      description: `Bingo-Go ${city} – Bingokaart`,
      redirectUrl: `${process.env.SITE_URL}/betaling-geslaagd.html?stad=${encodeURIComponent(city)}&email=${encodeURIComponent(email)}`,
      webhookUrl: `${process.env.SITE_URL}/api/webhook`,
      metadata: {
        email,
        city,
        lang: lang || 'nl',
      },
    });

    return res.status(200).json({ checkoutUrl: payment.getCheckoutUrl() });
  } catch (err) {
    console.error('Mollie error:', err);
    return res.status(500).json({ error: 'Betaling aanmaken mislukt. Probeer het opnieuw.' });
  }
}