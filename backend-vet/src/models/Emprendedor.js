import { Schema, model } from 'mongoose'
import bcrypt from 'bcryptjs'

const emprendedorSchema = new Schema({
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
    required: function() {
        // Requerido solo si NO hay Google OAuth
        return !this.idGoogle;
    }
    },
    idGoogle: {
      type: String,
      default: null
    },
  descripcion: {
    type: String,
    trim: true,
    default: ''
  },
  enlaces: {
    facebook: { type: String, default: null },
    instagram: { type: String, default: null },
    sitioWeb: { type: String, default: null }
  },
  telefono: {
    type: String,
    default: null,
    trim: true
  },
  rol:{
        type:String,
        default:"Emprendedor"
    },
  categorias: [{
    type: Schema.Types.ObjectId,
    ref: 'Categoria'
  }],
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

/* -------------------- MÉTODOS -------------------- */

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

export default model('Emprendedor', emprendedorSchema)
