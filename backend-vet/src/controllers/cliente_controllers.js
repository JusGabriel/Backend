import Cliente from '../models/Cliente.js';
import Emprendimiento from '../models/Emprendimiento.js'

import mongoose from 'mongoose';
import {
  sendMailToRegisterCliente,
  sendMailToRecoveryPasswordCliente,
} from '../config/nodemailerCliente.js';
import { crearTokenJWT } from '../middleware/JWT.js';

// Funciones internas para validación
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

const registro = async (req, res) => {
  const { nombre, telefono, email, password } = req.body;
  if (Object.values(req.body).includes('')) {
    return res.status(400).json({ msg: 'Todos los campos son obligatorios' });
  }

  // Validaciones
  const errorNombre = validarNombre(nombre);
  if (errorNombre) {
    return res.status(400).json({ msg: errorNombre });
  }

  const errorTelefono = validarTelefono(telefono);
  if (errorTelefono) {
    return res.status(400).json({ msg: errorTelefono });
  }

  const existe = await Cliente.findOne({ email });
  if (existe) {
    return res.status(400).json({ msg: 'Este email ya está registrado' });
  }
  const nuevoCliente = new Cliente(req.body);
  nuevoCliente.password = await nuevoCliente.encrypPassword(password);
  const token = nuevoCliente.crearToken();
  await sendMailToRegisterCliente(email, token);
  await nuevoCliente.save();
  res.status(200).json({ msg: 'Revisa tu correo electrónico para confirmar tu cuenta' });
};

const confirmarMail = async (req, res) => {
  const { token } = req.params;
  const clienteBDD = await Cliente.findOne({ token });
  if (!clienteBDD) return res.status(404).json({ msg: 'Token inválido' });
  clienteBDD.token = null;
  clienteBDD.confirmEmail = true;
  await clienteBDD.save();
  res.status(200).json({ msg: 'Cuenta confirmada correctamente' });
};

const recuperarPassword = async (req, res) => {
  const { email } = req.body;
  if (Object.values(req.body).includes('')) {
    return res.status(400).json({ msg: 'Debes llenar todos los campos' });
  }
  const clienteBDD = await Cliente.findOne({ email });
  if (!clienteBDD) {
    return res.status(404).json({ msg: 'El usuario no se encuentra registrado' });
  }
  const token = clienteBDD.crearToken();
  clienteBDD.token = token;
  await sendMailToRecoveryPasswordCliente(email, token);
  await clienteBDD.save();
  res.status(200).json({ msg: 'Revisa tu correo electrónico para reestablecer tu cuenta' });
};

const comprobarTokenPasword = async (req, res) => {
  const { token } = req.params;
  const clienteBDD = await Cliente.findOne({ token });
  if (clienteBDD?.token !== token) {
    return res.status(404).json({ msg: 'No se puede validar la cuenta' });
  }
  res.status(200).json({ msg: 'Token confirmado, ya puedes crear tu nuevo password' });
};

const crearNuevoPassword = async (req, res) => {
  const { password, confirmpassword } = req.body;
  if (Object.values(req.body).includes('')) {
    return res.status(400).json({ msg: 'Debes llenar todos los campos' });
  }
  if (password !== confirmpassword) {
    return res.status(400).json({ msg: 'Los passwords no coinciden' });
  }
  const clienteBDD = await Cliente.findOne({ token: req.params.token });
  if (clienteBDD?.token !== req.params.token) {
    return res.status(404).json({ msg: 'No se puede validar la cuenta' });
  }
  clienteBDD.token = null;
  clienteBDD.password = await clienteBDD.encrypPassword(password);
  await clienteBDD.save();
  res.status(200).json({ msg: 'Ya puedes iniciar sesión con tu nuevo password' });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (Object.values(req.body).includes('')) {
    return res.status(400).json({ msg: 'Debes llenar todos los campos' });
  }
  const clienteBDD = await Cliente.findOne({ email }).select('-__v -token -updatedAt -createdAt');
  if (!clienteBDD) {
    return res.status(404).json({ msg: 'El usuario no se encuentra registrado' });
  }
  if (!clienteBDD.confirmEmail) {
    return res.status(403).json({ msg: 'Debe verificar su cuenta' });
  }
  const verificarPassword = await clienteBDD.matchPassword(password);
  if (!verificarPassword) {
    return res.status(401).json({ msg: 'El password no es el correcto' });
  }
  const { nombre, apellido, direccion, telefono, _id, rol } = clienteBDD;
  const token = crearTokenJWT(clienteBDD._id, clienteBDD.rol);
  res.status(200).json({
    token,
    rol,
    nombre,
    apellido,
    direccion,
    telefono,
    _id,
    email: clienteBDD.email,
  });
};

const verClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find();
    res.status(200).json(clientes);
  } catch (error) {
    res.status(500).json({ msg: 'Error al obtener los clientes' });
  }
};

const actualizarCliente = async (req, res) => {
  const { id } = req.params;

  try {
    const cliente = await Cliente.findById(id);
    if (!cliente) return res.status(404).json({ msg: 'Cliente no encontrado' });

    const { nombre, apellido, email, password, telefono } = req.body;

    // Validaciones solo si se envía nombre o telefono para actualizar
    if (nombre) {
      const errorNombre = validarNombre(nombre);
      if (errorNombre) {
        return res.status(400).json({ msg: errorNombre });
      }
      cliente.nombre = nombre;
    }

    if (telefono) {
      const errorTelefono = validarTelefono(telefono);
      if (errorTelefono) {
        return res.status(400).json({ msg: errorTelefono });
      }
      cliente.telefono = telefono;
    }

    if (apellido) cliente.apellido = apellido;
    if (email) cliente.email = email;
    if (password) cliente.password = await cliente.encrypPassword(password);

    const actualizado = await cliente.save();
    res.status(200).json(actualizado);
  } catch (error) {
    res.status(500).json({ msg: 'Error al actualizar cliente' });
  }
};

const eliminarCliente = async (req, res) => {
  const { id } = req.params;
  try {
    const cliente = await Cliente.findById(id);
    if (!cliente) return res.status(404).json({ msg: 'Cliente no encontrado' });
    await cliente.deleteOne();
    res.status(200).json({ msg: 'Cliente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ msg: 'Error al eliminar cliente' });
  }
};

const perfil = (req, res) => {
  const { token, confirmEmail, createdAt, updatedAt, __v, password, ...datosPerfil } = req.clienteBDD;
  res.status(200).json(datosPerfil);
};

const actualizarPassword = async (req, res) => {
  try {
    const clienteBDD = await Cliente.findById(req.clienteBDD._id);
    if (!clienteBDD) {
      return res.status(404).json({ msg: 'No existe el cliente' });
    }
    const verificarPassword = await clienteBDD.matchPassword(req.body.passwordactual);
    if (!verificarPassword) {
      return res.status(400).json({ msg: 'El password actual no es correcto' });
    }
    clienteBDD.password = await clienteBDD.encrypPassword(req.body.passwordnuevo);
    await clienteBDD.save();
    res.status(200).json({ msg: 'Password actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ msg: 'Error al actualizar el password' });
  }
};

const actualizarPerfil = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, telefono, email } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'El ID no es válido' });
  }
  if (Object.values(req.body).includes('')) {
    return res.status(400).json({ msg: 'Debes llenar todos los campos' });
  }

  // Validaciones
  const errorNombre = validarNombre(nombre);
  if (errorNombre) {
    return res.status(400).json({ msg: errorNombre });
  }

  const errorTelefono = validarTelefono(telefono);
  if (errorTelefono) {
    return res.status(400).json({ msg: errorTelefono });
  }

  const clienteBDD = await Cliente.findById(id);
  if (!clienteBDD) {
    return res.status(404).json({ msg: `No existe el cliente con ID ${id}` });
  }
  if (clienteBDD.email !== email) {
    const clienteBDDMail = await Cliente.findOne({ email });
    if (clienteBDDMail) {
      return res.status(400).json({ msg: 'El email ya se encuentra registrado' });
    }
  }
  clienteBDD.nombre = nombre ?? clienteBDD.nombre;
  clienteBDD.apellido = apellido ?? clienteBDD.apellido;
  clienteBDD.telefono = telefono ?? clienteBDD.telefono;
  clienteBDD.email = email ?? clienteBDD.email;
  await clienteBDD.save();
  res.status(200).json(clienteBDD);
};
// Agregar emprendimiento a favoritos
export const agregarAFavoritos = async (req, res) => {
  const clienteId = req.clienteBDD?._id
  const { emprendimientoId } = req.body

  try {
    const cliente = await Cliente.findById(clienteId)
    const emprendimiento = await Emprendimiento.findById(emprendimientoId)

    if (!emprendimiento) {
      return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' })
    }

    // Verificar si ya está en favoritos
    if (cliente.favoritos.includes(emprendimientoId)) {
      return res.status(400).json({ mensaje: 'Ya está en favoritos' })
    }

    cliente.favoritos.push(emprendimientoId)
    await cliente.save()

    res.json({ mensaje: 'Agregado a favoritos correctamente' })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al agregar a favoritos', error: error.message })
  }
}

