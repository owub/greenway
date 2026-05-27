import { useState, useEffect } from "react";
import {
  useAdminLogin,
  useListPendingApprovals,
  getListPendingApprovalsQueryKey,
  useApproveUser,
  useDenyUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, X, Shield, RefreshCw, Monitor, Globe, Clock, Camera } from "lucide-react";

export function AdminPage() {
  const [adminToken, setAdminToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const adminLogin = useAdminLogin();
  const approveUser = useApproveUser();
  const denyUser = useDenyUser();

  const { data: approvals, isLoading, refetch } = useListPendingApprovals(
    { adminToken },
    { query: { enabled: !!adminToken, queryKey: getListPendingApprovalsQueryKey({ adminToken }), refetchInterval: 10_000 } }
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
      { sessionId, params: { adminToken } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPendingApprovalsQueryKey({ adminToken }) }) }
    );
  };

  const handleDeny = (sessionId: string) => {
    denyUser.mutate(
      { sessionId, params: { adminToken } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPendingApprovalsQueryKey({ adminToken }) }) }
    );
  };

  const pending = approvals?.filter(a => a.status === "pending") ?? [];
  const approved = approvals?.filter(a => a.status === "approved") ?? [];
  const denied = approvals?.filter(a => a.status === "denied") ?? [];

  if (!adminToken) {
    return (
      <div className="grain min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="orb-1" />
          <div className="orb-2" />
          <div className="orb-3" />
        </div>
        <div className="relative z-10 w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 border border-border/60 mb-6 animate-fade-in"
              style={{ boxShadow: "0 0 30px hsl(45 40% 60% / 0.1)" }}>
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-4xl font-serif text-foreground tracking-wide animate-logo-in"
              style={{ textShadow: "0 0 50px hsl(45 40% 60% / 0.2)" }}>
              Greenways
            </h1>
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mt-3 animate-fade-in delay-300">
              Owner Control Panel
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 animate-fade-in-up delay-200">
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-card/80 backdrop-blur border border-border/60 text-foreground px-4 py-3.5 text-sm focus:outline-none focus:border-primary/60 focus:shadow-[0_0_20px_hsl(45_40%_60%/0.08)] transition-all duration-300"
                placeholder="Enter admin passphrase"
                autoFocus
              />
            </div>
            {error && <p className="text-destructive text-xs animate-fade-in">{error}</p>}
            <button
              type="submit"
              disabled={!password || adminLogin.isPending}
              className="btn-shimmer w-full text-primary-foreground py-3.5 text-xs tracking-[0.25em] uppercase font-medium disabled:opacity-40 transition-all duration-300 hover:shadow-[0_0_30px_hsl(45_40%_60%/0.3)]"
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
      {/* Header */}
      <header className="border-b border-border/60 px-4 sm:px-6 py-4 flex items-center justify-between animate-fade-in backdrop-blur-sm sticky top-0 z-40 bg-background/95">
        <div className="flex items-center gap-3 sm:gap-4">
          <Shield className="w-4 h-4 text-primary" />
          <h1 className="text-base sm:text-xl font-serif text-foreground" style={{ textShadow: "0 0 30px hsl(45 40% 60% / 0.15)" }}>
            Greenways
          </h1>
          <div className="w-px h-4 bg-border hidden sm:block" />
          <span className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground hidden sm:block">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => refetch()} className="text-muted-foreground hover:text-primary transition-colors" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setAdminToken("")} className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors">
            Logout
          </button>
        </div>
      </header>

      {/* Stats banner */}
      <div className="border-b border-border/40 bg-card/30 px-4 sm:px-6 py-4 animate-fade-in">
        <div className="max-w-4xl mx-auto flex gap-6 sm:gap-10 overflow-x-auto">
          {[
            { label: "Pending", value: pending.length, color: "text-primary" },
            { label: "Approved", value: approved.length, color: "text-green-400" },
            { label: "Denied", value: denied.length, color: "text-destructive" },
            { label: "Total", value: (approvals?.length ?? 0), color: "text-foreground" },
          ].map((s) => (
            <div key={s.label} className="flex-shrink-0 text-center">
              <p className={`text-2xl font-serif ${s.color}`}>{s.value}</p>
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-2 mb-8 animate-fade-in-up">
          <h2 className="text-2xl font-serif text-foreground" style={{ textShadow: "0 0 30px hsl(45 40% 60% / 0.1)" }}>
            Access Requests
          </h2>
          <div className="gold-line w-16 mt-3" />
          <p className="text-muted-foreground text-sm pt-1">All face scan submissions. Auto-refreshes every 10s.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border/60 p-5 animate-pulse h-32 rounded-sm" />
            ))}
          </div>
        ) : approvals && approvals.length > 0 ? (
          <div className="space-y-3">
            {approvals.map((approval, idx) => (
              <div
                key={approval.id}
                className="card-glow bg-card border border-border/60 overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-4">
                  {/* Face photo */}
                  <div className="flex-shrink-0">
                    {approval.faceImageData ? (
                      <div className="relative">
                        <img
                          src={approval.faceImageData}
                          alt="Face scan"
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover border border-border/60"
                          style={{ boxShadow: "0 0 16px hsl(160 60% 5% / 0.6)" }}
                        />
                        {approval.surveillanceCaptureCount !== undefined && approval.surveillanceCaptureCount > 0 && (
                          <div className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 font-mono flex items-center gap-0.5">
                            <Camera className="w-2.5 h-2.5" />
                            {approval.surveillanceCaptureCount}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted border border-border/60 flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground text-center leading-tight">No<br />photo</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 border ${
                          approval.status === "pending"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : approval.status === "approved"
                            ? "bg-green-900/30 text-green-400 border-green-700/30"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}
                      >
                        {approval.status}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground/50 truncate max-w-[200px]">
                        {approval.sessionId.slice(0, 20)}…
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {approval.ipAddress && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Globe className="w-3 h-3 flex-shrink-0 text-primary/60" />
                          <span className="font-mono truncate">{approval.ipAddress}</span>
                        </div>
                      )}
                      {approval.deviceInfo?.platform && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Monitor className="w-3 h-3 flex-shrink-0 text-primary/60" />
                          <span className="truncate">{approval.deviceInfo.platform}</span>
                        </div>
                      )}
                      {approval.deviceInfo?.timezone && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Clock className="w-3 h-3 flex-shrink-0 text-primary/60" />
                          <span className="truncate">{approval.deviceInfo.timezone}</span>
                        </div>
                      )}
                      {approval.deviceInfo?.screenWidth && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                          <span className="font-mono">
                            {approval.deviceInfo.screenWidth}×{approval.deviceInfo.screenHeight}
                          </span>
                        </div>
                      )}
                    </div>

                    {approval.deviceInfo?.userAgent && (
                      <p className="text-[10px] text-muted-foreground/40 font-mono truncate leading-relaxed">
                        {approval.deviceInfo.userAgent.slice(0, 80)}…
                      </p>
                    )}

                    <p className="text-[10px] text-muted-foreground/40">
                      {new Date(approval.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Actions */}
                  {approval.status === "pending" && (
                    <div className="flex gap-2 flex-shrink-0 sm:ml-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleApprove(approval.sessionId)}
                        disabled={approveUser.isPending}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-green-900/20 border border-green-700/40 text-green-400 px-3 sm:px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase hover:bg-green-900/40 hover:shadow-[0_0_16px_rgba(74,222,128,0.15)] transition-all duration-300 disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleDeny(approval.sessionId)}
                        disabled={denyUser.isPending}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-destructive/10 border border-destructive/30 text-destructive px-3 sm:px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase hover:bg-destructive/20 hover:shadow-[0_0_16px_hsl(0_60%_40%/0.15)] transition-all duration-300 disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                        Deny
                      </button>
                    </div>
                  )}
                </div>
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
