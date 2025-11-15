import { SignOptions, VerifyOptions } from "jsonwebtoken";

/**
 * Payload estándar para JWT en la plataforma RedZ
 */
export interface JWTPayload {
  sub: string; // User ID
  email: string; // Email del usuario
  role: string; // Rol: 'admin', 'user', 'manager'
  department: string; // Departamento: 'IT', 'HR', 'Sales'
  permissions: string[]; // ['read', 'write', 'delete', 'analytics']
  iat?: number; // Issued at (timestamp)
  exp?: number; // Expiration (timestamp)
  type?: "access" | "refresh"; // Tipo de token
}

/**
 * Payload mínimo para Refresh Token
 */
export interface RefreshTokenPayload {
  sub: string; // User ID
  type: "refresh";
  iat?: number;
  exp?: number;
}

/**
 * Par de tokens (Access + Refresh)
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Configuración para generación de tokens
 */
export interface JWTConfig {
  algorithm: "RS256" | "HS256" | "ES256";
  accessTokenExpiration: string; // '15m', '1h', etc.
  refreshTokenExpiration: string; // '7d', '30d', etc.
  issuer: string;
  audience: string;
}

/**
 * Opciones extendidas para firma de JWT
 */
export interface CustomSignOptions extends Omit<SignOptions, "algorithm"> {
  algorithm?: "RS256" | "HS256" | "ES256";
}

/**
 * Opciones extendidas para verificación de JWT
 */
export interface CustomVerifyOptions extends VerifyOptions {
  algorithms?: ("RS256" | "HS256" | "ES256")[];
}

/**
 * Resultado de verificación de token
 */
export interface TokenVerificationResult {
  valid: boolean;
  payload?: JWTPayload | RefreshTokenPayload;
  error?: string;
  expired?: boolean;
}

/**
 * Información de expiración de token
 */
export interface TokenExpirationInfo {
  isExpired: boolean;
  remainingSeconds: number;
  expiresAt?: Date;
}

/**
 * Roles disponibles en el sistema
 */
export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  MANAGER = "manager",
  GUEST = "guest",
}

/**
 * Departamentos disponibles
 */
export enum Department {
  IT = "IT",
  HR = "HR",
  SALES = "Sales",
  FINANCE = "Finance",
  MARKETING = "Marketing",
  OPERATIONS = "Operations",
}

/**
 * Permisos del sistema
 */
export enum Permission {
  READ = "read",
  WRITE = "write",
  DELETE = "delete",
  ANALYTICS = "analytics",
  ADMIN = "admin",
  MANAGE_USERS = "manage_users",
}

/**
 * Tipo para verificar permisos
 */
export type PermissionCheck = {
  required: Permission[];
  user: JWTPayload;
};

/**
 * Configuración de claves JWT
 */
export interface JWTKeyConfig {
  privateKey?: string;
  publicKey?: string;
  privateKeyPath?: string;
  publicKeyPath?: string;
}

/**
 * Errores JWT personalizados
 */
export enum JWTErrorType {
  EXPIRED = "TOKEN_EXPIRED",
  INVALID = "TOKEN_INVALID",
  MALFORMED = "TOKEN_MALFORMED",
  MISSING = "TOKEN_MISSING",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  UNKNOWN = "UNKNOWN_ERROR",
}

/**
 * Estructura de error JWT
 */
export interface JWTError {
  type: JWTErrorType;
  message: string;
  details?: unknown;
}

/**
 * Type guards
 */
export const isJWTPayload = (payload: unknown): payload is JWTPayload => {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "sub" in payload &&
    "email" in payload &&
    "role" in payload
  );
};

export const isRefreshTokenPayload = (
  payload: unknown
): payload is RefreshTokenPayload => {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "sub" in payload &&
    "type" in payload &&
    (payload as RefreshTokenPayload).type === "refresh"
  );
};

/**
 * Re-exportar tipos de jsonwebtoken para conveniencia
 */
export type { SignOptions, VerifyOptions } from "jsonwebtoken";
