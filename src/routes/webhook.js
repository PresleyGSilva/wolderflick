require('dotenv').config();
const { processarVendaKirvano, processarVendaCakto } = require('../venda/vendas.service.js');
const { processarVendaBraip } = require('../venda/vendas.service.js');
const { PrismaClient } = require('@prisma/client');
const { VendaVekssel } = require('../venda/venda.vekssel.service.js');
const { obterPacote } = require('../utils/pacotes.js');
const axios = require('axios');
const { enviarConfirmacaoRenovacao } = require('../email/email.sevice.js');
const { renovarUsuarioQpanel } = require('../qpanel/renovarAssinaturaQpanel.js');

const prisma = new PrismaClient();


const API_URL = process.env.API_URL;
const API_TOKEN = process.env.API_TOKEN;
const USER_ID = process.env.USER_ID;



async function tratarWebhookKirvano(req, res, plataforma) {
  console.log('Payload recebido:', req.body);
  const { event, customer, status, created_at, products, total_price, plan } = req.body;

  if (!total_price || !event || !customer || !status || !created_at || !products || products.length === 0) {
    console.error('Evento ou dados ausentes.');
    return res.status(400).json({ message: 'Evento ou dados ausentes.' });
  }

  const eventosValidos = ['SALE_APPROVED', 'SUBSCRIPTION_RENEWED'];

  if (!eventosValidos.includes(event)) {
    return res.status(400).json({ message: 'Evento não tratado.' });
  }

  const plano = products[0].offer_name || plan?.name || 'Plano Padrão';

  // Validação básica dos dados do customer
  if (!customer.name || !customer.email || !customer.phone_number || !customer.document) {
    return res.status(400).json({ message: 'Dados do cliente incompletos.' });
  }

  try {
    res.status(200).json({ message: 'Recebido com sucesso. Processando em segundo plano.' });

    // Corrigido aqui: envia o corpo completo para a função que espera os campos 'customer', 'products', etc.
    await processarVendaKirvano(req.body);

  } catch (error) {
    console.error('Erro ao processar a venda Kirvano:', error.message);
    return res.status(500).json({ message: 'Erro ao processar a venda.', error: error.message });
  }
}





