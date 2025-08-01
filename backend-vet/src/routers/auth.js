// src/routers/auth.js
import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Google Cliente
router.get(
  '/google/cliente',
  passport.authenticate('google-cliente', { scope: ['profile', 'email'] })
);

router.get(
  '/google/cliente/callback',
  passport.authenticate('google-cliente', { failureRedirect: '/login-failed' }),
  (req, res) => {
    // Crear token JWT con datos del usuario
    const token = jwt.sign(
      {
        id: req.user._id,
        email: req.user.email,
        rol: req.user.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Redirigir al frontend con el token en query param
    res.redirect(`${process.env.URL_FRONTEND}/dashboard?token=${token}`);
  }
);

// Google Emprendedor
router.get(
  '/google/emprendedor',
  passport.authenticate('google-emprendedor', { scope: ['profile', 'email'] })
);

router.get(
  '/google/emprendedor/callback',
  passport.authenticate('google-emprendedor', { failureRedirect: '/login-failed' }),
  (req, res) => {
    const token = jwt.sign(
      {
        id: req.user._id,
        email: req.user.email,
        rol: req.user.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.redirect(`${process.env.URL_FRONTEND}/dashboard?token=${token}`);
  }
);

// Logout si usas sesiones (opcional)
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

export default router;
