const mongoose = require('mongoose');

let isMongoConnected = false;

const sanitizeUri = (uri) => {
  try {
    const parsed = new URL(uri);
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
  } catch (error) {
    return 'MongoDB';
  }
};

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI manquant dans les variables d’environnement');
    }

    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    isMongoConnected = true;
    const host = connection.connection.host;
    const dbName = connection.connection.name;
    console.log(`✅ MongoDB connecté (${host}/${dbName || 'default'})`);
    console.log(`📡 URI: ${sanitizeUri(process.env.MONGODB_URI)}`);
  } catch (error) {
    isMongoConnected = false;
    console.error('❌ Erreur MongoDB:', error.message);
    console.log('⚠️  Le serveur démarre quand même (mode dégradé sans DB)');
  }
};

const isDBConnected = () => isMongoConnected;

module.exports = connectDB;
module.exports.isDBConnected = isDBConnected;
