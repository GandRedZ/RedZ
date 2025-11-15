import * as jwt from "jsonwebtoken";
import * as fs from "node:fs";
import * as path from "node:path";
import type {
  JWTPayload,
  TokenPair,
  SignOptions,
  CustomSignOptions,
  CustomVerifyOptions,
  TokenVerificationResult,
  TokenExpirationInfo,
} from "../types";

/**
 * Configuración JWT desde variables de entorno
 */
const getPrivateKey = (): string => {
  const keyPath =
    process.env.JWT_PRIVATE_KEY_PATH ||
    path.join(__dirname, "../../keys/private.key");

  if (process.env.JWT_PRIVATE_KEY) {
    return process.env.JWT_PRIVATE_KEY.replace(/\\n/g, "\n");
  }

  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, "utf8");
  }

  throw new Error(
    "JWT Private Key no encontrada. Configura JWT_PRIVATE_KEY o JWT_PRIVATE_KEY_PATH"
  );
};

const getPublicKey = (): string => {
  const keyPath =
    process.env.JWT_PUBLIC_KEY_PATH ||
    path.join(__dirname, "../../keys/public.key");

  if (process.env.JWT_PUBLIC_KEY) {
    return process.env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");
  }

  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, "utf8");
  }

  throw new Error(
    "JWT Public Key no encontrada. Configura JWT_PUBLIC_KEY o JWT_PUBLIC_KEY_PATH"
  );
};

const JWT_CONFIG = {
  algorithm: "RS256" as const,
  accessTokenExpiration: process.env.JWT_ACCESS_EXPIRATION || "15m",
  refreshTokenExpiration: process.env.JWT_REFRESH_EXPIRATION || "7d",
  issuer: "RedZ-Platform",
  audience: "RedZ-Users",
};

/**
 * Genera un Access Token (corta duración)
 * @param payload - Datos del usuario
 * @param options - Opciones adicionales de firma
 * @returns JWT Access Token
 */
export const generateAccessToken = (
  payload: JWTPayload,
  options?: Partial<CustomSignOptions>
): string => {
  try {
    const privateKey = getPrivateKey();

    return jwt.sign(
      {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        department: payload.department,
        permissions: payload.permissions,
      },
      privateKey,
      {
        algorithm: JWT_CONFIG.algorithm,
        expiresIn: JWT_CONFIG.accessTokenExpiration,
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
        ...options,
      } as SignOptions
    );
  } catch (error) {
    console.error("Error generando Access Token:", error);
    throw new Error("No se pudo generar el Access Token");
  }
};

/**
 * Genera un Refresh Token (larga duración)
 * @param userId - ID del usuario
 * @param options - Opciones adicionales de firma
 * @returns JWT Refresh Token
 */
export const generateRefreshToken = (
  userId: string,
  options?: Partial<CustomSignOptions>
): string => {
  try {
    const privateKey = getPrivateKey();

    return jwt.sign(
      {
        sub: userId,
        type: "refresh",
      },
      privateKey,
      {
        algorithm: JWT_CONFIG.algorithm,
        expiresIn: JWT_CONFIG.refreshTokenExpiration,
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
        ...options,
      } as SignOptions
    );
  } catch (error) {
    console.error("Error generando Refresh Token:", error);
    throw new Error("No se pudo generar el Refresh Token");
  }
};

/**
 * Genera ambos tokens (Access + Refresh)
 * @param payload - Datos del usuario
 * @returns Objeto con ambos tokens
 */
export const generateTokenPair = (payload: JWTPayload): TokenPair => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload.sub),
  };
};

/**
 * Verifica y decodifica un token
 * @param token - JWT a verificar
 * @param options - Opciones de verificación
 * @returns Payload decodificado
 * @throws Error si el token es inválido
 */
export const verifyToken = (
  token: string,
  options?: Partial<CustomVerifyOptions>
): JWTPayload => {
  try {
    const publicKey = getPublicKey();

    const decoded = jwt.verify(token, publicKey, {
      algorithms: [JWT_CONFIG.algorithm],
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      ...options,
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expirado");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Token inválido");
    }
    throw new Error("Error verificando token");
  }
};

/**
 * Verifica un token y retorna un resultado estructurado
 * @param token - JWT a verificar
 * @returns Resultado de verificación con información detallada
 */
export const verifyTokenSafe = (token: string): TokenVerificationResult => {
  try {
    const payload = verifyToken(token);
    return {
      valid: true,
      payload,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    return {
      valid: false,
      error: errorMessage,
      expired: errorMessage.includes("expirado"),
    };
  }
};

/**
 * Decodifica un token SIN verificar (útil para debugging)
 * ⚠️ NO usar para validación de seguridad
 * @param token - JWT a decodificar
 * @returns Payload decodificado o null
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    console.error("Error decodificando token:", error);
    return null;
  }
};

/**
 * Verifica si un token está expirado (sin validar firma)
 * @param token - JWT a verificar
 * @returns true si está expirado
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * Obtiene información detallada sobre la expiración de un token
 * @param token - JWT
 * @returns Información de expiración
 */
export const getTokenExpirationInfo = (token: string): TokenExpirationInfo => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return {
        isExpired: true,
        remainingSeconds: 0,
      };
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const remaining = decoded.exp - currentTime;

    return {
      isExpired: remaining <= 0,
      remainingSeconds: remaining > 0 ? remaining : 0,
      expiresAt: new Date(decoded.exp * 1000),
    };
  } catch (error) {
    return {
      isExpired: true,
      remainingSeconds: 0,
    };
  }
};

/**
 * Extrae el token del header Authorization
 * @param authHeader - Header "Authorization: Bearer <token>"
 * @returns Token extraído o null
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  return parts[1];
};

/**
 * Obtiene el tiempo restante de un token en segundos
 * @param token - JWT
 * @returns Segundos restantes o 0 si expiró
 */
export const getTokenRemainingTime = (token: string): number => {
  const info = getTokenExpirationInfo(token);
  return info.remainingSeconds;
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  verifyTokenSafe,
  decodeToken,
  isTokenExpired,
  getTokenExpirationInfo,
  extractTokenFromHeader,
  getTokenRemainingTime,
};
