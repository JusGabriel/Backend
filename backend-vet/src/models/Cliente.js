
// models/Cliente.js
import { Schema, model } from 'mongoose'
import bcrypt from 'bcryptjs'

const AdvertenciaSchema = new Schema({
  tipo: {
    type: String,
    enum: ['Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido', 'Reactivado', 'Correccion'],
    required: true
  },
  motivo:     { type: String, required: true, trim: true },
  creadoPor:  { type: Schema.Types.ObjectId, ref: 'Administrador', default: null },
  creadoPorNombre: { type: String, default: null },
  creadoPorEmail:  { type: String, default: null },
  origen:     { type: String, enum: ['manual', 'sistema', 'automatizado'], default: 'manual' },
  fecha:      { type: Date, default: Date.now },
  ip:         { type: String, default: null },
  userAgent:  { type: String, default: null },
  metadata:   { type: Schema.Types.Mixed, default: null }
}, { _id: true, timestamps: false })

const clienteSchema = new Schema({
  nombre:    { type: String, required: true, trim: true },
  apellido:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, trim: true, unique: true, lowercase: true },
  password:  { type: String, required: function () { return !this.idGoogle } },
  idGoogle:  { type: String, default: null },
  favoritos: [{ type: Schema.Types.ObjectId, ref: 'Emprendimiento' }],
  telefono:      { type: String, default: null, trim: true },
  rol:           { type: String, default: 'Cliente' },
  token:         { type: String, default: null },
  confirmEmail:  { type: Boolean, default: false },
  status:        { type: Boolean, default: true },
  estado_Emprendedor: {
    type: String,
    enum: ['Activo', 'Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido'],
    default: 'Activo'
  },
  foto:         { type: String, default: null },
  fotoPublicId: { type: String, default: null },
  advertencias:        { type: [AdvertenciaSchema], default: [] },
  ultimaAdvertenciaAt: { type: Date, default: null },
  suspendidoHasta:     { type: Date, default: null }
}, { timestamps: true })

/* Métodos */
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
clienteSchema.methods._registrarEventoEstado = function ({
  nuevoEstado, motivo, adminId=null, adminNombre=null, adminEmail=null,
  origen='manual', ip=null, userAgent=null, metadata=null
}) {
  const ahora = new Date()
  this.advertencias.push({
    tipo: nuevoEstado === 'Activo' ? 'Correccion' : nuevoEstado,
    motivo, creadoPor: adminId || null,
    creadoPorNombre: adminNombre || null,
    creadoPorEmail:  adminEmail  || null,
    origen, ip, userAgent, metadata, fecha: ahora
  })
  this.estado_Emprendedor = nuevoEstado
  this.ultimaAdvertenciaAt = ahora
  if (nuevoEstado === 'Suspendido') this.status = false
  if (nuevoEstado === 'Activo')     this.status = true
}
clienteSchema.methods.cambiarEstado = function ({
  estadoUI, motivo, adminId, adminNombre, adminEmail, ip, userAgent, metadata
}) {
  const PERMITIDOS = ['Correcto','Advertencia1','Advertencia2','Advertencia3','Suspendido']
  if (!PERMITIDOS.includes(estadoUI)) throw new Error(`Estado UI inválido: ${estadoUI}`)
  if (!motivo || !String(motivo).trim()) throw new Error('El motivo es obligatorio')
  const target = (estadoUI === 'Correcto') ? 'Activo' : estadoUI
  this._registrarEventoEstado({
    nuevoEstado: target, motivo, adminId, adminNombre, adminEmail, ip, userAgent, metadata
  })
  return target
}
clienteSchema.methods.aplicarAdvertencia = function ({ motivo, adminId, adminNombre, adminEmail, ip, userAgent, metadata }) {
  if (!motivo || !String(motivo).trim()) throw new Error('El motivo es obligatorio')
  const count = this.advertencias.filter(a => a.tipo && a.tipo.startsWith('Advertencia')).length
  const siguiente = Math.min(count + 1, 3)
  const nuevoEstado = (siguiente >= 3) ? 'Suspendido' : `Advertencia${siguiente}`
  this._registrarEventoEstado({ nuevoEstado, motivo, adminId, adminNombre, adminEmail, ip, userAgent, metadata })
  return nuevoEstado
}
clienteSchema.methods.aplicarEstadoUI = function (estadoUI) {
  return this.cambiarEstado({ estadoUI, motivo: 'Cambio desde UI', adminId: null, origen: 'manual' })
}

/* Coherencia + auto-reactivar */
clienteSchema.pre('save', function (next) {
  if (Array.isArray(this.advertencias)) {
    this.advertencias = this.advertencias.map(a => (!a.fecha || isNaN(new Date(a.fecha))) ? { ...a, fecha: new Date() } : a)
  }
  if (this.estado_Emprendedor === 'Suspendido') this.status = false
  if (this.estado_Emprendedor === 'Activo' && this.status === false) this.status = true

  if (this.suspendidoHasta && new Date() > this.suspendidoHasta && this.estado_Emprendedor === 'Suspendido') {
    this._registrarEventoEstado({ nuevoEstado: 'Activo', motivo: 'Fin de suspensión automática', origen: 'sistema' })
    this.suspendidoHasta = null
  }
  next()
})

export default model('Cliente', clienteSchema)
