
// controllers/emprendimientoController.js
import Emprendimiento from '../models/Emprendimiento.js';
import cloudinary from '../config/cloudinary.js';

// Helpers slug
const crearSlugBase = (texto = '') =>
  texto.toString().toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');

const asegurarSlugUnico = async (baseSlug) => {
  let slug = baseSlug, i = 1;
  while (await Emprendimiento.findOne({ slug })) {
    slug = `${baseSlug}-${i++}`;
  }
  return slug;
};
const asegurarSlugUnicoParaUpdate = async (baseSlug, excludeId) => {
  let slug = baseSlug, i = 1;
  while (await Emprendimiento.findOne({ slug, _id: { $ne: excludeId } })) {
    slug = `${baseSlug}-${i++}`;
  }
  return slug;
};

// Parse FormData anidado ubicacion[lat]...
const parseFormDataNested = (body = {}) => {
  const ubicacion = {}, contacto = {}, result = {};
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
  if (Object.keys(ubicacion).length) {
    if (ubicacion.lat !== undefined && ubicacion.lat !== '') ubicacion.lat = Number(ubicacion.lat);
    if (ubicacion.lng !== undefined && ubicacion.lng !== '') ubicacion.lng = Number(ubicacion.lng);
    result.ubicacion = { ...ubicacion };
  }
  if (Object.keys(contacto).length) result.contacto = { ...contacto };
  return result;
};

// Crear
export const crearEmprendimiento = async (req, res) => {
  const parsed = parseFormDataNested(req.body);
  const emprendedorId = req.emprendedorBDD?._id;
  if (!emprendedorId) return res.status(401).json({ mensaje: 'No autorizado' });

  try {
    const baseSlug = crearSlugBase(parsed.nombreComercial || req.body.nombreComercial || '');
    const slug     = await asegurarSlugUnico(baseSlug);

    const logoUrl      = req.file?.path || req.body.logo || null;     // URL pública (Cloudinary o externa)
    const logoPublicId = req.file?.filename || null;                  // public_id (Cloudinary)

    const doc = await Emprendimiento.create({
      nombreComercial: parsed.nombreComercial || req.body.nombreComercial,
      slug,
      descripcion: parsed.descripcion || req.body.descripcion || '',
      logo: logoUrl,
      logoPublicId,
      ubicacion: parsed.ubicacion || req.body.ubicacion || {},
      contacto:  parsed.contacto  || req.body.contacto  || {},
      categorias: parsed.categorias || req.body.categorias || [],
      emprendedor: emprendedorId
    });

    res.status(201).json({ mensaje: 'Emprendimiento creado correctamente', emprendimiento: doc });
  } catch (error) {
    console.error('crearEmprendimiento error:', error);
    res.status(500).json({ mensaje: 'Error al crear emprendimiento', error: error.message });
  }
};

// Obtener mis
export const obtenerMisEmprendimientos = async (req, res) => {
  const emprendedorId = req.emprendedorBDD?._id;
  try {
    const lista = await Emprendimiento.find({ emprendedor: emprendedorId })
      // .populate('categorias', 'nombre') // ❌ quitar porque no usas Categoria
      .lean();
    res.json(lista);
  } catch (error) {
    console.error('obtenerMisEmprendimientos error:', error);
    res.status(500).json({ mensaje: 'Error al obtener emprendimientos', error: error.message });
  }
};

// Obtener por id (respeta estado)
export const obtenerEmprendimiento = async (req, res) => {
  try {
    const e = await Emprendimiento.findById(req.params.id)
      // .populate('categorias', 'nombre') // ❌ quitar
      .populate('emprendedor', 'nombre apellido descripcion enlaces')
      // Evita populate categoria dentro de productos
      .populate({ path: 'productos' })
      .lean();

    if (!e) return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' });
    if (e.estado === 'Activo') return res.json(e);

    const emprendedorId = req.emprendedorBDD?._id;
    if (emprendedorId && e.emprendedor?._id?.toString() === emprendedorId.toString()) return res.json(e);

    return res.status(403).json({ mensaje: 'No tienes permiso' });
  } catch (error) {
    console.error('obtenerEmprendimiento error:', error);
    res.status(500).json({ mensaje: 'Error', error: error.message });
  }
};

