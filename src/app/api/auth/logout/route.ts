import { NextRequest } from "next/server";
import { apiError, apiResponse, requireSameOrigin } from "@/lib/api/http";
import { clearSessionCookie, revokeSession, sessionTokenFromRequest } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    await revokeSession(sessionTokenFromRequest(request));
    const response = apiResponse({ signedOut: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
