export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/",
    "/data-sources/:path*",
    "/ask/:path*",
    "/history/:path*",
    "/saved/:path*",
  ],
};
