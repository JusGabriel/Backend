import { Schema, model } from "mongoose";

const productoSchema = new Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    descripcion: {
        type: String,
        trim: true
    },
    precio: {
        type: Number,
        required: true
    },
    imagen: {
        type: String,
        trim: true
    },
    emprendedor: {
        type: Schema.Types.ObjectId,
        ref: 'Emprendedor',
        required: true
    },
    categoria: {
        type: Schema.Types.ObjectId,
        ref: 'Categoria',
        required: false
    },
    stock: {
        type: Number,
        default: 0
    },
    estado: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default model("Producto", productoSchema);
