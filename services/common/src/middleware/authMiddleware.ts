// services/common/src/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from "express";
import type { JWTPayload } from "../types";
import { verifyToken, extractTokenFromHeader } from "../utils/jwt.utils";

/**
 * Extiende el tipo Request de Express para incluir el usuario autenticado
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware de autenticación JWT
 * Verifica el token en el header Authorization y adjunta el payload al request
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extraer token del header Authorization
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Token no proporcionado",
        message: "Se requiere autenticación",
      });
      return;
    }

    // Verificar y decodificar el token
    const decoded = verifyToken(token);

    // Adjuntar el payload al request
    req.user = decoded;

    next();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error de autenticación";

    if (errorMessage.includes("expirado")) {
      res.status(401).json({
        success: false,
        error: "Token expirado",
        message: "El token ha expirado. Por favor, inicia sesión nuevamente.",
      });
      return;
    }

    if (errorMessage.includes("inválido")) {
      res.status(401).json({
        success: false,
        error: "Token inválido",
        message: "El token proporcionado no es válido.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Error de autenticación",
      message: errorMessage,
    });
  }
};

/**
 * Middleware opcional de autenticación
 * Similar a authMiddleware pero no falla si no hay token
 */
export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
    }

    next();
  } catch (error) {
    console.error(error);
    // En caso de error, simplemente continúa sin usuario
    next();
  }
};

/**
 * Middleware para verificar roles específicos
 * @param allowedRoles - Array de roles permitidos
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "No autenticado",
        message: "Debes estar autenticado para acceder a este recurso",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Acceso denegado",
        message: `Se requiere uno de los siguientes roles: ${allowedRoles.join(", ")}`,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware para verificar permisos específicos
 * @param requiredPermissions - Array de permisos requeridos
 */
export const requirePermissions = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "No autenticado",
        message: "Debes estar autenticado para acceder a este recurso",
      });
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      res.status(403).json({
        success: false,
        error: "Permisos insuficientes",
        message: `Se requieren los siguientes permisos: ${requiredPermissions.join(", ")}`,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware para verificar departamento específico
 * @param allowedDepartments - Array de departamentos permitidos
 */
export const requireDepartment = (...allowedDepartments: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "No autenticado",
        message: "Debes estar autenticado para acceder a este recurso",
      });
      return;
    }

    if (!allowedDepartments.includes(req.user.department)) {
      res.status(403).json({
        success: false,
        error: "Acceso denegado",
        message: `Se requiere pertenecer a uno de los siguientes departamentos: ${allowedDepartments.join(", ")}`,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario sea admin
 */
export const requireAdmin = requireRole("admin");

/**
 * Middleware combinado: role + permissions
 * @param roles - Roles permitidos
 * @param permissions - Permisos requeridos
 */
export const requireRoleAndPermissions = (
  roles: string[],
  permissions: string[]
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "No autenticado",
        message: "Debes estar autenticado para acceder a este recurso",
      });
      return;
    }

    // Verificar rol
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Acceso denegado",
        message: `Se requiere uno de los siguientes roles: ${roles.join(", ")}`,
      });
      return;
    }

    // Verificar permisos
    const userPermissions = req.user.permissions || [];
    const hasAllPermissions = permissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      res.status(403).json({
        success: false,
        error: "Permisos insuficientes",
        message: `Se requieren los siguientes permisos: ${permissions.join(", ")}`,
      });
      return;
    }

    next();
  };
};

// Exportación por defecto
export default authMiddleware;
