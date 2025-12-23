
// src/controllers/administrador_controllers.js
import Administrador from '../models/Administrador.js';
import { sendMailToRegister, sendMailToRecoveryPassword } from '../config/nodemailer.js';
import { crearTokenJWT } from '../middleware/JWT.js';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary.js';

/* ...tus funciones originales (registro, confirmarMail, recuperarPassword, comprobarTokenPasword,
   crearNuevoPassword, login, verAdministradores, actualizarAdministrador, eliminarAdministrador,
   perfil, actualizarPassword, actualizarPerfil) permanecen igual... */

// 👇 NUEVO: actualizar SOLO la foto de perfil del Administrador
const actualizarFotoPerfil = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'ID no válido' });
  }

  const adminBDD = await Administrador.findById(id);
  if (!adminBDD) return res.status(404).json({ msg: 'Administrador no encontrado' });

  // (Opcional) Bloquear edición de foto de otro usuario:
  // if (req.adminBDD?._id?.toString() !== id.toString()) {
  //   return res.status(403).json({ msg: 'No autorizado' });
  // }

  try {
    if (req.file?.path) {
      // Si hay foto previa en Cloudinary, destruir
      if (adminBDD.fotoPublicId) {
        try { await cloudinary.uploader.destroy(adminBDD.fotoPublicId); } catch {}
      }
      adminBDD.foto         = req.file.path;     // secure_url
      adminBDD.fotoPublicId = req.file.filename; // public_id
      await adminBDD.save();
      return res.status(200).json({ msg: 'Foto actualizada', admin: adminBDD });
    }

    // URL directa (fallback)
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

// 👇 NUEVO: eliminar foto de perfil
const eliminarFotoPerfil = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'ID no válido' });
  }

  const adminBDD = await Administrador.findById(id);
  if (!adminBDD) return res.status(404).json({ msg: 'Administrador no encontrado' });

  // if (req.adminBDD?._id?.toString() !== id.toString()) {
  //   return res.status(403).json({ msg: 'No autorizado' });
  // }

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
  // ...exports que ya tenías...
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

  // 👇 nuevos
  actualizarFotoPerfil,
  eliminarFotoPerfil,
};
