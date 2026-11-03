const LEGACY_ADMIN = ["sysadmin", "schooladmin"];

export function normalizeRole(role?: string | null): string {
  return (role ?? "").toLowerCase().trim();
}

export function isAdminRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r.includes("_admin") || LEGACY_ADMIN.includes(r);
}

export function isGlobalAdmin(role?: string | null): boolean {
  const r = normalizeRole(role);
  return ["system_admin", "school_admin", ...LEGACY_ADMIN].includes(r);
}
