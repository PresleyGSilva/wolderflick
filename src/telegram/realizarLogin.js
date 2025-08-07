const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
require('dotenv').config();

const QPANEL_URL = process.env.QPANEL_URL;
const QPANEL_USERNAME = process.env.QPANEL_USERNAME;
const QPANEL_PASSWORD = process.env.QPANEL_PASSWORD;

// Ativar o plugin Stealth
puppeteer.use(StealthPlugin());

// Função para iniciar o navegador com Stealth Plugin
async function iniciarBrowser() {
  return await puppeteer.launch({
    

    headless: true,// Garante que será executado em modo headless 
     args: [ '--no-sandbox', 
       '--disable-setuid-sandbox', 
       '--disable-dev-shm-usage', 
        '--disable-accelerated-2d-canvas',
         '--disable-gpu', 
     ],

  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let browser = null;
let page = null;

async function iniciarBrowserELogin() {
  try {
    // Se o navegador já estiver aberto, não reinicia
    if (browser && page) {
      console.log("Navegador e página já estão abertos e logados.");
      return { browser, page };
    }

    console.log("Iniciando o navegador...");
    browser = await puppeteer.launch({ headless: false });
    page = await browser.newPage();

    console.log("Realizando o login...");
    await realizarLogin(page);

    console.log("Login realizado com sucesso. O navegador continuará rodando em segundo plano.");

    // Fechar o navegador ao encerrar o processo
    process.on('SIGINT', async () => {
      console.log("\nEncerrando o navegador...");
      if (browser) await browser.close();
      process.exit();
    });

    return { browser, page };
  } catch (error) {
    console.error("Erro ao iniciar o navegador ou realizar o login:", error);
    if (browser) await browser.close();
    throw error;
  }
}

async function realizarLogin(page) {
  let tentativas = 3;
  while (tentativas > 0) {
    try {
      console.log("Navegando para a URL de login...");
      await page.goto(QPANEL_URL, { waitUntil: 'networkidle2' });
      await sleep(2000);

      console.log("Procurando o campo de usuário...");
      const usuarioSelector = "input[name='username']";
      await page.waitForSelector(usuarioSelector, { visible: true, timeout: 30000 });
      await page.type(usuarioSelector, QPANEL_USERNAME);

      console.log("Procurando o campo de senha...");
      const senhaSelector = "input[name='password']";
      await page.waitForSelector(senhaSelector, { visible: true, timeout: 30000 });
      await page.type(senhaSelector, QPANEL_PASSWORD);

      console.log("Procurando o botão de login...");
      const loginButtonSelector = "button[type='submit']";
      await page.waitForSelector(loginButtonSelector, { visible: true, timeout: 30000 });
      await page.click(loginButtonSelector);

      console.log("Aguardando a navegação após o login...");
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
      console.log("Login realizado com sucesso.");
      return;
    } catch (error) {
      console.error("Erro no login, tentando novamente...", error);
      tentativas -= 1;
      if (tentativas === 0) {
        console.error("Falha ao realizar login após várias tentativas.");
        if (browser) await browser.close();
        throw new Error("Falha ao realizar login após várias tentativas.");
      }
      console.log(`Tentativas restantes: ${tentativas}`);
      await sleep(3000);
    }
  }
}

module.exports = { iniciarBrowserELogin };
