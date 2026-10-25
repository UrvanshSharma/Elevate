/**
 * Authentication & Authorization Middleware
 * Generates and verifies JWT tokens, enforces role-based access control,
 * and attaches authenticated user context to HTTP requests.
 */
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

/**
 * Generates a signed JWT for an authenticated user.
 * @param {Object} user - User document or object.
 * @returns {string} Signed JWT token.
 */
function generateToken(user) {
  const payload = {
    id: user._id ? user._id.toString() : user.id,
    email: user.email,
    role: user.role || 'student',
    name: user.name
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Extracts bearer token from headers or query parameters.
 * @param {express.Request} req
 * @returns {string|null}
 */
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

/**
 * Middleware: Strictly requires valid authentication.
 */
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

/**
 * Middleware: Attaches authenticated user context if a token is present,
 * but allows unauthenticated requests to continue with req.user = null.
 */
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

/**
 * Middleware factory: Enforces role-based authorization.
 * @param  {...string} allowedRoles - e.g. 'student', 'recruiter', 'admin'
 */
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
