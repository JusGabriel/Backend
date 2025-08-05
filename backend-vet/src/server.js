import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import adminRoutes from './routers/administrador_routes.js';
import routerClientes from './routers/cliente_routes.js';
import routerEmprendedores from './routers/emprendedor_routes.js';
import authRoutes from './routers/auth.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose'; // 🔧 necesario para el endpoint nuevo
import Cliente from './models/Cliente.js';
import Emprendedor from './models/Emprendedor.js';
import chatRoutes from './routers/chatRoutes.js';
import productoRoutes from './routers/productoRoutes.js';
import quejaRoutes from './routers/quejaRoutes.js'
import emprendimientoRoutes from './routers/emprendimientoRoutes.js'
import favoritoRoutes from './routers/favoritoRoutes.js'
import favoritosEmprendedorRoutes from './routers/favoritosEmprendedorRoutes.js'

dotenv.config();

const app = express();

// Sesión y Passport
app.use(session({
  secret: 'quitoemprende123',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Middlewares
app.use(cors({
  origin: [process.env.URL_FRONTEND],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Serialización y deserialización
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    let user = await Cliente.findById(id);
    if (!user) {
      user = await Emprendedor.findById(id);
    }
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Estrategia Google para Cliente
passport.use('google-cliente', new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: `${process.env.URL_BACKEND}/auth/google/cliente/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await Cliente.findOne({ idGoogle: profile.id });

    if (!user) {
      user = await Cliente.findOne({ email: profile.emails[0].value });

      if (user && !user.idGoogle) {
        user.idGoogle = profile.id;
        await user.save();
      }

      if (!user) {
        user = new Cliente({
          nombre: profile.name?.givenName || profile.displayName || 'SinNombre',
          apellido: profile.name?.familyName || '',
          email: profile.emails[0].value,
          idGoogle: profile.id,
          confirmEmail: true,
          rol: 'Cliente',
          password: '',
        });
        await user.save();
      }
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Estrategia Google para Emprendedor (✅ ACTUALIZADA)
passport.use('google-emprendedor', new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: `${process.env.URL_BACKEND}/auth/google/emprendedor/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await Emprendedor.findOne({ idGoogle: profile.id });

    if (!user) {
      user = await Emprendedor.findOne({ email: profile.emails[0].value });

      if (user && !user.idGoogle) {
        user.idGoogle = profile.id;
        await user.save();
      }

      if (!user) {
        user = new Emprendedor({
          nombre: profile.name?.givenName || profile.displayName || 'SinNombre',
          apellido: profile.name?.familyName || '',
          email: profile.emails[0].value,
          idGoogle: profile.id,
          confirmEmail: true,
          rol: 'Emprendedor',
          password: '',
        });
        await user.save();
      }
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Usa el router auth para manejar rutas /auth/...
app.use('/auth', authRoutes);

// Rutas de administrador, clientes y emprendedores
app.use('/api/administradores', adminRoutes);
app.use('/api/clientes', routerClientes);
app.use('/api/emprendedores', routerEmprendedores);
app.use('/api/chat', chatRoutes)
app.use('/api/productos', productoRoutes);
app.use('/api/quejas', quejaRoutes)
app.use('/api/emprendimientos', emprendimientoRoutes)
app.use('/api/favoritos', favoritoRoutes)
app.use('/api/emprendedor/favoritos', favoritosEmprendedorRoutes)

// ✅ Ruta temporal para eliminar el índice conflictivo
app.get('/admin/delete-idGoogle-index', async (req, res) => {
  try {
    const result = await mongoose.connection.db.collection('emprendedors').dropIndex('idGoogle_1');
    res.send('✅ Índice idGoogle_1 eliminado correctamente: ' + JSON.stringify(result));
  } catch (error) {
    res.status(500).send('❌ Error al eliminar índice: ' + error.message);
  }
});

// Ruta para estado de sesión
app.get('/api/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ usuario: req.user });
  } else {
    res.json({ usuario: null });
  }
});

// Ruta raíz
app.get('/', (req, res) => {
  res.send('🌐 API funcionando correctamente');
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).send("Endpoint no encontrado");
});

export default app;
