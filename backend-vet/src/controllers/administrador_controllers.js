// src/controllers/administrador_controllers.js
import Administrador from '../models/Administrador.js';
import { sendMailToRegister, sendMailToRecoveryPassword } from '../config/nodemailer.js';
import { crearTokenJWT } from '../middleware/JWT.js';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary.js';

// --- Validaciones internas (queda igual) ---
function validarNombre(nombre) {
  if (!nombre || typeof nombre !== 'string' || !/^[a-zA-Z\s]+$/.test(nombre.trim())) {
    return 'El nombre es obligatorio y solo puede contener letras y espacios';
  }
  return null;
}
function validarTelefono(telefono) {
  if (!telefono || (typeof telefono !== 'string' && typeof telefono !== 'number')) {
    return 'El teléfono es obligatorio y debe ser un número';
  }
  const telefonoStr = telefono.toString();
  if (!/^\d{7,15}$/.test(telefonoStr)) {
    return 'El teléfono debe contener solo números y tener entre 7 y 15 dígitos';
  }
  return null;
}

// --- REGISTRO / LOGIN / PERFIL: sin cambios (tu código original) ---
const registro = async (req, res) => { /* ...igual que tú... */ };
const confirmarMail = async (req, res) => { /* ... */ };
const recuperarPassword = async (req, res) => { /* ... */ };
const comprobarTokenPasword = async (req, res) => { /* ... */ };
const crearNuevoPassword = async (req, res) => { /* ... */ };
const login = async (req, res) => { /* ... */ };
const verAdministradores = async (req, res) => { /* ... */ };
const actualizarAdministrador = async (req, res) => { /* ... */ };
const eliminarAdministrador = async (req, res) => { /* ... */ };
const perfil = (req, res) => {
  const { token, confirmEmail, createdAt, updatedAt, __v, password, ...datosPerfil } = req.adminBDD;
  res.status(200).json(datosPerfil);
};
const actualizarPassword = async (req, res) => { /* ... */ };

// --- Actualizar perfil (tus reglas) ---
const actualizarPerfil = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, telefono, email } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'Lo sentimos, el ID no es válido' });
  }
  if (Object.values(req.body).includes('')) {
    return res.status(400).json({ msg: 'Lo sentimos, debes llenar todos los campos' });
  }

  const errorNombre = validarNombre(nombre);
  if (errorNombre) return res.status(400).json({ msg: errorNombre });

  const errorTelefono = validarTelefono(telefono);
  if (errorTelefono) return res.status(400).json({ msg: errorTelefono });

  const adminBDD = await Administrador.findById(id);
  if (!adminBDD) return res.status(404).json({ msg: `Lo sentimos, no existe el administrador con ID ${id}` });

  if (adminBDD.email !== email) {
    const adminBDDMail = await Administrador.findOne({ email });
    if (adminBDDMail) return res.status(400).json({ msg: 'Lo sentimos, el email ya se encuentra registrado' });
  }

  adminBDD.nombre   = nombre   ?? adminBDD.nombre;
  adminBDD.apellido = apellido ?? adminBDD.apellido;
  adminBDD.telefono = telefono ?? adminBDD.telefono;
  adminBDD.email    = email    ?? adminBDD.email;

  await adminBDD.save();
  res.status(200).json(adminBDD);
};

// --- 👇 NUEVO: actualizar SOLO la foto de perfil ---
const actualizarFotoPerfil = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'ID no válido' });
  }

  const adminBDD = await Administrador.findById(id);
  if (!adminBDD) return res.status(404).json({ msg: 'Administrador no encontrado' });

  try {
    // Si viene archivo (Multer + CloudinaryStorage)
    if (req.file?.path) {
      // Si había una foto previa, destruir en Cloudinary
      if (adminBDD.fotoPublicId) {
        try { await cloudinary.uploader.destroy(adminBDD.fotoPublicId); } catch {}
      }

      adminBDD.foto         = req.file.path;     // secure_url
      adminBDD.fotoPublicId = req.file.filename; // public_id
      await adminBDD.save();

      return res.status(200).json({ msg: 'Foto actualizada', admin: adminBDD });
    }

    // Si viene URL (fallback)
    if (typeof req.body.foto === 'string' && req.body.foto.trim()) {
      if (adminBDD.fotoPublicId) {
        try { await cloudinary.uploader.destroy(adminBDD.fotoPublicId); } catch {}
      }
      adminBDD.foto         = req.body.foto;
      adminBDD.fotoPublicId = null;
      await adminBDD.save();
      return res.status(200).json({ msg: 'Foto actualizada (URL)', admin: adminBDD });
    }

    return res.status(400).json({ msg: 'No se envió archivo ni URL de foto' });
  } catch (error) {
    console.error('actualizarFotoPerfil error:', error);
    res.status(500).json({ msg: 'Error al actualizar foto de perfil', error: error.message });
  }
};

// --- 👇 NUEVO: eliminar foto de perfil ---
const eliminarFotoPerfil = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'ID no válido' });
  }

  const adminBDD = await Administrador.findById(id);
  if (!adminBDD) return res.status(404).json({ msg: 'Administrador no encontrado' });

  try {
    if (adminBDD.fotoPublicId) {
      try { await cloudinary.uploader.destroy(adminBDD.fotoPublicId); } catch {}
    }
    adminBDD.foto = null;
    adminBDD.fotoPublicId = null;
    await adminBDD.save();

    res.status(200).json({ msg: 'Foto eliminada', admin: adminBDD });
  } catch (error) {
    console.error('eliminarFotoPerfil error:', error);
    res.status(500).json({ msg: 'Error al eliminar foto de perfil', error: error.message });
  }
};

export {
  registro,
  confirmarMail,
  recuperarPassword,
  comprobarTokenPasword,
  crearNuevoPassword,
  login,
  verAdministradores,
  actualizarAdministrador,
  eliminarAdministrador,
  perfil,
  actualizarPassword,
  actualizarPerfil,
  actualizarFotoPerfil,   // 👈 export nuevo
  eliminarFotoPerfil      // 👈 export nuevo
};
