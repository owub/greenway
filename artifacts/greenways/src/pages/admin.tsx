import { useState } from "react";
import {
  useAdminLogin,
  useListPendingApprovals,
  getListPendingApprovalsQueryKey,
  useApproveUser,
  useDenyUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";

export function AdminPage() {
  const [adminToken, setAdminToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const adminLogin = useAdminLogin();
  const approveUser = useApproveUser();
  const denyUser = useDenyUser();

  const { data: approvals, isLoading } = useListPendingApprovals(
    { adminToken },
    { query: { enabled: !!adminToken, queryKey: getListPendingApprovalsQueryKey({ adminToken }) } }
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    adminLogin.mutate(
      { data: { password } },
      {
        onSuccess: (result) => {
          if (result.valid && result.adminToken) setAdminToken(result.adminToken);
          else setError("Invalid admin password.");
        },
        onError: () => setError("Connection error."),
      }
    );
  };

  const handleApprove = (sessionId: string) => {
    approveUser.mutate(
      { sessionId },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPendingApprovalsQueryKey({ adminToken }) }) }
    );
  };

  const handleDeny = (sessionId: string) => {
    denyUser.mutate(
      { sessionId },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPendingApprovalsQueryKey({ adminToken }) }) }
    );
  };

  if (!adminToken) {
    return (
      <div className="auth-bg grain min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div
            className="absolute rounded-full animate-orb-float"
            style={{
              width: 500, height: 500,
              top: "-20%", left: "-15%",
              background: "radial-gradient(circle, hsl(160 50% 7% / 0.9) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
          <div
            className="absolute rounded-full animate-orb-float-slow"
            style={{
              width: 400, height: 400,
              bottom: "-15%", right: "-10%",
              background: "radial-gradient(circle, hsl(45 35% 8% / 0.7) 0%, transparent 70%)",
              filter: "blur(70px)",
            }}
          />
        </div>

        <div className="relative z-10 w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="gold-line w-16 mx-auto mb-5 animate-fade-in" />
            <h1
              className="text-4xl font-serif text-foreground tracking-wide animate-logo-in"
              style={{ textShadow: "0 0 50px hsl(45 40% 60% / 0.2)" }}
            >
              Greenways
            </h1>
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mt-3 animate-fade-in delay-300">
              Owner Access
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 animate-fade-in-up delay-200" data-testid="form-admin-login">
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-card/80 backdrop-blur border border-border/60 text-foreground px-4 py-3.5 text-sm focus:outline-none focus:border-primary/60 focus:shadow-[0_0_20px_hsl(45_40%_60%/0.08)] transition-all duration-300"
                placeholder="Admin passphrase"
                autoFocus
                data-testid="input-admin-password"
              />
            </div>
            {error && <p className="text-destructive text-xs animate-fade-in" data-testid="text-error">{error}</p>}
            <button
              type="submit"
              disabled={!password || adminLogin.isPending}
              className="btn-shimmer w-full text-primary-foreground py-3.5 text-xs tracking-[0.25em] uppercase font-medium disabled:opacity-40 transition-all duration-300 hover:shadow-[0_0_30px_hsl(45_40%_60%/0.3)]"
              data-testid="button-admin-login"
            >
              {adminLogin.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border border-primary-foreground border-t-transparent rounded-full animate-spin inline-block" />
                  Verifying
                </span>
              ) : "Access Panel"}
            </button>
            <div className="gold-line mt-2" />
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="grain min-h-screen bg-background">
      <header className="border-b border-border/60 px-6 py-4 flex items-center justify-between animate-fade-in backdrop-blur-sm sticky top-0 z-40 bg-background/90">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-serif text-foreground" style={{ textShadow: "0 0 30px hsl(45 40% 60% / 0.15)" }}>
            Greenways
          </h1>
          <div className="w-px h-4 bg-border" />
          <span className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Admin</span>
        </div>
        <button
          onClick={() => setAdminToken("")}
          className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-admin-logout"
        >
          Logout
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="space-y-2 mb-10 animate-fade-in-up">
          <h2
            className="text-2xl font-serif text-foreground"
            style={{ textShadow: "0 0 30px hsl(45 40% 60% / 0.1)" }}
          >
            Pending Approvals
          </h2>
          <div className="gold-line w-16 mt-3" />
          <p className="text-muted-foreground text-sm pt-1">Review face scans from users requesting access.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card border border-border/60 p-5 animate-pulse h-28" />
            ))}
          </div>
        ) : approvals && approvals.length > 0 ? (
          <div className="space-y-3">
            {approvals.map((approval, idx) => (
              <div
                key={approval.id}
                className="card-glow bg-card border border-border/60 p-5 flex items-center gap-5 animate-fade-in-up"
                style={{ animationDelay: `${idx * 80}ms` }}
                data-testid={`card-approval-${approval.id}`}
              >
                {approval.faceImageData ? (
                  <img
                    src={approval.faceImageData}
                    alt="Face scan"
                    className="w-16 h-16 object-cover border border-border/60 flex-shrink-0"
                    style={{ boxShadow: "0 0 16px hsl(160 60% 5% / 0.6)" }}
                    data-testid={`img-face-${approval.id}`}
                  />
                ) : (
                  <div className="w-16 h-16 bg-muted border border-border/60 flex-shrink-0 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">No photo</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono text-muted-foreground/60 truncate tracking-wide">
                    {approval.sessionId}
                  </p>
                  <p className="text-[10px] text-muted-foreground/40 mt-1">
                    {new Date(approval.createdAt).toLocaleString()}
                  </p>
                  <span
                    className={`inline-block mt-2 text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 ${
                      approval.status === "pending"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : approval.status === "approved"
                        ? "bg-green-900/30 text-green-400 border border-green-700/30"
                        : "bg-destructive/10 text-destructive border border-destructive/20"
                    }`}
                    data-testid={`status-approval-${approval.id}`}
                  >
                    {approval.status}
                  </span>
                </div>

                {approval.status === "pending" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(approval.sessionId)}
                      disabled={approveUser.isPending}
                      className="flex items-center gap-1.5 bg-green-900/20 border border-green-700/40 text-green-400 px-3.5 py-2 text-[10px] tracking-[0.15em] uppercase hover:bg-green-900/40 hover:shadow-[0_0_16px_rgba(74,222,128,0.1)] transition-all duration-300 disabled:opacity-50"
                      data-testid={`button-approve-${approval.id}`}
                    >
                      <Check className="w-3 h-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeny(approval.sessionId)}
                      disabled={denyUser.isPending}
                      className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/30 text-destructive px-3.5 py-2 text-[10px] tracking-[0.15em] uppercase hover:bg-destructive/20 hover:shadow-[0_0_16px_hsl(0_60%_40%/0.15)] transition-all duration-300 disabled:opacity-50"
                      data-testid={`button-deny-${approval.id}`}
                    >
                      <X className="w-3 h-3" />
                      Deny
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 animate-fade-in-up">
            <div className="gold-line w-20 mx-auto mb-8" />
            <p className="text-muted-foreground text-sm">No requests yet.</p>
          </div>
        )}
      </main>
    </div>
  );
}