async function tratarWebhookBraip(req, res, plataforma) {
  console.log('📩 Payload recebido da Braip:', req.body);

  const {
    client_name,
    client_email,
    client_cel,
    client_documment,
    trans_value,
    trans_status,
    trans_key,
    trans_createdate,
    plan_name,
    trans_items,
    trans_type,
    type,
    subs_status,       // status da assinatura (caso exista)
    subs_status_code,  // código numérico da assinatura
    subs_key,
    subs_next_charge,
    subs_attempts
  } = req.body;

  if (!client_name || !client_email || !client_cel) {
    console.error('❌ Dados essenciais ausentes.');
    return res.status(400).json({ message: 'Dados essenciais ausentes.' });
  }

  try {
    const usuario = await prisma.usuarioQpanel.findFirst({
      where: {
        OR: [
          { nome: client_name },
          { email: client_email },
          { celular: client_cel }
        ]
      }
    });

    const eventosNovaVenda = ['PAID', 'APPROVED', 'Pagamento Aprovado'];
    const eventoEhNovaVenda =
      eventosNovaVenda.includes(trans_status) &&
      (!trans_type || trans_type === 'SALE');

    const eventoEhRenovacao =
      type === 'ASSINATURA_ALTERADA' &&
      subs_status === 'Ativa' &&
      usuario;

    const eventoEhCancelamentoAssinatura =
      type === 'ASSINATURA_ALTERADA' &&
      ['Cancelada pelo Cliente', 'Cancelada pelo Suporte', 'Cancelada pela Plataforma', 'Vencida'].includes(subs_status) &&
      usuario;

    // ====== NOVA VENDA ======
    if (eventoEhNovaVenda) {
      if (usuario) {
        console.log(`🔎 Usuário ${usuario.nome} já existe. Ignorando nova venda.`);
        return res.status(200).json({ message: 'Usuário já existe. Nenhuma ação necessária.' });
      }

      const dadosVenda = {
        nome: client_name,
        email: client_email,
        celular: client_cel,
        cpf: client_documment,
        valor: parseFloat(trans_value) / 100,
        statusPagamento: trans_status,
        dataCriacao: new Date(trans_createdate),
        plano: plan_name,
        itensVenda: trans_items || [],
        transKey: trans_key,
        plataforma,
      };

      res.status(200).json({ message: 'Nova venda recebida. Processando...' });

      processarVendaBraip(dadosVenda, (error, resultado) => {
        if (error) {
          console.error('❌ Erro ao processar venda:', error.message);
        } else {
          console.log('✅ Nova venda processada:', resultado);
        }
      });

      return;
    }

    // ====== RENOVAÇÃO ======
    if (eventoEhRenovacao) {
      console.log(`🔁 Renovação de assinatura para: ${usuario.nome} - Plano: ${plan_name}`);
      await renovarUsuarioQpanel(usuario.nome, plan_name);
      return res.status(200).json({ message: 'Renovação processada com sucesso.', status: 'success' });
    }

    // ====== CANCELAMENTO DE ASSINATURA ======
    if (eventoEhCancelamentoAssinatura) {
      console.log(`🚫 Assinatura cancelada ou vencida para ${usuario.nome}. Status: ${subs_status}`);
      await desativarUsuarioQpanel(usuario.nome); // <-- sua função para suspender/cancelar acesso
      return res.status(200).json({ message: 'Cancelamento de assinatura tratado com sucesso.', status: 'success' });
    }

    // ====== OUTROS CASOS ======
    console.warn(`⚠️ Evento não tratado. Tipo: ${trans_type}, Status: ${trans_status}, Type: ${type}, Subs: ${subs_status}`);
    return res.status(400).json({ message: 'Evento não tratado.' });

  } catch (error) {
    console.error('❌ Erro geral ao processar webhook:', error.message);
    return res.status(500).json({ message: 'Erro interno ao processar webhook.', error: error.message });
  }
}




async function tratarWebhookVekssell(req, res, plataforma) {
  const tokenRecebido = req.body.token;

  if (!tokenRecebido) {
    console.error("❌ Token ausente");
    return res.status(403).json({ message: "Token ausente." });
  }

  const TOKEN_VALIDACAO = process.env.TOKEN_VEKSELL || "sju08avt";
  if (tokenRecebido !== TOKEN_VALIDACAO) {
    console.error("❌ Token inválido");
    return res.status(403).json({ message: "Token inválido." });
  }

  console.log("📩 Payload recebido:", req.body);

  const { event, client, transaction, subscription, orderItems } = req.body;

  if (!event || !client || !transaction || !orderItems || orderItems.length === 0) {
    console.error("🚨 Evento ou dados ausentes.");
    return res.status(400).json({ message: "Evento ou dados ausentes." });
  }

  if (event === "TRANSACTION_PAID") {
    try {
      const valorProduto = orderItems[0]?.price;
      if (!valorProduto || typeof valorProduto !== "number") {
        throw new Error("Produto inválido. Valor do produto não fornecido ou inválido.");
      }

      console.log(`💰 Valor do produto recebido: R$ ${valorProduto}`);

      const planos = {
        19.9: "cineflick 1 mês de acesso!",
        39.9: "cineflick 3 mês de acesso!",
        69.9: "cineflick 6 mês de acesso!",
        129.9: "1 ano de acesso + 4 telas!",
      };

      const nomePlano = planos[valorProduto] || "Plano Desconhecido";
      console.log(`📦 Plano identificado: ${nomePlano}`);

      // Monta o objeto de dadosVenda, que será enviado para VendaVekssel
      const dadosVenda = {
        nome: client.name,
        email: client.email,
        cpf: client.cpf || '',
        celular: client.phone,
        valor: transaction.amount,
        statusPagamento: transaction.status,
        dataCriacao: transaction.payedAt ? new Date(transaction.payedAt) : new Date(),
        plano: nomePlano,
        plataforma,
        emailAfiliado: client.emailAfiliado || null,
        assinaturaId: subscription?.id || null,
        ciclo: subscription?.cycle || null,
        proximoVencimento: subscription?.nextChargeDate || null,
      };

      await VendaVekssel(dadosVenda);

      console.log(`✅ Venda (ou renovação) enviada para processamento: ${client.name}`);

      return res.status(200).json({ message: "Processamento concluído com sucesso.", status: "success" });

    } catch (error) {
      console.error("❌ Erro ao processar venda/renovação:", error.message);
      return res.status(500).json({ message: "Erro ao processar venda/renovação.", error: error.message });
    }
  }

  console.error("🚨 Evento não esperado:", event);
  return res.status(400).json({ message: "Evento não tratado." });
}



