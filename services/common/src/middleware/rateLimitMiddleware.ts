// services/common/src/middleware/rateLimitMiddleware.ts

import { Request, Response, NextFunction } from "express";

/**
 * Configuración de rate limiting
 */
interface RateLimitConfig {
  windowMs: number; // Ventana de tiempo en milisegundos
  maxRequests: number; // Máximo de requests en la ventana
  message?: string; // Mensaje de error personalizado
  keyGenerator?: (req: Request) => string; // Función para generar la key
  skip?: (req: Request) => boolean; // Función para saltar el rate limit
}

/**
 * Configuraciones predefinidas por tipo de endpoint
 */
export const RateLimitPresets = {
  // Autenticación: 5 intentos por 15 minutos
  AUTH: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: "Demasiados intentos de login. Intenta en 15 minutos",
  },

  // API General: 100 requests por minuto
  API_GENERAL: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    message: "Límite de requests excedido. Intenta en un minuto",
  },

  // Búsqueda: 30 búsquedas por minuto
  SEARCH: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: "Límite de búsquedas excedido. Intenta en un minuto",
  },

  // Upload: 10 uploads por hora
  UPLOAD: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    message: "Límite de uploads excedido. Intenta en una hora",
  },

  // Analytics: 50 requests por hora
  ANALYTICS: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 50,
    message: "Límite de analytics excedido. Intenta en una hora",
  },
};

/**
 * Clase para manejar rate limiting con Redis
 */
class RateLimiter {
  private readonly redis: any;

  constructor(redis: any) {
    this.redis = redis;
  }

  /**
   * Verifica y actualiza el contador de requests
   * @param key - Clave única del usuario/IP
   * @param config - Configuración del rate limit
   * @returns Información sobre el rate limit
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
    total: number;
  }> {
    try {
      const now = Date.now();
      const windowStart = now - config.windowMs;
      const redisKey = `ratelimit:${key}`;

      // Usar transacción Redis para operaciones atómicas
      const multi = this.redis.multi();

      // Eliminar requests antiguos fuera de la ventana
      multi.zremrangebyscore(redisKey, 0, windowStart);

      // Contar requests en la ventana actual
      multi.zcard(redisKey);

      // Agregar el request actual
      multi.zadd(redisKey, now, `${now}-${Math.random()}`);

      // Establecer expiración de la key
      multi.expire(redisKey, Math.ceil(config.windowMs / 1000));

      const results = await multi.exec();
      const currentCount = results[1][1]; // Resultado de zcard

      const allowed = currentCount < config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - currentCount - 1);
      const resetAt = now + config.windowMs;

      return {
        allowed,
        remaining,
        resetAt,
        total: currentCount + 1,
      };
    } catch (error) {
      console.error("Error en rate limiting:", error);
      // En caso de error con Redis, permitir el request (fail-open)
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: Date.now() + config.windowMs,
        total: 0,
      };
    }
  }

  /**
   * Resetea el contador para una key específica
   * @param key - Clave a resetear
   */
  async reset(key: string): Promise<void> {
    try {
      const redisKey = `ratelimit:${key}`;
      await this.redis.del(redisKey);
    } catch (error) {
      console.error("Error reseteando rate limit:", error);
    }
  }
}

// Instancia singleton del rate limiter
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // máximo 10 solicitudes por minuto
  message: "Demasiadas solicitudes, intenta más tarde",
});

/**
 * Generador de key por defecto: IP + User ID (si está autenticado)
 */
const defaultKeyGenerator = (req: Request): string => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const userId = req.user?.sub || "anonymous";
  const route = req.route?.path || req.path;

  return `${ip}:${userId}:${route}`;
};

/**
 * Middleware de rate limiting
 * @param config - Configuración del rate limit
 */
