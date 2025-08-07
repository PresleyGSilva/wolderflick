function obterPacote(plano, valorTransacao, packageId) {
  const pacotes = [
    // Planos antigos
    { packageId: "RYAWRk1jlx", serverPackageId: "8", nome: "1 MÊS DE ACESSO 16,90 -18", valor: 16.9 },
    { packageId: "o231qzL4qz", serverPackageId: "8", nome: "3 MESES DE ACESSO 33,90 -18", valor: 33.9 },
    { packageId: "VpKDaJWRAa", serverPackageId: "8", nome: "6 MESES DE ACESSO 59,90 -18", valor: 69.9 },
    { packageId: "ANKWPKDPRq", serverPackageId: "8", nome: "1 ANO DE ACESSO 110,90 -18", valor: 110.9 },

    // 🔥 Novos pacotes (Oferta R$)
    { packageId: "qK4WrQDeNj", serverPackageId: "8", nome: "1 MÊS DE ACESSO 29,90 OFERTA -18", valor: 29.9 },
    { packageId: "ZVdWXjL3qk", serverPackageId: "8", nome: "3 MESES DE ACESSO 59,90 OFERTA -18", valor: 59.9 },
    { packageId: "BKADdn1lrn", serverPackageId: "8", nome: "6 MESES DE ACESSO 104,90 OFERTA -18", valor: 104.9 },
    { packageId: "ryJDzKWgeV", serverPackageId: "8", nome: "1 ANO DE ACESSO 195,90 OFERTA -18", valor: 195.9 },



  ];

  const mapeamentoAbreviacoes = {
    // Planos antigos
    "1 MÊS DE ACESSO COMPLETO": "1 MÊS DE ACESSO 16,90 -18",
    "3 MESES DE ACESSO COMPLETO": "3 MESES DE ACESSO 33,90 -18",
    "6 MESES DE ACESSO COMPLETO": "6 MESES DE ACESSO 59,90 -18",
    "1 Ano DE ACESSO COMPLETO": "1 ANO DE ACESSO 110,90 -18",
    "OFERTA 1 MÊS DE ACESSO COMPLETO": "1 MÊS DE ACESSO 16,90 -18",
    "OFERTA 3 MESES DE ACESSO COMPLETO": "3 MESES DE ACESSO 33,90 -18",
    "OFERTA 6 MESES DE ACESSO COMPLETO": "6 MESES DE ACESSO 59,90 -18",
    "OFERTA 1 ANO DE ACESSO COMPLETO": "1 ANO DE ACESSO 195,90 OFERTA -18",
    

    "plano mensal": "1 MÊS DE ACESSO 16,90 -18",
    "plano trimestral": "3 MESES DE ACESSO 33,90 -18",
    "plano semestral": "6 MESES DE ACESSO 59,90 -18",
    "plano anual": "1 ANO DE ACESSO 110,90 -18",
    

   
  };

  const normalizarTexto = (texto) =>
    texto.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  let pacoteEncontrado;

  // Busca pelo packageId primeiro
  if (packageId) {
    pacoteEncontrado = pacotes.find((p) => p.packageId === packageId);
  }

  // Se não encontrou pelo packageId, tenta pelo nome do plano
  if (!pacoteEncontrado && plano) {
    const planoNormalizado = normalizarTexto(plano);
    const nomePlano = Object.entries(mapeamentoAbreviacoes).find(
      ([chave]) => normalizarTexto(chave) === planoNormalizado
    )?.[1];

    if (nomePlano) {
      pacoteEncontrado = pacotes.find((p) => normalizarTexto(p.nome) === normalizarTexto(nomePlano));
    }
  }

  // Se ainda não encontrou, tenta pelo valor da transação
  if (!pacoteEncontrado && valorTransacao) {
    pacoteEncontrado = pacotes.find((p) => p.valor === valorTransacao);
  }

  if (!pacoteEncontrado) {
    throw new Error(`❌ Nenhum pacote corresponde ao plano informado: ${plano} (Valor: ${valorTransacao})`);
  }

  console.log("✅ Package ID selecionado:", pacoteEncontrado.packageId);
  console.log("✅ Server Package ID selecionado:", pacoteEncontrado.serverPackageId);

  return {
    packageId: pacoteEncontrado.packageId,
    serverPackageId: pacoteEncontrado.serverPackageId,
    nome: pacoteEncontrado.nome,
    valor: pacoteEncontrado.valor,
  };
}

module.exports = { obterPacote };
