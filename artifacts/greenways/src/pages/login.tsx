import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  getGetAuthStatusQueryKey,
  useGetAuthStatus,
  useVerifyPassword,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { schoolPortraitUrl } from "../local-media";

export function LoginPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const statusQuery = useGetAuthStatus({
    query: {
      queryKey: getGetAuthStatusQueryKey(),
      retry: false,
      refetchOnMount: "always",
    },
  });
  const verifyPassword = useVerifyPassword();

  useEffect(() => {
    if (statusQuery.isLoading) return;
    if (statusQuery.data?.status === "approved") {
      setLocation("/home");
      return;
    }

    setReady(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [setLocation, statusQuery.data?.status, statusQuery.isLoading]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!token.trim() || verifyPassword.isPending) return;
    setError("");

    verifyPassword.mutate(
      { data: { password: token } },
      {
        onSuccess: (result) => {
          if (!result.valid) {
            setError("That token was not recognized.");
            setToken("");
            inputRef.current?.focus();
            return;
          }

          queryClient.setQueryData(getGetAuthStatusQueryKey(), {
            status: "approved" as const,
          });
          setLocation("/home");
        },
        onError: () => setError("Access service is unavailable. Try again."),
      },
    );
  };

  return (
    <main className="school-shell login-shell">
      <div className="login-grid" aria-label="Greenways School access">
        <section className="identity-card">
          <img src={schoolPortraitUrl} alt="Greenways School" />
          <div className="identity-overlay">
            <span className="school-mark">GW</span>
            <div>
              <p>Private community</p>
              <h1>Greenways School</h1>
            </div>
          </div>
        </section>

        <section className="access-card" aria-labelledby="access-heading">
          <div className="access-icon" aria-hidden="true">
            <ShieldCheck />
          </div>
          <p className="eyebrow">Member access</p>
          <h2 id="access-heading">Enter your token</h2>
          <p className="access-copy">
            Use the private token issued by Greenways School.
          </p>

          {ready ? (
            <form onSubmit={handleSubmit} className="access-form">
              <label htmlFor="school-token">Access token</label>
              <div className="token-field">
                <KeyRound aria-hidden="true" />
                <input
                  ref={inputRef}
                  id="school-token"
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Enter token"
                  autoComplete="current-password"
                  maxLength={256}
                />
                <button
                  type="button"
                  onClick={() => setShowToken((value) => !value)}
                  className="icon-button"
                  title={showToken ? "Hide token" : "Show token"}
                >
                  {showToken ? <EyeOff /> : <Eye />}
                </button>
              </div>

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!token.trim() || verifyPassword.isPending}
                className="primary-button"
              >
                {verifyPassword.isPending ? (
                  <LoaderCircle className="spin" aria-hidden="true" />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
                <span>
                  {verifyPassword.isPending ? "Checking token" : "Enter school"}
                </span>
              </button>
            </form>
          ) : (
            <div className="access-loading" aria-label="Checking session">
              <LoaderCircle className="spin" aria-hidden="true" />
              <span>Checking access</span>
            </div>
          )}

          <p className="privacy-note">
            Private access · Authorized members only
          </p>
        </section>
      </div>
    </main>
  );
}
