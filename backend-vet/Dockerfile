# Imagen base recomendada por Railway
FROM node:18

# Crear carpeta de la app
WORKDIR /app

# Copiar package.json y lock
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto del proyecto
COPY . .

# Exponer puerto del backend
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]
