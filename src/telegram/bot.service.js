const { gerarTeste } = require('./gerateste');
const ClienteService = require('./cliente.service');
const { Telegraf } = require('telegraf');
const { validateInput } = require('./validators');
const { getMainMenu } = require('./menus');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

class BotService {
  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    this.clienteService = new ClienteService();
    this.activeListeners = new Map(); // Rastrear ouvintes ativos por usuário
  }

  inicializarBot() {
    // Menu inicial ao iniciar o bot
    this.bot.start((ctx) => {
      ctx.reply('Olá! Escolha uma das opções abaixo:', getMainMenu());
    });

    // Processar callback queries
    this.bot.on('callback_query', async (ctx) => {
      try {
        const callbackData = ctx.callbackQuery.data;
        await ctx.answerCbQuery('Processando sua solicitação...');

        if (callbackData === 'abrir_consulta') {
          await ctx.reply('Escolha como deseja consultar:', {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Consultar por EMAIL', callback_data: 'email' }],
                [{ text: 'Consultar por CPF', callback_data: 'cpf' }],
                [{ text: 'Consultar por CELULAR', callback_data: 'celular' }],
              ],
            },
          });
        } else if (['email', 'cpf', 'celular'].includes(callbackData)) {
          const tipo = callbackData;
          await ctx.reply(`Digite o ${tipo.toUpperCase()} que deseja consultar:`);

          const userId = ctx.from.id;

          // Registrar novo ouvinte associado ao ID do usuário
          this.activeListeners.set(userId, tipo);
        } else if (callbackData === 'gera_teste') {
          const loadingMessage = await ctx.reply('🔄 Gerando teste... Por favor, aguarde...');

          try {
            await gerarTeste(ctx);
            await ctx.telegram.editMessageText(ctx.chat.id, loadingMessage.message_id, null, '✅ Teste gerado com sucesso!');
          } catch (error) {
            console.error('Erro ao gerar o teste:', error);
            await ctx.telegram.editMessageText(ctx.chat.id, loadingMessage.message_id, null, '❌ Ocorreu um erro ao gerar o teste. Tente novamente.');
          }

          await this.showMenu(ctx);
        } else if (callbackData === 'baixar_manual') {
          // Ajuste do caminho do manual de instalação
          const manualPath = path.resolve(__dirname, '../telegram/', 'Manual CineFlickCard.pdf');

          console.log('Caminho do manual:', manualPath);  // Verificando o caminho gerado

          // Verificar se o arquivo existe antes de enviar
          if (fs.existsSync(manualPath)) {
            await ctx.replyWithDocument({ source: manualPath, filename: 'Manual_de_Instalacao.pdf' });
            await this.showMenu(ctx);
          } else {
            await ctx.reply('❌ O manual de instalação não foi encontrado.');
          }
        }
      } catch (err) {
        console.error('Erro ao processar callback:', err);
        ctx.reply('❌ Ocorreu um erro. Tente novamente.');
      }
    });

    // Tratar mensagens de texto e filtrar pelo usuário ativo
    this.bot.on('text', async (ctx) => {
      const userId = ctx.from.id;

      if (!this.activeListeners.has(userId)) {
        return; // Ignorar se não há ouvinte registrado para o usuário
      }

      const tipo = this.activeListeners.get(userId);
      const valor = ctx.message.text;
      const errorMsg = validateInput(tipo, valor);

      if (errorMsg) {
        return await ctx.reply(errorMsg);
      }

      try {
        const resultado = await this.clienteService.consultarCliente(tipo, valor);
        if (!resultado) {
          await ctx.reply('❌ Nenhum cliente encontrado.');
        } else {
          await ctx.reply(resultado);
        }

        await this.showMenu(ctx);
      } catch (error) {
        console.error('Erro ao consultar cliente:', error);
        await ctx.reply('❌ Houve um erro ao processar sua solicitação.');
      }

      // Remover o ouvinte após processar a mensagem
      this.activeListeners.delete(userId);
    });

    // Captura erros globais
    this.bot.catch((err, ctx) => {
      console.error(`Erro não tratado para atualização ${ctx.update.update_id}:`, err);
      ctx.reply('❌ Ocorreu um erro inesperado. Tente novamente mais tarde.');
    });

    this.bot.launch();
    console.log('Bot do Telegram inicializado com sucesso!');
  }

  async showMenu(ctx) {
    await ctx.reply('Escolha uma das opções abaixo:', getMainMenu());
  }
}

module.exports = {
  BotService,
};
