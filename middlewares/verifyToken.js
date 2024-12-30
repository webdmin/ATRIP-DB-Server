// middlewares/verifyToken.js

const jwt = require('jsonwebtoken');

// Middleware to verify the token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Extract token from Authorization header

  if (!token) {
    return res.status(401).json({ error: 'No token provided, access denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token with the secret key
    req.user = decoded; // Attach the decoded user data to the request object
    next(); // Proceed to the next middleware/route handler
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired token' }); // Handle invalid token
  }
};

module.exports = verifyToken; // Export the middleware
