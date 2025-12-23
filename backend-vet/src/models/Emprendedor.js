
// models/Emprendedor.js
import { Schema, model } from 'mongoose'
import bcrypt from 'bcryptjs'

const emprendedorSchema = new Schema({
  nombre:   { type: String, required: true, trim: true },
  apellido: { type: String, required: true, trim: true },
  email:    { type: String, required: true, trim: true, unique: true, lowercase: true },
  password: {
    type: String,
    required: function() { return !this.idGoogle } // Solo si no hay Google OAuth
  },
  idGoogle: { type: String, default: null },

  descripcion: { type: String, trim: true, default: '' },

  favoritos: [{ type: Schema.Types.ObjectId, ref: 'Emprendimiento' }],

  enlaces: {
    facebook:  { type: String, default: null },
    instagram: { type: String, default: null },
    sitioWeb:  { type: String, default: null }
  },

  telefono: { type: String, default: null, trim: true },

  rol: { type: String, default: 'Emprendedor' },

  token:        { type: String, default: null },
  confirmEmail: { type: Boolean, default: false },

  status: { type: Boolean, default: true },

  estado_Emprendedor: {
    type: String,
    enum: ['Activo', 'Advertencia1','Advertencia2','Advertencia3', 'Suspendido'],
    default: 'Activo'
  }
}, { timestamps: true })

/* ============================
   Métodos
============================ */

// Cifrar contraseña
emprendedorSchema.methods.encrypPassword = async function (password) {
  const salt = await bcrypt.genSalt(10)
  return await bcrypt.hash(password, salt)
}

// Comparar contraseñas
emprendedorSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password)
}

// Generar token
emprendedorSchema.methods.crearToken = function () {
  this.token = Math.random().toString(36).slice(2)
  return this.token
}

/**
 * Aplica estado (modelo) respetando la regla:
 * - Si actual === 'Suspendido', solo puede pasar a 'Activo'
 * - Desde cualquier estado se puede ir a 'Suspendido'
 * - Entre 'Activo' y 'AdvertenciaX' puede moverse libremente
 */
emprendedorSchema.methods.aplicarEstadoEmprendedor = function (nuevoEstado) {
  const PERMITIDOS = ['Activo', 'Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido']
  if (!PERMITIDOS.includes(nuevoEstado)) {
    throw new Error(`Estado inválido: ${nuevoEstado}`)
  }

  const actual = this.estado_Emprendedor

  // Regla de salida de suspendido:
  if (actual === 'Suspendido' && nuevoEstado !== 'Activo') {
    throw new Error('Para salir de Suspendido, primero debes poner el estado en "Activo"')
  }

  this.estado_Emprendedor = nuevoEstado

  // Coherencia de status
  if (nuevoEstado === 'Suspendido') {
    this.status = false
  } else if (nuevoEstado === 'Activo') {
    this.status = true
  } else {
    // Advertencias: puedes decidir mantener status como esté o forzarlo a true
    // this.status = true
  }
}

/**
 * Coherencia automática antes de guardar:
 * - 'Suspendido' => status=false
 * - 'Activo' con status=false => fuerza status=true
 */
emprendedorSchema.pre('save', function (next) {
  if (this.estado_Emprendedor === 'Suspendido') {
    this.status = false
  }
  if (this.estado_Emprendedor === 'Activo' && this.status === false) {
    this.status = true
  }
  next()
})

export default model('Emprendedor', emprendedorSchema)
