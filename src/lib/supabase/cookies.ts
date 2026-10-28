// Session cookie settings. The app has no browser-side Supabase client, so
// scripts never need to read these: HttpOnly keeps tokens away from any XSS.
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
