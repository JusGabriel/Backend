
import { Schema, model } from 'mongoose'
import bcrypt from "bcryptjs"

const administradorSchema = new Schema({
  nombre:   { type: String, required: true, trim: true },
  apellido: { type: String, required: true, trim: true },
  email:    { type: String, required: true, trim: true, unique: true },
  password: { type: String, required: true },
  telefono: { type: String, default: null, trim: true },

  rol:   { type: String, default: "Administrador" },
  token: { type: String, default: null },
  confirmEmail: { type: Boolean, default: false },
  status: { type: Boolean, default: true },

  // === Igual al patrón de Emprendimientos (logo / logoPublicId) ===
  // URL pública (secure_url de Cloudinary o externa)
  foto:         { type: String, default: null },
  // public_id de Cloudinary para borrar/reemplazar
  fotoPublicId: { type: String, default: null }

}, {
  timestamps: true
})

// Métodos
administradorSchema.methods.encrypPassword = async function(password){
  const salt = await bcrypt.genSalt(10)
  return await bcrypt.hash(password, salt)
}

administradorSchema.methods.matchPassword = async function(password){
  return await bcrypt.compare(password, this.password)
}

administradorSchema.methods.crearToken = function(){
  this.token = Math.random().toString(36).slice(2)
  return this.token
}

export default model("Administrador", administradorSchema)
