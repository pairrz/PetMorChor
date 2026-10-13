import { getSessionUser, type AuthenticatedUser } from "@/lib/auth-guard";

export async function getAdminUser(): Promise<AuthenticatedUser | null> {
  const user = await getSessionUser();
  return user?.role === "ADMIN" ? user : null;
}
