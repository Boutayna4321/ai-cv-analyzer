// backend/controllers/cvController.js
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const { extractTextFromPDF, analyzeCV, generateOptimizedCV } = require('../utils/openai');
const { s3Configured, uploadFileToS3 } = require('../utils/storage');
const { getAnalysisQueue, isRedisAvailable } = require('../utils/queue');
const path = require('path');
const fs = require('fs').promises;

/**
 * @desc    Upload et analyse d'un CV (async via queue si Redis disponible, sinon sync)
 * @route   POST /api/cv/upload
 * @access  Private
 */
exports.uploadAndAnalyze = async (req, res) => {
  try {
    // Vérifier qu'un fichier a été uploadé
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier PDF fourni'
      });
    }

    // Créer l'entrée d'analyse avec statut 'processing'
    const analysis = await Analysis.create({
      userId: req.user.id,
      originalFileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      status: 'processing'
    });

    // Essayer d'utiliser la queue si Redis disponible
    const queue = getAnalysisQueue();
    if (queue && isRedisAvailable()) {
      try {
        const job = await queue.add(
          'analyze',
          {
            analysisId: analysis._id.toString(),
            userId: req.user.id.toString(),
            filePath: req.file.path,
            originalFileName: req.file.originalname
          },
          {
            jobId: `${analysis._id}`,
            removeOnComplete: true,
            removeOnFail: false
          }
        );
        console.log(`[CV] Job async créé: ${job.id}`);
        return res.status(202).json({
          success: true,
          message: 'Analyse en cours (async)...',
          data: {
            analysisId: analysis._id,
            status: 'processing',
            originalFileName: analysis.originalFileName
          }
        });
      } catch (queueErr) {
        console.warn('[CV] Erreur queue, traitement synchrone:', queueErr.message);
        // Fallback au traitement synchrone
      }
    }

    // Traitement synchrone (fallback si Redis non disponible)
    console.log('[CV] Traitement synchrone de l\'analyse');
    const startTime = Date.now();
    
    const cvText = await extractTextFromPDF(req.file.path);
    if (!cvText || cvText.trim().length < 100) {
      analysis.status = 'failed';
      analysis.errorMessage = 'Le CV ne contient pas assez de texte exploitable';
      await analysis.save();
      // Nettoyer le fichier
      try {
        await fs.unlink(req.file.path);
      } catch (e) {
        console.error('[CV] Erreur suppression fichier:', e.message);
      }
      return res.status(400).json({
        success: false,
        message: 'Le CV ne contient pas assez de texte. Vérifiez que le PDF est lisible.'
      });
    }

    // Analyser avec OpenAI
    const analysisResult = await analyzeCV(cvText);
    analysis.score = analysisResult.score;
    analysis.strengths = analysisResult.strengths;
    analysis.weaknesses = analysisResult.weaknesses;
    analysis.missingSkills = analysisResult.missingSkills;
    analysis.improvements = analysisResult.improvements;
    analysis.extractedData = analysisResult.extractedData;
    analysis.atsCompatible = analysisResult.atsCompatible;
    analysis.status = 'completed';
    analysis.processingTime = Date.now() - startTime;

    await analysis.save();

    // Upload S3 si configuré
    try {
      if (s3Configured() && req.file && req.file.path) {
        const key = `uploads/${req.user.id}_${Date.now()}${path.extname(req.file.originalname)}`;
        const s3Url = await uploadFileToS3(req.file.path, key);
        analysis.fileUrl = s3Url;
        await analysis.save();
        try {
          await fs.unlink(req.file.path);
        } catch (e) {
          console.error('[CV] Erreur suppression après S3:', e.message);
        }
      } else {
        // Supprimer le fichier local sinon
        try {
          await fs.unlink(req.file.path);
        } catch (e) {
          console.error('[CV] Erreur suppression fichier local:', e.message);
        }
      }
    } catch (err) {
      console.error('[CV] Erreur upload S3:', err);
    }

    // Incrémenter le compteur
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { analysesCount: 1 }
    });

    res.status(200).json({
      success: true,
      message: 'CV analysé avec succès',
      data: {
        analysisId: analysis._id,
        score: analysis.score,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        missingSkills: analysis.missingSkills,
        improvements: analysis.improvements,
        extractedData: analysis.extractedData,
        atsCompatible: analysis.atsCompatible,
        processingTime: analysis.processingTime
      }
    });

  } catch (error) {
    console.error('[CV] Erreur:', error);
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {
        console.error('[CV] Erreur suppression fichier:', e.message);
      }
    }
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'analyse du CV',
      error: error.message
    });
  }
};

/**
 * @desc    Obtenir l'historique des analyses
 * @route   GET /api/cv/history
 * @access  Private
 */
exports.getHistory = async (req, res) => {
  try {
    const analyses = await Analysis.find({ 
      userId: req.user.id,
      status: 'completed'
    })
    .sort({ createdAt: -1 })
    .select('-extractedData -optimizedVersion') // Exclure les données lourdes
    .limit(20);

    res.status(200).json({
      success: true,
      count: analyses.length,
      data: analyses
    });
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique'
    });
  }
};

/**
 * @desc    Obtenir une analyse spécifique
 * @route   GET /api/cv/analyze/:id
 * @access  Private
 */
exports.getAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analyse non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Erreur récupération analyse:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'analyse'
    });
  }
};

/**
 * @desc    Générer une version optimisée du CV
 * @route   POST /api/cv/optimize/:id
 * @access  Private
 */
exports.optimizeCV = async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analyse non trouvée'
      });
    }

    // Vérifier si déjà optimisé
    if (analysis.optimizedVersion) {
      return res.status(200).json({
        success: true,
        message: 'Version optimisée déjà disponible',
        data: {
          optimizedVersion: analysis.optimizedVersion
        }
      });
    }

    // Extraire le texte du PDF original
    const filePath = path.join(__dirname, '..', analysis.fileUrl.replace(/^\//, ''));
    const cvText = await extractTextFromPDF(filePath);

    // Générer la version optimisée
    const optimizedCV = await generateOptimizedCV(cvText, {
      score: analysis.score || 0,
      weaknesses: analysis.weaknesses || [],
      missingSkills: analysis.missingSkills || []
    });

    // Sauvegarder
    analysis.optimizedVersion = optimizedCV;
    await analysis.save();

    res.status(200).json({
      success: true,
      message: 'CV optimisé généré avec succès',
      data: {
        optimizedVersion: optimizedCV
      }
    });

  } catch (error) {
    console.error('Erreur optimisation CV:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'optimisation du CV',
      error: error.message
    });
  }
};

/**
 * @desc    Supprimer une analyse
 * @route   DELETE /api/cv/:id
 * @access  Private
 */
exports.deleteAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analyse non trouvée'
      });
    }

    // Supprimer le fichier
    const filePath = path.join(__dirname, '..', analysis.fileUrl.replace(/^\//, ''));
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      console.error('Fichier déjà supprimé ou introuvable');
    }

    // Supprimer l'analyse
    await analysis.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Analyse supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression analyse:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
};