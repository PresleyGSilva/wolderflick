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

  // Método para enviar mensagem ao Telegram
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
        parse_mode: 'Markdown', // Texto puro
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
      let valorPlano = "0.00";

      const packageId = novaVenda.usuarioQpanel?.package_id;
      if (packageId) {
        try {
          const pacoteEncontrado = obterPacote(null, null, packageId);
          if (pacoteEncontrado) {
            nomePlano = pacoteEncontrado.nome;
            valorPlano = pacoteEncontrado.valor;
          }
        } catch (err) {
          console.error('❌ Erro ao buscar pacote:', err.message);
        }
      }

      const mensagem =
        `NOVA VENDA RECEBIDA! 🚀\n` +
        `Plataforma: ${novaVenda.plataforma || 'N/A'}\n` +
        `Nome do Cliente: ${novaVenda.nome || 'N/A'}\n` +
        `Email do Cliente: ${novaVenda.email || 'N/A'}\n` +
        `Telefone: ${novaVenda.celular || 'N/A'}\n` +
        `Valor do Plano: R$${valorPlano}\n` +
        `Plano Contratado: ${nomePlano}\n` +
        `Usuário: ${usuarioNome}\n` +
        `Senha: ${usuarioSenha}\n\n` +
        `Links de Acesso:\n` +
        `STB/SMARTUP/SSIPTV: 178.156.149.200\n` +
        `WEB PLAYER: http://wfmixx.wplay.lat/\n` +
        `Aplicativo Android WF MIXX: https://aftv.news/5999178\n` +
        `Max Player iPhone: Solicitar desbloqueio ao suporte\n` +
        `IBO Control: Play Store TV Android e Box\n` +
        `Lazer Play: https://lazerplay.io/#/upload-playlist\n\n` +
        `M3U Links:\n` +
        `Todos Apps: http://worldflick.xyz/get.php?username=${usuarioNome}&password=${usuarioSenha}&type=m3u_plus&output=mpegts\n` +
        `CloudDy: http://worldflick.xyz/get.php?username=${usuarioNome}&password=${usuarioSenha}&type=m3u_plus&output=mpegts\n` +
        `SSIPTV: http://ss.cd1mu9.eu/p/${usuarioNome}/${usuarioSenha}/ssiptv\n` +
        `HLS Set IPTV: http://75924gx.click/get.php?username=${usuarioNome}&password=${usuarioSenha}&type=m3u_plus&output=hls\n\n` +
        `Suporte:\n` +
        `WhatsApp: https://bit.ly/ajudaffiliado\n` +
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

  // Inicia monitoramento
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
