const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur auth:', error);
    res.status(401).json({
      success: false,
      message: 'Token invalide ou expiré'
    });
  }
};

exports.checkQuota = async (req, res, next) => {
  try {
    const allowed = req.user.canAnalyze();
    await req.user.save();
    if (allowed) return next();

    return res.status(403).json({
      success: false,
      message: 'Limite d’analyses atteinte. Passez au plan Premium.'
    });
  } catch (error) {
    console.error('Erreur quota:', error);
    res.status(500).json({
      success: false,
      message: 'Impossible de vérifier le quota'
    });
  }
};
