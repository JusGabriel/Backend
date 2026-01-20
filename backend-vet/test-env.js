import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

// URI de Railway (tomada de MONGO_URL)
const uri = process.env.MONGO_URL || "mongodb://mongo:BHFQycLysgYtindKTQJOWyFJUyTNLxiv@mongodb.railway.internal:27017";

async function limpiarClientes() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Conectado a MongoDB");

    const db = client.db("test"); // Tu base de datos
    const clientes = db.collection("clientes"); // Tu colección de clientes

    // Actualiza todos los clientes que tengan campos antiguos
    const resultado = await clientes.updateMany(
      {
        $or: [
          { estado_Emprendedor: { $exists: true } },
          { advertencias: { $exists: true } },
          { ultimaAdvertenciaAt: { $exists: true } }
        ]
      },
      {
        $unset: {
          estado_Emprendedor: "",
          advertencias: "",
          ultimaAdvertenciaAt: ""
        }
      }
    );

    console.log("Clientes corregidos:", resultado.modifiedCount);
  } catch (err) {
    console.error("Error al limpiar clientes:", err);
  } finally {
    await client.close();
    console.log("Conexión cerrada");
  }
}

// Ejecutar script
limpiarClientes();
