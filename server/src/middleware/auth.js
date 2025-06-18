const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  try {
    // Debug logging
    //console.log('Cookies:', req.cookies);
    //console.log('Headers:', req.headers);
    
    // Get the session token from the cookie
    const sessionToken = req.headers.authorization?.split(' ')[1];

    //console.log('token:', sessionToken);
    
    if (!sessionToken) {
      //console.log('No session token found');
      return res.status(401).json({ error: 'Please authenticate' });
    }

    try {
      // Decrypt the session token
      
      const decryptedToken = jwt.decode(sessionToken);
      
      if (!decryptedToken || typeof decryptedToken === 'string') {
        //console.log('Failed to decode session token');
        return res.status(401).json({ error: 'Invalid session' });
      }

      // Add user info to request
      req.user = {
        id: decryptedToken.id,
        username: decryptedToken.username
      };

      next();
    } catch (error) {
      //console.log('Auth error details:', error);
      return res.status(401).json({ error: 'Please authenticate' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}; 