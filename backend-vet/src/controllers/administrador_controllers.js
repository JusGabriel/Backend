// src/controllers/administrador_controllers.js
import Administrador from '../models/Administrador.js';
import { sendMailToRegister, sendMailToRecoveryPassword } from '../config/nodemailer.js';
import { crearTokenJWT } from '../middleware/JWT.js';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/* ---------------- Validaciones ---------------- */
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
function validarEmail(email) {
  if (!email || typeof email !== 'string') return 'El email es obligatorio';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) return 'El email no tiene un formato válido';
  return null;
}
function validarPassword(password) {
  if (!password || typeof password !== 'string' || password.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  return null;
}

/* ----------------- Helpers ----------------- */
const generarTokenAleatorio = (size = 32) => crypto.randomBytes(size).toString('hex');

/* ----------------- CONTROLADORES ----------------- */

/**
 * Registro de administrador
 * Campos esperados: nombre, apellido, telefono, email, password
 */
const registro = async (req, res) => {
  try {
    const { nombre, apellido, telefono, email, password } = req.body;

    // Validaciones básicas
    if ([nombre, apellido, telefono, email, password].some(v => v === undefined)) {
      return res.status(400).json({ msg: 'Faltan campos obligatorios' });
    }
    const errNombre = validarNombre(nombre);
    if (errNombre) return res.status(400).json({ msg: errNombre });
    const errTelefono = validarTelefono(telefono);
    if (errTelefono) return res.status(400).json({ msg: errTelefono });
    const errEmail = validarEmail(email);
    if (errEmail) return res.status(400).json({ msg: errEmail });
    const errPassword = validarPassword(password);
    if (errPassword) return res.status(400).json({ msg: errPassword });

    // Verificar duplicados
    const existe = await Administrador.findOne({ email: email.toLowerCase() });
    if (existe) return res.status(400).json({ msg: 'El email ya se encuentra registrado' });

    // Crear administrador
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const tokenConfirm = generarTokenAleatorio(16);
    const nuevoAdmin = new Administrador({
      nombre: nombre.trim(),
      apellido: apellido?.trim() ?? '',
      telefono: telefono.toString(),
      email: email.toLowerCase().trim(),
      password: hashed,
      token: tokenConfirm,
      confirmEmail: false
    });

    await nuevoAdmin.save();

    // Intentar enviar mail de confirmación (ajusta la firma de sendMailToRegister si tu implementación es distinta)
    try {
      // sendMailToRegister puede recibir el admin completo o email+token según tu implementación.
      // Ajusta acorde a tu función.
      await sendMailToRegister({ email: nuevoAdmin.email, nombre: nuevoAdmin.nombre, token: tokenConfirm });
    } catch (mailError) {
      console.warn('No se pudo enviar el email de registro:', mailError?.message ?? mailError);
      // no bloqueamos el registro por fallo en correo
    }

    res.status(201).json({ msg: 'Administrador creado. Revisa tu correo para confirmar la cuenta.' });
  } catch (error) {
    console.error('registro error:', error);
    res.status(500).json({ msg: 'Error en el registro', error: error.message });
  }
};

/**
 * Confirmar email mediante token (req.params.token)
 */
const confirmarMail = async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json({ msg: 'Token inválido' });

  try {
    const admin = await Administrador.findOne({ token });
    if (!admin) return res.status(404).json({ msg: 'Token no válido o administrador no encontrado' });

    admin.confirmEmail = true;
    admin.token = null;
    await admin.save();

    res.status(200).json({ msg: 'Cuenta confirmada correctamente' });
  } catch (error) {
    console.error('confirmarMail error:', error);
    res.status(500).json({ msg: 'Error al confirmar cuenta', error: error.message });
  }
};

/**
 * Iniciar recuperación de contraseña (por email)
 * req.body.email
 */
const recuperarPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ msg: 'El email es obligatorio' });

  try {
    const admin = await Administrador.findOne({ email: email.toLowerCase().trim() });
    if (!admin) return res.status(404).json({ msg: 'No existe administrador con ese email' });

    const tokenRecovery = generarTokenAleatorio(20);
    admin.tokenRecovery = tokenRecovery;
    admin.tokenRecoveryExpiration = Date.now() + 1000 * 60 * 60; // 1 hora de validez (opcional)
    await admin.save();

    try {
      await sendMailToRecoveryPassword({ email: admin.email, nombre: admin.nombre, token: tokenRecovery });
    } catch (mailErr) {
      console.warn('No se pudo enviar email de recuperación:', mailErr?.message ?? mailErr);
    }

    res.status(200).json({ msg: 'Se ha enviado un correo con instrucciones para recuperar la contraseña' });
  } catch (error) {
    console.error('recuperarPassword error:', error);
    res.status(500).json({ msg: 'Error al solicitar recuperación de contraseña', error: error.message });
  }
};

/**
 * Comprobar token de recuperación (req.params.token)
 */
