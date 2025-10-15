require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

// 🧩 Mapeamento dos pacotes válidos
function obterPacote(package_id) {
  const pacotes = {
    'zpKDN6DXlE': { nome: '0️⃣1️⃣ MÊS S/ ADULTO - 3 TELAS', valor: 18.9 },
    'kmVLl71QwB': { nome: '0️⃣3️⃣ MESES S/ ADULTO - 3 TELAS', valor: 38.9 },
    'XYgD9JWr6V': { nome: '0️⃣6️⃣ MESES S/ ADULTO - 3 TELAS', valor: 64.9 },
    'PkaL4qdDgr': { nome: '1️⃣2️⃣ MESES PROMOCIONAL S/ ADULTO - 3 TELAS', valor: 124.99 },
  };

  return pacotes[package_id] || { nome: 'Plano Desconhecido', valor: '0.00' };
}

class PagamentosService {
  constructor() {
    this.prisma = new PrismaClient();
    this.botToken = process.env.TELEGRAM_BOT_PAGAMENTOS;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
  }

  // Escapa caracteres especiais do MarkdownV2
  escapeMarkdownV2(text) {
    if (!text) return '';
    return text.replace(/([_\*\[\]\(\)~`>#+\-=|{}.!])/g, '\\$1');
  }

  // Envio da mensagem ao Telegram
  async enviarMensagemTelegram(mensagem) {
    if (!this.botToken || !this.chatId) {
      console.error('❌ TELEGRAM_BOT_PAGAMENTOS ou TELEGRAM_CHAT_ID não configurados no .env');
      return;
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    try {
      await axios.post(url, {
        chat_id: this.chatId,
        text: mensagem,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      });

      console.log('✅ Mensagem enviada com sucesso ao Telegram.');
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem ao Telegram:', error.message);
      if (error.response) console.error('📌 Resposta da API:', error.response.data);
    }
  }

  // Busca usuários não enviados e envia ao Telegram
  async verificarUsuariosNaoEnviados() {
    try {
      const usuarios = await this.prisma.usuarioQpanel.findMany({
        where: { enviadoTelegram: false },
        orderBy: { criadoEm: 'desc' },
      });

      if (usuarios.length === 0) {
        console.log('Nenhum novo usuário encontrado para enviar.');
        return;
      }

      for (const usuario of usuarios) {
        console.log(`📤 Enviando usuário: ${usuario.nome}`);

        const nome = this.escapeMarkdownV2(usuario.nome);
        const email = this.escapeMarkdownV2(usuario.email);
        const senha = this.escapeMarkdownV2(usuario.senha);
        const celular = this.escapeMarkdownV2(usuario.celular || 'N/A');
        const packageId = this.escapeMarkdownV2(usuario.package_id || 'N/A');
        const dataExpiracao = this.escapeMarkdownV2(
          usuario.dataExpiracao.toLocaleDateString('pt-BR')
        );

        // Obter nome e valor do plano com base no package_id
        const { nome: nomePlano, valor: valorPlano } = obterPacote(usuario.package_id);
        const nomePlanoEsc = this.escapeMarkdownV2(nomePlano);
        const valorPlanoEsc = this.escapeMarkdownV2(`R$${valorPlano}`);

        const mensagem = `
*NOVO USUÁRIO CRIADO\\!* 🚀

👤 *Nome:* ${nome}
📧 *Email:* ${email}
📱 *Celular:* ${celular}

💰 *Plano:* ${nomePlanoEsc}
💵 *Valor:* ${valorPlanoEsc}
📅 *Expira em:* ${dataExpiracao}

🔐 *Usuário:* \`${email}\`
🔑 *Senha:* \`${senha}\`
`;

        await this.enviarMensagemTelegram(mensagem);

        // Atualiza o campo enviadoTelegram para true
        await this.prisma.usuarioQpanel.update({
          where: { id: usuario.id },
          data: { enviadoTelegram: true },
        });

        console.log(`✅ Usuário ${usuario.email} marcado como enviado.`);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar usuários não enviados:', error.message);
    }
  }

  // Loop de monitoramento contínuo
  iniciarMonitoramento() {
    console.log('📡 Iniciando monitoramento de novos usuários...');
    setInterval(() => this.verificarUsuariosNaoEnviados(), 10000); // verifica a cada 10 segundos
  }
}

// Fechamento seguro ao encerrar o processo
process.on('SIGINT', async () => {
  console.log('Encerrando conexão com o Prisma...');
  await new PrismaClient().$disconnect();
  process.exit(0);
});

module.exports = { PagamentosService };

