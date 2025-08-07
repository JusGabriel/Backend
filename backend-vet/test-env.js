import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI_LOCAL

const clienteSchema = new mongoose.Schema({
  idGoogle: {
    type: String,
    unique: true,
    sparse: true,
    default: null
  }
  // Aquí solo pones el campo necesario para el filtro
}, { collection: 'clientes' }) // importante usar el nombre correcto de la colección

const Cliente = mongoose.model('Cliente', clienteSchema)

async function borrarClientesConIdGoogleNull() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Conectado a MongoDB')

    const resultado = await Cliente.deleteMany({ idGoogle: null })
    console.log(`🗑️ Documentos eliminados: ${resultado.deletedCount}`)

    await mongoose.disconnect()
    console.log('🔌 Desconectado de MongoDB')
  } catch (error) {
    console.error('❌ Error al borrar documentos:', error)
  }
}

borrarClientesConIdGoogleNull()
