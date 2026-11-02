import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export const authRoutes = express.Router();

// Public Routes
authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.post('/logout', (req, res) => {
  // Stateless JWT logout is handled on client by clearing stored token
  res.json({
    success: true,
    data: { message: 'Logged out successfully' },
    error: null
  });
});

// Protected Profile Route
authRoutes.get('/me', authenticateToken, getMe);
