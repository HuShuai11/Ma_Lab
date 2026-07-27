import {
  clearSessionCookie,
  deleteAdminSession,
  getAdminIdentity,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (await getAdminIdentity(request)) {
    await deleteAdminSession(request);
  }
  return new Response(null, {
    status: 303,
    headers: {
      location: new URL("/admin/login", request.url).toString(),
    "set-cookie": clearSessionCookie(request),
    },
  });
}
