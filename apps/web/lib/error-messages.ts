const ERROR_MESSAGES: Record<string, string> = {
  LAST_OWNER: "No puedes cambiar el rol ni eliminar al ultimo Tenant Admin del tenant.",
  ACCOUNT_REQUIRES_INVITATION: "La cuenta debe incorporarse mediante una invitacion.",
  FORBIDDEN: "No tienes permisos para realizar esta accion.",
  UNAUTHORIZED: "No estas autenticado. Inicia sesion para continuar.",
  NOT_MEMBER: "No eres miembro de este tenant.",
  NOT_FOUND: "El recurso solicitado no existe.",
  TENANT_SUSPENDED: "El tenant esta suspendido. Las acciones estan bloqueadas hasta su reactivacion.",
  TENANT_ARCHIVED: "El tenant esta archivado. Las acciones estan bloqueadas hasta su reactivacion.",
  TENANT_PROVISIONING: "El tenant esta en provisionamiento. Solo se permiten invitaciones Tenant Admin y configuracion.",
  SLUG_TAKEN: "El slug ya esta en uso. Elige otro.",
  INVALID_SLUG: "El slug no es valido. Usa solo minusculas, numeros y guiones (3-63 caracteres).",
  INVALID_OWNER_EMAIL: "El email del owner no es valido.",
  INVALID_EMAIL: "El email no es valido.",
  INVALID_ROLE: "El rol especificado no es valido.",
  LEGACY_ROLE_NOT_ASSIGNABLE: "Este rol pertenece al modelo anterior y ya no puede asignarse.",
  INVALID_TRANSITION: "La transicion de estado no esta permitida.",
  DUPLICATE_MEMBERSHIP: "El usuario ya es miembro de este tenant.",
  DUPLICATE_INVITATION: "Ya existe una invitacion activa para este email.",
  ALREADY_ACCEPTED: "La invitacion ya fue aceptada.",
  INVALID_PAGINATION: "Los parametros de paginacion no son validos.",
};

export function translateError(code: string, fallback: string): string {
  return ERROR_MESSAGES[code] ?? fallback;
}
