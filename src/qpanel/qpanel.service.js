const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { logiNenviarEmail } = require('../email/email.sevice');
const { calcularExpiracao } = require('../utils/utils');
require('dotenv').config();

const prisma = new PrismaClient();

const API_URL = 'https://worldflick.sigmab.pro/api/webhook';
const API_TOKEN = process.env.API_TOKEN;
const USER_ID = 'rlKWO3Wzo7'; // Seu UserID

// 🔵 Utilitários
function generateUsername(length = 12) {
  const numbers = '0123456789';
  let username = '';
  for (let i = 0; i < length; i++) {
    username += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  return username;
}

// 🔵 Senha padrão fixa
const SENHA_PADRAO = 'Flick10top';

// 🔵 Função para deletar no QPanel
async function deletarUsuarioQpanel(username) {
  try {
    await axios.delete(`${API_URL}/customer`, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        userId: USER_ID,
        username: username,
      },
    });
    console.log(`🗑️ Usuário ${username} deletado do QPanel (se existia)`);
  } catch (error) {
    console.error(`⚠️ Erro ao tentar deletar usuário ${username} no QPanel:`, error.response?.data || error.message);
  }
}

// 🔵 Função principal para criar usuário
async function criarUsuarioQpanel(nome, email, whatsapp, packageId, serverPackageId, dataExpiracao) {
  try {
    console.log('🔍 Verificando se o usuário já existe no banco...');

    const usuarioBanco = await prisma.usuarioQpanel.findFirst({
      where: {
        OR: [
          { email: email },
          { celular: whatsapp }
        ]
      }
    });

    let username;
    let password = SENHA_PADRAO;

    if (usuarioBanco) {
      console.log(`⚠️ Usuário encontrado no banco: ${usuarioBanco.nome}`);

      username = usuarioBanco.nome;
      password = usuarioBanco.senha;

      console.log(`🛑 Deletando usuário ${username} no QPanel...`);
      await deletarUsuarioQpanel(username);

      console.log(`🛑 Deletando usuário no banco de dados...`);
      await prisma.usuarioQpanel.delete({
        where: { id: usuarioBanco.id }
      });

    } else {
      console.log('🆕 Novo usuário. Gerando username...');
      username = generateUsername();
    }

    console.log('🛠 Criando usuário no QPanel...');
    const response = await axios.post(`${API_URL}/customer/create`, {
      userId: USER_ID,
      packageId: serverPackageId,
      username: username,
      password: password,
      name: nome,
      email: whatsapp,
      whatsapp: email,
    }, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.data || !response.data.username) {
      throw new Error('❌ Erro ao criar usuário: resposta inesperada da API.');
    }

    console.log('✅ Usuário criado no QPanel:', response.data);

    // 🔹 Salva usuário no banco
    const usuarioCriado = await prisma.usuarioQpanel.create({
      data: {
        nome: username,
        email: whatsapp,
        celular:email ,
        senha: password,
        package_id: serverPackageId,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        dataExpiracao: dataExpiracao,
      }
    });

    console.log('✅ Novo usuário salvo no banco:', usuarioCriado);

    // 🔹 Vincula todas as vendas do email do cliente a esse usuário
    const vendasAtualizadas = await prisma.venda.updateMany({
      where: { email: email },
      data: { usuarioQpanelId: usuarioCriado.id }
    });

    console.log(`🔗 Vendas vinculadas ao usuário: ${vendasAtualizadas.count}`);

    // 🔹 Envia email com dados de login
    await logiNenviarEmail(
      usuarioCriado.email,
      usuarioCriado.nome,
      usuarioCriado.senha,
      usuarioCriado.package_id,
      usuarioCriado.criadoEm,
      usuarioCriado.dataExpiracao
    );

    console.log(`📤 Email enviado para: ${usuarioCriado.email}`);

    return usuarioCriado;

  } catch (error) {
    console.error('❌ Erro geral:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { criarUsuarioQpanel };
