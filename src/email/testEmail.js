// importe o módulo que contém logiNenviarEmail
const emailService = require('./email.sevice');  // ajuste o caminho conforme seu projeto

async function enviarEmailTeste() {
  try {
    await emailService.logiNenviarEmail(
      'presleygs.dev@gmail.com',
      'TesteUsuario',
      'senha123',
      'Plano 12 meses',
      '01/08/2025 12:00',
      '01/08/2026 12:00'
    );
    console.log('Email de teste enviado!');
  } catch (error) {
    console.error('Erro ao enviar email de teste:', error);
  }
}

enviarEmailTeste();
