const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const Redis = require('ioredis');
const cron = require('node-cron');

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Função para criar transporter usando o servidor de e-mail do cPanel
function createTransporter() {
  return nodemailer.createTransport({
    host: 'ca806-cp.fmhospeda.com', // servidor SMTP do cPanel
    port: 465, // usa SSL (porta padrão segura)
    secure: true, // true para SSL
    auth: {
      user: 'atende@worldflick.site', // seu e-mail completo
      pass: 'Cyn10203040@', // sua senha do e-mail
    },
    tls: {
      rejectUnauthorized: false // evita erros de certificado (recomendado para cPanel)
    }
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

async function logiNenviarEmail(email, username, password, plano, created_at, expires_at, conexoes = 3) {
  // preco mantido como antes (ajuste se necessário)
  const preco = "R$ 0,00";

  const corpoHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Seu Acesso ao Worldflick</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f7f7f7;
      margin: 0;
      padding: 20px;
      -webkit-font-smoothing:antialiased;
    }
    .container {
      max-width: 720px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 6px 18px rgba(0,0,0,0.08);
      color: #222;
    }
    .hero {
      background: linear-gradient(90deg, #1e4427 0%, #2d7a34 100%);
      color: #fff;
      padding: 18px 24px;
      text-align: center;
    }
    .hero img {
      max-width: 180px;
      height: auto;
      display: block;
      margin: 0 auto 12px;
    }
    .hero h1 {
      margin: 0;
      font-size: 20px;
      letter-spacing: 0.2px;
    }
    .content {
      padding: 20px 24px;
      line-height: 1.45;
      font-size: 15px;
    }
    .badge {
      display: inline-block;
      background: #e9f7ea;
      color: #1b6a17;
      padding: 6px 10px;
      border-radius: 6px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .field {
      margin: 8px 0;
    }
    .field strong {
      display: inline-block;
      width: 135px;
      color: #111;
    }
    .code {
      display: block;
      background: #f4f4f4;
      padding: 10px;
      border-radius: 6px;
      word-break: break-all;
      font-family: monospace;
      margin: 8px 0 12px 0;
    }
    .note {
      font-size: 13px;
      color: #555;
      margin-top: 10px;
    }
    .links a {
      display: inline-block;
      margin: 6px 6px 6px 0;
      text-decoration: none;
      padding: 8px 12px;
      border-radius: 6px;
      background: #f0f0f0;
      color: #222;
      font-weight: bold;
    }
    .footer {
      background: #fafafa;
      padding: 14px 20px;
      text-align: center;
      font-size: 13px;
      color: #777;
      border-top: 1px solid #eee;
    }
    a.whatsapp {
      background: #25D366;
      color: #fff !important;
      text-decoration: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-weight: bold;
      display: inline-block;
    }
    @media (max-width: 520px) {
      .field strong { width: 110px; display: block; margin-bottom: 4px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <img src="cid:logo@worldflick" alt="Worldflick" />
      <h1>USUÁRIO CRIADO COM SUCESSO !!!</h1>
    </div>

    <div class="content">
      <p class="badge">🌐 DNS URL XCIPTV: <strong>http://worldflick.xyz</strong></p>

      <div class="field"><strong>✅ Usuário:</strong> ${username}</div>
      <div class="field"><strong>✅ Senha:</strong> ${password}</div>
      <div class="field"><strong>📶 Conexões:</strong> ${conexoes}</div>
      <div class="field"><strong>🗓️ Vencimento:</strong> ${expires_at}</div>

      <hr style="border:none;border-top:1px solid #eee;margin:14px 0;" />

      <div class="field"><strong>🟢 STB/SMARTUP/SSIPTV:</strong> 178.156.149.200</div>

      <div style="margin-top:12px;">
        <strong>✅ WEB PLAYER:</strong>
        <div class="code">http://wfmixx.wplay.lat/</div>
        <div class="note">USAR EM COMPUTADOR, NOTEBOOK, XBOX, PHILCO NET RANGE, SONY BRAVIA, PS4 !!!</div>
      </div>

      <div style="margin-top:14px;">
        <h3 style="margin:6px 0 8px 0;">✅ APLICATIVO PRÓPRIO ANDROID WF MIXX:</h3>
        <div class="field"><strong>LINK DOWNLOADER:</strong> <a href="https://aftv.news/5999178" target="_blank">https://aftv.news/5999178</a></div>
        <div class="field"><strong>CÓDIGO DOWNLOADER:</strong> 5999178</div>
        <div class="field"><strong>CÓDIGO NTDOWN:</strong> 99879</div>
      </div>

      <div style="margin-top:14px;">
        <h3 style="margin:6px 0 8px 0;">✅ APLICATIVO PARCEIRO MAX PLAYER:</h3>
        <div class="note">- IPHONE - <br/>APÓS INSTALAR O MAX PLAYER SOLICITE DESBLOQUEIO AO SUPORTE !!!</div>
      </div>

      <div style="margin-top:12px;">
        <div class="field"><strong>✅ APP PLAYSTORE TV BOX E CELULAR:</strong> IBO CONTROL OU XTREAM ULTRA</div>
        <div class="field"><strong>✅ APP PLAYSTORE TV ANDROID:</strong> IBO CONTROL</div>
      </div>

      <div style="margin-top:12px;">
        <h3 style="margin:6px 0 8px 0;">✅ APLICATIVO PARCEIRO LAZER PLAY:</h3>
        <div class="note">APENAS LG, SAMSUNG, ROKU !!!</div>
        <div style="margin-top:8px;">
          <div class="note">CLIENTE ENTRA EM PLAYLIST NO APP LAZER PLAY E ADICIONA OU NO SITE:</div>
          <div class="code">https://lazerplay.io/#/upload-playlist</div>
          <div class="field"><strong>CÓDIGO:</strong> worldflick</div>
          <div class="field"><strong>USUÁRIO:</strong> ${username}</div>
          <div class="field"><strong>SENHA:</strong> ${password}</div>
        </div>
      </div>

      <hr style="border:none;border-top:1px solid #eee;margin:14px 0;" />

      <div>
        <h3 style="margin:6px 0 8px 0;">M3U / LINKS</h3>

        <div class="field"><strong>🟠 M3U TODOS APLICATIVOS:</strong></div>
        <div class="code">http://worldflick.xyz/get.php?username=${username}&password=${password}&type=m3u_plus&output=mpegts</div>

        <div class="field"><strong>🟡 M3U APLICATIVO CLOUDDY:</strong></div>
        <div class="code">http://worldflick.xyz/get.php?username=${username}&password=${password}&type=m3u_plus&output=mpegts</div>

        <div class="field"><strong>🔴 Link (SSIPTV):</strong></div>
        <div class="code">http://ss.cd1mu9.eu/p/${username}/${password}/ssiptv</div>

        <div class="field"><strong>🟡 Link (HLS) SET IPTV:</strong></div>
        <div class="code">http://75924gx.click/get.php?username=${username}&password=${password}&type=m3u_plus&output=hls</div>
      </div>

      <hr style="border:none;border-top:1px solid #eee;margin:14px 0;" />

      <div style="margin-top:10px;">
        <h3 style="margin:6px 0 8px 0;">SUPORTE</h3>
        <div class="field"><strong>WHATSAPP:</strong> <a class="whatsapp" href="https://bit.ly/ajudaffiliado" target="_blank">Clique para WhatsApp</a></div>
        <div class="field"><strong>E-MAIL:</strong> atende@worldflick.site</div>
        <div class="field"><strong>SITE OFICIAL:</strong> www.worldfick.site</div>
      </div>

      <div style="margin-top:18px;">
        <p style="font-size:13px;color:#666;margin:0;">Se tiver alguma dúvida, responda este e-mail ou entre em contato via WhatsApp.</p>
      </div>
    </div>

    <div class="footer">
      <img src="cid:logo@worldflick" alt="Worldflick" style="max-width:120px; display:block; margin:0 auto 8px;" />
      <div>Worldflick © ${new Date().getFullYear()}. Todos os direitos reservados.</div>
    </div>
  </div>
</body>
</html>
`;

  // cria transporter (assume createTransporter() existe no seu projeto)
  const transporter = await createTransporter();

  const mailOptions = {
    from: transporter.options.auth.user,
    to: email,
    subject: '🎬 Seu Acesso ao Worldflick',
    html: corpoHtml,
    attachments: [
      {
        filename: 'worldflick-logo.png',
        path: __dirname + '/worldflick-logo.png',
        cid: 'logo@worldflick' // corresponde ao src no HTML
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
