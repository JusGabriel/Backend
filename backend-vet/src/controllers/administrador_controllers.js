
// src/controllers/administrador_controllers.js
import Administrador from '../models/Administrador.js';
import { sendMailToRegister, sendMailToRecoveryPassword } from '../config/nodemailer.js';
import { crearTokenJWT } from '../middleware/JWT.js';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary.js';

/* ============================
   Validaciones internas
============================ */
function validarNombre(nombre) {
  if (!nombre || typeof nombre !== 'string' || !/^[a-zA-Z\s]+$/.test(nombre.trim())) {
    return 'El nombre es obligatorio y solo puede contener letras y espacios';
  }
  return null;
}

// Teléfono REQUERIDO para admin (si quieres hacerlo opcional como cliente/emprendedor,
// cambia la primera línea a: if (telefono == null || telefono === '') return null)
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

/* ============================
   Registro / confirmación / recuperación
============================ */
const registro = async (req, res) => {
  const { nombre, telefono, email, password } = req.body;

  if ([nombre, telefono, email, password].some(v => !v || String(v).trim() === '')) {
    return res.status(400).json({ msg: 'Nombre, teléfono, email y password son obligatorios' });
  }

  const e1 = validarNombre(nombre);      if (e1) return res.status(400).json({ msg: e1 });
  const e2 = validarTelefono(telefono);  if (e2) return res.status(400).json({ msg: e2 });

  const existeEmail = await Administrador.findOne({ email });
  if (existeEmail) return res.status(400).json({ msg: 'Este email ya está registrado' });

  const nuevo = new Administrador(req.body);
  nuevo.password = await nuevo.encrypPassword(password);
  const token = nuevo.crearToken();

  await sendMailToRegister(email, token);
  await nuevo.save();

  res.status(200).json({ msg: 'Revisa tu correo electrónico para confirmar tu cuenta' });
};

const confirmarMail = async (req, res) => {
  const { token } = req.params;
  const adminBDD = await Administrador.findOne({ token });
  if (!adminBDD) return res.status(404).json({ msg: 'Token inválido' });

  adminBDD.token = null;
  adminBDD.confirmEmail = true;
  await adminBDD.save();

  res.status(200).json({ msg: 'Cuenta confirmada correctamente' });
};

const recuperarPassword = async (req, res) => {
  const { email } = req.body;
  if (!email || String(email).trim() === '') {
    return res.status(400).json({ msg: 'Debes llenar todos los campos' });
  }

  const adminBDD = await Administrador.findOne({ email });
  if (!adminBDD) return res.status(404).json({ msg: 'El administrador no se encuentra registrado' });

  const token = adminBDD.crearToken();
  adminBDD.token = token;

  await sendMailToRecoveryPassword(email, token);
  await adminBDD.save();

  res.status(200).json({ msg: 'Revisa tu correo electrónico para reestablecer tu cuenta' });
};

const comprobarTokenPasword = async (req, res) => {
  const { token } = req.params;
  const adminBDD = await Administrador.findOne({ token });
  if (adminBDD?.token !== token) {
    return res.status(404).json({ msg: 'Token no válido' });
  }
  res.status(200).json({ msg: 'Token confirmado, ya puedes crear tu nuevo password' });
};

const crearNuevoPassword = async (req, res) => {
  const { password, confirmpassword } = req.body;
  if (!password || !confirmpassword) {
    return res.status(400).json({ msg: 'Debes llenar todos los campos' });
  }
  if (password !== confirmpassword) {
    return res.status(400).json({ msg: 'Los passwords no coinciden' });
  }

  const adminBDD = await Administrador.findOne({ token: req.params.token });
  if (adminBDD?.token !== req.params.token) {
    return res.status(404).json({ msg: 'Token no válido' });
  }

  adminBDD.token = null;
  adminBDD.password = await adminBDD.encrypPassword(password);
  await adminBDD.save();

  res.status(200).json({ msg: 'Ya puedes iniciar sesión con tu nuevo password' });
};

