
// models/Cliente.js
import { Schema, model } from 'mongoose'
import bcrypt from 'bcryptjs'

const clienteSchema = new Schema({
  nombre:    { type: String, required: true, trim: true },
  apellido:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, trim: true, unique: true, lowercase: true },
  password:  {
    type: String,
    required: function () { return !this.idGoogle } // Requerido solo si NO hay Google OAuth
  },
  idGoogle:  { type: String, default: null },

  favoritos: [{ type: Schema.Types.ObjectId, ref: 'Emprendimiento' }],

  telefono:      { type: String, default: null, trim: true },
  rol:           { type: String, default: 'Cliente' },
  token:         { type: String, default: null },
  confirmEmail:  { type: Boolean, default: false },

  // Activo/Inactivo
  status: { type: Boolean, default: true },

  // Advertencias / suspensión (modelo interno)
  estado_Emprendedor: {
    type: String,
    enum: ['Activo', 'Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido'],
    default: 'Activo'
  }
}, { timestamps: true })

/* ============================
   Métodos del modelo
============================ */
clienteSchema.methods.encrypPassword = async function (password) {
  const salt = await bcrypt.genSalt(10)
  return await bcrypt.hash(password, salt)
}

clienteSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password)
}

clienteSchema.methods.crearToken = function () {
  this.token = Math.random().toString(36).slice(2)
  return this.token
}

/**
 * Aplica el estado proveniente de la UI:
 * - 'Correcto'     => estado_Emprendedor='Activo', status=true
 * - 'AdvertenciaX' => estado_Emprendedor='AdvertenciaX' (status no se fuerza)
 * - 'Suspendido'   => estado_Emprendedor='Suspendido', status=false
 */
clienteSchema.methods.aplicarEstadoUI = function (estadoUI) {
  const PERMITIDOS = ['Correcto', 'Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido']
  if (!PERMITIDOS.includes(estadoUI)) {
    throw new Error(`Estado UI inválido: ${estadoUI}`)
  }

  if (estadoUI === 'Correcto') {
    this.estado_Emprendedor = 'Activo'
    this.status = true
  } else if (estadoUI === 'Suspendido') {
    this.estado_Emprendedor = 'Suspendido'
    this.status = false
  } else {
    // Advertencia1/2/3
    this.estado_Emprendedor = estadoUI
    // Si quieres asegurarte que advertencias sigan "activas", descomenta:
    // this.status = true
  }
}

/**
 * Coherencia automática antes de guardar:
 * - 'Suspendido' => status=false
 * - 'Activo' con status=false => se fuerza status=true
 */
clienteSchema.pre('save', function (next) {
  if (this.estado_Emprendedor === 'Suspendido') {
    this.status = false
  }
  if (this.estado_Emprendedor === 'Activo' && this.status === false) {
    this.status = true
  }
  next()
})

export default model('Cliente', clienteSchema)
