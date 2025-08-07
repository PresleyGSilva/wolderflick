const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Função para criar uma pausa
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
console.log("Variáveis de ambiente carregadas:");

const QPANEL_URL = process.env.QPANEL_URL;
const QPANEL_USERNAME = process.env.QPANEL_USERNAME;
const QPANEL_PASSWORD = process.env.QPANEL_PASSWORD;

puppeteer.use(StealthPlugin());

async function capturarUsuarios() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    console.log("Acessando o Qpanel...");
    await page.goto(QPANEL_URL);
    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', QPANEL_USERNAME);
    await page.type('input[name="password"]', QPANEL_PASSWORD);
    await page.click('#kt_sign_in_submit');
    await page.waitForNavigation();

    console.log("Página de clientes carregada");
    await page.goto('https://cineflick2.qpanel.top/#/apps/customers/customers-listing');
    await page.waitForSelector('table tbody tr');

    // Adiciona um delay extra para garantir que o conteúdo dinâmico seja carregado
    await sleep(2000);

    // Capturando todos os dados de clientes próximos de vencer
    const usuariosProximosDeVencer = await page.evaluate(() => {
      const listaUsuarios = [];
      const rows = document.querySelectorAll('table tbody tr');

      console.log(`Número de linhas encontradas na tabela: ${rows.length}`);

      rows.forEach(row => {
        // Captura os dados conforme os seletores fornecidos
        const idElem = row.querySelector('td:nth-child(1) a');
        const dataExpiracaoElem = row.querySelector('td:nth-child(2) span');
        const situacaoElem = row.querySelector('td:nth-child(3) .alert-success');
        const nomeElem = row.querySelector('td:nth-child(4) small');
        const emailElem = row.querySelector('td:nth-child(4) a');
        
        // Verifica se todos os elementos foram encontrados e captura os dados
        if (idElem && dataExpiracaoElem && situacaoElem && nomeElem && emailElem) {
          const id = idElem.textContent.trim();
          const dataExpiracao = dataExpiracaoElem.textContent.trim();
          const situacao = situacaoElem.textContent.trim();
          const nome = nomeElem.textContent.trim();
          const email = emailElem.textContent.trim();

          console.log(`Usuário capturado: ID: ${id}, Nome: ${nome}, Email: ${email}, Situação: ${situacao}, Data de Expiração: ${dataExpiracao}`);

          // Adiciona cada usuário à lista
          listaUsuarios.push({ id, nome, email, situacao, dataExpiracao });
        }
      });

      return listaUsuarios;
    });

    console.log("Usuários próximos de vencer:", usuariosProximosDeVencer);

    if (usuariosProximosDeVencer.length === 0) {
      console.log("Nenhum usuário encontrado com a assinatura próxima de vencer.");
    }

    // Exibe cada usuário encontrado
    for (const usuario of usuariosProximosDeVencer) {
      console.log(`ID: ${usuario.id}, Nome: ${usuario.nome}, Email: ${usuario.email}, Situação: ${usuario.situacao}, Data de Expiração: ${usuario.dataExpiracao}`);
    }

  } catch (error) {
    console.error("Erro ao capturar ou salvar os usuários:", error);
  } finally {
    await browser.close();
  }
}

capturarUsuarios();
