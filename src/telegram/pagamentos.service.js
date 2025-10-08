require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

class PagamentosService {
  constructor() {
    this.prisma = new PrismaClient();
    this.botToken = process.env.TELEGRAM_BOT_PAGAMENTOS;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.maxTentativas = 5;
  }

  async esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async enviarMensagemTelegram(mensagem, tentativa = 1) {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    try {
      await axios.post(url, {
        chat_id: this.chatId,
        text: mensagem,
        parse_mode: 'Markdown',
      });

      console.log(`✅ Mensagem enviada com sucesso (tentativa ${tentativa}).`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem (tentativa ${tentativa}):`, error.message);

      if (tentativa < this.maxTentativas) {
        const espera = 3000 * tentativa;
        console.log(`⏳ Tentando novamente em ${espera / 1000}s...`);
        await this.esperar(espera);
        return this.enviarMensagemTelegram(mensagem, tentativa + 1);
      } else {
        console.error(`🚨 Falha após ${this.maxTentativas} tentativas.`);
        return false;
      }
    }
  }

  async verificarNovasVendas() {
    try {
     const vendasPendentes = await this.prisma.venda.findMany({
  where: { processada: false },
  orderBy: { criadoEm: 'desc' },
  include: { usuarioQpanel: true },
});


      if (vendasPendentes.length === 0) {
        console.log('🔍 Nenhuma venda pendente para envio.');
        return;
      }

      console.log(`📦 Encontradas ${vendasPendentes.length} vendas pendentes.`);

      for (const venda of vendasPendentes) {
        console.log(`🧾 Processando venda ID: ${venda.id}`);

        const username = venda.usuarioQpanel?.nome || 'N/A';
        const password = venda.usuarioQpanel?.senha || 'N/A';

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

        const enviada = await this.enviarMensagemTelegram(mensagem);

        if (enviada) {
          await this.prisma.venda.update({
            where: { id: venda.id },
            data: { processada: true, erroTelegram: null },
          });
          console.log(`✅ Venda ${venda.id} marcada como processada.`);
        } else {
          await this.prisma.venda.update({
            where: { id: venda.id },
            data: { erroTelegram: 'Falha ao enviar mensagem para o Telegram' },
          });
          console.error(`⚠️ Venda ${venda.id} falhou novamente. Mantida como pendente.`);
        }
      }
    } catch (error) {
      console.error('❌ Erro geral ao verificar novas vendas:', error.message);
    }
  }

  iniciarMonitoramento() {
    console.log('🚀 Iniciando monitoramento de novas vendas...');
    this.verificarNovasVendas(); // roda uma vez imediatamente
    setInterval(() => this.verificarNovasVendas(), 10000); // a cada 10s
  }
}

process.on('SIGINT', async () => {
  console.log('🧹 Encerrando conexão com o Prisma...');
  await new PrismaClient().$disconnect();
  process.exit(0);
});

// Se for executado diretamente
if (require.main === module) {
  const pagamentos = new PagamentosService();
  pagamentos.iniciarMonitoramento();
}
