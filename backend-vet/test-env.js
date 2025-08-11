import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function eliminarIndice() {
  const uri = process.env.MONGODB_URI_LOCAL;
  if (!uri) {
    console.error('No se encontró la variable MONGODB_URI_LOCAL en .env');
    return;
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('test'); // Usa el nombre de tu base de datos
    const coleccion = db.collection('clientes'); // Usa el nombre de tu colección

    // Eliminar índice
    await coleccion.dropIndex('idGoogle_1');
    console.log('Índice idGoogle_1 eliminado correctamente');
  } catch (error) {
    if (error.codeName === 'IndexNotFound') {
      console.log('El índice idGoogle_1 no existe');
    } else {
      console.error('Error eliminando índice:', error);
    }
  } finally {
    await client.close();
  }
}

eliminarIndice();
