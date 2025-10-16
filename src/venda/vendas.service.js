// vendas.service.js
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { logiNenviarEmail } = require('../email/email.sevice');
const { calcularExpiracao } = require('../utils/utils');
const { formatInTimeZone } = require('date-fns-tz');
const { criarVenda, vincularUsuarioVenda } = require('../database/prisma/prisma.service.js');
const { obterPacote } = require('../utils/pacotes.js');
const { criarUsuarioQpanel } = require('../qpanel/qpanel.service.js');
const { renovarUsuarioQpanel } = require('../qpanel/renovarAssinaturaQpanel.js');

const prisma = new PrismaClient();

// -------------------- Helpers --------------------
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

// -------------------- Fila de vendas --------------------
let filaDeVendas = [];
let processando = false;

function adicionarVendaAFila(dadosVenda) {
  filaDeVendas.push(dadosVenda);
  processarFila();
}

// -------------------- Funções internas --------------------
async function enviarConfirmacaoRenovacao(email, { usuario, proximoVencimento }) {
  console.log(`✉️ Enviando confirmação de renovação para ${usuario} (${email}), próximo vencimento: ${proximoVencimento}`);
}

// -------------------- Processamento da fila --------------------
async function processarFila() {
  if (processando || filaDeVendas.length === 0) return;
  processando = true;

  const dadosVenda = filaDeVendas.shift();

  try {
    const nome = dadosVenda.nome?.trim();
    const email = dadosVenda.email?.trim();
    const celular = formatarNumeroSemMais(dadosVenda.celular?.trim() || '');
    const cpf = dadosVenda.cpf?.trim();

    if (!nome || !email || !celular || !cpf) throw new Error('❌ Dados incompletos');

    const pacote = obterPacote(dadosVenda.plano, dadosVenda.valor, null);
    if (!pacote?.packageId) throw new Error('⚠️ Pacote não encontrado');

    let usuarioQpanel;
    let enviarCredenciais = true;

    // Verifica se usuário já existe
    const usuarioBanco = await prisma.usuarioQpanel.findFirst({
      where: { OR: [{ nome }, { email }, { celular }] }
    });

    if (usuarioBanco) {
      const agora = new Date();
      const expirado = !usuarioBanco.dataExpiracao || new Date(usuarioBanco.dataExpiracao) <= agora;

      if (expirado) {
        usuarioQpanel = await renovarUsuarioQpanel(usuarioBanco.nome, dadosVenda.plano);
      } else {
        usuarioQpanel = usuarioBanco;
        enviarCredenciais = false;
      }

      await enviarConfirmacaoRenovacao(email, {
        usuario: usuarioQpanel.nome,
        proximoVencimento: formatarDataBrasil(usuarioQpanel.dataExpiracao)
      });

    } else {
      const dataExpiracao = calcularExpiracao(pacote.nome);

      // Criando novo usuário no QPanel
      usuarioQpanel = await criarUsuarioQpanel(
        nome,       // nome do cliente
        email,      // e-mail do cliente
        celular,    // celular do cliente
        pacote.packageId,
        pacote.serverPackageId, // se necessário
        dataExpiracao.toISOString()
      );
    }

    if (!usuarioQpanel?.id) throw new Error('❌ Usuário QPanel não possui ID');

    // Criar venda vinculada ao usuário
    const novaVenda = await criarVenda({
      plataforma: dadosVenda.plataforma,
      transStatus: dadosVenda.statusPagamento,
      nome,
      transValue: Math.round(dadosVenda.valor * 100),
      email,
      celular,
      cpf,
      produto: pacote.nome,
      criadoEm: formatarDataBrasil(new Date(dadosVenda.dataCriacao)),
      emailAfiliado: dadosVenda.emailAfiliado
    }, usuarioQpanel.id);

    if (!novaVenda?.id) throw new Error('❌ Venda não criada');

    await vincularUsuarioVenda(novaVenda.id, usuarioQpanel.id);

    // Enviar e-mail com credenciais apenas se usuário for novo
    if (enviarCredenciais) {
      await logiNenviarEmail(
        usuarioQpanel.email || email,
        usuarioQpanel.nome || nome,
        usuarioQpanel.senha || 'Flick10top',
        pacote.nome,
        formatarDataBrasil(usuarioQpanel.criadoEm),
        formatarDataBrasil(usuarioQpanel.dataExpiracao),
        dadosVenda.emailAfiliado
      );
    }

    console.log('✅ Venda processada com sucesso');

  } catch (error) {
    console.error('❌ Erro ao processar venda:', error.message);
  }

  processando = false;
  processarFila();
}

// -------------------- Funções para processar vendas por plataforma --------------------
async function processarVendaKirvano(dados) {
  const produto = (dados.products && dados.products[0]) || {};
  const valor = Number((produto.price || '').replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;

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
    emailAfiliado: dados.affiliateEmail || null
  });
}

async function processarVendaVekssel(dadosVenda) { adicionarVendaAFila(dadosVenda); }
async function processarVendaBraip(dadosVenda) { adicionarVendaAFila(dadosVenda); }
async function processarVendaCakto(dadosVenda) { adicionarVendaAFila(dadosVenda); }

module.exports = {
  processarVendaKirvano,
  processarVendaVekssel,
  processarVendaBraip,
  processarVendaCakto
};
