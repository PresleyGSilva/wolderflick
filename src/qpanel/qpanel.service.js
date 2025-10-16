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
      // senha já é a padrão
    }

    console.log('🛠 Criando usuário no QPanel...');
    const response = await axios.post(`${API_URL}/customer/create`, {
      userId: USER_ID,
      packageId: serverPackageId,
      username: username,
      password: password,
      name: nome,
      email: email,
      whatsapp: whatsapp,
    }, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });

    if (response.data && response.data.username) {
      console.log('✅ Usuário criado no QPanel:', response.data);

      const usuarioCriado = await prisma.usuarioQpanel.create({
        data: {
          nome: username,
          email: email,
          celular: whatsapp,
          senha: password,
          package_id: serverPackageId,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          dataExpiracao: dataExpiracao,
        }
      });

      console.log('✅ Novo usuário salvo no banco:', usuarioCriado);

      await logiNenviarEmail(
        usuarioCriado.email,
        usuarioCriado.nome,
        usuarioCriado.senha,
        usuarioCriado.package_id,
        usuarioCriado.criadoEm,
        usuarioCriado.dataExpiracao
      );

      return usuarioCriado;
    } else {
      throw new Error('❌ Erro ao criar usuário: resposta inesperada da API.');
    }
  } catch (error) {
    console.error('❌ Erro geral:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { criarUsuarioQpanel };
