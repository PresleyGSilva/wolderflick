# Usa uma imagem de Node.js como base
FROM node:18

# Instalação do Google Chrome e dependências necessárias
RUN apt-get update && \
    apt-get install -y wget gnupg && \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*  # Limpa a lista de pacotes

    
# Define o diretório de trabalho
WORKDIR /app

# Copia o arquivo package.json e package-lock.json e instala as dependências
COPY package*.json ./
RUN npm install

# Copia o restante do código
COPY . .

# Executa o comando `prisma generate`
RUN npx prisma generate

# Define o comando padrão
CMD ["npm", "start"]
