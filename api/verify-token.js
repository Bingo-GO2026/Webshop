import crypto from 'crypto';

// Leid een vaste 4-letter game code af uit de HMAC-handtekening
// Zelfde alfabet als de client-side genereerCode functie
// Gebruik eerste 16 hex-chars van de HMAC als Firebase game key
// Deterministisch: zelfde token = altijd zelfde key
function sigNaarGameCode(sigHex) {
  return sigHex.substring(0, 16);
}

export default function handler(req, res) {
  // CORS — sta requests toe vanuit play.bingo-go.com
  res.setHeader('Access-Control-Allow-Origin', 'https://play.bingo-go.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Allow both GET and POST
  const token = req.method === 'POST' ? req.body?.token : req.query?.token;

  if (!token) {
    return res.status(400).json({ valid: false, error: 'Geen token meegegeven' });
  }

  try {
    const secret = process.env.TOKEN_SECRET;
    if (!secret) {
      console.error('TOKEN_SECRET is niet ingesteld in Vercel environment variables');
      return res.status(500).json({ valid: false, error: 'Server configuratie fout' });
    }

    // Token format: base64url(city:email:expiry).HMAC-signature
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) {
      return res.status(401).json({ valid: false, error: 'Ongeldig token formaat' });
    }

    const payloadB64  = token.substring(0, dotIndex);
    const signature   = token.substring(dotIndex + 1);
    const payload     = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const parts       = payload.split(':');

    if (parts.length < 3) {
      return res.status(401).json({ valid: false, error: 'Ongeldig token formaat' });
    }

    const city   = parts[0];
    const email  = parts[1];
    const expiry = parseInt(parts[2], 10);

    // Verify HMAC signature
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSig) {
      return res.status(401).json({ valid: false, error: 'Ongeldige token handtekening' });
    }

    // Check expiry (72 hours)
    if (Date.now() > expiry) {
      return res.status(401).json({ valid: false, expired: true, error: 'Link is verlopen (72 uur overschreden)' });
    }

    // Leid een unieke, stabiele game code af uit de handtekening
    const gameCode = sigNaarGameCode(expectedSig);

    return res.status(200).json({ valid: true, city, email, gameCode });

  } catch (err) {
    console.error('verify-token error:', err);
    return res.status(400).json({ valid: false, error: 'Token kon niet worden geverifieerd' });
  }
}
