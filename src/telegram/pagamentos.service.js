require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { obterPacote } = require('../utils/pacotes'); // Função que busca os pacotes

class PagamentosService {
  constructor() {
    this.prisma = new PrismaClient();
    this.botToken = process.env.TELEGRAM_BOT_PAGAMENTOS; // Token do bot do Telegram
    this.chatId = process.env.TELEGRAM_CHAT_ID; // ID do chat no Telegram
  }

  // Função para escapar caracteres especiais no HTML do Telegram
  escapeHtmlTelegram(text) {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Método para enviar mensagens ao Telegram
  async enviarMensagemTelegram(mensagem) {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    try {
      const response = await axios.post(url, {
        chat_id: this.chatId,
        text: mensagem,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      });

      console.log('✅ Mensagem enviada com sucesso:', response.data);
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem para o Telegram:', error.message);
      if (error.response) console.error('📌 Resposta da API:', error.response.data);
    }
  }

  // Método para verificar novas vendas
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

      // Escapa todos os campos para HTML
      const usuarioNome = this.escapeHtmlTelegram(novaVenda.usuarioQpanel?.nome || 'Não criado');
      const usuarioSenha = this.escapeHtmlTelegram(novaVenda.usuarioQpanel?.senha || 'Não criado');
      const nomeCliente = this.escapeHtmlTelegram(novaVenda.nome || 'N/A');
      const emailCliente = this.escapeHtmlTelegram(novaVenda.email || 'N/A');
      const telefoneCliente = this.escapeHtmlTelegram(novaVenda.celular || 'N/A');
      const plataforma = this.escapeHtmlTelegram(novaVenda.plataforma || 'N/A');

      // Obtem pacote
      const packageId = novaVenda.usuarioQpanel?.package_id;
      let nomePlano = "Plano Desconhecido";
      let valorPlano = "0.00";

      if (packageId) {
        try {
          const pacoteEncontrado = obterPacote(null, null, packageId);
          if (pacoteEncontrado) {
            nomePlano = this.escapeHtmlTelegram(pacoteEncontrado.nome);
            valorPlano = this.escapeHtmlTelegram(pacoteEncontrado.valor.toString());
          }
        } catch (error) {
          console.error('❌ Erro ao buscar pacote:', error.message);
        }
      }

      // Monta a mensagem em HTML
      const mensagem = `
<b>NOVA VENDA RECEBIDA! 🚀</b><br>
<b>Plataforma:</b> ${plataforma}<br>
<b>Nome do Cliente:</b> ${nomeCliente}<br>
<b>Email do Cliente:</b> ${emailCliente}<br>
<b>Telefone:</b> ${telefoneCliente}<br>
<b>Valor do Plano:</b> R$${valorPlano}<br>
<b>Plano Contratado:</b> ${nomePlano}<br>
<b>Usuário:</b> ${usuarioNome}<br>
<b>Senha:</b> ${usuarioSenha}<br><br>

<b>Links de Acesso:</b><br>
🌐 <b>STB/SMARTUP/SSIPTV:</b> 178.156.149.200<br>
✅ <b>WEB PLAYER:</b> <a href="http://wfmixx.wplay.lat/">Acessar</a><br>
✅ <b>Aplicativo Android WF MIXX:</b> <a href="https://aftv.news/5999178">Download</a><br>
📺 <b>Max Player iPhone:</b> Solicitar desbloqueio ao suporte<br>
✅ <b>IBO Control:</b> Play Store TV Android e Box<br>
✅ <b>Lazer Play:</b> <a href="https://lazerplay.io/#/upload-playlist">Adicionar Playlist</a><br><br>

<b>M3U Links:</b><br>
🟠 Todos Apps: <a href="http://worldflick.xyz/get.php?username=${usuarioNome}&password=${usuarioSenha}&type=m3u_plus&output=mpegts">Link</a><br>
🟡 CloudDy: <a href="http://worldflick.xyz/get.php?username=${usuarioNome}&password=${usuarioSenha}&type=m3u_plus&output=mpegts">Link</a><br>
🔴 SSIPTV: <a href="http://ss.cd1mu9.eu/p/${usuarioNome}/${usuarioSenha}/ssiptv">Link</a><br>
🟡 HLS Set IPTV: <a href="http://75924gx.click/get.php?username=${usuarioNome}&password=${usuarioSenha}&type=m3u_plus&output=hls">Link</a><br><br>

<b>Suporte:</b><br>
WhatsApp: <a href="https://bit.ly/ajudaffiliado">Clique aqui</a><br>
E-mail: atende@worldflick.site<br>
Site oficial: www.worldflick.site
`;

      // Envia a mensagem ao Telegram
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

  // Método para iniciar o monitoramento de vendas
  iniciarMonitoramento() {
    console.log('Iniciando monitoramento de novas vendas...');
    setInterval(() => this.verificarNovasVendas(), 5000); // Verifica a cada 5 segundos
  }
}

// Encerrar conexão do Prisma ao finalizar o processo
process.on('SIGINT', async () => {
  console.log('Encerrando conexão com o Prisma...');
  await new PrismaClient().$disconnect();
  process.exit(0);
});

// Exporta o serviço de pagamentos
module.exports = {
  PagamentosService,
};
