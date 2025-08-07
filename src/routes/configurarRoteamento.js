const { roteadorWebhooks } = require('./webhook');

function configurarRoteamento(app) {
  app.post('/api/v1/webhook/kirvano', roteadorWebhooks);
  app.post('/api/v1/webhook', roteadorWebhooks);
  app.post('/api/v1/webhook/vekssell', roteadorWebhooks);
  app.post('/api/v1/webhook/cakto', roteadorWebhooks);
}

module.exports = { configurarRoteamento };
