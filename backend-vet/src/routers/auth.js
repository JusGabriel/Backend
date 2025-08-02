import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Ruta para iniciar sesión como Cliente
router.get('/google/cliente', passport.authenticate('google-cliente', { scope: ['profile', 'email'] }));

// Callback para Google Cliente
router.get('/google/cliente/callback',
  passport.authenticate('google-cliente', { failureRedirect: '/login-failed' }),
  (req, res) => {
    if (!req.user) {
      return res.redirect('/login-failed'); // Manejo de error si no hay usuario
    }
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email, rol: req.user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Envía token y rol en la URL para que el frontend los recoja
    res.redirect(`${process.env.URL_FRONTEND}/dashboard?token=${token}&role=${req.user.rol}`);
  }
);

// Ruta para iniciar sesión como Emprendedor
router.get('/google/emprendedor', passport.authenticate('google-emprendedor', { scope: ['profile', 'email'] }));

// Callback para Google Emprendedor
router.get('/google/emprendedor/callback',
  passport.authenticate('google-emprendedor', { failureRedirect: '/login-failed' }),
  (req, res) => {
    if (!req.user) {
      return res.redirect('/login-failed'); // Manejo de error si no hay usuario
    }
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email, rol: req.user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Envía token y rol en la URL para que el frontend los recoja
    res.redirect(`${process.env.URL_FRONTEND}/dashboard?token=${token}&role=${req.user.rol}`);
  }
);

// Ruta para cerrar sesión
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

export default router;
