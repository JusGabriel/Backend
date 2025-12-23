
// controllers/productoController.js
import mongoose from 'mongoose';
import Producto from '../models/Productos.js';
import Emprendimiento from '../models/Emprendimiento.js';
import cloudinary from '../config/cloudinary.js';

// ---------- Helpers de validación ----------
function validarNombre(nombre) {
  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 3) {
    return 'El nombre es obligatorio y debe tener al menos 3 caracteres';
  }
  return null;
}

function validarPrecio(precio) {
  if (precio === undefined || precio === null || isNaN(precio) || Number(precio) < 0) {
    return 'El precio es obligatorio y debe ser un número igual o mayor a 0';
  }
  return null;
}

function validarStock(stock) {
  if (stock === undefined || stock === null || isNaN(stock) || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
    return 'El stock debe ser un entero igual o mayor a 0';
  }
  return null;
}

function validarCategoria(categoria) {
  if (categoria === undefined || categoria === null || categoria === '') return null;
  if (typeof categoria !== 'string' || categoria.trim() === '') {
    return 'La categoría, si se envía, debe ser una cadena válida';
  }
  return null;
}

function validarObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ---------- CREAR PRODUCTO (acepta archivo en req.file o URL en body) ----------
export const crearProducto = async (req, res) => {
  const { nombre, descripcion, precio, categoria, stock, emprendimiento } = req.body;
  const emprendedorId = req.emprendedorBDD?._id;

  if (!emprendedorId) {
    return res.status(401).json({ mensaje: 'No autorizado: debe ser un emprendedor autenticado' });
  }

  // Validaciones
  const errorNombre = validarNombre(nombre);
  if (errorNombre) return res.status(400).json({ mensaje: errorNombre });

  const precioNum = precio !== undefined ? Number(precio) : undefined;
  const errorPrecio = validarPrecio(precioNum);
  if (errorPrecio) return res.status(400).json({ mensaje: errorPrecio });

  const stockNum = stock !== undefined ? Number(stock) : 0;
  const errorStock = validarStock(stockNum);
  if (errorStock) return res.status(400).json({ mensaje: errorStock });

  const errorCategoria = validarCategoria(categoria);
  if (errorCategoria) return res.status(400).json({ mensaje: errorCategoria });

  if (!emprendimiento || !validarObjectId(emprendimiento)) {
    return res.status(400).json({ mensaje: 'Debes seleccionar un emprendimiento válido' });
  }

  try {
    // Verificar que el emprendimiento exista y pertenezca al emprendedor
    const empDoc = await Emprendimiento.findById(emprendimiento);
    if (!empDoc) return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' });

    if (empDoc.emprendedor.toString() !== emprendedorId.toString()) {
      return res.status(403).json({ mensaje: 'No puedes crear productos en un emprendimiento que no te pertenece' });
    }

    // Resolver imagen (Cloudinary)
    const imagenUrl      = req.file?.path || (typeof req.body.imagen === 'string' ? req.body.imagen : null);
    const imagenPublicId = req.file?.filename || null;

    const nuevoProducto = new Producto({
      nombre,
      descripcion: descripcion || '',
      precio: precioNum,
      imagen: imagenUrl,
      imagenPublicId,
      categoria: categoria || null,
      stock: stockNum,
      emprendimiento: empDoc._id
    });

    const guardado = await nuevoProducto.save();
    res.status(201).json({ mensaje: 'Producto creado', producto: guardado });
  } catch (error) {
    console.error('crearProducto error:', error);
    res.status(500).json({ mensaje: 'Error al crear producto', error: error.message });
  }
};

// ---------- OBTENER PRODUCTOS POR EMPRENDEDOR ----------
export const obtenerProductosPorEmprendedor = async (req, res) => {
  const { emprendedorId } = req.params;

  try {
    const emprendimientos = await Emprendimiento.find({ emprendedor: emprendedorId }).select('_id');
    const emprIds = emprendimientos.map(e => e._id);

    const productos = await Producto.find({ emprendimiento: { $in: emprIds } })
      .populate('categoria')
      .populate({
        path: 'emprendimiento',
        select: 'nombreComercial descripcion emprendedor',
        populate: { path: 'emprendedor', select: 'nombre apellido' }
      });

    res.json(productos);
  } catch (error) {
    console.error('obtenerProductosPorEmprendedor error:', error);
    res.status(500).json({ mensaje: 'Error al obtener productos', error: error.message });
  }
};

// ---------- OBTENER PRODUCTO POR ID ----------
export const obtenerProducto = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id)
      .populate('categoria')
      .populate({
        path: 'emprendimiento',
        select: 'nombreComercial descripcion emprendedor',
        populate: { path: 'emprendedor', select: 'nombre apellido' }
      });

    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    res.json(producto);
  } catch (error) {
    console.error('obtenerProducto error:', error);
    res.status(500).json({ mensaje: 'Error al obtener producto', error: error.message });
  }
};

