import type { UserRole } from "@/lib/types";

export const NAV_PATHS = {
  dashboard: "/",
  today: "/bugun",
  cases: "/dosyalar",
  tasks: "/isler",
  calendar: "/takvim",
  notifications: "/bildirimler",
  profile: "/profil",
  settings: "/ayarlar",
} as const;

const ALL_APP_PATHS = Object.values(NAV_PATHS);

const STAFF_PATHS = [
  NAV_PATHS.dashboard,
  NAV_PATHS.today,
  NAV_PATHS.cases,
  NAV_PATHS.tasks,
  NAV_PATHS.calendar,
  NAV_PATHS.notifications,
  NAV_PATHS.profile,
] as const;

export const ROLE_NAV_PATHS: Record<UserRole, readonly string[]> = {
  ADMIN: ALL_APP_PATHS,
  LAWYER: STAFF_PATHS,
  SECRETARY: STAFF_PATHS,
};

export type AppAction =
  | "delete_case"
  | "delete_task"
  | "manage_users"
  | "download_backup"
  | "view_admin_settings";

const ACTION_ROLES: Record<AppAction, readonly UserRole[]> = {
  delete_case: ["ADMIN"],
  delete_task: ["ADMIN"],
  manage_users: ["ADMIN"],
  download_backup: ["ADMIN"],
  view_admin_settings: ["ADMIN"],
};

export function canPerform(role: UserRole, action: AppAction): boolean {
  return ACTION_ROLES[action].includes(role);
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  const allowed = ROLE_NAV_PATHS[role];
  return allowed.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function shouldDefaultToMyTasks(role: UserRole): boolean {
  return role === "LAWYER" || role === "SECRETARY";
}

/** @deprecated Prefer canPerform(role, "delete_case") */
export function canDeleteCase(role: UserRole): boolean {
  return canPerform(role, "delete_case");
}

export function canDeleteTask(role: UserRole): boolean {
  return canPerform(role, "delete_task");
}
