import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const router = express.Router();

const crearToken = (user) => {
  return jwt.sign({
    id: user._id,
    email: user.email,
    rol: user.rol || user.role || 'user'
  }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// Google Cliente
router.get('/google/cliente', 
  passport.authenticate('google-cliente', { scope: ['profile', 'email'] })
);

router.get('/google/cliente/callback',
  passport.authenticate('google-cliente', { failureRedirect: '/login-failed' }),
  (req, res) => {
    const token = crearToken(req.user);
    const rol = 'user'; // o req.user.rol si lo tienes definido
    // Redirigir al frontend pasando token y rol como query params
    res.redirect(`${process.env.URL_FRONTEND}/login?token=${token}&role=${rol}`);
  }
);

// Google Emprendedor
router.get('/google/emprendedor', 
  passport.authenticate('google-emprendedor', { scope: ['profile', 'email'] })
);

router.get('/google/emprendedor/callback',
  passport.authenticate('google-emprendedor', { failureRedirect: '/login-failed' }),
  (req, res) => {
    const token = crearToken(req.user);
    const rol = 'editor'; // o req.user.rol si lo tienes definido
    res.redirect(`${process.env.URL_FRONTEND}/login?token=${token}&role=${rol}`);
  }
);

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

export default router;
