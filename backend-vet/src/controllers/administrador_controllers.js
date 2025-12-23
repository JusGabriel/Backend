// src/controllers/administrador_controllers.js
import Administrador from '../models/Administrador.js';
import { sendMailToRegister, sendMailToRecoveryPassword } from '../config/nodemailer.js';
import { crearTokenJWT } from '../middleware/JWT.js';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary.js';
import bcrypt from 'bcryptjs'; // ✅ Usar bcryptjs en lugar de bcrypt

// --- Validaciones internas ---
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

// --- REGISTRO / LOGIN / PERFIL ---
const registro = async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono } = req.body;

    // Validaciones
    if (!nombre || !apellido || !email || !password || !telefono) {
      return res.status(400).json({ msg: 'Todos los campos son obligatorios' });
    }

    const errorNombre = validarNombre(nombre);
    if (errorNombre) return res.status(400).json({ msg: errorNombre });

    const errorTelefono = validarTelefono(telefono);
    if (errorTelefono) return res.status(400).json({ msg: errorTelefono });

    const existeAdmin = await Administrador.findOne({ email });
    if (existeAdmin) return res.status(400).json({ msg: 'El email ya está registrado' });

    // Hashear password con bcryptjs
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = new Administrador({
      nombre,
      apellido,
      email,
      password: passwordHash,
      telefono
    });

    await admin.save();
    await sendMailToRegister(admin.email, admin.nombre);

    res.status(201).json({ msg: 'Administrador registrado', admin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al registrar administrador', error: error.message });
  }
};

const confirmarMail = async (req, res) => { /* ...igual que tú... */ };
const recuperarPassword = async (req, res) => { /* ... */ };
const comprobarTokenPasword = async (req, res) => { /* ... */ };
const crearNuevoPassword = async (req, res) => { /* ... */ };

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ msg: 'Email y password son obligatorios' });

    const adminBDD = await Administrador.findOne({ email });
    if (!adminBDD) return res.status(404).json({ msg: 'Administrador no encontrado' });

    const isMatch = await bcrypt.compare(password, adminBDD.password);
    if (!isMatch) return res.status(400).json({ msg: 'Password incorrecto' });

    const token = crearTokenJWT({ id: adminBDD._id });
    res.status(200).json({ token, admin: adminBDD });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al iniciar sesión', error: error.message });
  }
};

const verAdministradores = async (req, res) => { /* ... */ };
const actualizarAdministrador = async (req, res) => { /* ... */ };
const eliminarAdministrador = async (req, res) => { /* ... */ };

const perfil = (req, res) => {
  const { token, confirmEmail, createdAt, updatedAt, __v, password, ...datosPerfil } = req.adminBDD;
  res.status(200).json(datosPerfil);
};

const actualizarPassword = async (req, res) => { /* ... */ };

// --- Actualizar perfil ---
const actualizarPerfil = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, telefono, email } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ msg: 'ID no válido' });
  if (Object.values(req.body).includes('')) return res.status(400).json({ msg: 'Debes llenar todos los campos' });

  const errorNombre = validarNombre(nombre);
  if (errorNombre) return res.status(400).json({ msg: errorNombre });

  const errorTelefono = validarTelefono(telefono);
  if (errorTelefono) return res.status(400).json({ msg: errorTelefono });

  const adminBDD = await Administrador.findById(id);
  if (!adminBDD) return res.status(404).json({ msg: `No existe el administrador con ID ${id}` });

  if (adminBDD.email !== email) {
    const adminBDDMail = await Administrador.findOne({ email });
    if (adminBDDMail) return res.status(400).json({ msg: 'El email ya se encuentra registrado' });
  }

  adminBDD.nombre = nombre ?? adminBDD.nombre;
  adminBDD.apellido = apellido ?? adminBDD.apellido;
  adminBDD.telefono = telefono ?? adminBDD.telefono;
  adminBDD.email = email ?? adminBDD.email;

  await adminBDD.save();
  res.status(200).json(adminBDD);
};

// --- Actualizar foto de perfil ---
const actualizarFotoPerfil = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ msg: 'ID no válido' });

  const adminBDD = await Administrador.findById(id);
  if (!adminBDD) return res.status(404).json({ msg: 'Administrador no encontrado' });

  try {
    if (req.file?.path) {
      if (adminBDD.fotoPublicId) await cloudinary.uploader.destroy(adminBDD.fotoPublicId);
      adminBDD.foto = req.file.path;
      adminBDD.fotoPublicId = req.file.filename;
      await adminBDD.save();
      return res.status(200).json({ msg: 'Foto actualizada', admin: adminBDD });
    }

    if (typeof req.body.foto === 'string' && req.body.foto.trim()) {
      if (adminBDD.fotoPublicId) await cloudinary.uploader.destroy(adminBDD.fotoPublicId);
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

// --- Eliminar foto de perfil ---
const eliminarFotoPerfil = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ msg: 'ID no válido' });

  const adminBDD = await Administrador.findById(id);
  if (!adminBDD) return res.status(404).json({ msg: 'Administrador no encontrado' });

  try {
    if (adminBDD.fotoPublicId) await cloudinary.uploader.destroy(adminBDD.fotoPublicId);
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