// ---------- ACTUALIZAR PRODUCTO ----------
export const actualizarProducto = async (req, res) => {
  const productoId = req.params.id;
  const emprendedorId = req.emprendedorBDD?._id;

  if (!emprendedorId) {
    return res.status(401).json({ mensaje: 'No autorizado: debe ser un emprendedor autenticado' });
  }

  try {
    const producto = await Producto.findById(productoId);
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

    // Verificar que el emprendimiento del producto pertenezca al emprendedor
    const empDoc = await Emprendimiento.findById(producto.emprendimiento);
    if (!empDoc || empDoc.emprendedor.toString() !== emprendedorId.toString()) {
      return res.status(403).json({ mensaje: 'No tienes permiso para editar este producto' });
    }

    // Validaciones parciales si vienen
    if (req.body.nombre !== undefined) {
      const err = validarNombre(req.body.nombre);
      if (err) return res.status(400).json({ mensaje: err });
    }
    if (req.body.precio !== undefined) {
      const err = validarPrecio(Number(req.body.precio));
      if (err) return res.status(400).json({ mensaje: err });
    }
    if (req.body.stock !== undefined) {
      const err = validarStock(Number(req.body.stock));
      if (err) return res.status(400).json({ mensaje: err });
    }
    if (req.body.categoria !== undefined) {
      const err = validarCategoria(req.body.categoria);
      if (err) return res.status(400).json({ mensaje: err });
    }

    // Campos permitidos (no se permite cambiar 'emprendimiento' aquí)
    const camposActualizar = {};
    ['nombre', 'descripcion', 'precio', 'imagen', 'categoria', 'stock', 'estado'].forEach(campo => {
      if (req.body[campo] !== undefined) camposActualizar[campo] = req.body[campo];
    });

    // Si suben nueva imagen a Cloudinary, borra la anterior si tenía public_id
    if (req.file?.path) {
      if (producto.imagenPublicId) {
        try { await cloudinary.uploader.destroy(producto.imagenPublicId); } catch {}
      }
      camposActualizar.imagen = req.file.path;         // URL pública (https)
      camposActualizar.imagenPublicId = req.file.filename; // public_id
    } else if (req.body.imagen !== undefined && req.body.imagen !== producto.imagen) {
      // Cambiaron manualmente la URL -> si la anterior era Cloudinary, borra
      if (producto.imagenPublicId) {
        try { await cloudinary.uploader.destroy(producto.imagenPublicId); } catch {}
      }
      camposActualizar.imagen = req.body.imagen || null;
      camposActualizar.imagenPublicId = null;
    }

    // Normalizar tipos
    if (camposActualizar.precio !== undefined) camposActualizar.precio = Number(camposActualizar.precio);
    if (camposActualizar.stock !== undefined)  camposActualizar.stock  = Number(camposActualizar.stock);

    const actualizado = await Producto.findByIdAndUpdate(productoId, camposActualizar, { new: true });
    res.json({ mensaje: 'Producto actualizado', producto: actualizado });
  } catch (error) {
    console.error('actualizarProducto error:', error);
    res.status(500).json({ mensaje: 'Error al actualizar producto', error: error.message });
  }
};

// ---------- ELIMINAR PRODUCTO ----------
export const eliminarProducto = async (req, res) => {
  const productoId = req.params.id;
  const emprendedorId = req.emprendedorBDD?._id;

  if (!emprendedorId) {
    return res.status(401).json({ mensaje: 'No autorizado: debe ser un emprendedor autenticado' });
  }

  try {
    const producto = await Producto.findById(productoId);
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

    const empDoc = await Emprendimiento.findById(producto.emprendimiento);
    if (!empDoc || empDoc.emprendedor.toString() !== emprendedorId.toString()) {
      return res.status(403).json({ mensaje: 'No tienes permiso para eliminar este producto' });
    }

    // Si la imagen está en Cloudinary, destruye
    if (producto.imagenPublicId) {
      try { await cloudinary.uploader.destroy(producto.imagenPublicId); } catch {}
    }

    await producto.deleteOne();
    res.json({ mensaje: 'Producto eliminado' });
  } catch (error) {
    console.error('eliminarProducto error:', error);
    res.status(500).json({ mensaje: 'Error al eliminar producto', error: error.message });
  }
};

// ---------- OBTENER TODOS LOS PRODUCTOS (públicos) ----------
export const obtenerTodosLosProductos = async (_req, res) => {
  try {
    const productos = await Producto.find()
      .populate('categoria')
      .populate({
        path: 'emprendimiento',
        select: 'nombreComercial descripcion emprendedor',
        populate: { path: 'emprendedor', select: 'nombre apellido' }
      });

    res.json(productos);
  } catch (error) {
    console.error('obtenerTodosLosProductos error:', error);
    res.status(500).json({ mensaje: 'Error al obtener productos', error: error.message });
  }
};
