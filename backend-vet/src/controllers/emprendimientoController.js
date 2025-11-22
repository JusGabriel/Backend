import Emprendimiento from '../models/Emprendimiento.js'
import Categoria from '../models/Categoria.js'

// -------------------------------
// FUNCION PARA CREAR SLUG
// -------------------------------
const crearSlug = (texto) => {
  return texto
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     
    .replace(/[^\w\-]+/g, '') 
    .replace(/\-\-+/g, '-');  
};

// -------------------------------
// CREAR EMPRENDIMIENTO
// -------------------------------
export const crearEmprendimiento = async (req, res) => {
  const { nombreComercial, descripcion, logo, ubicacion, contacto, categorias } = req.body

  const emprendedorId = req.emprendedorBDD?._id
  if (!emprendedorId) {
    return res.status(401).json({ mensaje: 'No autorizado: debes ser un emprendedor autenticado' })
  }

  try {
    const slug = crearSlug(nombreComercial);

    const nuevoEmprendimiento = new Emprendimiento({
      nombreComercial,
      slug,
      descripcion,
      logo,
      ubicacion,
      contacto,
      categorias,
      emprendedor: emprendedorId
    })

    const guardado = await nuevoEmprendimiento.save()
    res.status(201).json({ mensaje: 'Emprendimiento creado correctamente', emprendimiento: guardado })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear emprendimiento', error: error.message })
  }
}

// -------------------------------
// OBTENER MIS EMPRENDIMIENTOS
// -------------------------------
export const obtenerMisEmprendimientos = async (req, res) => {
  const emprendedorId = req.emprendedorBDD?._id

  try {
    const emprendimientos = await Emprendimiento.find({ emprendedor: emprendedorId })
      .populate('categorias', 'nombre')
    res.json(emprendimientos)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener emprendimientos', error: error.message })
  }
}

// -------------------------------
// OBTENER EMPRENDIMIENTO POR ID
// -------------------------------
export const obtenerEmprendimiento = async (req, res) => {
  const { id } = req.params;

  try {
    const emprendimiento = await Emprendimiento.findById(id)
      .populate('categorias', 'nombre')
      .populate('emprendedor', 'nombre apellido descripcion enlaces')

    if (!emprendimiento) {
      return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' });
    }

    if (emprendimiento.estado === 'Activo') {
      return res.json(emprendimiento);
    }

    const emprendedorId = req.emprendedorBDD?._id;

    if (emprendedorId && emprendimiento.emprendedor.toString() === emprendedorId.toString()) {
      return res.json(emprendimiento);
    }

    return res.status(403).json({ mensaje: 'No tienes permiso para ver este emprendimiento' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener emprendimiento', error: error.message });
  }
};

// -------------------------------
// OBTENER EMPRENDIMIENTO POR SLUG
// -------------------------------
export const obtenerEmprendimientoPorSlug = async (req, res) => {
  const { slug } = req.params;

  try {
    const emprendimiento = await Emprendimiento.findOne({ slug, estado: 'Activo' })
      .populate('categorias', 'nombre')
      .populate('emprendedor', 'nombre apellido descripcion enlaces');

    if (!emprendimiento) {
      return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' });
    }

    res.json(emprendimiento);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener emprendimiento por URL', error: error.message });
  }
};

// -------------------------------
// ACTUALIZAR EMPRENDIMIENTO
// -------------------------------
export const actualizarEmprendimiento = async (req, res) => {
  const { id } = req.params
  const emprendedorId = req.emprendedorBDD?._id

  try {
    const emprendimiento = await Emprendimiento.findById(id)

    if (!emprendimiento) {
      return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' })
    }

    if (emprendimiento.emprendedor.toString() !== emprendedorId.toString()) {
      return res.status(403).json({ mensaje: 'No tienes permiso para actualizar este emprendimiento' })
    }

    const campos = ['nombreComercial', 'descripcion', 'logo', 'ubicacion', 'contacto', 'categorias', 'estado']
    campos.forEach(campo => {
      if (req.body[campo] !== undefined) {
        emprendimiento[campo] = req.body[campo]

        // Si cambió el nombre, actualizar el slug
        if (campo === 'nombreComercial') {
          emprendimiento.slug = crearSlug(req.body[campo])
        }
      }
    })

    const actualizado = await emprendimiento.save()
    res.json({ mensaje: 'Emprendimiento actualizado', emprendimiento: actualizado })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar emprendimiento', error: error.message })
  }
}

// -------------------------------
// ELIMINAR EMPRENDIMIENTO
// -------------------------------
export const eliminarEmprendimiento = async (req, res) => {
  const { id } = req.params
  const emprendedorId = req.emprendedorBDD?._id

  try {
    const emprendimiento = await Emprendimiento.findById(id)

    if (!emprendimiento) {
      return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' })
    }

    if (emprendimiento.emprendedor.toString() !== emprendedorId.toString()) {
      return res.status(403).json({ mensaje: 'No tienes permiso para eliminar este emprendimiento' })
    }

    await emprendimiento.deleteOne()
    res.json({ mensaje: 'Emprendimiento eliminado correctamente' })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar emprendimiento', error: error.message })
  }
}

// -------------------------------
// OBTENER EMPRENDIMIENTOS PUBLICOS
// -------------------------------
export const obtenerEmprendimientosPublicos = async (req, res) => {
  try {
    const emprendimientos = await Emprendimiento.find({ estado: 'Activo' })
      .populate('categorias', 'nombre')
      .populate('emprendedor', 'nombre apellido descripcion enlaces')

    res.json(emprendimientos)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener emprendimientos públicos', error: error.message })
  }
}
