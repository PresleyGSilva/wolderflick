const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const Redis = require('ioredis');
const cron = require('node-cron');

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Função para criar transporter usando Hostinger
function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465, // SSL
    secure: true, // true para 465
    auth: {
      user: 'suporte@ironplayoficial.com.br',
      pass: '130829Be@16', // senha do e-mail
    },
  });
}

async function enviarConfirmacaoRenovacao(email, dadosConfirmacao) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    console.error('❌ Erro: Nenhum e-mail válido foi passado para o envio da renovação!', email);
    return;
  }

  if (!dadosConfirmacao || !dadosConfirmacao.usuario || !dadosConfirmacao.proximoVencimento) {
    console.error('❌ Dados de confirmação incompletos ou inválidos:', dadosConfirmacao);
    return;
  }

  const htmlMensagem = `
  <div style="
    font-family: Arial, sans-serif; 
    font-size: 16px; 
    color: #fff; 
    background-color: #1e4427; /* fundo com cor da logo */
    padding: 20px;
    border-radius: 10px;
    max-width: 350px;
    margin: auto;
  ">
    <div style="text-align:center; margin-bottom: 20px;">
      <img src="cid:logoironplay" alt="IronPlay" style="width:150px; height:auto;" />
    </div>
    <p style="color: #a5d6a7; font-weight: bold; margin: 10px 0;">
      ✅ Usuário: ${dadosConfirmacao.usuario}
    </p>
    <p style="color: #cfd8dc; font-weight: bold; margin: 10px 0;">
      🗓️ Próximo Vencimento: ${dadosConfirmacao.proximoVencimento}
    </p>
    <hr style="border: 1px solid #2D9C28; margin: 20px 0;" />
    <p style="margin: 10px 0;">
      Obrigado por continuar conosco! Qualquer dúvida, estamos à disposição.
    </p>

    <div style="margin-top: 30px; text-align: center;">
      <h3 style="color: #e53935; margin-bottom: 15px;">🔴 Suporte</h3>
      <a href="https://wa.me/message/6RHNBJB7PCIPN1" 
         style="
           display: inline-block; 
           background-color: #2D9C28; 
           color: white; 
           padding: 12px 24px; 
           text-decoration: none; 
           border-radius: 5px; 
           font-weight: bold;
           font-size: 16px;
           ">
        📱 Clique aqui para falar no WhatsApp
      </a>
    </div>
  </div>
`;


  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: transporter.options.auth.user,
      to: email,
      subject: 'Confirmação de Renovação de Assinatura',
      text: `Usuário: ${dadosConfirmacao.usuario}\nPróximo Vencimento: ${dadosConfirmacao.proximoVencimento}`,
      html: htmlMensagem,
      attachments: [
        {
          filename: 'ironplay-logo.png',
          path: './ironplay-logo.png',
          cid: 'logoironplay'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`📩 E-mail de confirmação de renovação enviado com sucesso para: ${email}`);
  } catch (error) {
    console.error('❌ Erro ao enviar o e-mail de confirmação de renovação:', error);
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
    await redis.lpush('fila-emails', JSON.stringify(mailOptions)); // Adiciona à fila em caso de erro
  }
}

