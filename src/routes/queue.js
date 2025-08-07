// webhookQueue.js
const Bull = require('bull');
const redis = require('redis');

// Cria a fila de webhooks
const filaWebhooks = new Bull('webhooks', process.env.REDIS_URL);

// Processamento de jobs da fila
filaWebhooks.process(async (job) => {
  try {
    console.log(`Processando webhook de ${job.data.plataforma}...`);
    const { plataforma, dadosVenda } = job.data;

    // Lógica para processar a venda conforme a plataforma
    switch (plataforma) {
      case 'KIRVANO':
        await processarVendaKirvano(dadosVenda);
        break;
      case 'BRAIP':
        await processarVendaBraip(dadosVenda);
        break;
      case 'MONETIZZE':
        await processarVendaMonetizze(dadosVenda);
        break;
      default:
        throw new Error('Plataforma desconhecida');
    }

    console.log(`Venda processada com sucesso para ${plataforma}`);
  } catch (error) {
    console.error('Erro no processamento do webhook:', error);
    throw error;
  }
});

// Registrar eventos para monitoramento
filaWebhooks.on('completed', (job, result) => {
  console.log(`Job ${job.id} concluído com sucesso`);
});

filaWebhooks.on('failed', (job, error) => {
  console.log(`Job ${job.id} falhou: ${error.message}`);
});

module.exports = filaWebhooks;
