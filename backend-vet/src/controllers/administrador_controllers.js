// src/controllers/administrador_controllers.js
import Administrador from '../models/Administrador.js';
import { sendMailToRegister, sendMailToRecoveryPassword } from '../config/nodemailer.js';
import { crearTokenJWT } from '../middleware/JWT.js';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/* ------------------ Validaciones internas ------------------ */
function validarNombre(nombre) {
  if (!nombre || typeof nombre !== 'string' || !/^[a-zA-Z\s]+$/.test(nombre.trim())) {
    return 'El nombre es obligatorio y solo puede contener letras y espacios';
  }
  if (nombre.trim().length < 2 || nombre.trim().length > 60) {
    return 'El nombre debe tener entre 2 y 60 caracteres';
  }
  return null;
}
function validarTelefono(telefono) {
  if (!telefono || (typeof telefono !== 'string' && typeof telefono !== 'number')) {
    return 'El teléfono es obligatorio y debe ser un número';
  }
  const telefonoStr = telefono.toString().trim();
  if (!/^\d{7,15}$/.test(telefonoStr)) {
    return 'El teléfono debe contener solo números y tener entre 7 y 15 dígitos';
  }
  return null;
}

/* ------------------ Helpers ------------------ */
const sanitizeAdminResponse = (adminDoc) => {
  if (!adminDoc) return null;
  const admin = adminDoc.toObject ? adminDoc.toObject() : { ...adminDoc };
  delete admin.password;
  delete admin.token;
  delete admin.resetPasswordToken;
  delete admin.resetPasswordExpires;
  delete admin.__v;
  return admin;
};

/* ------------------ REGISTRO ------------------ */
const registro = async (req, res) => {
  try {
    const { nombre, apellido, email, telefono, password } = req.body;

    if (!nombre || !email || !telefono || !password) {
      return res.status(400).json({ msg: 'Todos los campos son obligatorios' });
    }

    const errorNombre = validarNombre(nombre);
    if (errorNombre) return res.status(400).json({ msg: errorNombre });

    const errorTelefono = validarTelefono(telefono);
    if (errorTelefono) return res.status(400).json({ msg: errorTelefono });

    const existe = await Administrador.findOne({ email: email.toLowerCase().trim() });
    if (existe) return res.status(400).json({ msg: 'El email ya se encuentra registrado' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // Token de confirmación (hex)
    const tokenConfirm = crypto.randomBytes(20).toString('hex');

    const nuevoAdmin = new Administrador({
      nombre: nombre.trim(),
      apellido: apellido?.trim() ?? '',
      email: email.toLowerCase().trim(),
      telefono: telefono.toString().trim(),
      password: hashed,
      token: tokenConfirm,
      confirmEmail: false,
      foto: null,
      fotoPublicId: null
    });

    await nuevoAdmin.save();

    // Enviar mail de confirmación (ajusta la firma si tu sendMailToRegister espera otros params)
    try {
      await sendMailToRegister(nuevoAdmin.email, tokenConfirm, nuevoAdmin.nombre);
    } catch (mailError) {
      console.error('Error enviando email de registro:', mailError);
      // No abortamos el registro por fallo en mail, pero informamos
    }

    res.status(201).json({ msg: 'Administrador creado. Revisa tu email para confirmar la cuenta.' });
  } catch (error) {
    console.error('registro error:', error);
    res.status(500).json({ msg: 'Error interno al registrar administrador', error: error.message });
  }
};

/* ------------------ CONFIRMAR MAIL ------------------ */
const confirmarMail = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ msg: 'Token inválido' });

    const admin = await Administrador.findOne({ token });
    if (!admin) return res.status(404).json({ msg: 'Token no válido o administrador no encontrado' });

    admin.token = null;
    admin.confirmEmail = true;
    await admin.save();

    res.status(200).json({ msg: 'Correo confirmado correctamente' });
  } catch (error) {
    console.error('confirmarMail error:', error);
    res.status(500).json({ msg: 'Error confirmando correo', error: error.message });
  }
};

/* ------------------ RECUPERAR PASSWORD (enviar mail) ------------------ */
const recuperarPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'El email es obligatorio' });

    const admin = await Administrador.findOne({ email: email.toLowerCase().trim() });
    if (!admin) return res.status(404).json({ msg: 'No existe administrador con ese email' });

    // Token temporal de recuperación
    const resetToken = crypto.randomBytes(20).toString('hex');
    admin.resetPasswordToken = resetToken;
    admin.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await admin.save();

    try {
      await sendMailToRecoveryPassword(admin.email, resetToken, admin.nombre);
    } catch (mailError) {
      console.error('Error enviando mail de recuperación:', mailError);
      // Seguimos, pero informamos
    }

    res.status(200).json({ msg: 'Se envió un enlace de recuperación al email indicado' });
  } catch (error) {
    console.error('recuperarPassword error:', error);
    res.status(500).json({ msg: 'Error al solicitar recuperación de contraseña', error: error.message });
  }
};

