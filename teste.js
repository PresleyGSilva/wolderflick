const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:docker@69.166.232.42:5432/cineflick_restore',
});

client.connect()
  .then(() => {
    console.log('✅ Conexão bem-sucedida!');
    return client.end();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar:', err.message);
  });
