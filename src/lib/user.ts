import { prisma } from "./prisma";

export async function findOrCreateGoogleUser(
  name: string,
  email: string
) {
  return prisma.user.upsert({
    where: {
      email,
    },
    update: {
      name,
      oauthProvider: "google",
    },
    create: {
      name,
      email,
      oauthProvider: "google",
      role: "USER",
    },
  });
}