async function logiNenviarEmail(email, username, password, plano, created_at, expires_at) {
  let conexoes = plano.toLowerCase().includes('12') ? 1 : 1;
  const preco = "R$ 0,00";

  const corpoHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Seu Acesso ao IronPlay</title>
  <style>
  body { 
    font-family: Arial, sans-serif; 
    background: #f7f7f7; /* fundo claro neutro */
    padding: 20px; 
    margin: 0;
  }
  .container { 
    background: #1e4427; /* fundo com cor da logo */
    max-width: 700px; 
    margin: auto; 
    padding: 20px; 
    border-radius: 12px;
    color: white; /* texto branco padrão */
    box-sizing: border-box;
    border: none; 
  }
  .header, .footer { 
    text-align: center; 
  }
  .footer { 
    font-size: 12px; 
    color: #ccc; 
    margin-top: 30px; 
  }
  h1 { 
    text-align: center; 
    color: #a5d6a7; /* tom verde claro para título */
  }
  /* Padrão dos parágrafos */
  .info p, .section p {
    font-size: 16px; 
    margin: 6px 0; 
    color: white; /* texto branco */
  }
  /* Negrito e preto para strong dentro de p */
  .info p strong, .section p strong {
    font-weight: bold;
    color: black;
  }
  /* h3 em negrito e preto */
  h3 {
    font-weight: bold;
    color: black;
  }
  .section { 
    margin-top: 25px; 
  }
  a.btn { 
    display: inline-block; 
    padding: 10px 15px; 
    background: #2D9C28; /* verde do botão */
    color: #fff; 
    border-radius: 5px; 
    text-decoration: none; 
    margin: 10px 0; 
    font-weight: bold;
    transition: background-color 0.3s ease;
  }
  a.btn:hover { 
    background: #1b6a17; 
  }
  a.whatsapp-btn { 
    background: #25D366 !important; 
  }
  code { 
    background: #144d11; /* fundo escuro para código */
    padding: 2px 6px; 
    border-radius: 4px; 
    color: #c8f7c5;
    font-weight: bold;
  }
</style>

</head>
<body>
  <div class="container">
    <div class="header">
      <img src="cid:logo@ironplay" alt="IronPlay" style="max-width: 250px; height: auto;" />
    </div>

    <h1>Agradecemos a preferência</h1>

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
      <h3>🔴 Suporte</h3>
      <p><a href="https://wa.me/message/6RHNBJB7PCIPN1" class="btn whatsapp-btn">📱 Clique aqui para falar no WhatsApp</a></p>
    </div>

    <div class="section">
      <h3>🔸 Link direto Dispositivos Android</h3>
      <p>📥 <a href="https://www.ironplayoficial.com.br/apk/iron1.apk">Baixar App 1</a></p>
      <p><strong>Cód. Downloader:</strong> 4032041</p>
      <p>📥 <a href="https://www.ironplayoficial.com.br/apk/iron2.apk">Baixar App 2</a></p>
      <p><strong>Cód. Downloader:</strong> 9581295</p>
    </div>

    <div class="section">
      <h3>🟠 DNS XCIPTV</h3>
      <p><code>http://u2xayz.shop</code></p>
      <p><code>http://1q2s.shop</code></p>
    </div>

    <div class="section">
      <h3>🟠 DNS SMARTERS</h3>
      <p><code>http://u2xayz.shop</code></p>
      <p><code>http://1q2s.shop</code></p>
    </div>

    <div class="section">
      <h3>🟣 Assist Plus - Roku, LG, Samsung e Android</h3>
      <p><strong>Cod:</strong> 34985687</p>
      <p><strong>Usuário:</strong> ${username}</p>
      <p><strong>Senha:</strong> ${password}</p>
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

    <div class="footer">
      <img src="cid:logo@ironplay" alt="IronPlay" style="max-width: 120px;" />
      <p>IronPlay © ${new Date().getFullYear()}. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
`;

  

  const transporter = await createTransporter();

  const mailOptions = {
    from: transporter.options.auth.user,
    to: email,
    subject: '🎬 Seu Acesso ao IronPlay',
    html: corpoHtml,
    attachments: [
      {
        filename: 'ironplay-logo.png',
        path: __dirname + '/ironplay-logo.png',
        cid: 'logo@ironplay' // mesmo que no src do HTML
      }
    ]
  };

  await transporter.sendMail(mailOptions);
}

// Envia e-mail para um usuário específico do QPanel
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
      usuario.username,
      usuario.password,
      usuario.plano,
      usuario.created_at,
      usuario.expires_at
    );

  } catch (error) {
    console.error('Erro ao enviar e-mail para o usuário do QPanel:', error);
  }
}

// Cria um usuário no banco e envia o e-mail
async function criarUsuarioEEnviarEmail(dadosUsuario) {
  try {
    const novoUsuario = await prisma.usuarioQpanel.create({
      data: dadosUsuario,
    });

    await enviarEmailUsuarioQpanel(novoUsuario.id);

  } catch (error) {
    console.error('Erro ao criar usuário e enviar e-mail:', error);

    await redis.lpush('fila-emails', JSON.stringify({
      from: (await createTransporter()).options.auth.user,
      to: dadosUsuario.email,
      subject: '🎬 Seu Acesso ao IronPlay',
      text: `
✅ *Usuário:* ${dadosUsuario.username}
✅ *Senha:* ${dadosUsuario.password}
📦 *Plano:* ${dadosUsuario.plano}
      `
    }));
  }
}

// Processa a fila de e-mails
async function processarFilaEmails() {
  let count = 0;
  const maxProcess = 100; // Limite por ciclo

  while (count < maxProcess) {
    const emailData = await redis.rpop('fila-emails');
    if (emailData) {
      const mailOptions = JSON.parse(emailData);
      const tentativaKey = `tentativa:${mailOptions.to}`;

      const tentativas = await redis.incr(tentativaKey);

      try {
        if (tentativas <= 3) {
          await enviarEmailGenerico(mailOptions);
          console.log('E-mail reenviado com sucesso:', mailOptions.to);
          await redis.del(tentativaKey);
        } else {
          console.log(`E-mail para ${mailOptions.to} falhou após 3 tentativas. Movendo para fila de erros.`);
          await redis.lpush('fila-erros', emailData);
        }
      } catch (error) {
        console.error('Erro ao reenviar e-mail:', error);
        await redis.lpush('fila-emails', emailData);
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    count++;
  }
}

// Reprocessa a fila de erros
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
        await redis.lpush('fila-erros', emailData);
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 86400000)); // 24h
    }
  }
}

// Agenda para rodar a cada 10 minutos
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
