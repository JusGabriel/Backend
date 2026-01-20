// models/Cliente.js
import { Schema, model } from 'mongoose'
import bcrypt from 'bcryptjs'

const clienteSchema = new Schema({
  nombre:    { type: String, required: true, trim: true },
  apellido:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, trim: true, unique: true, lowercase: true },
  password:  { type: String, required: function () { return !this.idGoogle } },
  idGoogle:  { type: String, default: null },

  descripcion: { type: String, trim: true, default: '' }, // opcional

  favoritos: [{ type: Schema.Types.ObjectId, ref: 'Emprendimiento' }],

  telefono: { type: String, default: null, trim: true },

  rol: { type: String, default: 'Cliente' },

  token:        { type: String, default: null },
  confirmEmail: { type: Boolean, default: false },

  status: { type: Boolean, default: true },

  estado_Cliente: {
    type: String,
    enum: ['Activo', 'Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido'],
    default: 'Activo'
  },

  // Foto / Cloudinary
  foto:         { type: String, default: null },
  fotoPublicId: { type: String, default: null }

}, { timestamps: true })

/* ============================
   Métodos (paralelos a Emprendedor)
   ============================ */

// Cifrar contraseña
clienteSchema.methods.encrypPassword = async function (password) {
  const salt = await bcrypt.genSalt(10)
  return await bcrypt.hash(password, salt)
}

// Comparar contraseñas
clienteSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password)
}

// Generar token sencillo (registro / recuperación)
clienteSchema.methods.crearToken = function () {
  this.token = Math.random().toString(36).slice(2)
  return this.token
}

/**
 * Aplica estado (reglas):
 * - Si actual === 'Suspendido', solo puede pasar a 'Activo'
 * - Desde cualquier estado se puede ir a 'Suspendido'
 * - Entre 'Activo' y 'AdvertenciaX' puede moverse libremente
 */
clienteSchema.methods.aplicarEstadoCliente = function (nuevoEstado) {
  const PERMITIDOS = ['Activo', 'Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido']
  if (!PERMITIDOS.includes(nuevoEstado)) {
    throw new Error(`Estado inválido: ${nuevoEstado}`)
  }

  const actual = this.estado_Cliente

  // Regla de salida de suspendido:
  if (actual === 'Suspendido' && nuevoEstado !== 'Activo') {
    throw new Error('Para salir de Suspendido, primero debes poner el estado en "Activo"')
  }

  this.estado_Cliente = nuevoEstado

  // Coherencia de status
  if (nuevoEstado === 'Suspendido') {
    this.status = false
  } else if (nuevoEstado === 'Activo') {
    this.status = true
  }
}

/* Coherencia automática antes de guardar:
   - 'Suspendido' => status=false
   - 'Activo' con status=false => fuerza status=true
*/
clienteSchema.pre('save', function (next) {
  if (this.estado_Cliente === 'Suspendido') {
    this.status = false
  }
  if (this.estado_Cliente === 'Activo' && this.status === false) {
    this.status = true
  }
  next()
})

export default model('Cliente', clienteSchema)
