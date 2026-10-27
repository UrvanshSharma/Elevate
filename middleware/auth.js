// JWT authentication and role-based access control
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

function resolveJwtSecret() {
  if (process.env.JWT_SECRET && !process.env.JWT_SECRET.includes('YOUR_JWT_SECRET')) {
    return process.env.JWT_SECRET.trim();
  }
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    try {
      const match = fs.readFileSync(envPath, 'utf8').match(/^\s*JWT_SECRET\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match && match[1] && !match[1].includes('YOUR_JWT_SECRET')) {
        return match[1].trim();
      }
    } catch (_) {}
  }
  return 'elevate_jwt_secret_2026_super_secure_key';
}

const JWT_SECRET = resolveJwtSecret();
const TOKEN_EXPIRY = '7d';

// Generate a JWT token for the user
function generateToken(user) {
  const payload = {
    id: user._id ? user._id.toString() : user.id,
    email: user.email,
    role: user.role || 'student',
    name: user.name
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Extract bearer token from headers or query string
function extractToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string') {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      return parts[1];
    }
    return authHeader;
  }
  if (req.headers['x-auth-token']) {
    return req.headers['x-auth-token'];
  }
  if (req.query && req.query.token) {
    return req.query.token;
  }
  return null;
}

// Block request if user is not authenticated
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Authentication required. Please log in or provide an Authorization header.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired authentication token. Please log in again.'
    });
  }
}

// Attach user if token is valid, otherwise proceed as guest
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (_) {
    req.user = null;
  }
  next();
}

// Restrict route to specific user roles
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden. Role '${req.user.role}' is not authorized to access this resource. Required: ${allowedRoles.join(' or ')}`
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  requireAuth,
  optionalAuth,
  requireRole,
  extractToken
};
