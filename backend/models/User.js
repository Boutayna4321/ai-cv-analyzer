// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: 6,
    select: false
  },
  planType: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  analysesCount: {
    type: Number,
    default: 0
  },
  monthlyAnalysesReset: {
    type: Date,
    default: Date.now
  },
  stripeCustomerId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Hash password avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Méthode pour vérifier le mot de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Vérifier les quotas d'analyses
userSchema.methods.canAnalyze = function() {
  if (this.planType === 'premium') return true;
  
  // Réinitialiser le compteur si le mois est passé
  const now = new Date();
  const resetDate = new Date(this.monthlyAnalysesReset);
  if (now.getMonth() !== resetDate.getMonth() || 
      now.getFullYear() !== resetDate.getFullYear()) {
    this.analysesCount = 0;
    this.monthlyAnalysesReset = now;
  }
  
  return this.analysesCount < 3; // Limite gratuite : 3 analyses/mois
};

module.exports = mongoose.model('User', userSchema);