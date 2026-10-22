"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import dynamic from "next/dynamic";
import {
  useTideCloak,
  type TideCloakContextProviderProps,
} from "@tidecloak/nextjs";
const TideProvider = dynamic(
  () => import("@tidecloak/nextjs").then((m) => m.TideCloakProvider),
  { ssr: false },
);
type Auth = {
  authenticated: boolean;
  loading: boolean;
  configured: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  secureFetch: (url: string, init?: RequestInit) => Promise<Response>;
};
const AuthContext = createContext<Auth>({
  authenticated: false,
  loading: true,
  configured: false,
  error: null,
  login: async () => {},
  logout: async () => {},
  secureFetch: async () => {
    throw new Error("Sign in with TideCloak first.");
  },
});
export function useAuth() {
  return useContext(AuthContext);
}
function TideBridge({ children }: { children: React.ReactNode }) {
  const auth = useTideCloak();
  const { secureFetch } = auth;
  const fetcher = useCallback(
    (url: string, init?: RequestInit) => secureFetch(url, init),
    [secureFetch],
  );
  const value = useMemo(
    () => ({
      authenticated: auth.authenticated,
      loading: auth.isInitializing || auth.isLoading,
      configured: true,
      error: auth.initError?.message ?? null,
      login: auth.login,
      logout: auth.logout,
      secureFetch: fetcher,
    }),
    [
      auth.authenticated,
      auth.isInitializing,
      auth.isLoading,
      auth.initError,
      auth.login,
      auth.logout,
      fetcher,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function Providers({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    config: TideCloakContextProviderProps["config"] | null;
    loading: boolean;
    error: string | null;
  }>({ config: null, loading: true, error: null });
  useEffect(() => {
    let active = true;
    fetch("/api/config", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            "TideCloak enrollment or adapter setup is incomplete. See the setup guide.",
          );
        return r.json();
      })
      .then((config) => {
        if (active) setState({ config, loading: false, error: null });
      })
      .catch((e) => {
        if (active)
          setState({ config: null, loading: false, error: e.message });
      });
    return () => {
      active = false;
    };
  }, []);
  if (!state.config)
    return (
      <AuthContext.Provider
        value={{
          authenticated: false,
          loading: state.loading,
          configured: false,
          error: state.error,
          login: async () => {
            throw new Error("Complete TideCloak setup before signing in.");
          },
          logout: async () => {},
          secureFetch: async () => {
            throw new Error("Sign in with TideCloak first.");
          },
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  return (
    <TideProvider
      config={{ ...state.config, useDPoP: { mode: "strict", alg: "ES256" } }}
    >
      <TideBridge>{children}</TideBridge>
    </TideProvider>
  );
}
