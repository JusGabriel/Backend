import { Schema, model } from 'mongoose'

const categoriaSchema = new Schema({
    nombre: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    descripcion: {
        type: String,
        trim: true,
        default: ''
    }
}, {
    timestamps: true
})

export default model('Categoria', categoriaSchema)
