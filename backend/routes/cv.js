// backend/routes/cv.js
const express = require('express');
const router = express.Router();
const {
  uploadAndAnalyze,
  getHistory,
  getAnalysis,
  optimizeCV,
  deleteAnalysis
} = require('../controllers/cvController');
const { protect, checkQuota } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

// Toutes les routes nécessitent l'authentification
router.use(protect);

// Upload et analyse (avec vérification du quota)
router.post('/upload', checkQuota, upload.single('cv'), handleUploadError, uploadAndAnalyze);

// Historique des analyses
router.get('/history', getHistory);

// Détails d'une analyse
router.get('/analyze/:id', getAnalysis);

// Générer version optimisée
router.post('/optimize/:id', optimizeCV);

// Supprimer une analyse
router.delete('/:id', deleteAnalysis);

module.exports = router;