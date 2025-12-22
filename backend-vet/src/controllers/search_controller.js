// controllers/search_controller.js
import Producto from '../models/Producto.js';
import Emprendimiento from '../models/Emprendimiento.js';
import Emprendedor from '../models/Emprendedor.js';

/** Normaliza parámetros comunes */
function parseParams(req) {
  const q = (req.query.q || '').trim();
  const types = (req.query.types || 'productos,emprendimientos,emprendedores')
    .split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

  const page  = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
  const skip  = (page - 1) * limit;

  const mode = (req.query.mode || 'smart'); // smart | prefix | contains
  return { q, types, page, limit, skip, mode };
}

/** Construye regex segura, con modo prefijo o contiene */
function buildRegex(q, mode = 'smart') {
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const isShort = q.length < 3;
  if (mode === 'prefix')   return new RegExp(`^${safe}`, 'i');
  if (mode === 'contains') return new RegExp(safe, 'i');
  return new RegExp(isShort ? safe : `^${safe}`, 'i'); // smart
}

/** Colecciones reales (evita suposición de nombres pluralizados) */
const EMPRENDIMIENTO_COLL = Emprendimiento.collection.name; // 'emprendimientos'
const EMPRENDEDOR_COLL    = Emprendedor.collection.name;    // 'emprendedors'

/** Búsqueda en Emprendedores (find + collation) */
async function searchEmprendedores(regex, skip, limit) {
  const filter = {
    $or: [
      { nombre:   { $regex: regex } },
      { apellido: { $regex: regex } },
      { email:    { $regex: regex } }
      // Sin nombreCompleto porque tus modelos no lo tienen; igual funciona
    ]
  };

  const [items, total] = await Promise.all([
    Emprendedor.find(filter)
      .select('nombre apellido email telefono descripcion estado_Emprendedor rol')
      .skip(skip).limit(limit)
      .collation({ locale: 'es', strength: 1 }) // case/diacritics insensitive
      .lean(),
    Emprendedor.countDocuments(filter)
  ]);

  return { items, total };
}

/** Búsqueda en Emprendimientos (aggregate + $lookup → emprendedor) */
async function searchEmprendimientos(regex, skip, limit) {
  const pipeline = [
    { $lookup: {
        from: EMPRENDEDOR_COLL,
        localField: 'emprendedor',
        foreignField: '_id',
        as: 'owner'
    }},
    { $unwind: '$owner' },
    { $addFields: {
        ownerNombreCompleto: {
          $concat: [
            { $ifNull: ['$owner.nombre', ''] }, ' ',
            { $ifNull: ['$owner.apellido', ''] }
          ]
        }
    }},
    { $match: { $or: [
        { nombreComercial:   { $regex: regex } },
        { descripcion:       { $regex: regex } },
        { 'ubicacion.ciudad':{ $regex: regex } },
        { ownerNombreCompleto:{ $regex: regex } }
    ]}},
    { $project: {
        nombreComercial: 1, descripcion: 1, ubicacion: 1, slug: 1, logo: 1,
        'contacto.telefono': 1, 'contacto.email': 1, 'contacto.sitioWeb': 1,
        ownerNombreCompleto: 1
    }},
    { $skip: skip },
    { $limit: limit }
  ];

  const items = await Emprendimiento.aggregate(pipeline)
    .collation({ locale: 'es', strength: 1 });

  const countPipeline = pipeline
    .filter(st => !('$skip' in st) && !('$limit' in st))
    .concat([{ $count: 'total' }]);

  const countRes = await Emprendimiento.aggregate(countPipeline)
    .collation({ locale: 'es', strength: 1 });

  const total = countRes[0]?.total || 0;
  return { items, total };
}

