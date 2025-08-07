const puppeteer = require('puppeteer-extra');
const { escapeMarkdown } = require('../utils/escapeMkarkdown');
const { iniciarBrowserELogin } = require('./realizarLogin');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Ativar o plugin Stealth
puppeteer.use(StealthPlugin());

// Função para iniciar o navegador com Stealth Plugin
async function iniciarBrowser() {
  return await puppeteer.launch({
    headless: true, // Garante que será executado em modo headless
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],
  });
}

// Função para clicar no botão "Teste Cine Flick"
async function clicarBotaoTesteCineFlick(page) {
  console.log("Clicando no botão 'Teste Cine Flick'...");

  await page.waitForSelector(
    'button.btn.btn-sm.btn-bg-light.btn-active-color-primary.w-100.d-md-flex.align-items-center.justify-content-between.mb-2',
    { visible: true }
  );

  const botao = await page.$(
    'button.btn.btn-sm.btn-bg-light.btn-active-color-primary.w-100.d-md-flex.align-items-center.justify-content-between.mb-2'
  );

  if (botao) {
    await botao.click();
    console.log("Botão 'Teste Cine Flick' clicado.");
  } else {
    throw new Error("Botão 'Teste Cine Flick' não encontrado.");
  }
}

// Função para capturar os dados do div
async function capturarDadosDoDiv(page) {
  console.log('Capturando dados do div...');

  await page.waitForSelector('div.d-flex.flex-column.pre', { visible: true, timeout: 60000 });

  const conteudo = await page.evaluate(() => {
    const div = document.querySelector('div.d-flex.flex-column.pre');
    return div ? div.innerText : null;
  });

  if (!conteudo) throw new Error('Conteúdo do div não encontrado.');

  // Linhas proibidas que não devem ser incluídas na resposta
  const linhasProibidas = [
    '✅ *NOSSA LOJA:* https://dns2.top/cineflick',
    '✅ *App EM APK (LINK DIRETO):*',
    '*DOWNLOAD:* https://dns2.top/cineflick/cineflick.apk',
    '380482',
    '437846',
    '795498'
  ];

  // Filtra o conteúdo removendo as linhas proibidas
  const linhasFiltradas = conteudo
    .split('\n')
    .filter((linha) => !linhasProibidas.some((proibida) => linha.includes(proibida)))
    .join('\n'); // Junta as linhas restantes para formatar corretamente

  // Retorna o conteúdo filtrado
  return linhasFiltradas;
}

// Função para fechar o modal
async function fecharModal(page) {
  console.log("Fechando o modal...");

  const botaoFecharSelector = "#playlistModal > div > div > div.modal-body.scroll-y > div.modal-footer.flex-center > button";
  
  await page.waitForSelector(botaoFecharSelector, { visible: true, timeout: 30000 });

  const botaoFechar = await page.$(botaoFecharSelector);

  if (botaoFechar) {
    await botaoFechar.click();
    console.log("Modal fechado.");
  } else {
    throw new Error("Botão 'Fechar' do modal não encontrado.");
  }
}

// Função principal para gerar o teste
async function gerarTeste(ctx) {
  let page;

  try {
    console.log("Preparando o ambiente para gerar o teste...");

    // Reutiliza a instância do navegador já aberta e logada
    const { browser, page } = await iniciarBrowserELogin();

    console.log("Iniciando o fluxo de geração de teste...");

    // Clica no botão "Teste Cine Flick"
    await clicarBotaoTesteCineFlick(page);

    // Captura os dados do div
    const dadosFiltrados = await capturarDadosDoDiv(page);
    console.log("Dados capturados:", dadosFiltrados);

    // Envia os dados para o Telegram
    await ctx.reply(
      `🆕 *Dados do Cliente:* \n\n${escapeMarkdown(dadosFiltrados)}`,
      { parse_mode: 'Markdown' }
    );

    // Fecha o modal
    await fecharModal(page);

    // Retorna à página inicial
    console.log("Voltando para o dashboard...");
    await page.goto(process.env.QPANEL_DASHBOARD_URL, { waitUntil: 'networkidle2' });

  } catch (error) {
    console.error("Erro ao gerar o teste:", error);
    await ctx.reply('❌ Ocorreu um erro ao tentar gerar o teste. Por favor, tente novamente.');
  }
}

module.exports = { gerarTeste };


