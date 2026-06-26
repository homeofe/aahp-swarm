export interface RolePlan {
  role: string
}

export interface RoleRouter {
  next(role: string): string | undefined
}

export function createRoleRouter(roles: string[]): RoleRouter {
  return {
    next(currentRole: string): string | undefined {
      const idx = roles.indexOf(currentRole)
      if (idx < 0 || idx + 1 >= roles.length) return undefined
      return roles[idx + 1]
    },
  }
}
