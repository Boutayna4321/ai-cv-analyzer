// backend/routes/payment.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateCreateSession, validate } = require('../middleware/validators');
const {
  createCheckoutSession,
  handleWebhook,
  getSubscriptionStatus
} = require('../controllers/paymentController');

/**
 * @desc    Créer une session de paiement Stripe
 * @route   POST /api/payment/create-session
 * @access  Private
 */
router.post('/create-session', protect, validateCreateSession, validate, createCheckoutSession);

/**
 * @desc    Webhook Stripe pour gérer les événements
 * @route   POST /api/payment/webhook
 * @access  Public (validé par Stripe)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

/**
 * @desc    Obtenir le statut de l'abonnement
 * @route   GET /api/payment/subscription-status
 * @access  Private
 */
router.get('/subscription-status', protect, getSubscriptionStatus);

module.exports = router;