const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const JWT_SECRET = 'eaud-cbdc-secret-key-2024';
const usersFile = './users.json';

// Load users from file
function loadUsers() {
  try {
    const data = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(data).users;
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

// Hash password (for creating new users - run once)
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// Verify user credentials
function verifyUser(username, password) {
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  
  if (!user) {
    return null;
  }
  
  // For demo, we'll use simple comparison since we have pre-hashed passwords
  // In production, use bcrypt.compare
  if (username === 'rba_admin' && password === 'admin123') {
    return user;
  }
  if (username === 'banka_admin' && password === 'bankA123') {
    return user;
  }
  if (username === 'bankb_admin' && password === 'bankB123') {
    return user;
  }
  if (username === 'austrac_admin' && password === 'austrac123') {
    return user;
  }
  if (username === 'customer1' && password === 'pass123') {
    return user;
  }
  if (username === 'customer2' && password === 'pass123') {
    return user;
  }
  
  return null;
}

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      bank: user.bank,
      walletId: user.walletId
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Middleware to check authentication
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
  
  req.user = decoded;
  next();
}

// Middleware to check role
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
  };
}

module.exports = {
  verifyUser,
  generateToken,
  authenticate,
  requireRole,
  hashPassword
};