async function tratarWebhookCakto(req, res, plataforma = 'Cakto') {
  console.log('📩 Payload recebido da Cakto:', req.body);

  // ✅ Verificação da chave secreta
  const secretRecebido = req.body.secret;
  if (secretRecebido !== '0f0c46a0-13ce-47f6-8243-d07fa8fc717c') {
    console.warn('🔒 Chave secreta inválida:', secretRecebido);
    return res.status(403).json({ message: 'Chave secreta inválida.' });
  }

  const { event, data } = req.body;

  if (!event || !data || !data.customer || !data.amount || !data.createdAt || !data.offer?.name) {
    console.error('🚨 Dados essenciais ausentes.');
    return res.status(400).json({ message: 'Dados essenciais ausentes.' });
  }

  if (event === 'purchase_approved') {
    try {
      const dadosVenda = {
        nome: data.customer.name,
        email: data.customer.email,
        celular: data.customer.phone,
        cpf: data.customer.docNumber,
        valor: data.amount,
        plano: data.offer.name || 'Plano Desconhecido',
        statusPagamento: 'APPROVED',
        dataCriacao: new Date(data.createdAt),
        plataforma,
        emailAfiliado: data.affiliate || null,
      };

      if (!dadosVenda.nome || !dadosVenda.email || !dadosVenda.celular || !dadosVenda.cpf) {
        throw new Error('Dados do cliente incompletos.');
      }

      // Retorna rápido para o webhook confirmando recebimento
      res.status(200).json({ message: 'Recebido com sucesso. Processando em segundo plano.' });

      // Processa a venda adicionando na fila de vendas via service
      
      await processarVendaCakto(dadosVenda);

    } catch (error) {
      console.error('❌ Erro ao processar venda Cakto:', error.message);
      return res.status(500).json({ message: 'Erro ao processar venda.', error: error.message });
    }
  } else {
    console.warn(`⚠️ Evento não tratado: ${event}`);
    return res.status(200).json({ message: 'Evento não tratado, mas recebido com sucesso.' });
  }
}









// Roteador para webhooks
function roteadorWebhooks(req, res) {
  const caminho = req.originalUrl; // URL do webhook
  let plataforma;

  switch (caminho) {
    case '/api/v1/webhook/kirvano':
      plataforma = 'Kirvano';
      return tratarWebhookKirvano(req, res, plataforma);
    case '/api/v1/webhook':
      plataforma = 'Braip';
      return tratarWebhookBraip(req, res, plataforma);
    case '/api/v1/webhook/vekssell':
      plataforma = 'Vekssell';
      return tratarWebhookVekssell(req, res, plataforma);
    default:
      case '/api/v1/webhook/cakto':
        plataforma = 'Cakto';
        return tratarWebhookCakto(req, res, plataforma);
      
      return res.status(404).json({ message: 'Rota do webhook não encontrada.' });
  }
}

module.exports = { roteadorWebhooks };
