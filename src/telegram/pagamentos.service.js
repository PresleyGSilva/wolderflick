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
      // Busca a venda mais recente que ainda não foi processada
      const novaVenda = await this.prisma.venda.findFirst({
        where: { processada: false }, // Apenas vendas não processadas
        orderBy: { criadoEm: 'desc' }, // Ordenar pela data de criação (mais recente)
        include: { usuarioQpanel: true }, // Inclui o usuário relacionado
      });

      if (novaVenda) {
        console.log('📌 Nova venda recebida:', novaVenda);

        // Pegando o package_id do usuário
        const packageId = novaVenda.usuarioQpanel?.package_id;

        // Se existir um package_id, busca o pacote correspondente
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
*NOVA VENDA RECEBIDA!* 🚀
*Plataforma:* ${novaVenda.plataforma}
*NOME CLIENTE:* ${novaVenda.nome}
*EMAIL CLIENTE:* ${novaVenda.email}
*TELEFONE CLIENTE:* ${novaVenda.celular}
*VALOR DO PLANO CONTRATADO:* R$${valorPlano}
*PLANO CONTRATADO:* ${nomePlano}
*USUÁRIO:* ${novaVenda.usuarioQpanel?.nome || 'N/A'}
*SENHA:* ${novaVenda.usuarioQpanel?.senha || 'N/A'}


 
🟠 *DNS XCIPTV:* http://1q2s.shop
🟠 *DNS SMARTERS:* http://1q2s.shop
 
🟢 *Link (M3U):* http://1q2s.shop/get.php?username=${novaVenda.usuarioQpanel?.nome || 'N/A'}&password=${novaVenda.usuarioQpanel?.senha || 'N/A'}
&type=m3u_plus&output=mpegts
 
🟢 *Link Curto (M3U):* http://e.1q2s.shop/p/${novaVenda.usuarioQpanel?.nome || 'N/A'}/${novaVenda.usuarioQpanel?.senha || 'N/A'}
/m3u
 
🟡 *Link (HLS):* http://1q2s.shop/get.php?username=${novaVenda.usuarioQpanel?.nome || 'N/A'}&password=${novaVenda.usuarioQpanel?.senha || 'N/A'}
&type=m3u_plus&output=hls
 
🟡 *Link Curto (HLS):* http://e.1q2s.shop/p/${novaVenda.usuarioQpanel?.nome || 'N/A'}/${novaVenda.usuarioQpanel?.senha || 'N/A'}
/hls
 
🔴 *Link (SSIPTV):* http://e.1q2s.shop/p/${novaVenda.usuarioQpanel?.nome || 'N/A'}/${novaVenda.usuarioQpanel?.senha || 'N/A'}
/ssiptv
 
📺 *DNS STB / SmartUp:* XXXXX
 
📺 *WebPlayer:* http://XXXXXX/
 
✅ *PARA ANDROID:*
- PLAYSTORE
- EM BREVE
✅ *App EM APK (LINK DIRETO):*
*DOWNLOAD:* https://bit.ly/XXXXX
`;

        // Envia a mensagem ao Telegram
        await this.enviarMensagemTelegram(mensagem);

        // Marca a venda como processada no banco de dados
        await this.prisma.venda.update({
          where: { id: novaVenda.id },
          data: { processada: true },
        });

        console.log(`Venda ${novaVenda.id} processada com sucesso.`);
      } else {
        console.log('Nenhuma nova venda encontrada.');
      }
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