/* ------------------ COMPROBAR TOKEN DE RECUPERACIÓN ------------------ */
const comprobarTokenPasword = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ msg: 'Token inválido' });

    const admin = await Administrador.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!admin) return res.status(404).json({ msg: 'Token inválido o expirado' });

    res.status(200).json({ msg: 'Token válido' });
  } catch (error) {
    console.error('comprobarTokenPasword error:', error);
    res.status(500).json({ msg: 'Error comprobando token', error: error.message });
  }
};

/* ------------------ CREAR NUEVA CONTRASEÑA (tras comprobar token) ------------------ */
const crearNuevoPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!token || !password) return res.status(400).json({ msg: 'Faltan datos' });

    const admin = await Administrador.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!admin) return res.status(404).json({ msg: 'Token inválido o expirado' });

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(password, salt);
    admin.resetPasswordToken = null;
    admin.resetPasswordExpires = null;
    await admin.save();

    res.status(200).json({ msg: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('crearNuevoPassword error:', error);
    res.status(500).json({ msg: 'Error al crear nueva contraseña', error: error.message });
  }
};

/* ------------------ LOGIN ------------------ */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'Email y contraseña son obligatorios' });

    const admin = await Administrador.findOne({ email: email.toLowerCase().trim() });
    if (!admin) return res.status(404).json({ msg: 'Usuario no encontrado' });

    // Si implementas confirmEmail y quieres que confirme antes:
    // if (!admin.confirmEmail) return res.status(400).json({ msg: 'Confirma tu correo antes de iniciar sesión' });

    const passwordOk = await bcrypt.compare(password, admin.password ?? '');
    if (!passwordOk) return res.status(401).json({ msg: 'Contraseña incorrecta' });

    // Crear token JWT (usa tu función)
    const token = crearTokenJWT ? crearTokenJWT(admin._id) : null;

    const adminSafe = sanitizeAdminResponse(admin);
    res.status(200).json({ admin: adminSafe, token });
  } catch (error) {
    console.error('login error:', error);
    res.status(500).json({ msg: 'Error en login', error: error.message });
  }
};

/* ------------------ VER TODOS LOS ADMINISTRADORES ------------------ */
const verAdministradores = async (req, res) => {
  try {
    const admins = await Administrador.find().sort({ createdAt: -1 });
    const safe = admins.map(sanitizeAdminResponse);
    res.status(200).json(safe);
  } catch (error) {
    console.error('verAdministradores error:', error);
    res.status(500).json({ msg: 'Error obteniendo administradores', error: error.message });
  }
};

/* ------------------ ACTUALIZAR ADMINISTRADOR (por ID) ------------------ */
const actualizarAdministrador = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, telefono, email } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ msg: 'ID no válido' });
    }

    const adminBDD = await Administrador.findById(id);
    if (!adminBDD) return res.status(404).json({ msg: 'Administrador no encontrado' });

    if (Object.values(req.body).includes('')) {
      return res.status(400).json({ msg: 'Debes llenar todos los campos' });
    }

    const errorNombre = validarNombre(nombre);
    if (errorNombre) return res.status(400).json({ msg: errorNombre });

    const errorTelefono = validarTelefono(telefono);
    if (errorTelefono) return res.status(400).json({ msg: errorTelefono });

    if (adminBDD.email !== email) {
      const adminMail = await Administrador.findOne({ email: email.toLowerCase().trim() });
      if (adminMail) return res.status(400).json({ msg: 'El email ya se encuentra registrado' });
    }

    adminBDD.nombre = nombre ?? adminBDD.nombre;
    adminBDD.apellido = apellido ?? adminBDD.apellido;
    adminBDD.telefono = telefono ?? adminBDD.telefono;
    adminBDD.email = email ? email.toLowerCase().trim() : adminBDD.email;

    await adminBDD.save();
    res.status(200).json(sanitizeAdminResponse(adminBDD));
  } catch (error) {
    console.error('actualizarAdministrador error:', error);
    res.status(500).json({ msg: 'Error al actualizar administrador', error: error.message });
  }
};

/* ------------------ ELIMINAR ADMINISTRADOR ------------------ */
const eliminarAdministrador = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ msg: 'ID no válido' });

    const adminBDD = await Administrador.findById(id);
    if (!adminBDD) return res.status(404).json({ msg: 'Administrador no encontrado' });

    // si tiene foto en cloudinary la borramos
    if (adminBDD.fotoPublicId) {
      try { await cloudinary.uploader.destroy(adminBDD.fotoPublicId); } catch (err) { /* no bloquear */ }
    }

    await Administrador.findByIdAndDelete(id);
    res.status(200).json({ msg: 'Administrador eliminado correctamente' });
  } catch (error) {
    console.error('eliminarAdministrador error:', error);
    res.status(500).json({ msg: 'Error al eliminar administrador', error: error.message });
  }
};

