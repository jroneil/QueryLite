import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/",
    "/data-sources/:path*",
    "/ask/:path*",
    "/history/:path*",
    "/saved/:path*",
  ],
};
