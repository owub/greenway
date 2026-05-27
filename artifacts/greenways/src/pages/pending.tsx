import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetAuthStatus, getGetAuthStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function PendingPage() {
  const [, setLocation] = useLocation();
  const sessionId = localStorage.getItem("sessionId") || "";
  const faceImage = localStorage.getItem("faceImage") || "";
  const queryClient = useQueryClient();

  const { data: status } = useGetAuthStatus(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetAuthStatusQueryKey(sessionId),
      refetchInterval: 3000,
    },
  });

  useEffect(() => {
    if (!sessionId) { setLocation("/"); return; }
    if (status?.status === "approved") {
      if (status.sessionToken) localStorage.setItem("sessionToken", status.sessionToken);
      queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey(sessionId) });
      setLocation("/videos");
    }
  }, [status, sessionId, setLocation, queryClient]);

  const isDenied = status?.status === "denied";

  return (
    <div className="grain min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="orb-1" /><div className="orb-2" /><div className="orb-3" />
      </div>

      {/* Cinematic scan lines */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.015]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)", backgroundSize: "100% 3px" }} />

      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="gold-line w-16 mx-auto mb-6 animate-fade-in" />
        <h1 className="text-3xl sm:text-4xl font-serif text-foreground mb-8 animate-logo-in"
          style={{ textShadow: "0 0 40px hsl(45 40% 60% / 0.15)" }}>
          Greenways
        </h1>

        {isDenied ? (
          <div className="space-y-6 animate-fade-in-up">
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-20 h-20 rounded-full border-2 border-destructive/50 flex items-center justify-center"
                style={{ boxShadow: "0 0 40px hsl(0 60% 40% / 0.2)" }}>
                <span className="text-destructive text-3xl font-serif">✕</span>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-serif text-foreground">Access Denied</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your request has been declined by the owner.
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("sessionId");
                localStorage.removeItem("faceImage");
                localStorage.removeItem("sessionToken");
                setLocation("/");
              }}
              className="w-full border border-border/60 text-foreground py-3 text-xs tracking-[0.25em] uppercase hover:border-primary/50 hover:text-primary transition-all duration-300 bg-card/50 backdrop-blur"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in-up">
            {faceImage && (
              <div className="relative mx-auto" style={{ width: 120, height: 120 }}>
                <div className="absolute -inset-4 rounded-full animate-ring-spin"
                  style={{ background: "conic-gradient(from 0deg, hsl(45 40% 60% / 0), hsl(45 40% 60% / 0.6), hsl(45 40% 60% / 0))", animationDuration: "3s" }} />
                <div className="absolute -inset-4 rounded-full"
                  style={{ background: "radial-gradient(circle, transparent 40%, hsl(160 40% 4%) 70%)" }} />
                <img
                  src={faceImage}
                  alt="Your face scan"
                  className="w-full h-full object-cover rounded-full border border-border/60 relative z-10"
                  style={{ boxShadow: "0 0 30px hsl(45 40% 60% / 0.15)" }}
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center z-20"
                  style={{ boxShadow: "0 0 12px hsl(45 40% 60% / 0.6)" }}>
                  <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h2 className="text-xl font-serif text-foreground">Awaiting Approval</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your face scan has been sent to the owner.
                <br />Please wait while they review your request.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-full bg-primary/60"
                  style={{
                    width: i === 2 ? 8 : i === 1 || i === 3 ? 5 : 3,
                    height: i === 2 ? 8 : i === 1 || i === 3 ? 5 : 3,
                    animation: `bounce 1.4s ease-in-out ${i * 0.1}s infinite`,
                  }} />
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground/40">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
              Checking every 3 seconds
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
