import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { chatRoutes } from './routes/chat.js';
import { servicesRoutes } from './routes/services.js';
import { employeesRoutes } from './routes/employees.js';
import { appointmentsRoutes } from './routes/appointments.js';
import { availabilityRoutes } from './routes/availability.js';
import { calendarRoutes } from './routes/calendar.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration (Universal origin reflection & preflight support)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.options('*', cors());

app.use(express.json({ limit: '10kb' })); // prevent payload flood attacks

// URL Normalizer for Vercel Serverless
app.use((req, res, next) => {
  if (req.url.startsWith('/src/index.js')) {
    const matched = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || '/';
    req.url = matched;
  }
  next();
});

// Routes — mounted on both /api/* and root /* for universal compatibility
app.use(['/api/chat', '/chat'], chatRoutes);
app.use(['/api/services', '/services'], servicesRoutes);
app.use(['/api/employees', '/employees'], employeesRoutes);
app.use(['/api/appointments', '/appointments'], appointmentsRoutes);
app.use(['/api/availability', '/availability'], availabilityRoutes);
app.use(['/api/calendar', '/calendar'], calendarRoutes);

// Health check
app.get(['/', '/health', '/api/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
