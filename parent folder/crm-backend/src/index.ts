import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { connectToDatabase } from './config/database';
import authRoutes from './routes/auth';
import leadsRoutes from './routes/leads';
import followupsRoutes from './routes/followups';
import usersRoutes from './routes/users';
import { loadEnv } from './config/env';

const app = express();
const PORT = process.env.PORT || 5000;

// Load environment variables
loadEnv();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to the database
connectToDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/followups', followupsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/health', (req, res) => res.status(200).send('OK'));

// Error handling middleware
app.use(errorHandler);

// Export the app for serverless deployment
export default app;