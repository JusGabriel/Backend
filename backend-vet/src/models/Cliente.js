import { Schema, model } from 'mongoose'
import bcrypt from 'bcryptjs'

const clienteSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  apellido: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  // Dentro de clienteSchema
favoritos: [{
    type: Schema.Types.ObjectId,
    ref: 'Emprendedor'
}],

  telefono: {
    type: String,
    default: null,
    trim: true
  },
  rol:{
        type:String,
        default:"Cliente"
    },
  token: {
    type: String,
    default: null
  },
  confirmEmail: {
    type: Boolean,
    default: false
  },
  status: {
    type: Boolean,
    default: true
  },
  estado_Emprendedor: {
    type: String,
    enum: ['Activo', 'Advertencia1','Advertencia2','Advertencia3', 'Suspendido'], 
    default: 'Activo'
  }
}, {
  timestamps: true
})

// Métodos del modelo
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

export default model('Cliente', clienteSchema)
