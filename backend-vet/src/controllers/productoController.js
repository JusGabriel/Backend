
import Producto from '../models/Productos.js';

// Funciones de validación interna
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
  if (!categoria || typeof categoria !== 'string' || categoria.trim() === '') {
    return 'La categoría es obligatoria';
  }
  return null;
}

// Crear producto
export const crearProducto = async (req, res) => {
  const { nombre, descripcion, precio, imagen, categoria, stock } = req.body;
  const emprendedorId = req.emprendedorBDD?._id;

  if (!emprendedorId) {
    return res.status(401).json({ mensaje: 'No autorizado: debe ser un emprendedor autenticado' });
  }

  // Validaciones
  const errorNombre = validarNombre(nombre);
  if (errorNombre) return res.status(400).json({ mensaje: errorNombre });

  const errorPrecio = validarPrecio(precio);
  if (errorPrecio) return res.status(400).json({ mensaje: errorPrecio });

  const errorStock = validarStock(stock);
  if (errorStock) return res.status(400).json({ mensaje: errorStock });

  const errorCategoria = validarCategoria(categoria);
  if (errorCategoria) return res.status(400).json({ mensaje: errorCategoria });

  try {
    const nuevoProducto = await Producto.create({
      nombre,
      descripcion,
      precio,
      imagen,
      categoria,
      stock,
      emprendimiento: emprendedorId
    });

    res.status(201).json({ mensaje: 'Producto creado', producto: nuevoProducto });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear producto', error: error.message });
  }
};

// Obtener todos los productos de un emprendedor
export const obtenerProductosPorEmprendedor = async (req, res) => {
  const { emprendedorId } = req.params;

  try {
    const productos = await Producto.find({ emprendimiento: emprendedorId }).populate('categoria');
    res.json(productos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener productos', error: error.message });
  }
};

// Obtener producto por ID
export const obtenerProducto = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id)
      .populate('categoria')
      .populate({
        path: 'emprendimiento',
        select: 'nombreComercial descripcion emprendedor',
        populate: {
          path: 'emprendedor',
          select: 'nombre apellido'
        }
      });

    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    res.json(producto);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener producto', error: error.message });
  }
};

// Actualizar producto
export const actualizarProducto = async (req, res) => {
  const productoId = req.params.id;
  const emprendedorId = req.emprendedorBDD?._id;

  if (!emprendedorId) {
    return res.status(401).json({ mensaje: 'No autorizado: debe ser un emprendedor autenticado' });
  }

  try {
    const producto = await Producto.findById(productoId);

    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    if (producto.emprendimiento.toString() !== emprendedorId.toString()) {
      return res.status(403).json({ mensaje: 'No tienes permiso para editar este producto' });
    }

    // Validar campos si vienen en req.body
    if (req.body.nombre) {
      const errorNombre = validarNombre(req.body.nombre);
      if (errorNombre) return res.status(400).json({ mensaje: errorNombre });
    }
    if (req.body.precio !== undefined) {
      const errorPrecio = validarPrecio(req.body.precio);
      if (errorPrecio) return res.status(400).json({ mensaje: errorPrecio });
    }
    if (req.body.stock !== undefined) {
      const errorStock = validarStock(req.body.stock);
      if (errorStock) return res.status(400).json({ mensaje: errorStock });
    }
    if (req.body.categoria) {
      const errorCategoria = validarCategoria(req.body.categoria);
      if (errorCategoria) return res.status(400).json({ mensaje: errorCategoria });
    }

    // Actualizar solo campos permitidos
    const camposActualizar = {};
    ['nombre', 'descripcion', 'precio', 'imagen', 'categoria', 'stock', 'estado'].forEach(campo => {
      if (req.body[campo] !== undefined) camposActualizar[campo] = req.body[campo];
    });

    const actualizado = await Producto.findByIdAndUpdate(productoId, camposActualizar, { new: true });
    res.json({ mensaje: 'Producto actualizado', producto: actualizado });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar producto', error: error.message });
  }
};

// Eliminar producto
export const eliminarProducto = async (req, res) => {
  const productoId = req.params.id;
  const emprendedorId = req.emprendedorBDD?._id;

  if (!emprendedorId) {
    return res.status(401).json({ mensaje: 'No autorizado: debe ser un emprendedor autenticado' });
  }

  try {
    const producto = await Producto.findById(productoId);

    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    if (producto.emprendimiento.toString() !== emprendedorId.toString()) {
      return res.status(403).json({ mensaje: 'No tienes permiso para eliminar este producto' });
    }

    await producto.deleteOne();
    res.json({ mensaje: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar producto', error: error.message });
  }
};

// Obtener todos los productos (públicos)
export const obtenerTodosLosProductos = async (req, res) => {
  try {
    const productos = await Producto.find()
      .populate('categoria')
      .populate({
        path: 'emprendimiento',
        select: 'nombreComercial descripcion emprendedor',
        populate: {
          path: 'emprendedor',
          select: 'nombre apellido'
        }
      });

    res.json(productos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener productos', error: error.message });
  }
};
