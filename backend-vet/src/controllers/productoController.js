import Producto from '../models/Productos.js';

// Crear producto
export const crearProducto = async (req, res) => {
  const { nombre, descripcion, precio, imagen, categoria, stock } = req.body;

  const emprendedorId = req.emprendedorBDD?._id;
  if (!emprendedorId) {
    return res.status(401).json({ mensaje: 'No autorizado: debe ser un emprendedor autenticado' });
  }

  try {
    const nuevoProducto = await Producto.create({
      nombre,
      descripcion,
      precio,
      imagen,
      categoria,
      stock,
      emprendimiento: emprendedorId  // Aquí debe ir 'emprendimiento' no 'emprendedor'
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
