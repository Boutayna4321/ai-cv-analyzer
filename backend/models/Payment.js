const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stripeCustomerId: String,
  stripeSessionId: String,
  plan: {
    type: String,
    enum: ['free', 'premium'],
    default: 'premium'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'cancelled'],
    default: 'pending'
  },
  amount: Number,
  currency: {
    type: String,
    default: 'mad'
  },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
