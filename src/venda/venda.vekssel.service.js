const { criarVenda, vincularUsuarioVenda } = require('../database/prisma/prisma.service.js');
const { obterPacote } = require('../utils/pacotes.js');
const { criarUsuarioQpanel } = require('../qpanel/qpanel.service.js'); 
const { renovarUsuarioQpanel } = require('../qpanel/renovarAssinaturaQpanel.js'); // precisa importar
const { logiNenviarEmail } = require('../email/email.sevice.js');
const { calcularExpiracao } = require('../utils/utils.js'); 

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let filaDeVendas = [];
let processando = false;

function formatarNumeroSemMais(numero) {
  return numero.replace(/\D/g, '');
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

async function enviarConfirmacaoRenovacao(email, nome, proximoVencimento) {
  // Função para enviar confirmação da renovação
  console.log(`✉️ Enviando confirmação para ${nome} (${email}), próximo vencimento: ${proximoVencimento}`);
  // Aqui pode chamar seu serviço real de envio de email
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

    const pacote = obterPacote(dadosVenda.plano);
    if (!pacote || !pacote.packageId) throw new Error('⚠️ Pacote não encontrado.');

    console.log("📦 Package ID selecionado:", pacote.packageId);

    // Procurar usuário existente no banco
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
      console.log(`⚠️ Usuário encontrado: ${usuarioBanco.nome}`);

      const agora = new Date();
      const expirado = !usuarioBanco.dataExpiracao || new Date(usuarioBanco.dataExpiracao) <= agora;

      if (expirado) {
        console.log(`♻️ Renovando usuário ${usuarioBanco.nome}`);
        usuarioQpanel = await renovarUsuarioQpanel(usuarioBanco.nome, dadosVenda.plano);
        if (!usuarioQpanel) throw new Error('❌ Erro na renovação do usuário.');

        // Enviar confirmação renovação após renovar
        await enviarConfirmacaoRenovacao(emailFormatado, usuarioQpanel.nome, usuarioQpanel.dataExpiracao);

      } else {
        usuarioQpanel = usuarioBanco;
        enviarCredenciais = false;
        console.log(`ℹ️ Usuário ativo, nenhuma renovação necessária.`);

        // Enviar confirmação de usuário ativo
        await enviarConfirmacaoRenovacao(emailFormatado, usuarioBanco.nome, usuarioBanco.dataExpiracao);
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

    const novaVenda = await criarVenda({
      plataforma: dadosVenda.plataforma,
      transStatus: dadosVenda.statusPagamento,
      nome: nomeFormatado,
      transValue: valorProdutoEmCentavos,
      email: emailFormatado,
      celular: celularFormatado,
      cpf: cpfFormatado,
      produto: pacote.packageId,
      criadoEm: new Date(dataCriacao),
      emailAfiliado: dadosVenda.emailAfiliado,
    }, usuarioQpanel.id);

    await vincularUsuarioVenda(novaVenda.id, usuarioQpanel.id);

    if (enviarCredenciais) {
      await logiNenviarEmail(
        usuarioQpanel.email,
        usuarioQpanel.nome,
        usuarioQpanel.senha,
        pacote.nome,
        usuarioQpanel.criadoEm,
        usuarioQpanel.dataExpiracao,
        dadosVenda.emailAfiliado
      );
    } else {
      console.log('✅ Venda registrada, credenciais não reenviadas pois usuário já ativo.');
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

async function VendaVekssel(dadosVenda) {
  adicionarVendaAFila(dadosVenda);
}

module.exports = {
  VendaVekssel,
  verificarTamanhoDaFila,
  verificarFilaVazia,
  obterDetalhesDaFila,
};
