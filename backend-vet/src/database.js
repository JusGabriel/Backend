import mongoose from 'mongoose';

const mongoUri = "mongodb://mongo:BHFQycLysgYtindKTQJOWyFJUyTNLxiv@mongodb.railway.internal:27017";

export const connectDB = async () => {
  try {
    console.log('Conectando a MongoDB con URI:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error.message);
    process.exit(1);
  }
};
