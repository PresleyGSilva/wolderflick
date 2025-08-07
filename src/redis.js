require('dotenv').config();
const Redis = require('ioredis');

// Conexão usando URL do .env
const redis = new Redis(process.env.REDIS_URL, {
  connectTimeout: 10000,
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
});

// Testar conexão
redis.ping()
  .then(result => {
    console.log('✅ Conexão bem-sucedida ao Redis:', result); // Espera 'PONG'
  })
  .catch(error => {
    console.error('❌ Erro ao conectar ao Redis:', error);
  });

module.exports = redis;
