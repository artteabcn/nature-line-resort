import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // `content` (admin UI) lives outside locale routing — no /en/content etc.
  matcher: ["/((?!api|_next|_vercel|content|.*\\..*).*)"],
};
