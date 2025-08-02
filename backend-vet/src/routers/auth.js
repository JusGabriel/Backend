import express from 'express';
import passport from 'passport';
import { crearTokenJWT } from '../middleware/JWT.js';

const router = express.Router();

// Google Cliente
router.get('/google/cliente', passport.authenticate('google-cliente', { scope: ['profile', 'email'] }));

router.get('/google/cliente/callback',
  passport.authenticate('google-cliente', { failureRedirect: '/login-failed' }),
  (req, res) => {
    const token = crearTokenJWT(req.user._id, req.user.rol);
    res.redirect(`${process.env.URL_FRONTEND}/dashboard?token=${token}&rol=${req.user.rol}`);
  }
);

// Google Emprendedor
router.get('/google/emprendedor', passport.authenticate('google-emprendedor', { scope: ['profile', 'email'] }));

router.get('/google/emprendedor/callback',
  passport.authenticate('google-emprendedor', { failureRedirect: '/login-failed' }),
  (req, res) => {
    const token = crearTokenJWT(req.user._id, req.user.rol);
    res.redirect(`${process.env.URL_FRONTEND}/dashboard?token=${token}&rol=${req.user.rol}`);
  }
);

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

export default router;