const comprobarTokenPasword = async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json({ msg: 'Token es obligatorio' });

  try {
    const admin = await Administrador.findOne({ tokenRecovery: token });
    if (!admin) return res.status(404).json({ msg: 'Token no válido' });

    // Si usas expiración:
    if (admin.tokenRecoveryExpiration && admin.tokenRecoveryExpiration < Date.now()) {
      return res.status(400).json({ msg: 'Token expirado' });
    }

    res.status(200).json({ msg: 'Token válido' });
  } catch (error) {
    console.error('comprobarTokenPasword error:', error);
    res.status(500).json({ msg: 'Error al comprobar token', error: error.message });
  }
};

/**
 * Crear nueva contraseña usando token de recuperación
 * req.params.token, req.body.password
 */
const crearNuevoPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!token) return res.status(400).json({ msg: 'Token es obligatorio' });
  const errPass = validarPassword(password);
  if (errPass) return res.status(400).json({ msg: errPass });

  try {
    const admin = await Administrador.findOne({ tokenRecovery: token });
    if (!admin) return res.status(404).json({ msg: 'Token no válido' });

    if (admin.tokenRecoveryExpiration && admin.tokenRecoveryExpiration < Date.now()) {
      return res.status(400).json({ msg: 'Token expirado' });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(password, salt);
    admin.tokenRecovery = null;
    admin.tokenRecoveryExpiration = null;
    await admin.save();

    res.status(200).json({ msg: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('crearNuevoPassword error:', error);
    res.status(500).json({ msg: 'Error al crear nueva contraseña', error: error.message });
  }
};

/**
 * Login
 * req.body: email, password
 */
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ msg: 'Email y contraseña son obligatorios' });

  try {
    const admin = await Administrador.findOne({ email: email.toLowerCase().trim() });
    if (!admin) return res.status(404).json({ msg: 'No existe ningún administrador con ese email' });

    const igual = await bcrypt.compare(password, admin.password);
    if (!igual) return res.status(401).json({ msg: 'Contraseña incorrecta' });

    // (Opcional) verificar confirmEmail
    if (!admin.confirmEmail) {
      return res.status(401).json({ msg: 'Debe confirmar su correo antes de iniciar sesión' });
    }

    // Crear token JWT (ajusta crearTokenJWT según tu implementación)
    const token = crearTokenJWT({ id: admin._id });

    // No devolver contraseña
    const { password: _pw, token: _token, tokenRecovery, tokenRecoveryExpiration, ...rest } = admin.toObject();

    res.status(200).json({ token, admin: rest });
  } catch (error) {
    console.error('login error:', error);
    res.status(500).json({ msg: 'Error en el proceso de login', error: error.message });
  }
};

/**
 * Ver todos los administradores
 */
const verAdministradores = async (req, res) => {
  try {
    const admins = await Administrador.find().select('-password -tokenRecovery -tokenRecoveryExpiration -token');
    res.status(200).json(admins);
  } catch (error) {
    console.error('verAdministradores error:', error);
    res.status(500).json({ msg: 'Error al obtener administradores', error: error.message });
  }
};

/**
 * Actualizar administrador (por id) - uso administrativo
 * req.params.id, req.body {nombre, apellido, telefono, email}
 */
const actualizarAdministrador = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, telefono, email } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'ID no válido' });
  }
  if (Object.values(req.body).includes('')) {
    return res.status(400).json({ msg: 'Debes llenar todos los campos' });
  }

  const errNombre = validarNombre(nombre);
  if (errNombre) return res.status(400).json({ msg: errNombre });
  const errTelefono = validarTelefono(telefono);
  if (errTelefono) return res.status(400).json({ msg: errTelefono });
  const errEmail = validarEmail(email);
  if (errEmail) return res.status(400).json({ msg: errEmail });

  try {
    const adminBDD = await Administrador.findById(id);
    if (!adminBDD) return res.status(404).json({ msg: `No existe administrador con ID ${id}` });

    if (adminBDD.email !== email.toLowerCase()) {
      const existeEmail = await Administrador.findOne({ email: email.toLowerCase() });
      if (existeEmail) return res.status(400).json({ msg: 'El email ya se encuentra registrado' });
    }

    adminBDD.nombre = nombre ?? adminBDD.nombre;
    adminBDD.apellido = apellido ?? adminBDD.apellido;
    adminBDD.telefono = telefono ?? adminBDD.telefono;
    adminBDD.email = email?.toLowerCase() ?? adminBDD.email;

    await adminBDD.save();
    const { password: _pw, tokenRecovery, tokenRecoveryExpiration, token, ...rest } = adminBDD.toObject();

    res.status(200).json(rest);
  } catch (error) {
    console.error('actualizarAdministrador error:', error);
    res.status(500).json({ msg: 'Error al actualizar administrador', error: error.message });
  }
};

/**
 * Eliminar administrador por id
 */
