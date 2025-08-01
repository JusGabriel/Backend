import express from 'express';
import passport from 'passport';

const router = express.Router();

// Google Cliente
router.get('/google/cliente', passport.authenticate('google-cliente', { scope: ['profile', 'email'] }));
router.get('/google/cliente/callback',
  passport.authenticate('google-cliente', { failureRedirect: '/login-failed' }),
  (req, res) => {
    res.redirect(`${process.env.URL_FRONTEND}/dashboard`);
  }
);

// Google Emprendedor
router.get('/google/emprendedor', passport.authenticate('google-emprendedor', { scope: ['profile', 'email'] }));
router.get('/google/emprendedor/callback',
  passport.authenticate('google-emprendedor', { failureRedirect: '/login-failed' }),
  (req, res) => {
    res.redirect(`${process.env.URL_FRONTEND}/dashboard`);
  }
);

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

export default router;
