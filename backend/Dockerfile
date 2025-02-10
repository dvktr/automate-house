# Usa a imagem oficial do Node.js
FROM node:18

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência
COPY package.json package-lock.json ./

# Instala as dependências
RUN npm install

# Copia o restante dos arquivos
COPY . .

# Expõe a porta do backend
EXPOSE 3000

# Comando para rodar o backend
CMD ["node", "index.js"]