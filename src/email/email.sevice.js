const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const Redis = require('ioredis');
const cron = require('node-cron');

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'rediss://red-cshr5qu8ii6s73bkflgg:9QuiIogKKZhZBokDxlmqE43A8clbGTit@ohio-redis.render.com:6379');

// Lista de e-mails com suas respectivas senhas
const listaEmails = [
  { email: 'naoresponda545@gmail.com', senha: 'vannuzcuxtcdajox' },
 { email: 'naorespondafireplay@gmail.com', senha: 'tyvzzmogfvwtaizq' },
  { email: 'naoresponda1308@gmail.com', senha: 'yulotrawoocgvtba' },
  { email: 'naoresponda1309@gmail.com', senha: 'vovkcfnnrlisnjhe' },
  { email: 'naoresponda1310@gmail.com', senha: 'bmxhlbjtrxdxgdvg' },
  { email: 'naoresponda1311@gmail.com', senha: 'lprfgzspwbpggbro' }
];

// Função para obter o próximo e-mail da lista
let emailIndex = 0;
function getNextEmail() {
  const emailData = listaEmails[emailIndex];
  emailIndex = (emailIndex + 1) % listaEmails.length;  // Rotaciona os e-mails da lista
  return emailData;
}

// Configuração do transportador de e-mail usando os dados da lista
function createTransporter() {
  const { email, senha } = getNextEmail();
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === 465,
    auth: {
      user: email,
      pass: senha,
    },
  });
}

// Função para enviar confirmação de renovação
async function enviarConfirmacaoRenovacao(email, dadosConfirmacao) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    console.error('❌ Erro: Nenhum e-mail válido foi passado para o envio da renovação!', email);
    return;
  }

  if (!dadosConfirmacao || !dadosConfirmacao.usuario || !dadosConfirmacao.proximoVencimento) {
    console.error('❌ Dados de confirmação incompletos ou inválidos:', dadosConfirmacao);
    return;
  }

  const mensagem = `
✅ *Usuário:* ${dadosConfirmacao.usuario}
🗓️ *Próximo Vencimento:* ${dadosConfirmacao.proximoVencimento}
`;

  const transporter = createTransporter();

  const mailOptions = {
    from: transporter.options.auth.user,
    to: email,  // Aqui garantimos que `email` não está vazio
    subject: 'Confirmação de Renovação de Assinatura',
    text: mensagem,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('📩 E-mail enviado com sucesso para:', email);
  } catch (error) {
    console.error('❌ Erro ao enviar o e-mail:', error);
  }
}


// Função genérica para envio de e-mail
async function enviarEmailGenerico(mailOptions) {
  const transporter = createTransporter();
  try {
    await transporter.sendMail(mailOptions);
    console.log('E-mail enviado com sucesso:', mailOptions.to);
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    await redis.lpush('fila-emails', JSON.stringify(mailOptions));  // Adiciona à fila de emails em caso de erro
  }
}


