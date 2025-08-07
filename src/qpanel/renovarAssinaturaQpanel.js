const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { obterPacote } = require('../utils/pacotes');
const { enviarConfirmacaoRenovacao } = require('../email/email.sevice'); // ajuste o caminho conforme sua estrutura
require('dotenv').config();

const prisma = new PrismaClient();
const API_URL = process.env.API_URL;
const API_TOKEN = process.env.API_TOKEN;
const USER_ID = 'rlKWO3Wzo7';

function calcularDataExpiracao(packageId) {
  const dias = {
    'z2BDvoWrkj': 30,
    'bOxLAQLZ7a': 90,
    'Yen129WPEa': 180,
    '0RvWGl1e3P': 365
  };
  const diasExtras = dias[packageId] || 30;
  return new Date(Date.now() + diasExtras * 86400000);
}

async function renovarUsuarioQpanel(username, planoOuValor) {
  try {
    const pacote = obterPacote(planoOuValor, planoOuValor);

    if (!pacote || !pacote.packageId) {
      throw new Error(`Plano não reconhecido para renovação: ${planoOuValor}`);
    }

    console.log(`Renovando ${username} para o pacote ${pacote.packageId} (${pacote.nome})`);

    const response = await axios.post(`${API_URL}/webhook/customer/renew`, {
      userId: USER_ID,
      username,
      packageId: pacote.packageId
    }, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const novaDataExpiracao = response.data?.data?.expires_at
      ? new Date(response.data.data.expires_at)
      : calcularDataExpiracao(pacote.packageId);

    // Atualiza no bancos
    const resultado = await prisma.usuarioQpanel.updateMany({
      where: { nome: username },
      data: {
        package_id: pacote.packageId,
        atualizadoEm: new Date(),
         ultimaRenovacao: new Date(), // ⬅️ Aqui atualiza a data da renovação
        dataExpiracao: novaDataExpiracao
      }
    });

    console.log('✅ Banco atualizado com nova data de expiração.');

    // Busca o e-mail do usuário
    const usuario = await prisma.usuarioQpanel.findFirst({
      where: { nome: username },
      select: { email: true }
    });

    if (usuario?.email) {
      // Envia confirmação por e-mail
      await enviarConfirmacaoRenovacao(usuario.email, {
        usuario: username,
        proximoVencimento: novaDataExpiracao.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });
    } else {
      console.warn('⚠️ E-mail do cliente não encontrado no banco.');
    }

    return response.data;

  } catch (error) {
    console.error('❌ Erro durante a renovação:', error.response?.data || error.message);
    throw error;
  }
}

module.exports={ renovarUsuarioQpanel};
