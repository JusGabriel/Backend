
// models/Cliente.js
import { Schema, model } from 'mongoose'
import bcrypt from 'bcryptjs'

/**
 * Evento de advertencia/suspensión embebido (inmutable).
 * - creadoPor: _id del Administrador que ejecuta la acción (ref ajustado a 'Administrador')
 * - creadoPorNombre/Email: snapshot para evitar depender de populate y preservar histórico
 */
const AdvertenciaSchema = new Schema({
  tipo: {
    type: String,
    enum: ['Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido', 'Reactivado', 'Correccion'],
    required: true
  },
  motivo:     { type: String, required: true, trim: true },
  creadoPor:  { type: Schema.Types.ObjectId, ref: 'Administrador', default: null },
  // snapshots del actor en el momento del evento
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

  // Estado visible para UI (modelo interno)
  estado_Emprendedor: {
    type: String,
    enum: ['Activo', 'Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido'],
    default: 'Activo'
  },

  /* ============================
     📸 Foto de perfil (Cloudinary)
  ============================ */
  foto:         { type: String, default: null },
  fotoPublicId: { type: String, default: null },

  /* ============================
     🧾 Auditoría embebida
  ============================ */
  advertencias:        { type: [AdvertenciaSchema], default: [] },
  ultimaAdvertenciaAt: { type: Date, default: null },
  suspendidoHasta:     { type: Date, default: null } // opcional: suspensiones temporales
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
 * Método interno: registra un evento de cambio de estado + denormaliza estado actual.
 */
clienteSchema.methods._registrarEventoEstado = function ({
  nuevoEstado,
  motivo,
  adminId = null,
  adminNombre = null,  // 👈 snapshot
  adminEmail  = null,  // 👈 snapshot
  origen = 'manual',
  ip = null,
  userAgent = null,
  metadata = null
}) {
  // Evento inmutable
  this.advertencias.push({
    tipo: nuevoEstado === 'Activo' ? 'Correccion' : nuevoEstado,
    motivo,
    creadoPor: adminId || null,
    creadoPorNombre: adminNombre || null,
    creadoPorEmail: adminEmail || null,
    origen,
    ip,
    userAgent,
    metadata,
    fecha: new Date()
  })

  // Denormalización
  this.estado_Emprendedor = nuevoEstado
  this.ultimaAdvertenciaAt = new Date()

  // Reglas de coherencia
  if (nuevoEstado === 'Suspendido') this.status = false
  if (nuevoEstado === 'Activo')     this.status = true
}

/**
 * Cambiar estado explícito recibido desde la UI/Admin.
 * estadoUI: 'Correcto' | 'Advertencia1' | 'Advertencia2' | 'Advertencia3' | 'Suspendido'
 */
clienteSchema.methods.cambiarEstado = function ({
  estadoUI,
  motivo,
  adminId,
  adminNombre,  // 👈
  adminEmail,   // 👈
  ip,
  userAgent,
  metadata
}) {
  const PERMITIDOS = ['Correcto', 'Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido']
  if (!PERMITIDOS.includes(estadoUI)) {
    throw new Error(`Estado UI inválido: ${estadoUI}`)
  }
  const target = (estadoUI === 'Correcto') ? 'Activo' : estadoUI
  if (!motivo || !String(motivo).trim()) {
    throw new Error('El motivo es obligatorio')
  }
  this._registrarEventoEstado({
    nuevoEstado: target,
    motivo,
    adminId,
    adminNombre,
    adminEmail,
    ip,
    userAgent,
    metadata
  })
  return target
}

/**
 * Escalado automático de Advertencia1 -> 2 -> 3 -> Suspendido
 */
clienteSchema.methods.aplicarAdvertencia = function ({
  motivo,
  adminId,
  adminNombre,  // 👈
  adminEmail,   // 👈
  ip,
  userAgent,
  metadata
}) {
  const count = this.advertencias.filter(a => a.tipo && a.tipo.startsWith('Advertencia')).length
  const siguiente = Math.min(count + 1, 3)
  const nuevoEstado = (siguiente >= 3) ? 'Suspendido' : `Advertencia${siguiente}`
  if (!motivo || !String(motivo).trim()) {
    throw new Error('El motivo es obligatorio')
  }
  this._registrarEventoEstado({
    nuevoEstado,
    motivo,
    adminId,
    adminNombre,
    adminEmail,
    ip,
    userAgent,
    metadata
  })
  return nuevoEstado
}

/**
 * Compatibilidad: mantiene tu API previa pero ahora delega en cambiarEstado.
 */
clienteSchema.methods.aplicarEstadoUI = function (estadoUI) {
  return this.cambiarEstado({ estadoUI, motivo: 'Cambio desde UI', adminId: null, origen: 'manual' })
}

/**
 * Coherencia automática antes de guardar:
 * - 'Suspendido' => status=false
 * - 'Activo' con status=false => se fuerza status=true
 * - Levantar suspensión temporal si ya expiró
 */
clienteSchema.pre('save', function (next) {
  if (this.estado_Emprendedor === 'Suspendido') {
    this.status = false
  }
  if (this.estado_Emprendedor === 'Activo' && this.status === false) {
    this.status = true
  }

  // Auto-reactivar si expiró una suspensión temporal
  if (this.suspendidoHasta && new Date() > this.suspendidoHasta && this.estado_Emprendedor === 'Suspendido') {
    this._registrarEventoEstado({
      nuevoEstado: 'Activo',
      motivo: 'Fin de suspensión automática',
      adminId: null,
      adminNombre: null,
      adminEmail: null,
      origen: 'sistema'
    })
    this.suspendidoHasta = null
  }
  next()
})

export default model('Cliente', clienteSchema)
