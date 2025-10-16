const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const Redis = require('ioredis');
const cron = require('node-cron');

const prisma = new PrismaClient();
const redis = new Redis('redis://default:q9I8QyrFWcB93O8TW6EI4beJey55EnPK@redis-15509.c91.us-east-1-3.ec2.redns.redis-cloud.com:15509');

// -------------------- CONFIGURAÇÃO DO TRANSPORTER --------------------
function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: 'visionplayoficial@visionplay.lat',
      pass: '130829Be@16',
    },
    tls: { rejectUnauthorized: false },
  });
}

// Instância única do transporter
const transporter = createTransporter();

// -------------------- FUNÇÕES DE ENVIO --------------------
async function enviarConfirmacaoRenovacao(email, dadosConfirmacao) {
  if (!dadosConfirmacao || !dadosConfirmacao.usuario || !dadosConfirmacao.proximoVencimento) {
    console.error('Dados de confirmação incompletos ou inválidos:', dadosConfirmacao);
    return;
  }

  const mensagem = `
✅ *Usuário:* ${dadosConfirmacao.usuario}
🗓️ *Próximo Vencimento:* ${dadosConfirmacao.proximoVencimento}
`;

  const mailOptions = {
    from: 'atende@worldflick.site',
    to: email,
    subject: 'Confirmação de Renovação de Assinatura',
    text: mensagem,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('E-mail enviado com sucesso para:', email);
  } catch (error) {
    console.error('Erro ao enviar o e-mail:', error);
  }
}

async function enviarEmailGenerico(mailOptions) {
  try {
    await transporter.sendMail(mailOptions);
    console.log('E-mail enviado com sucesso:', mailOptions.to);
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    await redis.lpush('fila-emails', JSON.stringify(mailOptions));
  }
}

async function logiNenviarEmail(email, username, password, plano, created_at, expires_at) {
  const corpo = `
✅ *Usuário:* ${username}
✅ *Senha:* ${password}
📦 *Plano:* ${plano}

🗓️ *Criado em:* ${created_at}
🗓️ *Vencimento:* ${expires_at}
📶 *Conexões:* 3

USUARIO CRIADO COM SUCESSO !!!

🌐 DNS URL XCIPTV: http://75924gx.click
✅ Usuário:  ${username}
✅ Senha: ${password}
📶 Conexões: 3
🗓️ Vencimento:  ${expires_at}

🟢 STB/SMARTUP/SSIPTV: 178.156.149.200
✅ WEB PLAYER: http://wfmixx.wplay.lat/
USAR EM COMPUTADOR, NOTEBOOK, XBOX, PHILCO NET RANGE, SONY BRAVIA, PS4 !!!

✅ APLICATIVO PRÓPRIO ANDROID WF MIXX:
LINK DOWNLOADER: https://aftv.news/5999178
CÓDIGO DOWNLOADER: 5999178
CÓDIGO NTDOWN: 99879

SUPORTE:
WHATSAPP: https://bit.ly/ajudaffiliado
E-MAIL: atende@worldflick.site
SITE OFICIAL: www.worldflick.site
`;

  const mailOptions = {
    from: 'visionplayoficial@visionplay.lat',
    to: email,
    subject: 'Seu Acesso ao WorldFlick',
    text: corpo,
  };

  await enviarEmailGenerico(mailOptions);
}

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

async function criarUsuarioEEnviarEmail(dadosUsuario) {
  try {
    const novoUsuario = await prisma.usuarioQpanel.create({ data: dadosUsuario });
    await enviarEmailUsuarioQpanel(novoUsuario.id);

  } catch (error) {
    console.error('Erro ao criar usuário e enviar e-mail:', error);
    await redis.lpush('fila-emails', JSON.stringify({
      from: 'atende@worldflick.site',
      to: dadosUsuario.email,
      subject: 'Seu Acesso ao WorldFlick',
      text: `
✅ *Usuário:* ${dadosUsuario.username}
✅ *Senha:* ${dadosUsuario.password}
📦 *Plano:* ${dadosUsuario.package_id}
      `
    }));
  }
}

// -------------------- FILA DE EMAILS --------------------
async function processarFilaEmails() {
  let count = 0;
  const maxProcess = 100;

  while (count < maxProcess) {
    const emailData = await redis.rpop('fila-emails');
    if (emailData) {
      const mailOptions = JSON.parse(emailData);
      const tentativaKey = `tentativa:${mailOptions.to}`;
      const tentativas = await redis.incr(tentativaKey);

      try {
        if (tentativas <= 3) {
          await transporter.sendMail(mailOptions);
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

async function reprocessarFilaErros() {
  while (true) {
    const emailData = await redis.rpop('fila-erros');
    
    if (emailData) {
      const mailOptions = JSON.parse(emailData);

      try {
        await transporter.sendMail(mailOptions);
        console.log('E-mail reenviado com sucesso (servidor alternativo):', mailOptions.to);
      } catch (error) {
        console.error('Erro ao reenviar e-mail (servidor alternativo):', error);
        await redis.lpush('fila-erros', emailData);
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 60000 * 60 * 24));
    }
  }
}

// -------------------- CRON --------------------
cron.schedule('*/10 * * * *', async () => {
  console.log('Iniciando o processamento da fila de e-mails...');
  await processarFilaEmails();
  await reprocessarFilaErros();
});

// -------------------- EXPORTS --------------------
module.exports = {
  processarFilaEmails,
  reprocessarFilaErros,
  enviarConfirmacaoRenovacao,
  logiNenviarEmail,
  criarUsuarioEEnviarEmail,
};
