
// controllers/emprendimientoController.js
import Emprendimiento from '../models/Emprendimiento.js';
import Categoria from '../models/Categoria.js';
import cloudinary from '../config/cloudinary.js';

// -------------------------------
// Helpers: slug
// -------------------------------
const crearSlugBase = (texto) => {
  return texto
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

const asegurarSlugUnico = async (baseSlug) => {
  let slug = baseSlug;
  let i = 1;
  while (await Emprendimiento.findOne({ slug })) {
    slug = `${baseSlug}-${i}`;
    i++;
  }
  return slug;
};

const asegurarSlugUnicoParaUpdate = async (baseSlug, excludeId) => {
  let slug = baseSlug;
  let i = 1;
  while (await Emprendimiento.findOne({ slug, _id: { $ne: excludeId } })) {
    slug = `${baseSlug}-${i}`;
    i++;
  }
  return slug;
};

// -------------------------------
// Util: parsear fields tipo "ubicacion[direccion]" desde req.body (FormData style)
// -------------------------------
const parseFormDataNested = (body) => {
  const ubicacion = {};
  const contacto = {};
  const result = {};

  for (const k of Object.keys(body)) {
    const mU = k.match(/^ubicacion\[(.+)\]$/);
    if (mU) { ubicacion[mU[1]] = body[k]; continue; }

    const mC = k.match(/^contacto\[(.+)\]$/);
    if (mC) { contacto[mC[1]] = body[k]; continue; }

    if (k === 'categorias') {
      try { result.categorias = JSON.parse(body[k]); }
      catch { result.categorias = Array.isArray(body[k]) ? body[k] : [body[k]]; }
      continue;
    }

    result[k] = body[k];
  }

  if (Object.keys(ubicacion).length > 0) {
    if (ubicacion.lat !== undefined && ubicacion.lat !== '') ubicacion.lat = Number(ubicacion.lat);
    if (ubicacion.lng !== undefined && ubicacion.lng !== '') ubicacion.lng = Number(ubicacion.lng);
    result.ubicacion = { ...ubicacion };
  }
  if (Object.keys(contacto).length > 0) {
    result.contacto = { ...contacto };
  }

  return result;
};

// -------------------------------
// CREAR EMPRENDIMIENTO
// - acepta logo mediante req.file (multer) o req.body.logo (URL pública)
// -------------------------------
export const crearEmprendimiento = async (req, res) => {
  const parsed = parseFormDataNested(req.body);
  const nombreComercial = parsed.nombreComercial || req.body.nombreComercial;
  const descripcion     = parsed.descripcion     || req.body.descripcion || '';
  const ubicacion       = parsed.ubicacion       || req.body.ubicacion || {};
  const contacto        = parsed.contacto        || req.body.contacto || {};
  const categorias      = parsed.categorias      || req.body.categorias || [];

  const emprendedorId = req.emprendedorBDD?._id;
  if (!emprendedorId) {
    return res.status(401).json({ mensaje: 'No autorizado: debes ser un emprendedor autenticado' });
  }

  try {
    const baseSlug = crearSlugBase(nombreComercial || '');
    const slug     = await asegurarSlugUnico(baseSlug);

    // Resolver logo (Cloudinary)
    const logoUrl      = req.file?.path || req.body.logo || null;     // URL pública
    const logoPublicId = req.file?.filename || null;                  // public_id (solo si subió archivo)

    const nuevoEmprendimiento = new Emprendimiento({
      nombreComercial,
      slug,
      descripcion,
      logo: logoUrl,
      logoPublicId,
      ubicacion,
      contacto,
      categorias,
      emprendedor: emprendedorId
    });

    const guardado = await nuevoEmprendimiento.save();
    res.status(201).json({ mensaje: 'Emprendimiento creado correctamente', emprendimiento: guardado });
  } catch (error) {
    console.error('crearEmprendimiento error:', error);
    res.status(500).json({ mensaje: 'Error al crear emprendimiento', error: error.message });
  }
};

// -------------------------------
// OBTENER MIS EMPRENDIMIENTOS
// -------------------------------
export const obtenerMisEmprendimientos = async (req, res) => {
  const emprendedorId = req.emprendedorBDD?._id;

  try {
    const emprendimientos = await Emprendimiento.find({ emprendedor: emprendedorId })
      .populate('categorias', 'nombre');
    res.json(emprendimientos);
  } catch (error) {
    console.error('obtenerMisEmprendimientos error:', error);
    res.status(500).json({ mensaje: 'Error al obtener emprendimientos', error: error.message });
  }
};

// -------------------------------
// OBTENER EMPRENDIMIENTO POR ID
// -------------------------------
export const obtenerEmprendimiento = async (req, res) => {
  const { id } = req.params;

  try {
    const emprendimiento = await Emprendimiento.findById(id)
      .populate('categorias', 'nombre')
      .populate('emprendedor', 'nombre apellido descripcion enlaces')
      .populate({
        path: 'productos',
        populate: { path: 'categoria', select: 'nombre' }
      });

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
    console.error('obtenerEmprendimiento error:', error);
    res.status(500).json({ mensaje: 'Error al obtener emprendimiento', error: error.message });
  }
};

// -------------------------------
// OBTENER EMPRENDIMIENTO POR SLUG (PÚBLICO)
// -------------------------------
export const obtenerEmprendimientoPorSlug = async (req, res) => {
  const { slug } = req.params;

  try {
    const emprendimiento = await Emprendimiento.findOne({ slug, estado: 'Activo' })
      .populate('categorias', 'nombre')
      .populate('emprendedor', 'nombre apellido descripcion enlaces')
      .populate({
        path: 'productos',
        populate: { path: 'categoria', select: 'nombre' }
      });

    if (!emprendimiento) {
      return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' });
    }

    res.json(emprendimiento);
  } catch (error) {
    console.error('obtenerEmprendimientoPorSlug error:', error);
    res.status(500).json({ mensaje: 'Error al obtener emprendimiento por URL', error: error.message });
  }
};

// -------------------------------
// ACTUALIZAR EMPRENDIMIENTO
// - acepta logo nuevo en req.file o URL nueva en body
// - si hay logo anterior en Cloudinary (logoPublicId), se destruye
// -------------------------------
export const actualizarEmprendimiento = async (req, res) => {
  const { id } = req.params;
  const emprendedorId = req.emprendedorBDD?._id;

  try {
    const emprendimiento = await Emprendimiento.findById(id);
    if (!emprendimiento) {
      return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' });
    }

    if (emprendimiento.emprendedor.toString() !== emprendedorId.toString()) {
      return res.status(403).json({ mensaje: 'No tienes permiso para actualizar este emprendimiento' });
    }

    const parsed = parseFormDataNested(req.body);
    const campos = ['nombreComercial', 'descripcion', 'logo', 'ubicacion', 'contacto', 'categorias', 'estado'];

    for (const campo of campos) {
      const valor = (parsed[campo] !== undefined ? parsed[campo] : req.body[campo]);
      if (valor !== undefined) {
        if (campo === 'nombreComercial' && valor) {
          emprendimiento.nombreComercial = valor;
          const baseSlug = crearSlugBase(valor);
          emprendimiento.slug = await asegurarSlugUnicoParaUpdate(baseSlug, id);
          continue;
        }
        if (campo === 'ubicacion') {
          let ub = valor;
          if (typeof ub === 'string' && ub.trim().startsWith('{')) { try { ub = JSON.parse(ub); } catch {} }
          if (ub && ub.lat !== undefined) ub.lat = ub.lat === '' ? null : Number(ub.lat);
          if (ub && ub.lng !== undefined) ub.lng = ub.lng === '' ? null : Number(ub.lng);
          emprendimiento.ubicacion = { ...emprendimiento.ubicacion, ...ub };
          continue;
        }
        if (campo === 'contacto') {
          let cont = valor;
          if (typeof cont === 'string' && cont.trim().startsWith('{')) { try { cont = JSON.parse(cont); } catch {} }
          emprendimiento.contacto = { ...emprendimiento.contacto, ...cont };
          continue;
        }
        if (campo === 'categorias') {
          if (typeof valor === 'string') {
            try { emprendimiento.categorias = JSON.parse(valor); }
            catch { emprendimiento.categorias = [valor]; }
          } else {
            emprendimiento.categorias = valor;
          }
          continue;
        }
        emprendimiento[campo] = valor;
      }
    }

    // Manejo de logo (Cloudinary)
    if (req.file?.path) {
      // Si había logo anterior en Cloudinary, destruirlo
      if (emprendimiento.logoPublicId) {
        try { await cloudinary.uploader.destroy(emprendimiento.logoPublicId); } catch (e) { /* log opcional */ }
      }
      emprendimiento.logo         = req.file.path;     // URL https
      emprendimiento.logoPublicId = req.file.filename; // public_id
    } else if (req.body.logo && req.body.logo !== emprendimiento.logo) {
      // Cambiaron la URL manualmente: si la anterior era Cloudinary y hay public_id, borrar la anterior
      if (emprendimiento.logoPublicId) {
        try { await cloudinary.uploader.destroy(emprendimiento.logoPublicId); } catch {}
      }
      emprendimiento.logo         = req.body.logo;
      emprendimiento.logoPublicId = null; // no tenemos public_id de una URL externa
    }

    const actualizado = await emprendimiento.save();
    res.json({ mensaje: 'Emprendimiento actualizado', emprendimiento: actualizado });
  } catch (error) {
    console.error('actualizarEmprendimiento error:', error);
    res.status(500).json({ mensaje: 'Error al actualizar emprendimiento', error: error.message });
  }
};

// -------------------------------
// ELIMINAR EMPRENDIMIENTO
// - si hay logo en Cloudinary (logoPublicId) se destruye
// -------------------------------
export const eliminarEmprendimiento = async (req, res) => {
  const { id } = req.params;
  const emprendedorId = req.emprendedorBDD?._id;

  try {
    const emprendimiento = await Emprendimiento.findById(id);
    if (!emprendimiento) {
      return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' });
    }

    if (emprendimiento.emprendedor.toString() !== emprendedorId.toString()) {
      return res.status(403).json({ mensaje: 'No tienes permiso para eliminar este emprendimiento' });
    }

    if (emprendimiento.logoPublicId) {
      try { await cloudinary.uploader.destroy(emprendimiento.logoPublicId); } catch {}
    }

    await emprendimiento.deleteOne();
    res.json({ mensaje: 'Emprendimiento eliminado correctamente' });
  } catch (error) {
    console.error('eliminarEmprendimiento error:', error);
    res.status(500).json({ mensaje: 'Error al eliminar emprendimiento', error: error.message });
  }
};

// -------------------------------
// OBTENER EMPRENDIMIENTOS PUBLICOS
// -------------------------------
export const obtenerEmprendimientosPublicos = async (_req, res) => {
  try {
    const emprendimientos = await Emprendimiento.find({ estado: 'Activo' })
      .populate('categorias', 'nombre')
      .populate('emprendedor', 'nombre apellido descripcion enlaces');

    res.json(emprendimientos);
  } catch (error) {
    console.error('obtenerEmprendimientosPublicos error:', error);
    res.status(500).json({ mensaje: 'Error al obtener emprendimientos públicos', error: error.message });
  }
};
