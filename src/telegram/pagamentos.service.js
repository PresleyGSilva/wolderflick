require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { obterPacote } = require('../utils/pacotes'); // Importa a função

class PagamentosService {
  constructor() {
    this.prisma = new PrismaClient();
    this.botToken = process.env.TELEGRAM_BOT_PAGAMENTOS; // Token do bot do Telegram
    this.chatId = process.env.TELEGRAM_CHAT_ID; // ID do chat no Telegram
  }

  // Método para formatar e enviar mensagens ao Telegram
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
        parse_mode: 'Markdown', // Formatação básica do Telegram
      });

      console.log('✅ Mensagem enviada com sucesso:', response.data);
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem para o Telegram:', error.message);

      if (error.response) {
        console.error('📌 Resposta da API:', error.response.data);
      }
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

    const usuarioNome = novaVenda.usuarioQpanel?.nome || 'Não criado';
    const usuarioSenha = novaVenda.usuarioQpanel?.senha || 'Não criado';

    const packageId = novaVenda.usuarioQpanel?.package_id;
    let nomePlano = "Plano Desconhecido";
    let valorPlano = "0.00";

    if (packageId) {
      try {
        const pacoteEncontrado = obterPacote(null, null, packageId);
        if (pacoteEncontrado) {
          nomePlano = pacoteEncontrado.nome;
          valorPlano = pacoteEncontrado.valor;
        }
      } catch (error) {
        console.error('❌ Erro ao buscar pacote:', error.message);
      }
    }

    const mensagem = `
<b>NOVA VENDA RECEBIDA! 🚀</b><br>
<b>Plataforma:</b> ${novaVenda.plataforma || 'N/A'}<br>
<b>Nome do Cliente:</b> ${novaVenda.nome || 'N/A'}<br>
<b>Email do Cliente:</b> ${novaVenda.email || 'N/A'}<br>
<b>Telefone:</b> ${novaVenda.celular || 'N/A'}<br>
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

    await this.enviarMensagemTelegram({
      chat_id: this.chatId,
      text: mensagem,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    });

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
