import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import i18n, { detectStoredLang } from "@/i18n";
import { AuthProvider } from "@/lib/auth-context";
import { CurrencyProvider } from "@/lib/currency";
import { Toaster } from "@/components/ui/sonner";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { useTranslation } from "react-i18next";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

function NotFoundComponent() {
  return <NotFoundInner />;
}

function NotFoundInner() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-semibold tracking-tight text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("notFound.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFound.desc")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
          >
            {t("common.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Edu CRM — Modern education management" },
      {
        name: "description",
        content:
          "Edu CRM is a premium education-management platform for schools and learning centers. Manage students, teachers, groups, attendance, tests and payments.",
      },
      { name: "author", content: "Edu CRM" },
      { property: "og:title", content: "Edu CRM — Modern education management" },
      {
        property: "og:description",
        content: "Manage students, teachers, groups, attendance, tests and payments in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "icon", href: "/icon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: THEME_INIT_SCRIPT below intentionally mutates
    // <html>'s class/style *before* React hydrates (to avoid a light/dark flash).
    // That means the live DOM's <html> legitimately has attributes (class="dark",
    // style="color-scheme:dark") that the server-rendered markup didn't — without
    // this flag React treats that expected, intentional difference as a hydration
    // mismatch and logs the "tree hydrated but some attributes... didn't match" warning.
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Applies the saved (or system) theme before first paint, so there's no light/dark flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Runs once, client-side only, AFTER hydration finishes — safe to differ from the server's
  // render at this point (it's a normal post-mount update, not a hydration comparison). See
  // the comment in src/i18n/index.ts for why the initial render can't just use the detected
  // language directly.
  useEffect(() => {
    const stored = detectStoredLang();
    if (stored !== i18n.language) {
      void i18n.changeLanguage(stored);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CurrencyProvider>
          <Outlet />
          <Toaster richColors closeButton position="top-right" />
        </CurrencyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
