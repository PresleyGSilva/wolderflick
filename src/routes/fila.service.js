const { processarVendaKirvano } = require('../venda/vendas.service.js');
const { processarVendaBraip } = require('../venda/vendas.service.js');
const { processarVendaMonetizze } = require('../venda/vendas.service.js');
const Queue = require('bull');
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Criação da fila para processar webhooks
const filaWebhooks = new Queue('webhooks', redisUrl);

// Verificação das funções importadas
console.log('Função processarVendaKirvano:', typeof processarVendaKirvano);
console.log('Função processarVendaBraip:', typeof processarVendaBraip);
console.log('Função processarVendaMonetizze:', typeof processarVendaMonetizze);

// Processamento da fila de webhooks
filaWebhooks.process(async (job) => {
  const { funcao, dados } = job.data;

  // Verifica se a função passada no job é válida
  if (typeof funcao !== 'function') {
    console.error('A função fornecida não é válida', funcao);
    throw new Error('A função fornecida não é válida.');
  }

  // Executa a função passada no job
  try {
    console.log(`Iniciando o processamento do job ${job.id} com a função ${funcao.name}`);
    const resultado = await funcao(dados);
    console.log(`Job ${job.id} processado com sucesso.`);
    return resultado;
  } catch (error) {
    console.error(`Erro ao processar o job ${job.id}: ${error.message}`, error.stack);
    throw error; // Repassa o erro para o Bull registrar como falha
  }
});

// Evento quando o job é completado com sucesso
filaWebhooks.on('completed', (job) => {
  console.log(`Job ${job.id} concluído com sucesso.`);
});

// Evento quando o job falha
filaWebhooks.on('failed', (job, err) => {
  console.error(`Job ${job.id} falhou: ${err.message}`);
});

module.exports = { filaWebhooks };
