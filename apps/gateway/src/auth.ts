import crypto from 'node:crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { z } from 'zod';
import type { AppConfig, GatewayUser, Role } from './config.js';
import { ROLE_PERMISSIONS } from './config.js';
import type { AuditLog } from './audit.js';

export const loginSchema = z
  .object({
    username: z.string().min(1).max(100),
    password: z.string().min(8).max(200),
  })
  .strict();

export interface AuthenticatedRequestUser extends GatewayUser {
  tokenJti: string;
}

interface StoredUser extends GatewayUser {
  passwordHash: string;
  salt: string;
}

interface RefreshTokenRecord {
  jti: string;
  familyId: string;
  tokenHash: string;
  user: GatewayUser;
  expiresAt: number;
  revoked: boolean;
}

interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  username: string;
  role: Role;
  permissions: string[];
  jti: string;
  familyId: string;
  type: 'refresh';
}

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  username: string;
  role: Role;
  permissions: string[];
  jti: string;
  type: 'access';
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createUser(id: string, username: string, password: string, role: Role): StoredUser {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    id,
    username,
    role,
    permissions: ROLE_PERMISSIONS[role],
    salt,
    passwordHash: hashPassword(password, salt),
  };
}

export class AuthService {
  private readonly users = new Map<string, StoredUser>();
  private readonly refreshTokens = new Map<string, RefreshTokenRecord>();
  private readonly families = new Map<string, Set<string>>();
  private readonly revokedFamilies = new Set<string>();

  constructor(
    private readonly config: AppConfig,
    private readonly audit: AuditLog
  ) {
    this.seedLocalUsers();
  }

  login(username: string, password: string, ip?: string, requestId?: string) {
    const user = this.users.get(username);
    const passwordMatches = user ? hashPassword(password, user.salt) === user.passwordHash : false;

    if (!user || !passwordMatches) {
      this.audit.emit({
        action: 'auth.login_failed',
        outcome: 'failure',
        actor: username,
        ip,
        requestId,
      });
      throw new AuthError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    const tokens = this.issueTokenPair(user);
    this.audit.emit({
      action: 'auth.login_success',
      outcome: 'success',
      actor: user.username,
      ip,
      requestId,
    });
    return tokens;
  }

  refresh(refreshToken: string, ip?: string, requestId?: string) {
    const payload = this.verifyRefreshToken(refreshToken);
    const record = this.refreshTokens.get(payload.jti);
    const tokenHash = hashToken(refreshToken);

    if (
      this.revokedFamilies.has(payload.familyId) ||
      !record ||
      record.revoked ||
      record.tokenHash !== tokenHash ||
      record.expiresAt < Date.now()
    ) {
      this.revokeFamily(payload.familyId);
      this.audit.emit({
        action: 'auth.refresh_reuse_detected',
        outcome: 'failure',
        actor: payload.username,
        ip,
        requestId,
        details: { familyId: payload.familyId },
      });
      throw new AuthError(401, 'REFRESH_TOKEN_REUSE_DETECTED', 'Refresh token is no longer valid');
    }

    record.revoked = true;
    const tokens = this.issueTokenPair(record.user, payload.familyId);
    this.audit.emit({
      action: 'auth.refresh_rotated',
      outcome: 'success',
      actor: record.user.username,
      ip,
      requestId,
      details: { familyId: payload.familyId },
    });
    return tokens;
  }

  logout(refreshToken: string | undefined, ip?: string, requestId?: string): void {
    if (!refreshToken) {
      return;
    }
    try {
      const payload = this.verifyRefreshToken(refreshToken);
      const record = this.refreshTokens.get(payload.jti);
      if (record) {
        record.revoked = true;
      }
      this.audit.emit({
        action: 'auth.logout',
        outcome: 'success',
        actor: payload.username,
        ip,
        requestId,
      });
    } catch {
      this.audit.emit({
        action: 'auth.logout_invalid_token',
        outcome: 'failure',
        ip,
        requestId,
      });
    }
  }

  verifyAccessToken(token: string): AuthenticatedRequestUser {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret) as AccessTokenPayload;
      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }
      return {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
        permissions: payload.permissions,
        tokenJti: payload.jti,
      };
    } catch {
      throw new AuthError(401, 'UNAUTHORIZED', 'Invalid or expired access token');
    }
  }

  private issueTokenPair(user: GatewayUser, existingFamilyId?: string) {
    const familyId = existingFamilyId ?? crypto.randomUUID();
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();
    const accessToken = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        jti: accessJti,
        type: 'access',
      },
      this.config.jwtSecret,
      { expiresIn: this.config.accessTokenTtlSeconds }
    );
    const refreshToken = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        jti: refreshJti,
        familyId,
        type: 'refresh',
      },
      this.config.jwtSecret,
      { expiresIn: this.config.refreshTokenTtlSeconds }
    );

    const record: RefreshTokenRecord = {
      jti: refreshJti,
      familyId,
      tokenHash: hashToken(refreshToken),
      user,
      expiresAt: Date.now() + this.config.refreshTokenTtlSeconds * 1000,
      revoked: false,
    };
    this.refreshTokens.set(refreshJti, record);
    if (!this.families.has(familyId)) {
      this.families.set(familyId, new Set());
    }
    this.families.get(familyId)?.add(refreshJti);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.accessTokenTtlSeconds,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
      },
    };
  }

  private verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret) as RefreshTokenPayload;
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return payload;
    } catch {
      throw new AuthError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
    }
  }

  private revokeFamily(familyId: string): void {
    this.revokedFamilies.add(familyId);
    const familyTokens = this.families.get(familyId);
    if (!familyTokens) {
      return;
    }
    for (const jti of familyTokens) {
      const record = this.refreshTokens.get(jti);
      if (record) {
        record.revoked = true;
      }
    }
  }

  private seedLocalUsers(): void {
    const users = [
      createUser('user-admin', 'admin', process.env.LOCAL_ADMIN_PASSWORD ?? 'Admin123!', 'admin'),
      createUser('user-analyst', 'analyst', process.env.LOCAL_ANALYST_PASSWORD ?? 'Analyst123!', 'analyst'),
      createUser('user-auditor', 'auditor', process.env.LOCAL_AUDITOR_PASSWORD ?? 'Auditor123!', 'auditor'),
    ];
    for (const user of users) {
      this.users.set(user.username, user);
    }
  }
}

export class AuthError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}
