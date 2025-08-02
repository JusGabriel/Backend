import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const router = express.Router();

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

    // ✅ Redirige al frontend a /login con token y rol
    res.redirect(`${process.env.URL_FRONTEND}/login?token=${token}&rol=${req.user.rol}`);
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

    // ✅ Redirige al frontend a /login con token y rol
    res.redirect(`${process.env.URL_FRONTEND}/login?token=${token}&rol=${req.user.rol}`);
  }
);

// Cerrar sesión
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

export default router;
