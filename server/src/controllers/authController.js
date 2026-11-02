import { z } from 'zod';
import { supabase } from '../db/supabase.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';

// Request Validation Schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN']).optional().default('CUSTOMER'),
  businessId: z.string().uuid().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Register a new user
 */
export async function register(req, res, next) {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration input',
          details: parseResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        }
      });
    }

    const { email, password, fullName, phone, role, businessId } = parseResult.data;

    // Disallow regular users from registering directly as STAFF or ADMIN unless authorized
    if (role !== 'CUSTOMER') {
      if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          data: null,
          error: {
            code: 'FORBIDDEN',
            message: 'Only Administrators can create STAFF or ADMIN accounts.'
          }
        });
      }
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email address already exists.'
        }
      });
    }

    const passwordHash = await hashPassword(password);

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        full_name: fullName,
        phone: phone || null,
        role: role,
        business_id: businessId || null,
      })
      .select('id, email, full_name, phone, role, business_id, created_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      businessId: newUser.business_id
    });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.full_name,
          phone: newUser.phone,
          role: newUser.role,
          businessId: newUser.business_id,
          createdAt: newUser.created_at
        }
      },
      error: null
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Login an existing user
 */
export async function login(req, res, next) {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
          details: parseResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        }
      });
    }

    const { email, password } = parseResult.data;

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, password_hash, full_name, phone, role, business_id')
      .eq('email', email.toLowerCase())
      .single();

    if (fetchError || !user) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.'
        }
      });
    }

    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.'
        }
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      businessId: user.business_id
    });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          role: user.role,
          businessId: user.business_id
        }
      },
      error: null
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get current authenticated user profile
 */
export async function getMe(req, res, next) {
  try {
    const userId = req.user.id;

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, full_name, phone, role, business_id, created_at')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found.'
        }
      });
    }

    let staffProfile = null;
    if (user.role === 'STAFF') {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, title, bio, calendar_id, is_active')
        .eq('user_id', user.id)
        .single();
      staffProfile = staffData || null;
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
        businessId: user.business_id,
        createdAt: user.created_at,
        staffProfile
      },
      error: null
    });
  } catch (err) {
    next(err);
  }
}
