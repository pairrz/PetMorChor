import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/password";
import { createSessionAndSetCookie } from "@/lib/session";
import { POST } from "./route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/password", () => ({
  comparePassword: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  createSessionAndSetCookie: vi.fn(),
}));

const existingUser = {
  id: 42,
  name: "Test User",
  email: "user@example.com",
  password: "hashed-password",
  oauthProvider: null,
  role: "USER" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("authenticates a valid user and creates a session", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser);
    vi.mocked(comparePassword).mockResolvedValue(true);

    const response = await POST(
      createRequest({ email: "user@example.com", password: "correct-password" })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
    expect(comparePassword).toHaveBeenCalledWith(
      "correct-password",
      "hashed-password"
    );
    expect(createSessionAndSetCookie).toHaveBeenCalledWith(existingUser.id);
  });

  it("returns validation errors without querying users for invalid input", async () => {
    const response = await POST(
      createRequest({ email: "not-an-email", password: "" })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errors: {
        email: expect.any(Array),
        password: expect.any(Array),
      },
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(createSessionAndSetCookie).not.toHaveBeenCalled();
  });

  it("returns the same unauthorized response for an unknown user and wrong password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const unknownUserResponse = await POST(
      createRequest({ email: "unknown@example.com", password: "any-password" })
    );

    vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser);
    vi.mocked(comparePassword).mockResolvedValue(false);

    const wrongPasswordResponse = await POST(
      createRequest({ email: "user@example.com", password: "wrong-password" })
    );

    expect(unknownUserResponse.status).toBe(401);
    expect(wrongPasswordResponse.status).toBe(401);
    await expect(unknownUserResponse.json()).resolves.toEqual(
      await wrongPasswordResponse.json()
    );
    expect(createSessionAndSetCookie).not.toHaveBeenCalled();
  });

  it("rejects passwordless OAuth accounts without comparing or creating a session", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...existingUser,
      password: null,
    });

    const response = await POST(
      createRequest({ email: "user@example.com", password: "any-password" })
    );

    expect(response.status).toBe(401);
    expect(comparePassword).not.toHaveBeenCalled();
    expect(createSessionAndSetCookie).not.toHaveBeenCalled();
  });

  it("returns a server error when the user lookup fails", async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      createRequest({ email: "user@example.com", password: "any-password" })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Server error",
    });
    expect(createSessionAndSetCookie).not.toHaveBeenCalled();
  });
});
