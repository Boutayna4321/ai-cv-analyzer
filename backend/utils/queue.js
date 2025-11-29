const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let connection = null;
let isRedisAvailable = false;

const getRedisConnection = () => {
  if (!connection) {
    connection = new Redis(redisUrl, { retryStrategy: () => null, maxRetriesPerRequest: null });
    connection.on('error', (err) => {
      console.warn('[Queue] Redis non disponible, les analyses seront traitées synchronement');
      isRedisAvailable = false;
    });
    connection.on('connect', () => {
      isRedisAvailable = true;
      console.log('[Queue] Connecté à Redis');
    });
  }
  return connection;
};

const getAnalysisQueue = () => {
  try {
    if (!isRedisAvailable) {
      getRedisConnection().ping().then(() => {
        isRedisAvailable = true;
      }).catch(() => {
        isRedisAvailable = false;
      });
    }
  } catch (e) {
    isRedisAvailable = false;
  }

  if (!isRedisAvailable) {
    return null;
  }

  return new Queue('analysis', {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  });
};

module.exports = {
  getAnalysisQueue,
  isRedisAvailable: () => isRedisAvailable,
  getRedisConnection
};

