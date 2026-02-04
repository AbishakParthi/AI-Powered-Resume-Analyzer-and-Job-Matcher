import { usePuterStore } from "~/lib/puter";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useHydrated } from "~/hooks/useHydrated"; // ✅ ADD THIS

export const meta = () => ([
  { title: "Resumind | Auth" },
  { name: "description", content: "Log into your account" },
]);

const Auth = () => {
  const hydrated = useHydrated(); // ✅ ADD THIS
  const { isLoading, auth } = usePuterStore();

  const location = useLocation();
  const navigate = useNavigate();

  const next =
    new URLSearchParams(location.search).get("next") || "/";

  // ✅ FIX NAVIGATION (runs only on client)
  useEffect(() => {
    if (!hydrated) return;

    if (auth.isAuthenticated) {
      navigate(next, { replace: true });
    }
  }, [hydrated, auth.isAuthenticated, next, navigate]);

  // ✅ PREVENT HYDRATION MISMATCH
  if (!hydrated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen flex items-center justify-center">
      <div className="gradient-border shadow-lg">
        <section className="flex flex-col gap-8 bg-white rounded-2xl p-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1>Welcome</h1>
            <h2>Log In to Continue Your Job Journey</h2>
          </div>

          <div>
            {isLoading ? (
              <button className="auth-button animate-pulse">
                <p>Signing you in...</p>
              </button>
            ) : auth.isAuthenticated ? (
              <button
                className="auth-button"
                onClick={auth.signOut}
              >
                <p>Log Out</p>
              </button>
            ) : (
              <button
                className="auth-button"
                onClick={auth.signIn}
              >
                <p>Log In</p>
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Auth;
