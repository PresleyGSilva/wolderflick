
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

  // Função para escapar caracteres especiais do MarkdownV2
  escapeMarkdownV2(text) {
    if (!text) return '';
    return text.replace(/([_\*\[\]\(\)~`>#+\-=|{}.!])/g, '\\$1');
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
        parse_mode: 'MarkdownV2',
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

    // Escape básico para Markdown simples: coloca campos sensíveis entre ``
    const usuarioNome = novaVenda.usuarioQpanel?.nome || 'N/A';
    const usuarioSenha = novaVenda.usuarioQpanel?.senha || 'N/A';

    const mensagem = `
*NOVA VENDA RECEBIDA!* 🚀
Plataforma: ${novaVenda.plataforma || 'N/A'}
Nome do Cliente: ${novaVenda.nome || 'N/A'}
Email do Cliente: ${novaVenda.email || 'N/A'}
Telefone: ${novaVenda.celular || 'N/A'}
Valor do Plano: R$${valorPlano}
Plano Contratado: ${nomePlano}
Usuário: \`${usuarioNome}\`
Senha: \`${usuarioSenha}\`




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


  iniciarMonitoramento() {
    console.log('Iniciando monitoramento de novas vendas...');
    setInterval(() => this.verificarNovasVendas(), 5000);
  }
}

process.on('SIGINT', async () => {
  console.log('Encerrando conexão com o Prisma...');
  await new PrismaClient().$disconnect();
  process.exit(0);
});

module.exports = { PagamentosService };

    
