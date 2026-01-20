import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

async function limpiarEstadoEmprendedorEnClientes() {
  const uri = process.env.MONGODB_URI_LOCAL;
  if (!uri) {
    console.error("No se encontró MONGODB_URI_LOCAL");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("test"); // cambia si tu BD es otra
    const clientes = db.collection("clientes");

    const result = await clientes.updateMany(
      { estado_Emprendedor: { $exists: true } },
      {
        $unset: { estado_Emprendedor: "" }
      }
    );

    console.log(`Clientes limpiados: ${result.modifiedCount}`);
  } catch (error) {
    console.error("Error limpiando clientes:", error);
  } finally {
    await client.close();
  }
}

limpiarEstadoEmprendedorEnClientes();
