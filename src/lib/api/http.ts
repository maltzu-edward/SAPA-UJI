import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = "API_ERROR") {
    super(message);
    this.name = "ApiError";
  }
}

export function apiResponse(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Request data is invalid.", details: error.issues } }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (code === "P2002") return NextResponse.json({ error: { code: "CONFLICT", message: "A record with these values already exists." } }, { status: 409, headers: { "Cache-Control": "no-store" } });
    if (code === "P2003") return NextResponse.json({ error: { code: "INVALID_REFERENCE", message: "A referenced record does not exist or cannot be changed." } }, { status: 400, headers: { "Cache-Control": "no-store" } });
    if (code === "P2025") return NextResponse.json({ error: { code: "NOT_FOUND", message: "The requested record was not found." } }, { status: 404, headers: { "Cache-Control": "no-store" } });
    if (code === "P2034") return NextResponse.json({ error: { code: "TRANSACTION_CONFLICT", message: "The record changed during this request. Try again." } }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }
  console.error("Unhandled API error:", error);
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } }, { status: 500, headers: { "Cache-Control": "no-store" } });
}

export async function readJson<T>(request: NextRequest, schema: z.ZodType<T>): Promise<T> {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.", "INVALID_JSON");
  }
  if (Buffer.byteLength(raw, "utf8") > 1_000_000) throw new ApiError(413, "Request body is too large.", "BODY_TOO_LARGE");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.", "INVALID_JSON");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw parsed.error;
  return parsed.data;
}

export function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new ApiError(403, "A same-origin request is required.", "ORIGIN_CHECK_FAILED");
  }
}

export function queryNumber(value: string | null, fallback: number, min: number, max: number) {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ApiError(400, `Query value must be an integer from ${min} to ${max}.`, "INVALID_QUERY");
  }
  return parsed;
}
