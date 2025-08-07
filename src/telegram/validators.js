// validators.js
module.exports = {
  validateInput: (tipo, valor) => {
    if (tipo === 'cpf' && !/^\d{11}$/.test(valor)) {
      return '❌ O CPF deve conter 11 números.';
    }
    if (tipo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
      return '❌ O e-mail informado é inválido.';
    }
    return null; // Entrada válida
  },
};
