// models/MensajeQueja.js
import { Schema, model } from 'mongoose'

const mensajeQuejaSchema = new Schema({
  queja: {
    type: Schema.Types.ObjectId,
    ref: 'Queja',
    required: true
  },
  emisor: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'emisorRol'
  },
  emisorRol: {
    type: String,
    enum: ['Administrador', 'Emprendedor', 'Cliente'],
    required: true
  },
  contenido: {
    type: String,
    required: true,
    trim: true
  },
  leido: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

export default model('MensajeQueja', mensajeQuejaSchema)