async function logiNenviarEmail(email, username, password, plano, created_at, expires_at) {
  let conexoes = plano.toLowerCase().includes('12') ? 1 : 1;
  const preco = "R$ 0,00";
  const logoUrl = "ironplay-logo";

  const corpoHtml = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Seu Acesso ao IronPlay</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f7f7f7; padding: 20px; }
      .container { background: #fff; max-width: 700px; margin: auto; padding: 20px; border: 1px solid #ddd; }
      .header, .footer { text-align: center; }
      .footer { font-size: 12px; color: #999; margin-top: 30px; }
      h1 { text-align: center; color: #007bff; }
      .info p { font-size: 16px; margin: 6px 0; }
      .section { margin-top: 25px; }
      a.btn { display: inline-block; padding: 10px 15px; background: #007bff; color: #fff; border-radius: 5px; text-decoration: none; margin: 10px 0; }
      a.btn:hover { background: #0056b3; }
      a.whatsapp-btn { background: #25D366 !important; font-weight: bold; }
      code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="${logoUrl}" alt="IronPlay" style="max-width: 250px; height: auto;" />
      </div>

      <h1>Seu Acesso ao IronPlay</h1>

      <div class="info">
        <p><strong>✅ Usuário:</strong> ${username}</p>
        <p><strong>✅ Senha:</strong> ${password}</p>
        <p><strong>📦 Plano:</strong> ${plano}</p>
        <p><strong>💵 Preço do Plano:</strong> ${preco}</p>
        <p><strong>🗓️ Criado em:</strong> ${created_at}</p>
        <p><strong>🗓️ Vencimento:</strong> ${expires_at}</p>
        <p><strong>📶 Conexões:</strong> ${conexoes}</p>
      </div>

      <div class="section">
        <h3>🟠 DNS XCIPTV</h3>
        <p><code>http://1q2s.shop</code></p>
      </div>

      <div class="section">
        <h3>🟠 DNS SMARTERS</h3>
        <p><code>http://1q2s.shop</code></p>
      </div>

      <div class="section">
        <h3>🟢 Link M3U</h3>
        <p><code>http://1q2s.shop/get.php?username=${username}&password=${password}&type=m3u_plus&output=mpegts</code></p>
        <p><strong>Link Curto:</strong> <code>http://e.1q2s.shop/p/${username}/${password}/m3u</code></p>
      </div>

      <div class="section">
        <h3>🟡 Link HLS</h3>
        <p><code>http://1q2s.shop/get.php?username=${username}&password=${password}&type=m3u_plus&output=hls</code></p>
        <p><strong>Link Curto:</strong> <code>http://e.1q2s.shop/p/${username}/${password}/hls</code></p>
      </div>

      <div class="section">
        <h3>🔴 Link SSIPTV</h3>
        <p><code>http://e.1q2s.shop/p/${username}/${password}/ssiptv</code></p>
      </div>

      <div class="section">
        <h3>📺 DNS STB / SmartUp</h3>
        <p><code>XXXXX</code></p>
      </div>

      <div class="section">
        <h3>📺 WebPlayer</h3>
        <p><code>http://XXXXXX/</code></p>
      </div>

      <div class="section">
        <h3>📱 App Android</h3>
        <p>✅ PlayStore: EM BREVE</p>
        <p>✅ APK Direto: <a href="https://bit.ly/XXXXX" class="btn">Baixar App Android</a></p>
      </div>

      <div class="footer">
        <img src="${logoUrl}" alt="IronPlay" style="max-width: 120px;" />
        <p>IronPlay © ${new Date().getFullYear()}. Todos os direitos reservados.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  const mailOptions = {
    from: (await createTransporter()).options.auth.user,
    to: email,
    subject: '🎬 Seu Acesso ao IronPlay',
    html: corpoHtml,
  };

  await enviarEmailGenerico(mailOptions);
}



// Função para enviar e-mail para o usuário do QPanel
async function enviarEmailUsuarioQpanel(userId) {
  try {
    const usuario = await prisma.usuarioQpanel.findUnique({
      where: { id: userId },
      select: {
        email: true,
        username: true,
        password: true,
        plano: true,
        created_at: true,
        expires_at: true,
      },
    });

    if (!usuario) throw new Error('Usuário não encontrado no banco de dados.');

     await logiNenviarEmail(
      usuario.email,
      usuario.nome,
      usuario.senha,
      usuario.package_id,
      formatarDataBrasil(usuario.criadoEm),
      formatarDataBrasil(usuario.dataExpiracao)
    );

  } catch (error) {
    console.error('Erro ao enviar e-mail para o usuário do QPanel:', error);
  }
}

// Função para criar usuário e enviar e-mail
async function criarUsuarioEEnviarEmail(dadosUsuario) {
  try {
    // Cria o usuário no banco
    const novoUsuario = await prisma.usuarioQpanel.create({
      data: dadosUsuario,
    });

    // Envia o e-mail
    await enviarEmailUsuarioQpanel(novoUsuario.id);

  } catch (error) {
    console.error('Erro ao criar usuário e enviar e-mail:', error);

    // Envia os dados do e-mail à fila se falhar
    await redis.lpush('fila-emails', JSON.stringify({
      from: (await createTransporter()).options.auth.user,
      to: dadosUsuario.email,
      subject: '🎬 Seu Acesso ao IronPlay',
      text: `
✅ *Usuário:* ${dadosUsuario.username}
✅ *Senha:* ${dadosUsuario.password}
📦 *Plano:* ${dadosUsuario.package_id}
      `
    }));
  }
}

// Função para processar a fila de e-mails com controle de tentativas
async function processarFilaEmails() {
  let count = 0;
  const maxProcess = 100; // Limite de e-mails a processar por ciclo
 
  while (count < maxProcess) {
    const emailData = await redis.rpop('fila-emails');
    if (emailData) {
      const mailOptions = JSON.parse(emailData);
      const tentativaKey = `tentativa:${mailOptions.to}`;

      const tentativas = await redis.incr(tentativaKey);

      try {
        if (tentativas <= 3) {  // Limite de 3 tentativas
          await enviarEmailGenerico(mailOptions);
          console.log('E-mail reenviado com sucesso:', mailOptions.to);
          await redis.del(tentativaKey);  // Reset tentativas em caso de sucesso
        } else {
          console.log(`E-mail para ${mailOptions.to} falhou após 3 tentativas. Movendo para fila de erros.`);
          await redis.lpush('fila-erros', emailData);  // Mover para fila de erros
        }
      } catch (error) {
        console.error('Erro ao reenviar e-mail:', error);
        await redis.lpush('fila-emails', emailData);  // Recoloca na fila de e-mails se falhar
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Aguardar 5 segundos antes de tentar novamente
    }
    count++;
  }
}

// Função para reprocessar a fila de erros
async function reprocessarFilaErros() {
  while (true) {
    const emailData = await redis.rpop('fila-erros');
   
    if (emailData) {
      const mailOptions = JSON.parse(emailData);

      try {
        await enviarEmailGenerico(mailOptions);
        console.log('E-mail reenviado com sucesso (servidor alternativo):', mailOptions.to);
      } catch (error) {
        console.error('Erro ao reenviar e-mail (servidor alternativo):', error);
        await redis.lpush('fila-erros', emailData);  // Recoloca na fila de erros se falhar novamente
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 60000 * 60 * 24)); // Aguarda 24 horas antes de tentar novamente
    }
  }
}


cron.schedule('*/10 * * * *', async () => {
  console.log('Iniciando o processamento da fila de e-mails...');
  await processarFilaEmails();
  await reprocessarFilaErros();
});


module.exports = {
  processarFilaEmails,
  reprocessarFilaErros,
  enviarConfirmacaoRenovacao,
  logiNenviarEmail,
  criarUsuarioEEnviarEmail,
};
