import Emprendimiento from '../models/Emprendimiento.js'
import Categoria from '../models/Categoria.js'

// Crear emprendimiento
export const crearEmprendimiento = async (req, res) => {
  const { nombreComercial, descripcion, logo, ubicacion, contacto, categorias } = req.body

  const emprendedorId = req.emprendedorBDD?._id
  if (!emprendedorId) {
    return res.status(401).json({ mensaje: 'No autorizado: debes ser un emprendedor autenticado' })
  }

  try {
    const nuevoEmprendimiento = new Emprendimiento({
      nombreComercial,
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

// Obtener todos los emprendimientos del emprendedor autenticado
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

// Obtener un emprendimiento por ID (público si está activo, privado si es del emprendedor autenticado)
export const obtenerEmprendimiento = async (req, res) => {
  const { id } = req.params;

  try {
    const emprendimiento = await Emprendimiento.findById(id)
      .populate('categorias', 'nombre')
      .populate('emprendedor', 'nombre apellido descripcion enlaces')

    if (!emprendimiento) {
      return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' });
    }

    // Si el estado es "Activo", puede verlo cualquiera
    if (emprendimiento.estado === 'Activo') {
      return res.json(emprendimiento);
    }

    // Si el usuario autenticado es el dueño, también puede verlo
    const emprendedorId = req.emprendedorBDD?._id;
    if (emprendedorId && emprendimiento.emprendedor.toString() === emprendedorId.toString()) {
      return res.json(emprendimiento);
    }

    return res.status(403).json({ mensaje: 'No tienes permiso para ver este emprendimiento' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener emprendimiento', error: error.message });
  }
};


// Actualizar emprendimiento
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

    // Solo se actualizan campos permitidos
    const campos = ['nombreComercial', 'descripcion', 'logo', 'ubicacion', 'contacto', 'categorias', 'estado']
    campos.forEach(campo => {
      if (req.body[campo] !== undefined) {
        emprendimiento[campo] = req.body[campo]
      }
    })

    const actualizado = await emprendimiento.save()
    res.json({ mensaje: 'Emprendimiento actualizado', emprendimiento: actualizado })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar emprendimiento', error: error.message })
  }
}

// Eliminar emprendimiento
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
// Obtener todos los emprendimientos públicos (activos)
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

