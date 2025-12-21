// src/controllers/productoController.js
import mongoose from 'mongoose';
import Producto from '../models/Productos.js';
import Emprendimiento from '../models/Emprendimiento.js';
import path from 'path';
import fs from 'fs';

// ---------- Validaciones ----------
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
    return 'El stock es obligatorio y debe ser un entero igual o mayor a 0';
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

// ---------- Util: eliminar archivo si existe ----------
const eliminarArchivoSiExiste = (rutaRelativa) => {
  if (!rutaRelativa) return;
  // rutaRelativa: '/uploads/productos/archivo.jpg' o 'uploads/productos/archivo.jpg'
  const p = rutaRelativa.startsWith('/') ? rutaRelativa.slice(1) : rutaRelativa;
  const fullPath = path.resolve(p);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (err) {
      console.error('Error eliminando archivo:', err);
    }
  }
};

// ---------- CREAR PRODUCTO ----------
// Acepta imagen en req.file (multer) o imagen en req.body (URL) por compatibilidad
export const crearProducto = async (req, res) => {
  try {
    // Campos planos; si vienen como FormData vienen en req.body (strings)
    const {
      nombre,
      descripcion,
      precio: precioRaw,
      categoria,
      stock: stockRaw,
      emprendimiento
    } = req.body;

    const precio = precioRaw !== undefined ? Number(precioRaw) : undefined;
    const stock = stockRaw !== undefined && stockRaw !== '' ? Number(stockRaw) : undefined;

    const emprendedorId = req.emprendedorBDD?._id;
    if (!emprendedorId) {
      return res.status(401).json({ mensaje: 'No autorizado: debe ser un emprendedor autenticado' });
    }

    // Validaciones
    const errorNombre = validarNombre(nombre);
    if (errorNombre) return res.status(400).json({ mensaje: errorNombre });

    const errorPrecio = validarPrecio(precio);
    if (errorPrecio) return res.status(400).json({ mensaje: errorPrecio });

    const errorStock = validarStock(stock !== undefined ? stock : 0);
    if (errorStock) return res.status(400).json({ mensaje: errorStock });

    const errorCat = validarCategoria(categoria);
    if (errorCat) return res.status(400).json({ mensaje: errorCat });

    if (!emprendimiento || !validarObjectId(emprendimiento)) {
      return res.status(400).json({ mensaje: 'Debes seleccionar un emprendimiento válido' });
    }

    // Verificar emprendimiento existe y pertenece al emprendedor
    const empDoc = await Emprendimiento.findById(emprendimiento);
    if (!empDoc) {
      return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' });
    }
    if (empDoc.emprendedor.toString() !== emprendedorId.toString()) {
      return res.status(403).json({ mensaje: 'No puedes crear productos en un emprendimiento que no te pertenece' });
    }

    // Resolver imagen: si multer guardó archivo -> req.file, si no -> req.body.imagen (URL)
    let imagenValor = null;
    if (req.file && req.file.filename) {
      // si en router guardas en uploads/productos, filename está ahí
      imagenValor = `/uploads/productos/${req.file.filename}`;
    } else if (req.body.imagen) {
      imagenValor = req.body.imagen;
    }

    const nuevoProducto = await Producto.create({
      nombre,
      descripcion: descripcion || '',
      precio,
      imagen: imagenValor || null,
      categoria: categoria || null,
      stock: stock !== undefined ? stock : 0,
      emprendimiento: empDoc._id
    });

    res.status(201).json({ mensaje: 'Producto creado', producto: nuevoProducto });
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

// ---------- OBTENER PRODUCTO (ID) ----------
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
// Acepta imagen nueva en req.file; si hay imagen anterior en /uploads se elimina
export const actualizarProducto = async (req, res) => {
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
      return res.status(403).json({ mensaje: 'No tienes permiso para editar este producto' });
    }

    // Validar campos si vienen
    if (req.body.nombre) {
      const errorNombre = validarNombre(req.body.nombre);
      if (errorNombre) return res.status(400).json({ mensaje: errorNombre });
      producto.nombre = req.body.nombre;
    }
    if (req.body.precio !== undefined) {
      const precio = Number(req.body.precio);
      const errorPrecio = validarPrecio(precio);
      if (errorPrecio) return res.status(400).json({ mensaje: errorPrecio });
      producto.precio = precio;
    }
    if (req.body.stock !== undefined) {
      const stock = Number(req.body.stock);
      const errorStock = validarStock(stock);
      if (errorStock) return res.status(400).json({ mensaje: errorStock });
      producto.stock = stock;
    }
    if (req.body.descripcion !== undefined) producto.descripcion = req.body.descripcion;
    if (req.body.categoria !== undefined) {
      const errorCat = validarCategoria(req.body.categoria);
      if (errorCat) return res.status(400).json({ mensaje: errorCat });
      producto.categoria = req.body.categoria || null;
    }

    // Si multer subió nuevo archivo, eliminar anterior (si estaba en /uploads) y asignar nuevo path
    if (req.file && req.file.filename) {
      if (producto.imagen && producto.imagen.startsWith('/uploads')) {
        eliminarArchivoSiExiste(producto.imagen);
      }
      producto.imagen = `/uploads/productos/${req.file.filename}`;
    } else if (req.body.imagen) {
      // permitir actualizar con URL
      producto.imagen = req.body.imagen;
    }

    const actualizado = await producto.save();
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

    // eliminar archivo si estaba en /uploads
    if (producto.imagen && producto.imagen.startsWith('/uploads')) {
      eliminarArchivoSiExiste(producto.imagen);
    }

    await producto.deleteOne();
    res.json({ mensaje: 'Producto eliminado' });
  } catch (error) {
    console.error('eliminarProducto error:', error);
    res.status(500).json({ mensaje: 'Error al eliminar producto', error: error.message });
  }
};

// ---------- OBTENER TODOS LOS PRODUCTOS (Públicos) ----------
export const obtenerTodosLosProductos = async (req, res) => {
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
