function obterPacote(plano, valorTransacao, packageId) {
  const pacotes = [
    // Planos antigos
    { packageId: "zpKDN6DXlE", serverPackageId: "8", nome: "0️⃣1️⃣ MÊS S/ ADULTO - 3 TELAS", valor: 18.9 },
    { packageId: "kmVLl71QwB", serverPackageId: "8", nome: "0️⃣3️⃣ MESES S/ ADULTO - 3 TELAS", valor: 38.9 },
    { packageId: "XYgD9JWr6V", serverPackageId: "8", nome: "0️⃣6️⃣ MESES S/ ADULTO - 3 TELAS", valor: 64.9 },
    { packageId: "PkaL4qdDgr", serverPackageId: "8", nome: "1️⃣2️⃣ MESES PROMOCIONAL S/ ADULTO - 3 TELAS", valor: 124.9 },

    // 🔥 Novos pacotes (Oferta R$)
    { packageId: "qK4WrQDeNj", serverPackageId: "8", nome: "1 MÊS DE ACESSO 29,90 OFERTA -18", valor: 29.9 },
    { packageId: "ZVdWXjL3qk", serverPackageId: "8", nome: "3 MESES DE ACESSO 59,90 OFERTA -18", valor: 59.9 },
    { packageId: "BKADdn1lrn", serverPackageId: "8", nome: "6 MESES DE ACESSO 104,90 OFERTA -18", valor: 104.9 },
    { packageId: "ryJDzKWgeV", serverPackageId: "8", nome: "1 ANO DE ACESSO 195,90 OFERTA -18", valor: 195.9 },



  ];

  const mapeamentoAbreviacoes = {
    // Planos antigos
    "11 MÊS + 3 TELAS": "0️⃣1️⃣ MÊS S/ ADULTO - 3 TELAS",
    "3 MÊSES + 3 TELAS": "0️⃣3️⃣ MESES S/ ADULTO - 3 TELAS",
    "6 MÉSES + 3 TELAS": "0️⃣6️⃣ MESES S/ ADULTO - 3 TELAS",
    "12 MÊSES + 3 TELAS": "1️⃣2️⃣ MESES PROMOCIONAL S/ ADULTO - 3 TELAS",
    "OFERTA 11 MÊS + 3 TELAS": "0️⃣1️⃣ MÊS S/ ADULTO - 3 TELAS",
    "OFERTA 3 MÊSES + 3 TELAS": "0️⃣3️⃣ MESES S/ ADULTO - 3 TELAS",
    "OFERTA 6 MÉSES + 3 TELAS": "0️⃣6️⃣ MESES S/ ADULTO - 3 TELAS",
    "OFERTA 12 MÊSES + 3 TELAS": "1 ANO DE ACESSO 195,90 OFERTA -18",
    

    "plano mensal": "0️⃣1️⃣ MÊS S/ ADULTO - 3 TELAS",
    "plano trimestral": "0️⃣3️⃣ MESES S/ ADULTO - 3 TELAS",
    "plano semestral": "0️⃣6️⃣ MESES S/ ADULTO - 3 TELAS",
    "plano anual": "1️⃣2️⃣ MESES PROMOCIONAL S/ ADULTO - 3 TELAS",
    

   
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
