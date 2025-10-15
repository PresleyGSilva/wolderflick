require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { criarUsuarioQpanel } = require('../qpanel/qpanel.service.js');
const { renovarUsuarioQpanel } = require('../qpanel/renovarAssinaturaQpanel.js');
const { logiNenviarEmail } = require('../email/email.sevice.js');
const { calcularExpiracao } = require('../utils/utils.js');
const { obterPacote } = require('../utils/pacotes.js');
const fs = require('fs');
const path = require('path');
const { formatInTimeZone } = require('date-fns-tz');

const prisma = new PrismaClient();
const TELEGRAM_JSON = path.resolve(__dirname, 'enviados.json');

// Inicializa JSON de enviados
let enviadosTelegram = [];
if (fs.existsSync(TELEGRAM_JSON)) {
  try {
    enviadosTelegram = JSON.parse(fs.readFileSync(TELEGRAM_JSON, 'utf-8'));
  } catch { enviadosTelegram = []; }
}

function salvarEnviados() {
  fs.writeFileSync(TELEGRAM_JSON, JSON.stringify(enviadosTelegram, null, 2));
}

// -------------------- UTILITÁRIOS --------------------
function formatarDataBrasil(data) {
  try {
    if (!data || isNaN(new Date(data))) throw new Error("Data inválida");
    return formatInTimeZone(new Date(data), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  } catch {
    return 'Data inválida';
  }
}

function formatarNumeroSemMais(numero) {
  return numero.replace(/\D/g, '');
}

// -------------------- FILA DE VENDAS --------------------
let filaDeVendas = [];
let processando = false;

function adicionarVendaAFila(dadosVenda) {
  filaDeVendas.push(dadosVenda);
  processarFila();
}

function verificarTamanhoDaFila() {
  return filaDeVendas.length;
}

function verificarFilaVazia() {
  return filaDeVendas.length === 0;
}

function obterDetalhesDaFila() {
  return {
    tamanho: filaDeVendas.length,
    emProcessamento: processando,
    vendasPendentes: filaDeVendas.map((venda, index) => ({
      indice: index + 1,
      nome: venda.nome,
      email: venda.email,
      plano: venda.plano,
    })),
  };
}

// -------------------- PROCESSAMENTO --------------------
async function enviarConfirmacaoRenovacao(email, { usuario, proximoVencimento }) {
  console.log(`✉️ Confirmacao de renovação: ${usuario} (${email}) - vence em ${proximoVencimento}`);
}

async function processarFila() {
  if (processando || filaDeVendas.length === 0) return;
  processando = true;

  const dadosVenda = filaDeVendas.shift();

  try {
    const { nome, email, celular, cpf, dataCriacao, plano, valor, plataforma, emailAfiliado } = dadosVenda;

    const nomeFormatado = (nome || '').trim();
    const emailFormatado = (email || '').trim();
    const celularFormatado = formatarNumeroSemMais(celular || '');
    const cpfFormatado = (cpf || '').trim();

    if (!nomeFormatado || !emailFormatado || !celularFormatado || !cpfFormatado) {
      throw new Error('Dados incompletos ou inválidos');
    }

    const pacote = obterPacote(plano, valor, null);
    if (!pacote || !pacote.packageId) throw new Error('Pacote não encontrado');

    // Verifica se já existe usuário
    let usuarioBanco = await prisma.usuarioQpanel.findFirst({
      where: {
        OR: [
          { nome: nomeFormatado },
          { email: emailFormatado },
          { celular: celularFormatado }
        ]
      }
    });

    let usuarioQpanel;
    let enviarCredenciais = true;

    if (usuarioBanco) {
      // Usuário encontrado
      const agora = new Date();
      const expirado = !usuarioBanco.dataExpiracao || new Date(usuarioBanco.dataExpiracao) <= agora;

      if (expirado) {
        usuarioQpanel = await renovarUsuarioQpanel(usuarioBanco.nome, plano);
        if (!usuarioQpanel) throw new Error('Erro na renovação do usuário');
        await enviarConfirmacaoRenovacao(emailFormatado, {
          usuario: usuarioQpanel.nome,
          proximoVencimento: formatarDataBrasil(usuarioQpanel.dataExpiracao),
        });
      } else {
        usuarioQpanel = usuarioBanco;
        enviarCredenciais = false;
        await enviarConfirmacaoRenovacao(emailFormatado, {
          usuario: usuarioBanco.nome,
          proximoVencimento: formatarDataBrasil(usuarioBanco.dataExpiracao),
        });
      }
    } else {
      // Novo usuário
      const dataExpiracao = calcularExpiracao(pacote.nome);
      usuarioQpanel = await criarUsuarioQpanel(
        nomeFormatado,
        celularFormatado,
        emailFormatado,
        celularFormatado,
        pacote.packageId,
        dataExpiracao.toISOString()
      );
      if (!usuarioQpanel || !usuarioQpanel.nome) throw new Error('Erro ao criar usuário QPanel');
    }

    // -------------------- CRIA VENDA --------------------
    const novaVenda = await prisma.venda.create({
      data: {
        plataforma,
        transStatus: dadosVenda.statusPagamento || 'APPROVED',
        nome: nomeFormatado,
        email: emailFormatado,
        celular: celularFormatado,
        cpf: cpfFormatado,
        produto: pacote.nome,
        transValue: Math.round(valor * 100),
        criadoEm: new Date(dataCriacao),
        emailAfiliado: emailAfiliado || null,
        usuarioQpanelId: usuarioQpanel.id,
      }
    });

    // -------------------- ENVIO DE EMAIL --------------------
    if (enviarCredenciais) {
      await logiNenviarEmail(
        usuarioQpanel.email || emailFormatado,
        usuarioQpanel.nome || nomeFormatado,
        usuarioQpanel.senha || 'senha-não-disponível',
        pacote.nome,
        formatarDataBrasil(usuarioQpanel.criadoEm || new Date()),
        formatarDataBrasil(usuarioQpanel.dataExpiracao || new Date()),
        emailAfiliado
      );
    }

    // -------------------- ENVIO PARA TELEGRAM --------------------
    const telegramKey = `${usuarioQpanel.id}_${novaVenda.id}`;
    if (!enviadosTelegram.includes(telegramKey)) {
      console.log(`📤 Enviando para Telegram: ${usuarioQpanel.nome} - ${pacote.nome} - R$${valor}`);
      enviadosTelegram.push(telegramKey);
      salvarEnviados();
    } else {
      console.log('⚠️ Usuário já enviado para Telegram, pulando duplicado');
    }

    console.log('✅ Venda processada com sucesso.');
  } catch (err) {
    console.error('❌ Erro ao processar venda:', err.message);
  }

  processando = false;
  processarFila();
}

// -------------------- FUNÇÕES DE PROCESSAMENTO POR PLATAFORMA --------------------
async function processarVendaKirvano(dados) {
  const produto = (dados.products && dados.products[0]) || {};
  const precoStr = produto.price || '';
  const valor = Number(precoStr.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;

  adicionarVendaAFila({
    nome: dados.customer.name,
    email: dados.customer.email,
    celular: dados.customer.phone_number,
    cpf: dados.customer.document,
    valor,
    plano: produto.offer_name || produto.name || 'Plano Desconhecido',
    statusPagamento: dados.status || 'APPROVED',
    dataCriacao: new Date(dados.created_at),
    plataforma: 'Kirvano',
    emailAfiliado: dados.affiliateEmail || null,
  });
}

async function processarVendaVekssel(dadosVenda) { adicionarVendaAFila(dadosVenda); }
async function processarVendaBraip(dadosVenda) { adicionarVendaAFila(dadosVenda); }
async function processarVendaCakto(dadosVenda) { adicionarVendaAFila(dadosVenda); }

module.exports = {
  processarVendaKirvano,
  processarVendaVekssel,
  processarVendaBraip,
  processarVendaCakto,
  verificarTamanhoDaFila,
  verificarFilaVazia,
  obterDetalhesDaFila,
};
