API
https://backend-production-bd1d.up.railway.app

Backend - Sistema de Autenticación y Gestión de Usuarios
Este proyecto corresponde al backend de una aplicación que permite la autenticación de usuarios con Google, así como su gestión dentro de una base de datos MongoDB. Está desarrollado con Node.js, Express y Passport, implementando una API REST que permite registrar, autenticar y consultar usuarios. La autenticación con Google OAuth 2.0 está completamente integrada, permitiendo dos tipos de usuarios: clientes y emprendedores.

Funcionalidades principales
Autenticación de usuarios mediante Google OAuth.
Diferenciación entre tipos de usuario (cliente o emprendedor).
Registro automático en base de datos MongoDB.
API REST para obtener información del usuario autenticado.
Soporte para sesiones de usuario con express-session.

Tecnologías utilizadas
Node.js
Express.js
MongoDB + Mongoose
Passport.js + Google OAuth 2.0
Dotenv (para configuración de variables de entorno)
Railway (para despliegue del backend)



Instalación local
Clona el repositorio.
Instala las dependencias:

bash
Copiar código
npm install
Crea un archivo .env con las siguientes variables:


Copiar código
GOOGLE_CLIENT_ID=tu_id_google
GOOGLE_CLIENT_SECRET=tu_secreto_google
MONGO_URI=tu_uri_de_mongodb
Ejecuta el servidor:
node app.js


Autor
Sebastián Betancourt
Backend Developer

