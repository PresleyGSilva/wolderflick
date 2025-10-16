const { criarVenda, vincularUsuarioVenda } = require('../database/prisma/prisma.service.js');
const { obterPacote } = require('../utils/pacotes.js');
const { criarUsuarioQpanel } = require('../qpanel/qpanel.service.js');
const { renovarUsuarioQpanel } = require('../qpanel/renovarAssinaturaQpanel.js');
const { logiNenviarEmail } = require('../email/email.sevice.js');
const { calcularExpiracao } = require('../utils/utils.js');

const { formatInTimeZone } = require('date-fns-tz');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function formatarDataBrasil(data) {
  try {
    if (!data || isNaN(new Date(data))) throw new Error("Data inválida");
    return formatInTimeZone(new Date(data), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  } catch {
    return 'Data inválida';
  }
}

let filaDeVendas = [];
let processando = false;

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

function formatarNumeroSemMais(numero) {
  return numero.replace(/\D/g, '');
}

async function enviarConfirmacaoRenovacao(email, { usuario, proximoVencimento }) {
  console.log(`✉️ Enviando confirmação de renovação para ${usuario} (${email}), próximo vencimento: ${proximoVencimento}`);
}

async function processarFila() {
  if (processando || filaDeVendas.length === 0) return;
  processando = true;

  const dadosVenda = filaDeVendas.shift();

  try {
    console.log(`🔄 Processando venda de ${dadosVenda.nome}`);

    const { nome, email, celular, cpf, dataCriacao } = dadosVenda;

    const nomeFormatado = typeof nome === 'string' ? nome.trim() : '';
    const emailFormatado = typeof email === 'string' ? email.trim() : '';
    const celularFormatado = typeof celular === 'string' ? formatarNumeroSemMais(celular.trim()) : '';
    const cpfFormatado = typeof cpf === 'string' ? cpf.trim() : '';

    if (!nomeFormatado || !emailFormatado || !celularFormatado || !cpfFormatado) {
      throw new Error('❌ Dados incompletos ou inválidos.');
    }

    console.log("📞 Celular formatado:", celularFormatado);

    const pacote = obterPacote(dadosVenda.plano, dadosVenda.valor, null);
    if (!pacote || !pacote.packageId) throw new Error('⚠️ Pacote não encontrado.');

    console.log("📦 Package ID selecionado:", pacote.packageId);

    const usuarioBanco = await prisma.usuarioQpanel.findFirst({
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
      console.log(`⚠️ Usuário encontrado no banco: ${usuarioBanco.nome}`);

      const agora = new Date();
      const expirado = !usuarioBanco.dataExpiracao || new Date(usuarioBanco.dataExpiracao) <= agora;

      if (expirado) {
        console.log(`♻️ Renovando usuário ${usuarioBanco.nome}`);
        usuarioQpanel = await renovarUsuarioQpanel(usuarioBanco.nome, dadosVenda.plano);
        if (!usuarioQpanel) throw new Error('❌ Erro na renovação do usuário.');

        await enviarConfirmacaoRenovacao(emailFormatado, {
          usuario: usuarioQpanel.nome,
          proximoVencimento: formatarDataBrasil(usuarioQpanel.dataExpiracao),
        });

      } else {
        usuarioQpanel = usuarioBanco;
        enviarCredenciais = false;
        console.log(`ℹ️ Usuário está ativo. Nenhuma ação de renovação necessária.`);

        await enviarConfirmacaoRenovacao(emailFormatado, {
          usuario: usuarioBanco.nome,
          proximoVencimento: formatarDataBrasil(usuarioBanco.dataExpiracao),
        });
      }
    } else {
      console.log(`✨ Criando novo usuário para ${nomeFormatado}...`);

      const dataExpiracao = calcularExpiracao(pacote.nome);
      usuarioQpanel = await criarUsuarioQpanel(
        nomeFormatado,
        celularFormatado,
        emailFormatado,
        celularFormatado,
        pacote.packageId,
        dataExpiracao.toISOString()
      );

      if (!usuarioQpanel || !usuarioQpanel.nome) throw new Error('⚠️ Erro ao criar usuário no QPanel.');
    }

    const valorProdutoEmCentavos = Math.round(dadosVenda.valor * 100);
    const dataCriacaoFormatada = formatarDataBrasil(new Date(dataCriacao));

    const novaVenda = await criarVenda({
      plataforma: dadosVenda.plataforma,
      transStatus: dadosVenda.statusPagamento,
      nome: nomeFormatado,
      transValue: valorProdutoEmCentavos,
      email: emailFormatado,
      celular: celularFormatado,
      cpf: cpfFormatado,
      produto: pacote.nome,
      criadoEm: dataCriacaoFormatada,
      emailAfiliado: dadosVenda.emailAfiliado,
    }, usuarioQpanel.id);

    await vincularUsuarioVenda(novaVenda.id, usuarioQpanel.id);

    if (enviarCredenciais) {
      await logiNenviarEmail(
        usuarioQpanel.email || emailFormatado,
        usuarioQpanel.nome || nomeFormatado,
        usuarioQpanel.senha || 'senha-não-disponível',
        pacote.nome,
        formatarDataBrasil(usuarioQpanel.criadoEm || new Date()),
        formatarDataBrasil(usuarioQpanel.dataExpiracao || new Date()),
        dadosVenda.emailAfiliado
      );
    } else {
      console.log('✅ Venda registrada, mas credenciais não reenviadas porque o usuário já estava ativo.');
    }

    console.log('✅ Venda processada com sucesso.');
  } catch (error) {
    console.error('❌ Erro ao processar venda:', error.message);
  }

  processando = false;
  processarFila();
}

function adicionarVendaAFila(dadosVenda) {
  filaDeVendas.push(dadosVenda);
  processarFila();
}

async function processarVendaKirvano(dados) {
  const produto = (dados.products && dados.products[0]) || {};
  const precoStr = produto.price || '';
  const valor = Number(precoStr.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;

  const dadosVenda = {
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
  };

  adicionarVendaAFila(dadosVenda);
}

async function processarVendaVekssel(dadosVenda) {
  adicionarVendaAFila(dadosVenda);
}

async function processarVendaBraip(dadosVenda) {
  adicionarVendaAFila(dadosVenda);
}

async function processarVendaCakto(dadosVenda) {
  adicionarVendaAFila(dadosVenda);
}

module.exports = {
  processarVendaKirvano,
  processarVendaVekssel,
  processarVendaBraip,
  processarVendaCakto,
  verificarTamanhoDaFila,
  verificarFilaVazia,
  obterDetalhesDaFila,
};
