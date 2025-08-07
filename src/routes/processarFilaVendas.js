async function processarFilaVendas() {
  let count = 0;
  const maxProcess = 100; // Limite de vendas a processar por ciclo

  while (count < maxProcess) {
    const vendaData = await redis.rpop('fila-vendas'); // Recupera a próxima venda na fila
    if (vendaData) {
      const venda = JSON.parse(vendaData);
      const tentativaKey = `tentativa-venda:${venda.id}`; // Chave para controle de tentativas
      const tentativas = await redis.incr(tentativaKey);

      try {
        if (tentativas <= 3) { // Limite de 3 tentativas por venda
          console.log(`Processando venda: ${venda.id}`);
          const resultado = await venda.funcao(venda.dados); // Executa a função associada à venda
          console.log(`Venda processada com sucesso: ${venda.id}`);
          await redis.del(tentativaKey); // Limpa a chave de tentativas no sucesso
        } else {
          console.log(`Venda ${venda.id} falhou após 3 tentativas. Movendo para fila de erros.`);
          await redis.lpush('fila-erros-vendas', vendaData); // Move para a fila de erros
        }
      } catch (error) {
        console.error(`Erro ao processar venda ${venda.id}:`, error.message);
        await redis.lpush('fila-vendas', vendaData); // Recoloca na fila de vendas se falhar
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Aguarda 5 segundos antes de tentar novamente
    }
    count++;
  }
}
