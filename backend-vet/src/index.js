import dotenv from 'dotenv';
import app from './server.js';
import { connectDB } from './database.js';

dotenv.config();

const PORT = process.env.PORT || 8080;

const eliminarIndiceIdGoogle = async () => {
  try {
    const db = (await import('mongoose')).default.connection.db;
    await db.collection('clientes').dropIndex('idGoogle_1');
    console.log('Índice idGoogle_1 eliminado correctamente.');
  } catch (error) {
    // Si no existe el índice o hay otro error, lo mostramos pero no detenemos el servidor
    console.error('No se pudo eliminar el índice idGoogle_1:', error.message);
  }
};

const startServer = async () => {
  await connectDB(); // Conexión a MongoDB

  // Esperamos que la conexión esté lista para eliminar el índice
  await eliminarIndiceIdGoogle();

  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
};

startServer();
