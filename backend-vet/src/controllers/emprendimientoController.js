// controllers/emprendimientoController.js
import Emprendimiento from '../models/Emprendimiento.js';
import Categoria from '../models/Categoria.js';
import path from 'path';
import fs from 'fs';

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
// Util: eliminar archivo en uploads si existe
// -------------------------------
const eliminarArchivoSiExiste = (rutaRelativa) => {
  if (!rutaRelativa) return;
  // rutaRelativa esperada: '/uploads/archivo.ext' o 'uploads/archivo.ext'
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

// -------------------------------
// Util: parsear fields tipo "ubicacion[direccion]" desde req.body (FormData style)
// -------------------------------
const parseFormDataNested = (body) => {
  const ubicacion = {};
  const contacto = {};
  const result = {};

  for (const k of Object.keys(body)) {
    const mU = k.match(/^ubicacion\[(.+)\]$/);
    if (mU) {
      ubicacion[mU[1]] = body[k];
      continue;
    }
    const mC = k.match(/^contacto\[(.+)\]$/);
    if (mC) {
      contacto[mC[1]] = body[k];
      continue;
    }
    // categorias puede venir como JSON string o como campo simple
    if (k === 'categorias') {
      try {
        result.categorias = JSON.parse(body[k]);
      } catch (err) {
        // si no es JSON, convertir a array o dejar como string
        result.categorias = Array.isArray(body[k]) ? body[k] : [body[k]];
      }
      continue;
    }
    // campos normales
    result[k] = body[k];
  }

  if (Object.keys(ubicacion).length > 0) {
    // parsear lat/lng a Number si vienen
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
// - acepta logo mediante req.file (multer) o req.body.logo (compatibilidad URL)
// -------------------------------
export const crearEmprendimiento = async (req, res) => {
  // Primero parsear body con campos nested (si vienen desde FormData)
  const parsed = parseFormDataNested(req.body);
  const nombreComercial = parsed.nombreComercial || req.body.nombreComercial;
  const descripcion = parsed.descripcion || req.body.descripcion || '';
  const ubicacion = parsed.ubicacion || req.body.ubicacion || {};
  const contacto = parsed.contacto || req.body.contacto || {};
  const categorias = parsed.categorias || req.body.categorias || [];

  const emprendedorId = req.emprendedorBDD?._id;
  if (!emprendedorId) {
    return res.status(401).json({ mensaje: 'No autorizado: debes ser un emprendedor autenticado' });
  }

  try {
    const baseSlug = crearSlugBase(nombreComercial || '');
    const slug = await asegurarSlugUnico(baseSlug);

    // Resolver logo: si multer guardó archivo -> req.file, si no -> req.body.logo (URL)
    let logoValor = null;
    if (req.file && req.file.filename) {
      logoValor = `/uploads/${req.file.filename}`;
    } else if (req.body.logo) {
      logoValor = req.body.logo;
    }

    // Normalizar lat/lng a Number si vienen string directo en ubicacion
    if (ubicacion && typeof ubicacion.lat === 'string') ubicacion.lat = Number(ubicacion.lat);
    if (ubicacion && typeof ubicacion.lng === 'string') ubicacion.lng = Number(ubicacion.lng);

    const nuevoEmprendimiento = new Emprendimiento({
      nombreComercial,
      slug,
      descripcion,
      logo: logoValor || null,
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
// - acepta logo en req.file (multer) o logo en body (URL)
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

    // parsear posible FormData nested
    const parsed = parseFormDataNested(req.body);

    // campos permitidos
    const campos = ['nombreComercial', 'descripcion', 'logo', 'ubicacion', 'contacto', 'categorias', 'estado'];
    for (const campo of campos) {
      // si vino en parsed o en req.body
      const valor = (parsed[campo] !== undefined ? parsed[campo] : req.body[campo]);
      if (valor !== undefined) {
        // si nombreComercial, recalcular slug único
        if (campo === 'nombreComercial' && valor) {
          emprendimiento.nombreComercial = valor;
          const baseSlug = crearSlugBase(valor);
          emprendimiento.slug = await asegurarSlugUnicoParaUpdate(baseSlug, id);
          continue;
        }

        // asignar ubicacion/contacto correctamente (si vienen como objeto o json string)
        if (campo === 'ubicacion') {
          let ub = valor;
          if (typeof ub === 'string' && ub.trim().startsWith('{')) {
            try { ub = JSON.parse(ub); } catch (e) { /* ignore */ }
          }
          // parse numericos
          if (ub && ub.lat !== undefined) ub.lat = ub.lat === '' ? null : Number(ub.lat);
          if (ub && ub.lng !== undefined) ub.lng = ub.lng === '' ? null : Number(ub.lng);
          emprendimiento.ubicacion = { ...emprendimiento.ubicacion, ...ub };
          continue;
        }
        if (campo === 'contacto') {
          let cont = valor;
          if (typeof cont === 'string' && cont.trim().startsWith('{')) {
            try { cont = JSON.parse(cont); } catch (e) { /* ignore */ }
          }
          emprendimiento.contacto = { ...emprendimiento.contacto, ...cont };
          continue;
        }

        if (campo === 'categorias') {
          // permitir string JSON o array
          if (typeof valor === 'string') {
            try { emprendimiento.categorias = JSON.parse(valor); } catch { emprendimiento.categorias = [valor]; }
          } else {
            emprendimiento.categorias = valor;
          }
          continue;
        }

        // resto de campos simples
        emprendimiento[campo] = valor;
      }
    }

    // Si multer subió nuevo logo, eliminar el anterior si estaba en /uploads y setear nuevo path
    if (req.file && req.file.filename) {
      if (emprendimiento.logo && emprendimiento.logo.startsWith('/uploads')) {
        eliminarArchivoSiExiste(emprendimiento.logo);
      }
      emprendimiento.logo = `/uploads/${req.file.filename}`;
    } else if (req.body.logo) {
      // si envían logo por body como URL
      emprendimiento.logo = req.body.logo;
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
// - borra archivo de logo si estaba en /uploads
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

    // eliminar logo si está en uploads
    if (emprendimiento.logo && emprendimiento.logo.startsWith('/uploads')) {
      eliminarArchivoSiExiste(emprendimiento.logo);
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
export const obtenerEmprendimientosPublicos = async (req, res) => {
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
