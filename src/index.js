const express = require('express');
require('dotenv').config();
const { configurarRoteamento } = require('../src/routes/configurarRoteamento');
const { processarFilaVendas } = require('./routes/processarFilaVendas');
const { iniciarBrowserELogin } = require('./telegram/realizarLogin');
const { PagamentosService } = require('./telegram/pagamentos.service');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Iniciar monitoramento de pagamentos
const pagamentosService = new PagamentosService();
pagamentosService.iniciarMonitoramento();

// Configurar rotas
configurarRoteamento(app);

// Função keep-alive para manter o banco ativo
function iniciarKeepAlive() {
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Keep-alive: conexão com o banco mantida.');
    } catch (error) {
      console.error('Erro no keep-alive do banco:', error.message);
    }
  }, 1000 * 60 * 5); // A cada 5 minutos
}

iniciarKeepAlive(); // Inicia o keep-alive


// Inicializar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
