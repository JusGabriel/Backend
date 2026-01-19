import { Schema, model } from 'mongoose'
import bcrypt from 'bcryptjs'

const AdvertenciaSchema = new Schema({
  tipo: {
    type: String,
    enum: ['Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido', 'Reactivado', 'Correccion'],
    required: true
  },
  motivo:           { type: String, required: true, trim: true },
  creadoPor:        { type: Schema.Types.ObjectId, ref: 'Administrador', default: null },
  creadoPorNombre:  { type: String, default: null },
  creadoPorEmail:   { type: String, default: null },
  origen:           { type: String, enum: ['manual', 'sistema', 'automatizado'], default: 'manual' },
  fecha:            { type: Date, default: Date.now },
  ip:               { type: String, default: null },
  userAgent:        { type: String, default: null },
  metadata:         { type: Schema.Types.Mixed, default: null }
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

/* Métodos de seguridad */
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

/* Lógica de Estados */
clienteSchema.methods._registrarEventoEstado = function ({
  nuevoEstado, motivo, adminId=null, adminNombre=null, adminEmail=null,
  origen='manual', ip=null, userAgent=null, metadata=null
}) {
  const ahora = new Date()
  
  // Mapeo: Si el admin lo pone como Activo, el log registra "Correccion" o "Reactivado"
  let tipoEvento = nuevoEstado
  if (nuevoEstado === 'Activo') {
    tipoEvento = (motivo.toLowerCase().includes('automática')) ? 'Reactivado' : 'Correccion'
  }

  this.advertencias.push({
    tipo: tipoEvento,
    motivo,
    creadoPor: adminId,
    creadoPorNombre: adminNombre,
    creadoPorEmail:  adminEmail,
    origen, ip, userAgent, metadata,
    fecha: ahora
  })

  this.estado_Emprendedor = nuevoEstado
  this.ultimaAdvertenciaAt = ahora
  this.status = (nuevoEstado !== 'Suspendido')

  if (nuevoEstado === 'Activo') this.suspendidoHasta = null
}

clienteSchema.methods.cambiarEstado = function (datos) {
  const { estadoUI, motivo } = datos
  const PERMITIDOS = ['Correcto','Advertencia1','Advertencia2','Advertencia3','Suspendido']
  if (!PERMITIDOS.includes(estadoUI)) throw new Error(`Estado inválido: ${estadoUI}`)
  if (!motivo?.trim()) throw new Error('El motivo es obligatorio')

  const target = (estadoUI === 'Correcto') ? 'Activo' : estadoUI
  this._registrarEventoEstado({ ...datos, nuevoEstado: target })
  return target
}

clienteSchema.methods.aplicarAdvertencia = function (datos) {
  if (!datos.motivo?.trim()) throw new Error('El motivo es obligatorio')

  // BUSCAR ÚLTIMO RESET: Ignoramos advertencias previas a una corrección/reactivación
  const ultimoReset = [...this.advertencias].reverse().find(a => a.tipo === 'Correccion' || a.tipo === 'Reactivado')
  const fechaCorte = ultimoReset ? ultimoReset.fecha : new Date(0)

  const count = this.advertencias.filter(a => 
    a.tipo.startsWith('Advertencia') && a.fecha > fechaCorte
  ).length

  const siguiente = count + 1
  const nuevoEstado = (siguiente >= 3) ? 'Suspendido' : `Advertencia${siguiente}`
  
  this._registrarEventoEstado({ ...datos, nuevoEstado })
  return nuevoEstado
}

clienteSchema.pre('save', function (next) {
  // Auto-reactivación si la fecha venció
  if (this.suspendidoHasta && new Date() > this.suspendidoHasta && this.estado_Emprendedor === 'Suspendido') {
    this._registrarEventoEstado({ 
      nuevoEstado: 'Activo', 
      motivo: 'Fin de suspensión automática (vencimiento)', 
      origen: 'sistema' 
    })
  }
  next()
})

export default model('Cliente', clienteSchema)