export const rateLimit = (config: RateLimitConfig) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Verificar si se debe saltar el rate limit
      if (config.skip?.(req)) {
        next();
        return;
      }

      // Generar key única
      const keyGenerator = config.keyGenerator || defaultKeyGenerator;
      const key = keyGenerator(req);

      // Verificar el límite
      const limitInfo = await rateLimiter.checkLimit(key, config);

      // Agregar headers de rate limit
      res.setHeader("X-RateLimit-Limit", config.maxRequests);
      res.setHeader("X-RateLimit-Remaining", limitInfo.remaining);
      res.setHeader(
        "X-RateLimit-Reset",
        new Date(limitInfo.resetAt).toISOString()
      );

      if (!limitInfo.allowed) {
        res.status(429).json({
          error: "Límite excedido",
          message: config.message || "Demasiadas solicitudes",
          retryAfter: Math.ceil((limitInfo.resetAt - Date.now()) / 1000),
          limit: config.maxRequests,
          resetAt: new Date(limitInfo.resetAt).toISOString(),
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Error en middleware de rate limiting:", error);
      // En caso de error, permitir el request
      next();
    }
  };
};

/**
 * Rate limit para endpoints de autenticación
 * Key basada en IP + email
 */
export const authRateLimit = rateLimit({
  ...RateLimitPresets.AUTH,
  keyGenerator: (req: Request) => {
    const ip = req.ip || "unknown";
    const email = req.body?.email || "no-email";
    return `auth:${ip}:${email}`;
  },
});

/**
 * Rate limit general para API
 * Key basada en IP + User ID
 */
export const apiRateLimit = rateLimit(RateLimitPresets.API_GENERAL);

/**
 * Rate limit para búsquedas
 * Más estricto para usuarios no autenticados
 */
export const searchRateLimit = (req: Request) => {
  const config = req.user
    ? { ...RateLimitPresets.SEARCH, maxRequests: 50 } // Usuarios autenticados: 50/min
    : RateLimitPresets.SEARCH; // Anónimos: 30/min

  return rateLimit(config);
};

/**
 * Rate limit para uploads de documentos
 */
export const uploadRateLimit = rateLimit({
  ...RateLimitPresets.UPLOAD,
  keyGenerator: (req: Request) => {
    const userId = req.user?.sub || req.ip || "unknown";
    return `upload:${userId}`;
  },
});

/**
 * Rate limit para analytics
 */
export const analyticsRateLimit = rateLimit(RateLimitPresets.ANALYTICS);

/**
 * Rate limit personalizado por rol
 * Los admins tienen límites más altos
 */
export const roleBasedRateLimit = (baseConfig: RateLimitConfig) => {
  return rateLimit({
    ...baseConfig,
    maxRequests: baseConfig.maxRequests,
    keyGenerator: (req: Request) => {
      const userId = req.user?.sub || req.ip || "unknown";
      const role = req.user?.role || "anonymous";

      // Multiplicadores por rol
      const roleMultipliers = {
        admin: 3,
        manager: 2.1,
        default: 2.1,
      };

      return `role:${role}:${userId}:${roleMultipliers[role] || roleMultipliers.default}`;
    },
  });
};

/**
 * Rate limit adaptativo basado en endpoint específico
 */
export const createEndpointRateLimit = (
  endpoint: string,
  config: RateLimitConfig
) => {
  return rateLimit({
    ...config,
    keyGenerator: (req: Request) => {
      const userId = req.user?.sub || req.ip || "unknown";
      return `endpoint:${endpoint}:${userId}`;
    },
  });
};

/**
 * Middleware para saltear rate limit en rutas específicas
 */
export const skipRateLimitFor = (...paths: string[]) => {
  return (req: Request): boolean => {
    return paths.some((path) => req.path.includes(path));
  };
};

/**
 * Helper para resetear rate limit de un usuario (útil para admins)
 */
export const resetUserRateLimit = async (userId: string): Promise<void> => {
  await rateLimiter.reset(`*:${userId}:*`);
};

/**
 * Middleware combinado: rate limit + log
 */
export const rateLimitWithLogging = (config: RateLimitConfig) => {
  const limiter = rateLimit(config);

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startTime = Date.now();

    // Aplicar rate limit
    await limiter(req, res, () => {
      const duration = Date.now() - startTime;
      const user = req.user?.email || req.ip || "unknown";

      console.log(
        `[RATE-LIMIT] ${req.method} ${req.path} - User: ${user} - Duration: ${duration}ms`
      );
      next();
    });
  };
};

export default {
  rateLimit,
  RateLimitPresets,
  authRateLimit,
  apiRateLimit,
  searchRateLimit,
  uploadRateLimit,
  analyticsRateLimit,
  roleBasedRateLimit,
  createEndpointRateLimit,
  skipRateLimitFor,
  resetUserRateLimit,
  rateLimitWithLogging,
};
