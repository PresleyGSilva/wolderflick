const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Função para criar uma nova venda
async function criarVenda(dadosVenda, usuarioQpanelId) {
  try {
    const novaVenda = await prisma.venda.create({
      data: {
        plataforma: dadosVenda.plataforma,
        status: dadosVenda.status,
        nome: dadosVenda.nome,
        email: dadosVenda.email,
        cpf:   dadosVenda.cpf,
        celular: dadosVenda.celular,
        produto: dadosVenda.produto,
        criadoEm: new Date(),
        usuarioQpanelId: usuarioQpanelId, 
        transStatus: dadosVenda.transStatus,
        
      },
    });
    return novaVenda;
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    throw error;
  }
}

// Função para vincular a venda a um usuário QPanel
async function vincularUsuarioVenda(vendaId,usuarioCriado) {
  try {
    await prisma.venda.update({
      where: { id: vendaId },
      data: { usuarioQpanelId: usuarioCriado.id },
    });
  } catch (error) {
    console.error('Erro ao vincular usuário à venda:', error);
    throw error;
  }
}

// Função para buscar uma venda pelo ID
async function buscarVendaPorId(vendaId) {
  try {
    const venda = await prisma.venda.findUnique({
      where: { id: vendaId },
    });
    return venda;
  } catch (error) {
    console.error('Erro ao buscar venda:', error);
    throw error;
  }
}

// Função para fechar a conexão com o Prisma
async function fecharConexao() {
  await prisma.$disconnect();
}

module.exports = {
  criarVenda,
  vincularUsuarioVenda,
  buscarVendaPorId,
  fecharConexao,
};
