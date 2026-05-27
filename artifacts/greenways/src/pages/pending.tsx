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
    if (!sessionId) {
      setLocation("/");
      return;
    }
    if (status?.status === "approved") {
      if (status.sessionToken) {
        localStorage.setItem("sessionToken", status.sessionToken);
      }
      queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey(sessionId) });
      setLocation("/videos");
    }
  }, [status, sessionId, setLocation, queryClient]);

  const isDenied = status?.status === "denied";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <div className="inline-block w-12 h-px bg-primary mb-4" />
          <h1 className="text-3xl font-serif text-foreground">Greenways</h1>
        </div>

        {isDenied ? (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full border-2 border-destructive flex items-center justify-center mx-auto">
              <span className="text-destructive text-2xl font-serif">X</span>
            </div>
            <h2 className="text-xl font-serif text-foreground">Access Denied</h2>
            <p className="text-muted-foreground text-sm">
              Your request has been declined by the owner.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem("sessionId");
                localStorage.removeItem("faceImage");
                localStorage.removeItem("sessionToken");
                setLocation("/");
              }}
              className="w-full border border-border text-foreground py-2 text-xs tracking-widest uppercase hover:border-primary transition-colors"
              data-testid="button-try-again"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {faceImage && (
              <div className="relative mx-auto w-28 h-28">
                <img
                  src={faceImage}
                  alt="Your face scan"
                  className="w-full h-full object-cover rounded-full border-2 border-border"
                  data-testid="img-face-scan"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <h2 className="text-xl font-serif text-foreground">Awaiting Approval</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your face scan has been sent to the owner. Please wait while they review your request.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
            </div>
            <p className="text-xs text-muted-foreground">Checking every 3 seconds...</p>
          </div>
        )}
      </div>
    </div>
  );
}
