require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { obterPacote } = require('../utils/pacotes');

class PagamentosService {
  constructor() {
    this.prisma = new PrismaClient();
    this.botToken = process.env.TELEGRAM_BOT_PAGAMENTOS;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
  }

  // Função para escapar caracteres para MarkdownV2
  escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/([_*[\]()~`>#+-=|{}.!])/g, '\\$1');
  }

  // Método para enviar mensagem ao Telegram usando MarkdownV2
  async enviarMensagemTelegram(mensagem) {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    console.log('Tentando enviar mensagem ao Telegram...');
    console.log('URL:', url);
    console.log('Chat ID:', this.chatId);
    console.log('Mensagem:', mensagem);

    try {
      const response = await axios.post(url, {
        chat_id: this.chatId,
        text: mensagem,
        parse_mode: 'MarkdownV2', // MarkdownV2 seguro
        disable_web_page_preview: false,
      });

      console.log('✅ Mensagem enviada com sucesso:', response.data);
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem para o Telegram:', error.message);
      if (error.response) {
        console.error('📌 Resposta da API:', error.response.data);
      }
    }
  }

  // Verifica novas vendas
  async verificarNovasVendas() {
    try {
      const novaVenda = await this.prisma.venda.findFirst({
        where: { processada: false },
        orderBy: { criadoEm: 'desc' },
        include: { usuarioQpanel: true },
      });

      if (!novaVenda) {
        console.log('Nenhuma nova venda encontrada.');
        return;
      }

      console.log('📌 Nova venda recebida:', novaVenda);

      const usuarioNome = novaVenda.usuarioQpanel?.nome || 'Não criado';
      const usuarioSenha = novaVenda.usuarioQpanel?.senha || 'Não criado';

      let nomePlano = "Plano Desconhecido";
      let valorPlano = "0\\.00";

      const packageId = novaVenda.usuarioQpanel?.package_id;
      if (packageId) {
        try {
          const pacoteEncontrado = obterPacote(null, null, packageId);
          if (pacoteEncontrado) {
            nomePlano = pacoteEncontrado.nome;
            valorPlano = pacoteEncontrado.valor.replace('.', '\\.');
          }
        } catch (err) {
          console.error('❌ Erro ao buscar pacote:', err.message);
        }
      }

      // Monta a mensagem com MarkdownV2 seguro
      const mensagem =
        `*NOVA VENDA RECEBIDA! 🚀*\n` +
        `*Plataforma:* ${this.escapeMarkdown(novaVenda.plataforma || 'N/A')}\n` +
        `*Nome do Cliente:* ${this.escapeMarkdown(novaVenda.nome || 'N/A')}\n` +
        `*Email do Cliente:* ${this.escapeMarkdown(novaVenda.email || 'N/A')}\n` +
        `*Telefone:* ${this.escapeMarkdown(novaVenda.celular || 'N/A')}\n` +
        `*Valor do Plano:* R$${valorPlano}\n` +
        `*Plano Contratado:* ${this.escapeMarkdown(nomePlano)}\n` +
        `*Usuário:* ${this.escapeMarkdown(usuarioNome)}\n` +
        `*Senha:* ${this.escapeMarkdown(usuarioSenha)}\n\n` +
        `*Links de Acesso:*\n` +
        `STB/SMARTUP/SSIPTV: 178.156.149.200\n` +
        `WEB PLAYER: [Acessar](http://wfmixx.wplay.lat/)\n` +
        `Aplicativo Android WF MIXX: [Download](https://aftv.news/5999178)\n` +
        `Max Player iPhone: Solicitar desbloqueio ao suporte\n` +
        `IBO Control: Play Store TV Android e Box\n` +
        `Lazer Play: [Adicionar Playlist](https://lazerplay.io/#/upload-playlist)\n\n` +
        `*M3U Links:*\n` +
        `Todos Apps: [Link](http://worldflick.xyz/get.php?username=${usuarioNome}&password=${usuarioSenha}&type=m3u_plus&output=mpegts)\n` +
        `CloudDy: [Link](http://worldflick.xyz/get.php?username=${usuarioNome}&password=${usuarioSenha}&type=m3u_plus&output=mpegts)\n` +
        `SSIPTV: [Link](http://ss.cd1mu9.eu/p/${usuarioNome}/${usuarioSenha}/ssiptv)\n` +
        `HLS Set IPTV: [Link](http://75924gx.click/get.php?username=${usuarioNome}&password=${usuarioSenha}&type=m3u_plus&output=hls)\n\n` +
        `*Suporte:*\n` +
        `WhatsApp: [Clique aqui](https://bit.ly/ajudaffiliado)\n` +
        `E-mail: atende@worldflick.site\n` +
        `Site oficial: www.worldflick.site`;

      await this.enviarMensagemTelegram(mensagem);

      // Marca a venda como processada
      await this.prisma.venda.update({
        where: { id: novaVenda.id },
        data: { processada: true },
      });

      console.log(`Venda ${novaVenda.id} processada com sucesso.`);

    } catch (error) {
      console.error('Erro ao verificar novas vendas:', error.message);
    }
  }

  iniciarMonitoramento() {
    console.log('Iniciando monitoramento de novas vendas...');
    setInterval(() => this.verificarNovasVendas(), 5000);
  }
}

// Encerra Prisma ao sair
process.on('SIGINT', async () => {
  console.log('Encerrando conexão com o Prisma...');
  await new PrismaClient().$disconnect();
  process.exit(0);
});

module.exports = {
  PagamentosService,
};
