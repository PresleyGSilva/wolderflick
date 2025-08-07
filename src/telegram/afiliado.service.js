class AfiliadoService {
  constructor() {
    this.codigoAfiliadoValido = '1N7eaSwBMB5L'; // Código de afiliado válido
  }

  // Método para validar o código do afiliado
  validarCodigo(codigoRecebido) {
    return codigoRecebido === this.codigoAfiliadoValido;
  }
}

module.exports = AfiliadoService;
