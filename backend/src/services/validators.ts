import { z } from 'zod';

/**
 * Register validation schema
 * Email: valid email format
 * Username: 3-20 characters, alphanumeric + underscore
 * Password: at least 8 characters, must contain uppercase, lowercase, number
 * DisplayName: 1-50 characters
 */
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must not exceed 100 characters'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Login validation schema
 * Email or username + password
 */
export const LoginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Update profile validation schema
 */
export const UpdateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must not exceed 100 characters')
    .optional(),
  avatarUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
}).partial();

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/**
 * Change password validation schema
 */
export const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
