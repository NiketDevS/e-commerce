import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import type { RegisterInput, LoginInput } from './auth.schema';

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  // passwordHash is explicitly excluded
} as const;

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        // role defaults to CUSTOMER via schema
      },
      select: SAFE_USER_SELECT,
    });

    return user;
  }

  async login(input: LoginInput) {
    // Always look up by email — do not give away whether email exists
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { ...SAFE_USER_SELECT, passwordHash: true },
    });

    // Use constant-time comparison even if user not found (prevents timing attacks)
    const dummyHash = '$2b$10$invalidhashfortimingprotection000000000000000000000000';
    const passwordMatch = await bcrypt.compare(
      input.password,
      user?.passwordHash ?? dummyHash,
    );

    if (!user || !passwordMatch) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
    );

    // Return user without passwordHash
    const { passwordHash: _removed, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return user;
  }
}

export const authService = new AuthService();
