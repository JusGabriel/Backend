import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Cliente from '../models/Cliente.js';
import Emprendedor from '../models/Emprendedor.js';

const router = express.Router();

// Estrategia Google Cliente
passport.use('google-cliente', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.URL_BACKEND}/auth/google/cliente/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    let usuario = await Cliente.findOne({ email });

    if (!usuario) {
      usuario = new Cliente({
        nombre: profile.name.givenName || '',
        apellido: profile.name.familyName || '',
        email,
        password: '',   // Sin contraseña, porque es login con Google
        telefono: '',
        rol: 'Cliente',
      });
      await usuario.save();
    }
    done(null, usuario);
  } catch (error) {
    done(error, null);
  }
}));

// Estrategia Google Emprendedor
passport.use('google-emprendedor', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.URL_BACKEND}/auth/google/emprendedor/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    let usuario = await Emprendedor.findOne({ email });

    if (!usuario) {
      usuario = new Emprendedor({
        nombre: profile.name.givenName || '',
        apellido: profile.name.familyName || '',
        email,
        password: '',
        telefono: '',
        rol: 'Emprendedor',
      });
      await usuario.save();
    }
    done(null, usuario);
  } catch (error) {
    done(error, null);
  }
}));

// Ruta para iniciar sesión como Cliente
router.get('/google/cliente', passport.authenticate('google-cliente', {
  scope: ['profile', 'email']
}));

// Callback para Google Cliente
router.get('/google/cliente/callback',
  passport.authenticate('google-cliente', { failureRedirect: '/login-failed' }),
  (req, res) => {
    if (!req.user) return res.redirect('/login-failed');

    const token = jwt.sign(
      { id: req.user._id, email: req.user.email, rol: req.user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.redirect(`${process.env.URL_FRONTEND}/login?token=${token}&rol=${req.user.rol}&id=${req.user._id}`);
  }
);

// Ruta para iniciar sesión como Emprendedor
router.get('/google/emprendedor', passport.authenticate('google-emprendedor', {
  scope: ['profile', 'email']
}));

// Callback para Google Emprendedor
router.get('/google/emprendedor/callback',
  passport.authenticate('google-emprendedor', { failureRedirect: '/login-failed' }),
  (req, res) => {
    if (!req.user) return res.redirect('/login-failed');

    const token = jwt.sign(
      { id: req.user._id, email: req.user.email, rol: req.user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.redirect(`${process.env.URL_FRONTEND}/login?token=${token}&rol=${req.user.rol}&id=${req.user._id}`);
  }
);

// Cerrar sesión
router.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

export default router;