const eliminarAdministrador = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ msg: 'ID no válido' });

  try {
    const adminBDD = await Administrador.findById(id);
    if (!adminBDD) return res.status(404).json({ msg: 'Administrador no encontrado' });

    // Eliminar foto en Cloudinary si existe
    if (adminBDD.fotoPublicId) {
      try { await cloudinary.uploader.destroy(adminBDD.fotoPublicId); } catch (err) { console.warn('cloudinary destroy:', err?.message ?? err); }
    }

    await adminBDD.deleteOne();
    res.status(200).json({ msg: 'Administrador eliminado' });
  } catch (error) {
    console.error('eliminarAdministrador error:', error);
    res.status(500).json({ msg: 'Error al eliminar administrador', error: error.message });
  }
};

/**
 * Perfil - devuelve datos del admin extraídos por middleware (req.adminBDD)
 * Asegúrate de tener middleware que ponga req.adminBDD
 */
const perfil = (req, res) => {
  try {
    const { token, confirmEmail, createdAt, updatedAt, __v, password, ...datosPerfil } = req.adminBDD || {};
    res.status(200).json(datosPerfil);
  } catch (error) {
    console.error('perfil error:', error);
    res.status(500).json({ msg: 'Error al obtener perfil', error: error.message });
  }
};

/**
 * Actualizar contraseña del administrador autenticado
 * req.adminBDD (middleware), req.body { currentPassword, newPassword }
 */
const actualizarPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = req.adminBDD;
    if (!admin) return res.status(401).json({ msg: 'No autorizado' });

    if (!currentPassword || !newPassword) return res.status(400).json({ msg: 'Faltan campos' });

    const igual = await bcrypt.compare(currentPassword, admin.password);
    if (!igual) return res.status(401).json({ msg: 'Contraseña actual incorrecta' });

    const errPass = validarPassword(newPassword);
    if (errPass) return res.status(400).json({ msg: errPass });

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    res.status(200).json({ msg: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('actualizarPassword error:', error);
    res.status(500).json({ msg: 'Error al actualizar contraseña', error: error.message });
  }
};

/**
 * --- Actualizar perfil (propio o por id) ---
 * Este es similar al actualizarAdministrador pero pensado para que el admin
 * pueda actualizar su propio perfil pasando el id por params.
 */
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

  try {
    const adminBDD = await Administrador.findById(id);
    if (!adminBDD) return res.status(404).json({ msg: `Lo sentimos, no existe el administrador con ID ${id}` });

    if (adminBDD.email !== email?.toLowerCase()) {
      const adminBDDMail = await Administrador.findOne({ email: email?.toLowerCase() });
      if (adminBDDMail) return res.status(400).json({ msg: 'Lo sentimos, el email ya se encuentra registrado' });
    }

    adminBDD.nombre   = nombre   ?? adminBDD.nombre;
    adminBDD.apellido = apellido ?? adminBDD.apellido;
    adminBDD.telefono = telefono ?? adminBDD.telefono;
    adminBDD.email    = email?.toLowerCase() ?? adminBDD.email;

    await adminBDD.save();
    res.status(200).json(adminBDD);
  } catch (error) {
    console.error('actualizarPerfil error:', error);
    res.status(500).json({ msg: 'Error al actualizar perfil', error: error.message });
  }
};

/**
 * --- Actualizar SOLO la foto de perfil ---
 * El endpoint debe usar Multer (req.file) o recibir body.foto (URL).
 */
const actualizarFotoPerfil = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'ID no válido' });
  }

  try {
    const adminBDD = await Administrador.findById(id);
    if (!adminBDD) return res.status(404).json({ msg: 'Administrador no encontrado' });

    // Si viene archivo (Multer + CloudinaryStorage)
    if (req.file?.path) {
      // Si había una foto previa, destruir en Cloudinary
      if (adminBDD.fotoPublicId) {
        try { await cloudinary.uploader.destroy(adminBDD.fotoPublicId); } catch (err) { /* ignore */ }
      }

      adminBDD.foto = req.file.path;       // secure_url
      adminBDD.fotoPublicId = req.file.filename; // public_id (multer-storage-cloudinary)
      await adminBDD.save();

      return res.status(200).json({ msg: 'Foto actualizada', admin: adminBDD });
    }

    // Si viene URL (fallback)
    if (typeof req.body.foto === 'string' && req.body.foto.trim()) {
      if (adminBDD.fotoPublicId) {
        try { await cloudinary.uploader.destroy(adminBDD.fotoPublicId); } catch (err) { /* ignore */ }
      }
      adminBDD.foto = req.body.foto;
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

/**
 * --- Eliminar foto de perfil ---
 */
const eliminarFotoPerfil = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'ID no válido' });
  }

  try {
    const adminBDD = await Administrador.findById(id);
    if (!adminBDD) return res.status(404).json({ msg: 'Administrador no encontrado' });

    if (adminBDD.fotoPublicId) {
      try { await cloudinary.uploader.destroy(adminBDD.fotoPublicId); } catch (err) { /* ignore */ }
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
  actualizarFotoPerfil,
  eliminarFotoPerfil
};
