import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

async function limpiarClientes() {
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db("test");
  const clientes = db.collection("clientes");

  const res = await clientes.updateMany(
    { estado_Emprendedor: { $exists: true } },
    { $unset: { estado_Emprendedor: "", advertencias: "", ultimaAdvertenciaAt: "" } }
  );

  console.log("Clientes corregidos:", res.modifiedCount);
  await client.close();
}

limpiarClientes();
