import { NextRequest } from "next/server";
import { handleRegisterUserApi } from "@/lib/services/userService";

export const dynamic = "force-dynamic";

// POST /api/users
// - Public endpoint for self-signup.
// - Accepts JSON body with `name`, 8-digit `studentNumber`, `password`, optional `role` ("user"/"admin").
// - Creates user, issues session cookie, and returns normalized record; handles duplicate student numbers.
export async function POST(request: NextRequest) {
  return handleRegisterUserApi(request);
}