/** Búsqueda en Productos (aggregate + $lookup → emprendimiento → emprendedor) */
async function searchProductos(regex, skip, limit) {
  const pipeline = [
    { $lookup: {
        from: EMPRENDIMIENTO_COLL,
        localField: 'emprendimiento',
        foreignField: '_id',
        as: 'emp'
    }},
    { $unwind: '$emp' },
    { $lookup: {
        from: EMPRENDEDOR_COLL,
        localField: 'emp.emprendedor',
        foreignField: '_id',
        as: 'owner'
    }},
    { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
    { $addFields: {
        empNombreComercial: '$emp.nombreComercial',
        ownerNombreCompleto: {
          $concat: [
            { $ifNull: ['$owner.nombre', ''] }, ' ',
            { $ifNull: ['$owner.apellido', ''] }
          ]
        }
    }},
    { $match: { $or: [
        { nombre:             { $regex: regex } },
        { descripcion:        { $regex: regex } },
        { empNombreComercial: { $regex: regex } },
        { ownerNombreCompleto:{ $regex: regex } }
    ]}},
    { $project: {
        nombre: 1, descripcion: 1, precio: 1, stock: 1, imagen: 1,
        empNombreComercial: 1, ownerNombreCompleto: 1
    }},
    { $skip: skip },
    { $limit: limit }
  ];

  const items = await Producto.aggregate(pipeline)
    .collation({ locale: 'es', strength: 1 });

  const countPipeline = pipeline
    .filter(st => !('$skip' in st) && !('$limit' in st))
    .concat([{ $count: 'total' }]);

  const countRes = await Producto.aggregate(countPipeline)
    .collation({ locale: 'es', strength: 1 });

  const total = countRes[0]?.total || 0;
  return { items, total };
}

/** GET /api/search — unificado */
export async function unifiedSearch(req, res) {
  try {
    const { q, types, page, limit, skip, mode } = parseParams(req);
    if (!q) return res.status(400).json({ msg: 'Parámetro q es requerido' });

    const regex = buildRegex(q, mode);
    const results = {};
    const counts  = {};

    const tasks = [];

    if (types.includes('productos')) {
      tasks.push((async () => {
        const { items, total } = await searchProductos(regex, skip, limit);
        results.productos = items; counts.productos = total;
      })());
    }
    if (types.includes('emprendimientos')) {
      tasks.push((async () => {
        const { items, total } = await searchEmprendimientos(regex, skip, limit);
        results.emprendimientos = items; counts.emprendimientos = total;
      })());
    }
    if (types.includes('emprendedores')) {
      tasks.push((async () => {
        const { items, total } = await searchEmprendedores(regex, skip, limit);
        results.emprendedores = items; counts.emprendedores = total;
      })());
    }

    await Promise.all(tasks);
    return res.json({ q, page, limit, results, counts });
  } catch (err) {
    console.error('[unifiedSearch] error', err);
    return res.status(500).json({ msg: 'Error en búsqueda unificada' });
  }
}

/** GET /api/search/suggest — autocompletado por prefijo (top 5 por tipo) */
export async function suggest(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ msg: 'Parámetro q es requerido' });

    const regex = buildRegex(q, 'prefix');

    const [prods, emps, owners] = await Promise.all([
      Producto.aggregate([
        { $lookup: { from: EMPRENDIMIENTO_COLL, localField: 'emprendimiento', foreignField: '_id', as: 'emp' }},
        { $unwind: '$emp' },
        { $match: { $or: [
          { nombre: { $regex: regex } },
          { 'emp.nombreComercial': { $regex: regex } }
        ]}},
        { $project: { nombre: 1, empNombreComercial: '$emp.nombreComercial' } },
        { $limit: 5 }
      ]).collation({ locale: 'es', strength: 1 }),

      Emprendimiento.aggregate([
        { $lookup: { from: EMPRENDEDOR_COLL, localField: 'emprendedor', foreignField: '_id', as: 'owner' }},
        { $unwind: '$owner' },
        { $addFields: { ownerNombreCompleto: {
          $concat: [
            { $ifNull: ['$owner.nombre', ''] }, ' ',
            { $ifNull: ['$owner.apellido', ''] }
          ]
        }}},
        { $match: { $or: [
          { nombreComercial: { $regex: regex } },
          { ownerNombreCompleto: { $regex: regex } }
        ]}},
        { $project: { nombreComercial: 1, ownerNombreCompleto: 1, slug: 1 } },
        { $limit: 5 }
      ]).collation({ locale: 'es', strength: 1 }),

      Emprendedor.find({
        $or: [
          { nombre:   { $regex: regex } },
          { apellido: { $regex: regex } },
          { email:    { $regex: regex } }
        ]
      })
      .select('nombre apellido email')
      .limit(5)
      .collation({ locale: 'es', strength: 1 })
      .lean()
    ]);

    return res.json({
      q,
      sugerencias: {
        productos: prods,
        emprendimientos: emps,
        emprendedores: owners
      }
    });
  } catch (err) {
    console.error('[suggest] error', err);
    return res.status(500).json({ msg: 'Error en sugerencias' });
  }
}

/** Endpoints por entidad (si los quieres expuestos) */
export async function searchProductosController(req, res) {
  try {
    const { q, page, limit, skip, mode } = parseParams(req);
    if (!q) return res.status(400).json({ msg: 'Parámetro q es requerido' });
    const regex = buildRegex(q, mode);
    const { items, total } = await searchProductos(regex, skip, limit);
    return res.json({ q, page, limit, results: items, total });
  } catch (err) {
    console.error('[searchProductos] error', err);
    return res.status(500).json({ msg: 'Error buscando productos' });
  }
}

export async function searchEmprendimientosController(req, res) {
  try {
    const { q, page, limit, skip, mode } = parseParams(req);
    if (!q) return res.status(400).json({ msg: 'Parámetro q es requerido' });
    const regex = buildRegex(q, mode);
    const { items, total } = await searchEmprendimientos(regex, skip, limit);
    return res.json({ q, page, limit, results: items, total });
  } catch (err) {
    console.error('[searchEmprendimientos] error', err);
    return res.status(500).json({ msg: 'Error buscando emprendimientos' });
  }
}

export async function searchEmprendedoresController(req, res) {
  try {
    const { q, page, limit, skip, mode } = parseParams(req);
    if (!q) return res.status(400).json({ msg: 'Parámetro q es requerido' });
    const regex = buildRegex(q, mode);
    const { items, total } = await searchEmprendedores(regex, skip, limit);
    return res.json({ q, page, limit, results: items, total });
  } catch (err) {
    console.error('[searchEmprendedores] error', err);
    return res.status(500).json({ msg: 'Error buscando emprendedores' });
  }
}
