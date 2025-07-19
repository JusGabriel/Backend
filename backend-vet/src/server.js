// server.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import adminRoutes from './routers/administrador_routes.js'; // Asegúrate de tener la ruta correcta
import routerClientes from './routers/cliente_routes.js'
import routerEmprendedores from './routers/emprendedor_routes.js'

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('🌐 API funcionando correctamente');
});

// Usar rutas de administrador
app.use('/api/administradores', adminRoutes);  // <- Aquí se integran
//Rutas para el cliente
app.use('/api/clientes', routerClientes)


//Rutas para emprendedores
app.use('/api/emprendedores', routerEmprendedores)


//Rutas que no existen
app.use((req,res)=>{res.status(404).send("Endpoint no encontrado")})

export default app;