// Eliminar emprendimiento de favoritos
export const eliminarDeFavoritos = async (req, res) => {
  const clienteId = req.clienteBDD?._id
  const { emprendimientoId } = req.params

  try {
    const cliente = await Cliente.findById(clienteId)

    cliente.favoritos = cliente.favoritos.filter(id => id.toString() !== emprendimientoId)
    await cliente.save()

    res.json({ mensaje: 'Eliminado de favoritos correctamente' })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar de favoritos', error: error.message })
  }
}

// Obtener lista de favoritos
export const obtenerFavoritos = async (req, res) => {
  const clienteId = req.clienteBDD?._id

  try {
    const cliente = await Cliente.findById(clienteId)
      .populate({
        path: 'favoritos',
        populate: {
          path: 'emprendedor',
          select: 'nombre apellido'
        }
      })

    res.json(cliente.favoritos)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener favoritos', error: error.message })
  }
}

// -----------------------------
// NUEVO: constantes de validación de estado
// -----------------------------
const ESTADOS_PERMITIDOS = ['Activo', 'Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido']

// -----------------------------
// NUEVO: Cliente cambia su propio estado (con token)
// PUT /cliente/estado
// Body: { estado?: String, status?: Boolean }
// -----------------------------
export const actualizarMiEstado = async (req, res) => {
  const { estado, status } = req.body

  if (!estado && typeof status !== 'boolean') {
    return res.status(400).json({ msg: 'Debes enviar al menos uno: estado o status' })
  }

  if (estado && !ESTADOS_PERMITIDOS.includes(estado)) {
    return res.status(400).json({ msg: Estado inválido. Permitidos: ${ESTADOS_PERMITIDOS.join(', ')} })
  }

  try {
    const clienteId = req.clienteBDD?._id
    const cliente = await Cliente.findById(clienteId)
    if (!cliente) return res.status(404).json({ msg: 'Cliente no encontrado' })

    if (estado) cliente.estado_Emprendedor = estado
    if (typeof status === 'boolean') cliente.status = status

    // Regla opcional: si se suspende, también se inactiva
    // if (estado === 'Suspendido') cliente.status = false

    await cliente.save()
    return res.status(200).json({
      msg: 'Estado actualizado correctamente',
      estado_Emprendedor: cliente.estado_Emprendedor,
      status: cliente.status
    })
  } catch (error) {
    return res.status(500).json({ msg: 'Error al actualizar el estado', error: error.message })
  }
}

// -----------------------------
// NUEVO: Cliente cambia su estado SIN token
// PUT /cliente/estado/publico
// Body: { email: String, password: String, estado?: String, status?: Boolean }
// -----------------------------
export const actualizarEstadoSinToken = async (req, res) => {
  const { email, password, estado, status } = req.body

  // Validaciones básicas
  if (!email || !password) {
    return res.status(400).json({ msg: 'Email y password son obligatorios' })
  }
  if (!estado && typeof status !== 'boolean') {
    return res.status(400).json({ msg: 'Debes enviar al menos uno: estado o status' })
  }
  if (estado && !ESTADOS_PERMITIDOS.includes(estado)) {
    return res.status(400).json({ msg: Estado inválido. Permitidos: ${ESTADOS_PERMITIDOS.join(', ')} })
  }

  try {
    const cliente = await Cliente.findOne({ email })
    if (!cliente) return res.status(404).json({ msg: 'El usuario no se encuentra registrado' })

    // Si el cliente se registró con Google y no tiene password local
    if (!cliente.password) {
      return res.status(400).json({ msg: 'La cuenta no tiene password local. Inicia sesión para cambiar el estado.' })
    }

    const ok = await cliente.matchPassword(password)
    if (!ok) return res.status(401).json({ msg: 'El password no es correcto' })

    if (estado) cliente.estado_Emprendedor = estado
    if (typeof status === 'boolean') cliente.status = status

    await cliente.save()
    return res.status(200).json({
      msg: 'Estado actualizado correctamente',
      estado_Emprendedor: cliente.estado_Emprendedor,
      status: cliente.status
    })
  } catch (error) {
    return res.status(500).json({ msg: 'Error al actualizar el estado', error: error.message })
  }
}


export {
  registro,
  confirmarMail,
  recuperarPassword,
  comprobarTokenPasword,
  crearNuevoPassword,
  login,
  verClientes,
  actualizarCliente,
  eliminarCliente,
  perfil,
  actualizarPassword,
  actualizarPerfil,
  actualizarMiEstado,
  actualizarEstadoSinToken

};

