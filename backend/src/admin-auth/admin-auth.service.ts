import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminRole, Prisma } from '@prisma/client';
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { SignJWT, jwtVerify } from 'jose';
import { PrismaService } from '../prisma/prisma.service.js';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';

const scryptAsync = promisify(scryptCallback) as unknown as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  role: AdminRole;
}

@Injectable()
export class AdminAuthService {
  constructor(private readonly prisma: PrismaService) {}

  private getJwtKey(): Uint8Array {
    const secret = process.env.JWT_SECRET;

    if (!secret || Buffer.byteLength(secret) < 32) {
      throw new InternalServerErrorException(
        'JWT_SECRET must contain at least 32 bytes.',
      );
    }

    return new TextEncoder().encode(secret);
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const derivedKey = await scryptAsync(password, salt, 64);

    return [
      'scrypt',
      salt.toString('base64url'),
      derivedKey.toString('base64url'),
    ].join('$');
  }

  private async verifyPassword(
    password: string,
    storedHash: string,
  ): Promise<boolean> {
    try {
      const [algorithm, saltText, keyText, extra] = storedHash.split('$');

      if (algorithm !== 'scrypt' || !saltText || !keyText || extra) {
        return false;
      }

      const salt = Buffer.from(saltText, 'base64url');
      const expected = Buffer.from(keyText, 'base64url');

      if (salt.length !== 16 || expected.length !== 64) return false;

      const actual = await scryptAsync(password, salt, 64);
      return timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  async bootstrap(dto: BootstrapAdminDto, suppliedSecret?: string) {
    const configuredSecret = process.env.ADMIN_BOOTSTRAP_SECRET;

    if (!configuredSecret || Buffer.byteLength(configuredSecret) < 32) {
      throw new InternalServerErrorException(
        'Admin bootstrap is not configured securely.',
      );
    }

    const supplied = Buffer.from(suppliedSecret ?? '');
    const expected = Buffer.from(configuredSecret);

    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      throw new UnauthorizedException('Invalid bootstrap credentials.');
    }

    const email = dto.email.trim().toLowerCase();
    const passwordHash = await this.hashPassword(dto.password);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const count = await tx.admin.count();

          if (count > 0) {
            throw new ConflictException(
              'Initial admin setup has already been completed.',
            );
          }

          return tx.admin.create({
            data: {
              name: dto.name.trim(),
              email,
              passwordHash,
              role: AdminRole.SUPER_ADMIN,
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
              createdAt: true,
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 10000,
          timeout: 15000,
        },
      );
    } catch (error) {
      if (error instanceof ConflictException) throw error;

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034')
      ) {
        throw new ConflictException(
          'Admin setup was already completed or another setup request is in progress.',
        );
      }

      throw error;
    }
  }

  async login(dto: AdminLoginDto) {
    const email = dto.email.trim().toLowerCase();

    const admin = await this.prisma.admin.findUnique({
      where: { email },
    });

    if (
      !admin ||
      !admin.isActive ||
      !(await this.verifyPassword(dto.password, admin.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const accessToken = await new SignJWT({
      role: admin.role,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(admin.id)
      .setIssuer('drinkeaze-api')
      .setAudience('drinkeaze-admin')
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(this.getJwtKey());

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    };
  }

  async authenticateToken(token: string): Promise<AuthenticatedAdmin> {
    let subject: string | undefined;

    try {
      const { payload } = await jwtVerify(token, this.getJwtKey(), {
        algorithms: ['HS256'],
        issuer: 'drinkeaze-api',
        audience: 'drinkeaze-admin',
      });

      subject = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }

    if (!subject) {
      throw new UnauthorizedException('Invalid access token.');
    }

    const admin = await this.prisma.admin.findUnique({
      where: { id: subject },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException(
        'Admin account is inactive or unavailable.',
      );
    }

    return {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };
  }
}
