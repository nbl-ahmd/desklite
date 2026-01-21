const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  try {
    const sessionToken = req.headers.authorization?.split(' ')[1];
    if (!sessionToken) {
      return res.status(401).json({ error: 'Please authenticate' });
    }

    const tokenSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!tokenSecret) {
      console.error('JWT_SECRET / NEXTAUTH_SECRET not configured');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    try {
      const verified = jwt.verify(sessionToken, tokenSecret);
      if (!verified || typeof verified === 'string' || !verified.id) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      req.user = {
        id: verified.id,
        username: verified.username,
        shopId: verified.shopId || verified.id
      };

      return next();
    } catch (error) {
      console.error('Auth verification failed:', error.message);
      return res.status(401).json({ error: 'Please authenticate' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};