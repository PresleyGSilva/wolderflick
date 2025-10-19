function obterPacote(plano, valorTransacao, packageId) {
  const pacotes = [
    // Planos antigos
    { packageId: "zpKDN6DXlE", serverPackageId: "8", nome: "0️⃣1️⃣ MÊS S/ ADULTO - 3 TELAS", valor: 18.9 },
    { packageId: "kmVLl71QwB", serverPackageId: "8", nome: "0️⃣3️⃣ MESES S/ ADULTO - 3 TELAS", valor: 38.9 },
    { packageId: "XYgD9JWr6V", serverPackageId: "8", nome: "0️⃣6️⃣ MESES S/ ADULTO - 3 TELAS", valor: 64.9 },
    { packageId: "PkaL4qdDgr", serverPackageId: "8", nome: "1️⃣2️⃣ MESES PROMOCIONAL S/ ADULTO - 3 TELAS", valor: 124.99 },

    // 🔥 Novos pacotes (Oferta R$)
    { packageId: "Kr6LJjLv9m", serverPackageId: "8", nome: "0️⃣1️⃣ MÊS C/ ADULTO - 3 TELAS", valor: 14.9 },
    { packageId: "ayb1BxDPR9", serverPackageId: "8", nome: "0️⃣3️⃣ MESES C/ ADULTO - 3 TELAS", valor: 34.99 },
    { packageId: "7V01paLdO4", serverPackageId: "8", nome: "0️⃣6️⃣ MESES C/ ADULTO - 3 TELAS", valor: 68.9 },
    { packageId: "Yxl1jEBWMj", serverPackageId: "8", nome: "1️⃣2️⃣ MESES PROMOCIONAL S/ ADULTO - 3 TELAS", valor: 179.9 },



  ];

  const mapeamentoAbreviacoes = {
  // Planos antigos
  "1 MÊS + 3 TELAS PROMO": "0️⃣1️⃣ MÊS S/ ADULTO - 3 TELAS",
  "3 MÊSES + 3 TELAS PROMO": "0️⃣3️⃣ MESES S/ ADULTO - 3 TELAS",
    "3 MÊSES × 3 TELAS PROMO": "0️⃣3️⃣ MESES S/ ADULTO - 3 TELAS",
    "1 MÊS + 3 TELAS 14,90":"0️⃣1️⃣ MÊS C/ ADULTO - 3 TELAS",
    "3 MÊSES × 3 TELAS 34,90":"0️⃣3️⃣ MESES C/ ADULTO - 3 TELAS",
    "6 MÉSES + 3 TELAS 68,90":"0️⃣6️⃣ MESES C/ ADULTO - 3 TELAS",
    "12 MÊSES + 3 TELAS 179,99": "1️⃣2️⃣ MESES PROMOCIONAL S/ ADULTO - 3 TELAS",
    
  "6 MÉSES + 3 TELAS PROMO": "0️⃣6️⃣ MESES S/ ADULTO - 3 TELAS",
  "12 MÊSES + 3 TELAS": "1️⃣2️⃣ MESES PROMOCIONAL S/ ADULTO - 3 TELAS", // 👈 adicione esta linha
  "12 MÊSES + 3 TELAS PROMO": "1️⃣2️⃣ MESES PROMOCIONAL S/ ADULTO - 3 TELAS",
  
  // Planos de oferta
  "1 MÊS + 3 TELAS": "0️⃣1️⃣ MÊS S/ ADULTO - 3 TELAS",
  "3 MÊSES + 3 TELAS": "0️⃣3️⃣ MESES S/ ADULTO - 3 TELAS",
  "6 MÉSES + 3 TELAS": "0️⃣6️⃣ MESES S/ ADULTO - 3 TELAS",
  "12 MÊSES + 3 TELAS": "1️⃣2️⃣ MESES PROMOCIONAL S/ ADULTO - 3 TELAS",

  // Planos por nome genérico
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