// Público por slug
export const obtenerEmprendimientoPorSlug = async (req, res) => {
  try {
    const e = await Emprendimiento.findOne({ slug: req.params.slug, estado: 'Activo' })
      // .populate('categorias', 'nombre') // ❌ quitar
      .populate('emprendedor', 'nombre apellido descripcion enlaces')
      .populate({ path: 'productos' }) // ❌ sin categoria
      .lean();

    if (!e) return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' });
    res.json(e);
  } catch (error) {
    console.error('obtenerEmprendimientoPorSlug error:', error);
    res.status(500).json({ mensaje: 'Error', error: error.message });
  }
};

// Actualizar
export const actualizarEmprendimiento = async (req, res) => {
  const { id } = req.params;
  const emprendedorId = req.emprendedorBDD?._id;

  try {
    const e = await Emprendimiento.findById(id);
    if (!e) return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' });
    if (e.emprendedor.toString() !== emprendedorId.toString()) {
      return res.status(403).json({ mensaje: 'Sin permiso' });
    }

    const parsed = parseFormDataNested(req.body);
    const campos = ['nombreComercial', 'descripcion', 'logo', 'ubicacion', 'contacto', 'categorias', 'estado'];

    for (const campo of campos) {
      const valor = (parsed[campo] !== undefined ? parsed[campo] : req.body[campo]);
      if (valor !== undefined) {
        if (campo === 'nombreComercial' && valor) {
          e.nombreComercial = valor;
          e.slug = await asegurarSlugUnicoParaUpdate(crearSlugBase(valor), id);
          continue;
        }
        if (campo === 'ubicacion') {
          let ub = valor;
          if (typeof ub === 'string' && ub.trim().startsWith('{')) { try { ub = JSON.parse(ub); } catch {} }
          if (ub?.lat !== undefined) ub.lat = ub.lat === '' ? null : Number(ub.lat);
          if (ub?.lng !== undefined) ub.lng = ub.lng === '' ? null : Number(ub.lng);
          e.ubicacion = { ...e.ubicacion, ...ub };
          continue;
        }
        if (campo === 'contacto') {
          let cont = valor;
          if (typeof cont === 'string' && cont.trim().startsWith('{')) { try { cont = JSON.parse(cont); } catch {} }
          e.contacto = { ...e.contacto, ...cont };
          continue;
        }
        if (campo === 'categorias') {
          if (typeof valor === 'string') {
            try { e.categorias = JSON.parse(valor); }
            catch { e.categorias = [valor]; }
          } else {
            e.categorias = valor;
          }
          continue;
        }
        e[campo] = valor;
      }
    }

    // Logo (Cloudinary): si suben nuevo archivo, destruye el anterior
    if (req.file?.path) {
      if (e.logoPublicId) {
        try { await cloudinary.uploader.destroy(e.logoPublicId); } catch {}
      }
      e.logo         = req.file.path;
      e.logoPublicId = req.file.filename;
    } else if (req.body.logo && req.body.logo !== e.logo) {
      if (e.logoPublicId) {
        try { await cloudinary.uploader.destroy(e.logoPublicId); } catch {}
      }
      e.logo         = req.body.logo;
      e.logoPublicId = null;
    }

    const actualizado = await e.save();
    res.json({ mensaje: 'Emprendimiento actualizado', emprendimiento: actualizado });
  } catch (error) {
    console.error('actualizarEmprendimiento error:', error);
    res.status(500).json({ mensaje: 'Error', error: error.message });
  }
};

// Eliminar
export const eliminarEmprendimiento = async (req, res) => {
  const { id } = req.params;
  const emprendedorId = req.emprendedorBDD?._id;

  try {
    const e = await Emprendimiento.findById(id);
    if (!e) return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' });
    if (e.emprendedor.toString() !== emprendedorId.toString()) {
      return res.status(403).json({ mensaje: 'Sin permiso' });
    }

    if (e.logoPublicId) {
      try { await cloudinary.uploader.destroy(e.logoPublicId); } catch {}
    }

    await e.deleteOne();
    res.json({ mensaje: 'Emprendimiento eliminado correctamente' });
  } catch (error) {
    console.error('eliminarEmprendimiento error:', error);
    res.status(500).json({ mensaje: 'Error', error: error.message });
  }
};

// Públicos
export const obtenerEmprendimientosPublicos = async (_req, res) => {
  try {
    const lista = await Emprendimiento.find({ estado: 'Activo' })
      // .populate('categorias', 'nombre') // ❌ quitar
      .populate('emprendedor', 'nombre apellido descripcion enlaces')
      .lean();
    res.json(lista);
  } catch (error) {
    console.error('obtenerEmprendimientosPublicos error:', error);
    res.status(500).json({ mensaje: 'Error', error: error.message });
  }
};