/* ============================
   Login
============================ */
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ msg: 'Debes llenar todos los campos' });
  }

  const adminBDD = await Administrador.findOne({ email }).select('-__v -token -createdAt -updatedAt');
  if (!adminBDD) return res.status(404).json({ msg: 'El usuario no está registrado' });
  if (!adminBDD.confirmEmail) {
    return res.status(403).json({ msg: 'Debe confirmar su cuenta antes de iniciar sesión' });
  }

  const ok = await adminBDD.matchPassword(password);
  if (!ok) return res.status(401).json({ msg: 'El password es incorrecto' });

  const { nombre, apellido, telefono, _id, rol } = adminBDD;
  const token = crearTokenJWT(_id, rol);

  res.status(200).json({ token, rol, nombre, apellido, telefono, _id, email: adminBDD.email });
};

/* ============================
   Perfil (protegido)
============================ */
const perfil = (req, res) => {
  const { token, confirmEmail, createdAt, updatedAt, __v, password, ...datosPerfil } = req.adminBDD;
  res.status(200).json(datosPerfil);
};

/* ============================
   Actualizar password (protegido)
============================ */
const actualizarPassword = async (req, res) => {
  try {
    const adminBDD = await Administrador.findById(req.adminBDD._id);
    if (!adminBDD) return res.status(404).json({ msg: 'Administrador no encontrado' });

    const verificarPassword = await adminBDD.matchPassword(req.body.passwordactual);
    if (!verificarPassword) return res.status(400).json({ msg: 'El password actual no es correcto' });

    adminBDD.password = await adminBDD.encrypPassword(req.body.passwordnuevo);
    await adminBDD.save();

    res.status(200).json({ msg: 'Password actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ msg: 'Error al actualizar el password' });
  }
};

/* ============================
   Actualizar perfil (protegido, con ID)
============================ */
const actualizarPerfil = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, telefono, email } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'Lo sentimos, el ID no es válido' });
  }
  if ([nombre, apellido, telefono, email].some(v => !v || String(v).trim() === '')) {
    return res.status(400).json({ msg: 'Lo sentimos, debes llenar todos los campos' });
  }

  const errorNombre = validarNombre(nombre);      if (errorNombre) return res.status(400).json({ msg: errorNombre });
  const errorTelefono = validarTelefono(telefono); if (errorTelefono) return res.status(400).json({ msg: errorTelefono });

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

/* ============================
   Listado + CRUD básico
============================ */
const verAdministradores = async (req, res) => {
  try {
    const admins = await Administrador.find().lean();
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ msg: 'Error al obtener los administradores' });
  }
};

const actualizarAdministrador = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'ID no válido' });
  }

  try {
    const admin = await Administrador.findById(id);
    if (!admin) return res.status(404).json({ msg: 'Administrador no encontrado' });

    const { nombre, apellido, email, password, telefono, status, rol } = req.body;

    if (nombre) {
      const e1 = validarNombre(nombre); if (e1) return res.status(400).json({ msg: e1 });
      admin.nombre = nombre;
    }
    if (telefono !== undefined) {
      const e2 = validarTelefono(telefono); if (e2) return res.status(400).json({ msg: e2 });
      admin.telefono = telefono;
    }
    if (apellido) admin.apellido = apellido;

    if (email && email !== admin.email) {
      const dup = await Administrador.findOne({ email });
      if (dup) return res.status(400).json({ msg: 'El email ya se encuentra registrado' });
      admin.email = email;
    }

    if (password) admin.password = await admin.encrypPassword(password);
    if (typeof status === 'boolean') admin.status = status;
    if (rol) admin.rol = rol; // solo si tu modelo/negocio lo permite

    const actualizado = await admin.save();
    res.status(200).json(actualizado);
  } catch (error) {
    res.status(500).json({ msg: 'Error al actualizar administrador' });
  }
};

const eliminarAdministrador = async (req, res) => {
  const { id } = req.params;
  try {
    const admin = await Administrador.findById(id);
    if (!admin) return res.status(404).json({ msg: 'Administrador no encontrado' });
    await admin.deleteOne();
    res.status(200).json({ msg: 'Administrador eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ msg: 'Error al eliminar administrador' });
  }
};

/* ============================
   Foto de perfil (Cloudinary)
============================ */
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
      // Si había una foto previa, destruir en Cloudinary (best-effort)
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

/* ============================
   Exports
============================ */
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
  actualizarFotoPerfil,
  eliminarFotoPerfil
};
