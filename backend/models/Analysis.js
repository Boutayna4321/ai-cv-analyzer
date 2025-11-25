// backend/models/Analysis.js
const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  // Résultats de l'analyse
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  strengths: [{
    type: String
  }],
  weaknesses: [{
    type: String
  }],
  missingSkills: [{
    type: String
  }],
  improvements: [{
    category: String,
    suggestion: String
  }],
  // Version optimisée
  optimizedVersion: {
    type: String,
    default: null
  },
  atsCompatible: {
    type: Boolean,
    default: false
  },
  // Détails extraits
  extractedData: {
    name: String,
    email: String,
    phone: String,
    skills: [String],
    experience: [String],
    education: [String]
  },
  // Statistiques
  processingTime: {
    type: Number, // en millisecondes
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
analysisSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Analysis', analysisSchema);