import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

async function eliminarIndice() {
  const uri = process.env.MONGODB_URI_LOCAL;
  if (!uri) {
    console.error("No se encontró la variable MONGODB_URI_LOCAL en .env");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("test"); // Cambia 'test' si usas otra base
    const coleccion = db.collection("clientes"); // Cambia 'clientes' si usas otra colección

    await coleccion.dropIndex("idGoogle_1");
    console.log("Índice 'idGoogle_1' eliminado correctamente");
  } catch (error) {
    if (error.codeName === "IndexNotFound") {
      console.log("El índice 'idGoogle_1' no existe, nada que eliminar");
    } else {
      console.error("Error eliminando índice:", error);
    }
  } finally {
    await client.close();
  }
}

// Ejecutar al cargar este archivo
eliminarIndice();
