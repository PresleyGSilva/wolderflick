const { PrismaClient } = require('@prisma/client');

class ClienteService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async consultarCliente(campo, valor) {
    // Verifica qual é o campo de busca e define a condição
    let whereCondition;

    if (campo === 'cpf') {
      whereCondition = { vendas: { some: { cpf: valor } } }; // Busca nas vendas por CPF
    } else if (campo === 'celular') {
      whereCondition = { vendas: { some: { celular: valor } } }; // Busca nas vendas por celular
    } else if (campo === 'email') {
      whereCondition = { email: valor }; // Busca no cliente por email
    } else {
      whereCondition = { [campo]: valor }; // Busca genérica no cliente
    }

    const cliente = await this.prisma.usuarioQpanel.findFirst({
      where: whereCondition,
      include: { vendas: true },
    });

    if (!cliente) return '❌ Cliente não encontrado.';

    // Extraindo dados necessários do cliente e suas vendas
    const username = cliente.nome; // ou cliente.usuario, conforme o modelo
    const password = cliente.senha; // senha do cliente
    const venda = cliente.vendas[0]; // Supondo que sempre há pelo menos uma venda associada

    if (!venda) return '❌ Nenhuma venda encontrada para este cliente.';

    return `
      Olá, seja bem vindo a CineFlickCard!  

      🆔 ID Usuário: ${cliente.id}  
      ✅ | Nome: ${venda.nome}  
      ✅ | Usuário: ${username}
      ✅ | senha: ${password}
      ✅ | Email: ${cliente.email}  
      ✅ | CPF: ${venda.cpf}  
      ✅ | Celular: ${venda.celular}  
      🖥 | Produto: ${venda.produto}  
      🗓 | Vencimento: ${cliente.dataExpiracao}  

🟠 WebPlayer ( Assista on-line pelo nosso webplayer, sem a necessidade de baixar quaisquer aplicativo)

✅ http://oficialcineflick.com/web
✅ http://tv.topplay.top/#/login

🟠 Para Android tv, box tv, fire tv, celular ou qualquer dispositivo android, link do aplicativo
https://oficialcineflick.com/c.apk

🟠 Alternativo Para android tv abra a playstore baixe o app downloader e use o código:
✅ 380482
✅ 437846
✅ 795498

🟠 DNS XCIPTV: http://dns.lexustv.top:80
🟠 DNS XCIPTV: http://cineflick.dns2.top:80
🟠 DNS XCIPTV: http://dns.topplay.top:80
🟠 DNS XCIPTV: http://dns2.topplay.top:80

🟠 DNS SMARTERS: http://dns.lexustv.top
🟠 DNS SMARTERS: http://cineflick.dns2.top
🟠 DNS SMARTERS: http://dns.topplay.top
🟠 DNS SMARTERS: http://dns2.topplay.top

📺 DNS STB / SmartUp: 135.148.144.87

🟢 Link M3U 1: http://dns.topplay.top:80/get.php?username=${username}&password=${password}&type=m3u_plus&output=mpegts

🟢 Link M3U 2 : http://dns.lexustv.top:80/get.php?username=${username}2&password=${password}&type=m3u_plus&output=mpegts

🟡 Link HLS: http://dns.topplay.top:80/get.php?username=${username}&password=${password}&type=m3u_plus&output=hls

🟡 Link Curto HLS: http://e.dns.topplay.top/p/${username}/${password}/hls

🔴 Link SSIPTV: http://e.dns.topplay.top/p/${username}/${password}/ssiptv
    `;
  }
}

module.exports = ClienteService;
