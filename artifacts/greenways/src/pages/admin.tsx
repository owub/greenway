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
          if (result.valid && result.adminToken) {
            setAdminToken(result.adminToken);
          } else {
            setError("Invalid admin password.");
          }
        },
        onError: () => setError("Connection error."),
      }
    );
  };

  const handleApprove = (sessionId: string) => {
    approveUser.mutate(
      { sessionId },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({
            queryKey: getListPendingApprovalsQueryKey({ adminToken }),
          }),
      }
    );
  };

  const handleDeny = (sessionId: string) => {
    denyUser.mutate(
      { sessionId },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({
            queryKey: getListPendingApprovalsQueryKey({ adminToken }),
          }),
      }
    );
  };

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-block w-12 h-px bg-primary mb-4" />
            <h1 className="text-3xl font-serif text-foreground">Greenways</h1>
            <p className="text-xs tracking-widest uppercase text-muted-foreground">Owner Access</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4" data-testid="form-admin-login">
            <div className="space-y-1">
              <label className="text-xs tracking-widest uppercase text-muted-foreground">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-card border border-border text-foreground px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                placeholder="Admin passphrase"
                autoFocus
                data-testid="input-admin-password"
              />
            </div>
            {error && <p className="text-destructive text-xs" data-testid="text-error">{error}</p>}
            <button
              type="submit"
              disabled={!password || adminLogin.isPending}
              className="w-full bg-primary text-primary-foreground py-3 text-xs tracking-widest uppercase font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              data-testid="button-admin-login"
            >
              {adminLogin.isPending ? "Verifying..." : "Access Panel"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-serif text-foreground">Greenways</h1>
          <div className="w-px h-4 bg-border" />
          <span className="text-xs tracking-widest uppercase text-muted-foreground">Admin</span>
        </div>
        <button
          onClick={() => setAdminToken("")}
          className="text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-admin-logout"
        >
          Logout
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="space-y-2 mb-8">
          <h2 className="text-2xl font-serif text-foreground">Pending Approvals</h2>
          <p className="text-muted-foreground text-sm">
            Review face scans from users requesting access.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card border border-border p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : approvals && approvals.length > 0 ? (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className="bg-card border border-border p-4 flex items-center gap-4"
                data-testid={`card-approval-${approval.id}`}
              >
                {approval.faceImageData ? (
                  <img
                    src={approval.faceImageData}
                    alt="Face scan"
                    className="w-16 h-16 object-cover rounded-sm border border-border flex-shrink-0"
                    data-testid={`img-face-${approval.id}`}
                  />
                ) : (
                  <div className="w-16 h-16 bg-muted rounded-sm border border-border flex-shrink-0 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">No photo</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    {approval.sessionId}
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    {new Date(approval.createdAt).toLocaleString()}
                  </p>
                  <span
                    className={`inline-block mt-1 text-xs tracking-widest uppercase px-2 py-0.5 ${
                      approval.status === "pending"
                        ? "bg-primary/10 text-primary"
                        : approval.status === "approved"
                        ? "bg-green-900/30 text-green-400"
                        : "bg-destructive/10 text-destructive"
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
                      className="flex items-center gap-1.5 bg-green-900/30 border border-green-700/50 text-green-400 px-3 py-2 text-xs tracking-widest uppercase hover:bg-green-900/50 transition-colors disabled:opacity-50"
                      data-testid={`button-approve-${approval.id}`}
                    >
                      <Check className="w-3 h-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeny(approval.sessionId)}
                      disabled={denyUser.isPending}
                      className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/30 text-destructive px-3 py-2 text-xs tracking-widest uppercase hover:bg-destructive/20 transition-colors disabled:opacity-50"
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
          <div className="text-center py-20">
            <div className="w-16 h-px bg-border mx-auto mb-6" />
            <p className="text-muted-foreground text-sm">No pending approvals.</p>
          </div>
        )}
      </main>
    </div>
  );
}
