// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin, validate } = require('../middleware/validators');

// Routes publiques
router.post('/register', validateRegister, validate, register);
router.post('/login', validateLogin, validate, login);

// Routes protégées
router.get('/me', protect, getMe);

module.exports = router;