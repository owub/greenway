import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useVerifyPassword, useSubmitFaceScan, useGetAuthStatus, getGetAuthStatusQueryKey } from "@workspace/api-client-react";

type Step = "checking" | "password" | "camera" | "capturing" | "submitting";

export function LoginPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const verifyPassword = useVerifyPassword();
  const submitFaceScan = useSubmitFaceScan();

  const storedSessionId = localStorage.getItem("sessionId") || "";
  const { data: existingStatus } = useGetAuthStatus(storedSessionId, {
    query: {
      enabled: step === "checking" && !!storedSessionId,
      retry: false,
      queryKey: getGetAuthStatusQueryKey(storedSessionId),
    },
  });

  useEffect(() => {
    if (step !== "checking") return;
    const token = localStorage.getItem("sessionToken");
    if (token) { setLocation("/videos"); return; }
    if (!storedSessionId) { setStep("password"); return; }
  }, [step, storedSessionId, setLocation]);

  useEffect(() => {
    if (step !== "checking" || !existingStatus) return;
    if (existingStatus.status === "approved" && existingStatus.sessionToken) {
      localStorage.setItem("sessionToken", existingStatus.sessionToken);
      setLocation("/videos");
    } else if (existingStatus.status === "pending") {
      setLocation("/pending");
    } else {
      localStorage.removeItem("sessionId");
      localStorage.removeItem("faceImage");
      setStep("password");
    }
  }, [existingStatus, step, setLocation]);

  useEffect(() => {
    if (step === "checking" && !storedSessionId) setStep("password");
  }, [step, storedSessionId]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    verifyPassword.mutate(
      { data: { password } },
      {
        onSuccess: (result) => {
          if (result.valid) startCamera();
          else setError("Incorrect passphrase. Access denied.");
        },
        onError: () => setError("Connection error. Try again."),
      }
    );
  };

  const startCamera = async () => {
    setStep("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError("Camera access denied. Please allow camera access and try again.");
      setStep("password");
    }
  };

  const captureAndSubmit = useCallback(() => {
    setStep("capturing");
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) { clearInterval(interval); doCapture(); }
    }, 1000);
  }, []);

  const doCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.85);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    localStorage.setItem("faceImage", imageData);
    setStep("submitting");

    const deviceInfo = {
      userAgent: navigator.userAgent,
      screenWidth: screen.width,
      screenHeight: screen.height,
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    };

    submitFaceScan.mutate(
      { data: { imageData, deviceInfo } },
      {
        onSuccess: (result) => {
          localStorage.setItem("sessionId", result.sessionId);
          setLocation("/pending");
        },
        onError: () => {
          setError("Failed to submit face scan. Try again.");
          setStep("password");
        },
      }
    );
  };

  if (step === "checking") {
    return (
      <div className="grain min-h-screen bg-background flex items-center justify-center">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="orb-1" /><div className="orb-2" /><div className="orb-3" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative w-12 h-12">
            <div className="w-12 h-12 border border-primary/20 rounded-full" />
            <div className="absolute inset-0 border border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground animate-pulse">Checking session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grain min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="orb-1" /><div className="orb-2" /><div className="orb-3" />
      </div>

      {/* Cinematic scan lines */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.02]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 3px)", backgroundSize: "100% 3px" }} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Hero logo */}
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-block mb-6">
            <div className="gold-line w-20 mx-auto mb-0 animate-fade-in" />
            <div className="w-px h-6 bg-gradient-to-b from-primary/50 to-transparent mx-auto" />
          </div>
          <h1 className="text-5xl sm:text-6xl font-serif text-foreground tracking-wide animate-logo-in"
            style={{ textShadow: "0 0 80px hsl(45 40% 60% / 0.25), 0 0 160px hsl(45 40% 60% / 0.08)" }}>
            Greenways
          </h1>
          <div className="flex items-center justify-center gap-3 mt-4 animate-fade-in delay-400">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary/30" />
            <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">Private Access</p>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/30" />
          </div>
        </div>

        {/* Step: password */}
        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 animate-fade-in-up">
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Passphrase</label>
              <div className="relative group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-card/80 backdrop-blur border border-border text-foreground px-4 py-3.5 text-sm focus:outline-none focus:border-primary/60 transition-all duration-300 focus:bg-card focus:shadow-[0_0_20px_hsl(45_40%_60%/0.08)]"
                  placeholder="Enter passphrase"
                  autoFocus
                />
                <div className="absolute inset-0 pointer-events-none border border-primary/0 group-focus-within:border-primary/20 transition-all duration-500" />
              </div>
            </div>
            {error && <p className="text-destructive text-xs tracking-wide animate-fade-in">{error}</p>}
            <button
              type="submit"
              disabled={!password || verifyPassword.isPending}
              className="btn-shimmer w-full text-primary-foreground py-3.5 text-xs tracking-[0.25em] uppercase font-medium disabled:opacity-40 transition-all duration-300 hover:shadow-[0_0_30px_hsl(45_40%_60%/0.3)]"
            >
              {verifyPassword.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border border-primary-foreground border-t-transparent rounded-full animate-spin inline-block" />
                  Verifying
                </span>
              ) : "Enter"}
            </button>
            <div className="gold-line mt-2" />
          </form>
        )}

        {/* Step: camera / capturing */}
        {(step === "camera" || step === "capturing") && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="relative bg-black border border-border/60 overflow-hidden"
              style={{ aspectRatio: "4/3", boxShadow: "0 0 60px hsl(160 60% 5% / 0.9), 0 0 0 1px hsl(160 30% 10%)" }}>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

              {/* Animated scan line */}
              <div className="absolute left-0 right-0 h-px animate-scan-line pointer-events-none z-10"
                style={{ background: "linear-gradient(to right, transparent, hsl(45 40% 60% / 0.9), transparent)" }} />

              {/* Face guide oval */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="border-2 border-dashed border-primary/30 rounded-full animate-pulse"
                  style={{ width: "55%", height: "70%", borderStyle: "dashed" }} />
              </div>

              {/* Corner brackets */}
              {(["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"] as const).map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-5 h-5 pointer-events-none z-20`}>
                  <div className="absolute inset-0" style={{
                    borderTop: i < 2 ? "1.5px solid hsl(45 40% 60% / 0.8)" : "none",
                    borderBottom: i >= 2 ? "1.5px solid hsl(45 40% 60% / 0.8)" : "none",
                    borderLeft: i % 2 === 0 ? "1.5px solid hsl(45 40% 60% / 0.8)" : "none",
                    borderRight: i % 2 === 1 ? "1.5px solid hsl(45 40% 60% / 0.8)" : "none",
                  }} />
                </div>
              ))}

              {/* Countdown overlay */}
              {step === "capturing" && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-30">
                  <div className="text-center">
                    <span className="text-8xl font-serif text-primary animate-glow-pulse"
                      style={{ textShadow: "0 0 60px hsl(45 40% 60% / 0.7)" }}>{countdown}</span>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mt-3">Capturing</p>
                  </div>
                </div>
              )}

              {/* Live badge */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-20 bg-black/50 backdrop-blur-sm px-2 py-1">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[9px] text-white/70 tracking-[0.2em] uppercase">Live</span>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground/60 leading-relaxed">
              Centre your face in the frame. Your photo will be reviewed by the owner.
            </p>

            {error && <p className="text-destructive text-xs text-center animate-fade-in">{error}</p>}

            <button
              onClick={captureAndSubmit}
              disabled={step === "capturing"}
              className="btn-shimmer w-full text-primary-foreground py-3.5 text-xs tracking-[0.25em] uppercase font-medium disabled:opacity-50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(45_40%_60%/0.3)]"
            >
              {step === "capturing" ? `Capturing in ${countdown}…` : "Scan Face"}
            </button>
          </div>
        )}

        {/* Step: submitting */}
        {step === "submitting" && (
          <div className="text-center space-y-6 py-10 animate-fade-in">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 border border-primary/20 rounded-full" />
              <div className="absolute inset-0 border border-primary border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-3 border border-primary/30 border-b-transparent rounded-full animate-ring-spin"
                style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              </div>
            </div>
            <div>
              <p className="text-foreground text-sm tracking-wide font-serif">Submitting…</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Sending to owner for review</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
