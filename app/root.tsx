import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";
import type { Route } from "./+types/root";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const init = usePuterStore((s) => s.init);
  const [ToastContainer, setToastContainer] =
    useState<null | React.ComponentType<{
      position?: "top-right" | "top-left" | "top-center" | "bottom-right" | "bottom-left" | "bottom-center";
      theme?: "light" | "dark" | "colored";
      autoClose?: number | false;
      hideProgressBar?: boolean;
      newestOnTop?: boolean;
      closeOnClick?: boolean;
      pauseOnHover?: boolean;
    }>>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      init();
    }
  }, [init]);

  useEffect(() => {
    let mounted = true;
    const loadToast = async () => {
      await import("react-toastify/dist/ReactToastify.css");
      const mod = await import("react-toastify");
      if (mounted) {
        setToastContainer(() => mod.ToastContainer);
      }
    };
    loadToast();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <script src="https://js.puter.com/v2/" defer></script>

        {children}
        {ToastContainer ? (
          <ToastContainer
            position="top-right"
            theme="dark"
            autoClose={3000}
            hideProgressBar
            newestOnTop
            closeOnClick
            pauseOnHover
          />
        ) : null}

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">{message}</h1>
      <p className="mt-2">{details}</p>
      {stack && (
        <pre className="mt-4 p-4 bg-gray-100 rounded">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
