module.exports = {
  getMainMenu: () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔍 Consultar Cliente', callback_data: 'abrir_consulta' }],
        [{ text: '📥 Baixar Manual de Instalação', callback_data: 'baixar_manual' }],
        [{ text: '🛠️ Gera Teste', callback_data: 'gera_teste' }],
        [{ text: '🔞 Ativar/Desativar Conteúdo 18+', callback_data: 'conteudo_18' }],
      ],
    },
  }),

  getConsultMenu: () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Consultar por EMAIL', callback_data: 'email' }],
        [{ text: 'Consultar por CPF', callback_data: 'cpf' }],
        [{ text: 'Consultar por CELULAR', callback_data: 'celular' }],
      ],
    },
  }),

  getContent18Menu: () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔞 Ativar +18', callback_data: 'ativar_18' }],
        [{ text: '🔞 Desativar +18', callback_data: 'desativar_18' }],
      ],
    },
  }),
};


