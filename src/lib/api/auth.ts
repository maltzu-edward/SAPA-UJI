import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextRequest, NextResponse } from "next/server";
import type { RoleName } from "@prisma/client";
import { ApiError } from "@/lib/api/http";
import { prisma } from "@/lib/prisma";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "sapa_uji_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type ApiActor = {
  id: string;
  email: string;
  name: string;
  roles: { role: RoleName; institutionId: string | null }[];
  institutionIds: string[];
};

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt-v1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string | null) {
  if (!encoded) return false;
  const [version, saltText, hashText] = encoded.split("$");
  if (version !== "scrypt-v1" || !saltText || !hashText) return false;
  try {
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(hashText, "base64url");
    if (salt.length !== 16 || expected.length !== 64) return false;
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt } });
  return { token, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
  });
}

export async function revokeSession(token: string | undefined) {
  if (!token) return;
  await prisma.session.updateMany({
    where: { tokenHash: hashSessionToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getOptionalActor(request: NextRequest): Promise<ApiActor | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { include: { roles: true, memberships: { where: { membershipStatus: "ACTIVE" }, include: { institution: { select: { status: true } } } } } } },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) {
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    roles: session.user.roles.map(({ role, institutionId }) => ({ role, institutionId })),
    institutionIds: session.user.memberships.filter((membership) => membership.institution.status === "ACTIVE").map((membership) => membership.institutionId),
  };
}

export async function requireActor(request: NextRequest) {
  const actor = await getOptionalActor(request);
  if (!actor) throw new ApiError(401, "Sign in is required.", "AUTHENTICATION_REQUIRED");
  return actor;
}

export function hasRole(actor: ApiActor, role: RoleName, institutionId?: string) {
  return actor.roles.some((entry) => {
    if (entry.role !== role) return false;
    if (role === "SUPER_ADMIN" && entry.institutionId === null) return true;
    return institutionId ? entry.institutionId === institutionId : true;
  });
}

export function hasInstitutionAccess(actor: ApiActor, institutionId: string) {
  return hasRole(actor, "SUPER_ADMIN") || actor.institutionIds.includes(institutionId);
}

export function requireInstitutionRole(actor: ApiActor, institutionId: string, allowed: RoleName[]) {
  if (!hasInstitutionAccess(actor, institutionId)) {
    throw new ApiError(403, "You do not have access to this institution.", "INSTITUTION_ACCESS_DENIED");
  }
  if (!hasRole(actor, "SUPER_ADMIN") && !allowed.some((role) => hasRole(actor, role, institutionId))) {
    throw new ApiError(403, "Your role cannot perform this action.", "ROLE_ACCESS_DENIED");
  }
}

export function sessionTokenFromRequest(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE)?.value;
}
