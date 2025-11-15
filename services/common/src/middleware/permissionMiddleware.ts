import { Request, Response, NextFunction } from "express";
import { JWTPayload } from "../types";

/**
 * Tipos de permisos en RedZ
 */
export enum Permission {
  // Permisos de documentos
  DOCUMENT_READ = "document:read",
  DOCUMENT_WRITE = "document:write",
  DOCUMENT_DELETE = "document:delete",
  DOCUMENT_SHARE = "document:share",

  // Permisos de búsqueda
  SEARCH_BASIC = "search:basic",
  SEARCH_ADVANCED = "search:advanced",
  SEARCH_SEMANTIC = "search:semantic",

  // Permisos de analytics
  ANALYTICS_VIEW = "analytics:view",
  ANALYTICS_EXPORT = "analytics:export",
  ANALYTICS_ADMIN = "analytics:admin",

  // Permisos de usuarios
  USER_READ = "user:read",
  USER_WRITE = "user:write",
  USER_DELETE = "user:delete",

  // Permisos de departamento
  DEPARTMENT_MANAGE = "department:manage",
}

/**
 * Matriz de roles y sus permisos por defecto
 */
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_WRITE,
    Permission.DOCUMENT_DELETE,
    Permission.DOCUMENT_SHARE,
    Permission.SEARCH_BASIC,
    Permission.SEARCH_ADVANCED,
    Permission.SEARCH_SEMANTIC,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.ANALYTICS_ADMIN,
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.USER_DELETE,
    Permission.DEPARTMENT_MANAGE,
  ],
  manager: [
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_WRITE,
    Permission.DOCUMENT_SHARE,
    Permission.SEARCH_BASIC,
    Permission.SEARCH_ADVANCED,
    Permission.SEARCH_SEMANTIC,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.USER_READ,
  ],
  user: [
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_WRITE,
    Permission.SEARCH_BASIC,
    Permission.SEARCH_ADVANCED,
    Permission.ANALYTICS_VIEW,
  ],
  guest: [Permission.DOCUMENT_READ, Permission.SEARCH_BASIC],
};

/**
 * Middleware que verifica si el usuario tiene un permiso específico
 * @param requiredPermissions - Permisos requeridos (OR logic: solo necesita UNO)
 */
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "No autorizado",
        message: "Autenticación requerida",
      });
      return;
    }

    const userPermissions = getUserPermissions(req.user);
    const hasPermission = requiredPermissions.some((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasPermission) {
      res.status(403).json({
        error: "Prohibido",
        message: `Requiere permisos: ${requiredPermissions.join(" o ")}`,
        userPermissions, // Para debugging (remover en producción)
      });
      return;
    }

    next();
  };
};

/**
 * Middleware que requiere TODOS los permisos especificados (AND logic)
 * @param requiredPermissions - Todos los permisos requeridos
 */
export const requireAllPermissions = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "No autorizado",
        message: "Autenticación requerida",
      });
      return;
    }

    const userPermissions = getUserPermissions(req.user);
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasAllPermissions) {
      res.status(403).json({
        error: "Prohibido",
        message: `Requiere TODOS los permisos: ${requiredPermissions.join(", ")}`,
      });
      return;
    }

    next();
  };
};

/**
 * Obtiene todos los permisos de un usuario (rol + permisos custom)
 * @param user - Payload del JWT
 * @returns Array de permisos
 */
const getUserPermissions = (user: JWTPayload): Permission[] => {
  // Permisos base del rol
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];

  // Permisos custom del usuario (si existen en el JWT)
  const customPermissions = (user.permissions || []) as Permission[];

  // Combinar y eliminar duplicados
  return [...Array.from(new Set([...rolePermissions, ...customPermissions]))];
};

/**
 * Middleware específico para documentos
 * Verifica si el usuario puede acceder a un documento según su departamento
 */
export const canAccessDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      error: "No autorizado",
      message: "Autenticación requerida",
    });
    return;
  }

  // Aquí deberías consultar la base de datos para obtener el documento
  // y verificar si el usuario tiene acceso
  // Ejemplo:
  // const document = await DocumentService.findById(documentId);

  // Simulación (reemplazar con lógica real):

  const userRole = req.user.role;

  // Los admins tienen acceso total
  if (userRole === "admin") {
    next();
    return;
  }

  // Verificar si el documento pertenece al departamento del usuario
  // Esta lógica debe adaptarse a tu base de datos
  // const documentDepartment = document.department;
  // if (documentDepartment === userDepartment) {
  //   next();
  //   return;
  // }

  // Por ahora, permite el acceso (implementar lógica real)
  try {
    next();
  } catch (error) {
    res.status(500).json({
      error: "Error interno",
      message: "Error verificando permisos de documento",
    });
  }
};
/**
 * Middleware para operaciones de escritura en documentos
 */
export const canModifyDocument = [
  requirePermission(Permission.DOCUMENT_WRITE),
  canAccessDocument,
];

/**
 * Middleware para eliminar documentos
 */
export const canDeleteDocument = [
  requirePermission(Permission.DOCUMENT_DELETE),
  canAccessDocument,
];

/**
 * Middleware para compartir documentos
 */
export const canShareDocument = [
  requirePermission(Permission.DOCUMENT_SHARE),
  canAccessDocument,
];

/**
 * Middleware para búsquedas avanzadas
 */
export const canUseAdvancedSearch = requirePermission(
  Permission.SEARCH_ADVANCED,
  Permission.SEARCH_SEMANTIC
);

/**
 * Middleware para analytics
 */
export const canViewAnalytics = requirePermission(Permission.ANALYTICS_VIEW);

export const canExportAnalytics = requireAllPermissions(
  Permission.ANALYTICS_VIEW,
  Permission.ANALYTICS_EXPORT
);

/**
 * Middleware específico para búsqueda por departamento
 * Filtra resultados según el departamento del usuario
 */
export const filterByDepartment = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      error: "No autorizado",
      message: "Autenticación requerida",
    });
    return;
  }

  // Los admins pueden ver todos los departamentos
  if (req.user.role === "admin") {
    req.query.department = "all";
  } else {
    // Forzar filtro por departamento del usuario
    req.query.department = req.user.department;
  }

  next();
};

/**
 * Helper: Verifica si un usuario tiene un permiso específico
 * @param user - Usuario del JWT
 * @param permission - Permiso a verificar
 * @returns true si tiene el permiso
 */
export const hasPermission = (
  user: JWTPayload,
  permission: Permission
): boolean => {
  const userPermissions = getUserPermissions(user);
  return userPermissions.includes(permission);
};

/**
 * Helper: Verifica si un usuario puede acceder a un departamento
 * @param user - Usuario del JWT
 * @param targetDepartment - Departamento a verificar
 * @returns true si tiene acceso
 */
export const canAccessDepartment = (
  user: JWTPayload,
  targetDepartment: string
): boolean => {
  if (user.role === "admin") return true;

  // Usuarios solo acceden a su departamento
  return user.department === targetDepartment;
};

export default {
  Permission,
  requirePermission,
  requireAllPermissions,
  canAccessDocument,
  canModifyDocument,
  canDeleteDocument,
  canShareDocument,
  canUseAdvancedSearch,
  canViewAnalytics,
  canExportAnalytics,
  filterByDepartment,
  hasPermission,
  canAccessDepartment,
};
