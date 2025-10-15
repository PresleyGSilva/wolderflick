require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { obterPacote } = require('../utils/pacotes'); // Assumindo que este caminho está correto

class PagamentosService {
    constructor() {
        this.prisma = new PrismaClient();
        this.botToken = process.env.TELEGRAM_BOT_PAGAMENTOS;
        this.chatId = process.env.TELEGRAM_CHAT_ID;
    }

    // Função para escapar caracteres especiais do MarkdownV2
    // Caracteres que DEVEM ser escapados: _ * [ ] ( ) ~ ` > # + - = | { } . !
    escapeMarkdownV2(text) {
        if (!text) return '';
        // É importante que o escape do caractere '`' (backtick) também seja feito
        // antes de você envolver a string em backticks (como em usuário/senha).
        return text.replace(/([_\*\[\]\(\)~`>#+\-=|{}.!])/g, '\\$1');
    }

    // Método para enviar mensagem ao Telegram
    async enviarMensagemTelegram(mensagem) {
        // Validação básica para garantir que o token e o chat ID estão configurados
        if (!this.botToken || !this.chatId) {
            console.error('❌ Erro: TELEGRAM_BOT_PAGAMENTOS ou TELEGRAM_CHAT_ID não configurados no .env');
            return;
        }

        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

        console.log('Tentando enviar mensagem ao Telegram...');
        console.log('URL:', url);
        console.log('Chat ID:', this.chatId);
        // Exibe apenas uma prévia da mensagem para não poluir o log
        console.log('Mensagem (prévia):', mensagem.substring(0, 100).replace(/\n/g, ' ') + '...');

        try {
            const response = await axios.post(url, {
                chat_id: this.chatId,
                text: mensagem,
                parse_mode: 'MarkdownV2',
                // Geralmente é bom desabilitar a prévia de URL em mensagens de notificação
                disable_web_page_preview: true, 
            });

            console.log('✅ Mensagem enviada com sucesso:', response.data);
        } catch (error) {
            console.error('❌ Erro ao enviar mensagem para o Telegram:', error.message);
            if (error.response) {
                console.error('📌 Resposta da API:', error.response.data);
            }
        }
    }

    // Método para verificar novas vendas
    async verificarNovasVendas() {
        try {
            const novaVenda = await this.prisma.venda.findFirst({
                where: { processada: false },
                orderBy: { criadoEm: 'desc' },
                include: { usuarioQpanel: true },
            });

            if (!novaVenda) {
                console.log('Nenhuma nova venda encontrada.');
                return;
            }

            console.log('📌 Nova venda recebida:', novaVenda);

            const packageId = novaVenda.usuarioQpanel?.package_id;
            let nomePlano = "Plano Desconhecido";
            let valorPlano = "0.00";

            if (packageId) {
                try {
                    // Note: o 'obterPacote' deve ser importado corretamente
                    const pacoteEncontrado = obterPacote(null, null, packageId); 
                    if (pacoteEncontrado) {
                        nomePlano = pacoteEncontrado.nome;
                        valorPlano = pacoteEncontrado.valor;
                    }
                } catch (error) {
                    console.error('❌ Erro ao buscar pacote:', error.message);
                }
            }
            
            // ----------------------------------------------------
            // CORREÇÃO: Escapar TODAS as variáveis antes de usar no template.
            // ----------------------------------------------------
            
            // Escape de dados do cliente/venda
            const plataforma = this.escapeMarkdownV2(novaVenda.plataforma || 'N/A');
            const nomeCliente = this.escapeMarkdownV2(novaVenda.nome || 'N/A');
            const emailCliente = this.escapeMarkdownV2(novaVenda.email || 'N/A');
            const telefone = this.escapeMarkdownV2(novaVenda.celular || 'N/A');
            
            // Escape de dados do plano
            // O valorR$ pode conter o '.' (ponto) que precisa ser escapado
            const valorPlanoEscapado = this.escapeMarkdownV2(`R$${valorPlano}`);
            const nomePlanoEscapado = this.escapeMarkdownV2(nomePlano);

            // Escape do nome/senha antes de colocá-los entre crases,
            // caso o nome/senha contenha um backtick (`) que quebraria o bloco.
            const usuarioNome = this.escapeMarkdownV2(novaVenda.usuarioQpanel?.nome || 'N/A');
            const usuarioSenha = this.escapeMarkdownV2(novaVenda.usuarioQpanel?.senha || 'N/A');

            // Template da Mensagem: Observe o '\\!' para escapar o ponto de exclamação
            const mensagem = `
*NOVA VENDA RECEBIDA\\!* 🚀

Plataforma: ${plataforma}

Nome do Cliente: ${nomeCliente}

Email do Cliente: ${emailCliente}

Telefone: ${telefone}

Valor do Plano: ${valorPlanoEscapado}

Plano Contratado: ${nomePlanoEscapado}

Usuário: \`${usuarioNome}\`

Senha: \`${usuarioSenha}\`
`;
            
            // Envia a mensagem ao Telegram
            await this.enviarMensagemTelegram(mensagem);

            // Marca a venda como processada
            await this.prisma.venda.update({
                where: { id: novaVenda.id },
                data: { processada: true },
            });

            console.log(`Venda ${novaVenda.id} processada com sucesso.`);

        } catch (error) {
            console.error('Erro ao verificar novas vendas:', error.message);
        }
    }


    iniciarMonitoramento() {
        console.log('Iniciando monitoramento de novas vendas...');
        // Verifica a cada 5000 milissegundos (5 segundos)
        setInterval(() => this.verificarNovasVendas(), 5000); 
    }
}

// Tratamento de Encerramento (Recomendado)
process.on('SIGINT', async () => {
    console.log('Encerrando conexão com o Prisma...');
    // É importante criar uma nova instância aqui se você não tiver acesso direto à instância da classe
    await new PrismaClient().$disconnect(); 
    process.exit(0);
});

module.exports = { PagamentosService };