/* ------------------ PERFIL (ya lo tenías) ------------------ */
const perfil = (req, res) => {
  const { token, confirmEmail, createdAt, updatedAt, __v, password, ...datosPerfil } = req.adminBDD;
  res.status(200).json(datosPerfil);
};

/* ------------------ ACTUALIZAR PASSWORD (usuario autenticado) ------------------ */
const actualizarPassword = async (req, res) => {
  try {
    const { id } = req.params; // puede ser req.adminBDD._id si lo quieres obligatorio por token
    const { currentPassword, newPassword } = req.body;
    if (!id || !currentPassword || !newPassword) return res.status(400).json({ msg: 'Faltan datos' });

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ msg: 'ID no válido' });

    const adminBDD = await Administrador.findById(id);
    if (!adminBDD) return res.status(404).json({ msg: 'Administrador no encontrado' });

    const ok = await bcrypt.compare(currentPassword, adminBDD.password ?? '');
    if (!ok) return res.status(401).json({ msg: 'Contraseña actual incorrecta' });

    const salt = await bcrypt.genSalt(10);
    adminBDD.password = await bcrypt.hash(newPassword, salt);
    await adminBDD.save();

    res.status(200).json({ msg: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('actualizarPassword error:', error);
    res.status(500).json({ msg: 'Error actualizando contraseña', error: error.message });
  }
};

/* ------------------ actualizarPerfil (tu bloque ya hecho) ------------------ */
const actualizarPerfil = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, telefono, email } = req.body;

  try {
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
      const adminBDDMail = await Administrador.findOne({ email: email.toLowerCase().trim() });
      if (adminBDDMail) return res.status(400).json({ msg: 'Lo sentimos, el email ya se encuentra registrado' });
    }

    adminBDD.nombre   = nombre   ?? adminBDD.nombre;
    adminBDD.apellido = apellido ?? adminBDD.apellido;
    adminBDD.telefono = telefono ?? adminBDD.telefono;
    adminBDD.email    = email ? email.toLowerCase().trim() : adminBDD.email;

    await adminBDD.save();
    res.status(200).json(sanitizeAdminResponse(adminBDD));
  } catch (error) {
    console.error('actualizarPerfil error:', error);
    res.status(500).json({ msg: 'Error actualizando perfil', error: error.message });
  }
};

/* ------------------ actualizarFotoPerfil (ya lo tenías) ------------------ */
const actualizarFotoPerfil = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ msg: 'ID no válido' });
    }

    const adminBDD = await Administrador.findById(id);
    if (!adminBDD) return res.status(404).json({ msg: 'Administrador no encontrado' });

    // Si viene archivo (Multer + CloudinaryStorage)
    if (req.file?.path) {
      // Si había una foto previa, destruir en Cloudinary
      if (adminBDD.fotoPublicId) {
        try { await cloudinary.uploader.destroy(adminBDD.fotoPublicId); } catch {}
      }

      adminBDD.foto         = req.file.path;     // secure_url
      adminBDD.fotoPublicId = req.file.filename; // public_id
      await adminBDD.save();

      return res.status(200).json({ msg: 'Foto actualizada', admin: sanitizeAdminResponse(adminBDD) });
    }

    // Si viene URL (fallback)
    if (typeof req.body.foto === 'string' && req.body.foto.trim()) {
      if (adminBDD.fotoPublicId) {
        try { await cloudinary.uploader.destroy(adminBDD.fotoPublicId); } catch {}
      }
      adminBDD.foto         = req.body.foto;
      adminBDD.fotoPublicId = null;
      await adminBDD.save();
      return res.status(200).json({ msg: 'Foto actualizada (URL)', admin: sanitizeAdminResponse(adminBDD) });
    }

    return res.status(400).json({ msg: 'No se envió archivo ni URL de foto' });
  } catch (error) {
    console.error('actualizarFotoPerfil error:', error);
    res.status(500).json({ msg: 'Error al actualizar foto de perfil', error: error.message });
  }
};

/* ------------------ eliminarFotoPerfil (ya lo tenías) ------------------ */
const eliminarFotoPerfil = async (req, res) => {
  const { id } = req.params;

  try {
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

      res.status(200).json({ msg: 'Foto eliminada', admin: sanitizeAdminResponse(adminBDD) });
    } catch (error) {
      console.error('eliminarFotoPerfil internal error:', error);
      res.status(500).json({ msg: 'Error eliminando foto', error: error.message });
    }
  } catch (error) {
    console.error('eliminarFotoPerfil error:', error);
    res.status(500).json({ msg: 'Error al eliminar foto de perfil', error: error.message });
  }
};

/* ------------------ EXPORTS ------------------ */
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
