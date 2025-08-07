function calcularExpiracao(nomePlano) {
  const hoje = new Date();

  const texto = nomePlano
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const textoLimpo = texto
    .replace(/s\/ adulto/g, "")
    .replace(/de acesso/g, "")
    .replace(/oferta r\$ \d+,\d+/g, "")
    .replace(/[\+!]/g, "")
    .trim();

  // Casos fixos tipo "mensal", "anual"
  const duracoesFixas = {
    mensal: { quantidade: 1, unidade: "mes" },
    bimestral: { quantidade: 2, unidade: "mes" },
    trimestral: { quantidade: 3, unidade: "mes" },
    semestral: { quantidade: 6, unidade: "mes" },
    anual: { quantidade: 1, unidade: "ano" },
    bienal: { quantidade: 2, unidade: "ano" }
  };

  for (const chave in duracoesFixas) {
    if (textoLimpo.includes(chave)) {
      const { quantidade, unidade } = duracoesFixas[chave];
      if (unidade === "mes") hoje.setMonth(hoje.getMonth() + quantidade);
      else hoje.setFullYear(hoje.getFullYear() + quantidade);
      return new Date(hoje.getTime());
    }
  }

  // Regex para extrair duração explícita
  const regexDuracao = /(\d+)\s*(mes(?:es)?|ano(?:s)?)/;
  const match = textoLimpo.match(regexDuracao);

  if (!match) {
    throw new Error(`Duração inválida no nome do plano: "${nomePlano}"`);
  }

  const quantidade = parseInt(match[1], 10);
  const unidade = match[2];

  if (unidade.startsWith("mes")) {
    hoje.setMonth(hoje.getMonth() + quantidade);
  } else if (unidade.startsWith("ano")) {
    hoje.setFullYear(hoje.getFullYear() + quantidade);
  } else {
    throw new Error(`Unidade de duração desconhecida no plano: "${nomePlano}"`);
  }

  return new Date(hoje.getTime());
}

module.exports = { calcularExpiracao };
