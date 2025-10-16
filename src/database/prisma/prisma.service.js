const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * 🧾 Cria uma nova venda no banco de dados
 * @param {Object} dadosVenda - Dados da venda
 * @param {string|null} usuarioQpanelId - ID do usuário QPanel (opcional)
 */
async function criarVenda(dadosVenda, usuarioQpanelId = null) {
  try {
    const novaVenda = await prisma.venda.create({
      data: {
        plataforma: dadosVenda.plataforma,
        status: dadosVenda.status,
        nome: dadosVenda.nome,
        email: dadosVenda.email,
        cpf: dadosVenda.cpf,
        celular: dadosVenda.celular,
        produto: dadosVenda.produto,
        criadoEm: new Date(),
        usuarioQpanelId, // pode vir nulo e ser vinculado depois
        transStatus: dadosVenda.transStatus,
      },
    });

    console.log('✅ Venda criada com sucesso:', novaVenda.id);
    return novaVenda;
  } catch (error) {
    console.error('❌ Erro ao criar venda:', error);
    throw error;
  }
}

/**
 * 🔗 Vincula uma venda a um usuário QPanel existente
 * @param {string} vendaId - ID da venda
 * @param {string} usuarioId - ID do usuário QPanel
 */
async function vincularUsuarioVenda(vendaId, usuarioId) {
  try {
    const vendaAtualizada = await prisma.venda.update({
      where: { id: vendaId },
      data: { usuarioQpanelId: usuarioId },
    });

    console.log(`✅ Venda ${vendaId} vinculada ao usuário ${usuarioId}`);
    return vendaAtualizada;
  } catch (error) {
    console.error('❌ Erro ao vincular usuário à venda:', error);
    throw error;
  }
}

/**
 * 🔍 Busca uma venda pelo ID
 * @param {string} vendaId - ID da venda
 */
async function buscarVendaPorId(vendaId) {
  try {
    const venda = await prisma.venda.findUnique({
      where: { id: vendaId },
    });

    if (!venda) {
      console.warn(`⚠️ Venda com ID ${vendaId} não encontrada`);
    }

    return venda;
  } catch (error) {
    console.error('❌ Erro ao buscar venda:', error);
    throw error;
  }
}

/**
 * 🔒 Fecha a conexão com o banco de dados Prisma
 */
async function fecharConexao() {
  try {
    await prisma.$disconnect();
    console.log('🔌 Conexão Prisma fechada com sucesso.');
  } catch (error) {
    console.error('❌ Erro ao fechar conexão Prisma:', error);
  }
}

module.exports = {
  criarVenda,
  vincularUsuarioVenda,
  buscarVendaPorId,
  fecharConexao,
};
