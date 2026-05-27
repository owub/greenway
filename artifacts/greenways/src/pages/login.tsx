import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useVerifyPassword, useSubmitFaceScan } from "@workspace/api-client-react";

type Step = "password" | "camera" | "capturing" | "submitting";

export function LoginPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const verifyPassword = useVerifyPassword();
  const submitFaceScan = useSubmitFaceScan();

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    verifyPassword.mutate(
      { data: { password } },
      {
        onSuccess: (result) => {
          if (result.valid) {
            startCamera();
          } else {
            setError("Incorrect passphrase. Access denied.");
          }
        },
        onError: () => setError("Connection error. Try again."),
      }
    );
  };

  const startCamera = async () => {
    setStep("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
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
      if (count <= 0) {
        clearInterval(interval);
        doCapture();
      }
    }, 1000);
  }, []);

  const doCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    localStorage.setItem("faceImage", imageData);
    setStep("submitting");
    submitFaceScan.mutate(
      { data: { imageData } },
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

  return (
    <div className="auth-bg grain min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow orbs */}
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
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="gold-line w-16 mx-auto mb-5 animate-fade-in" />
          <h1
            className="text-5xl font-serif text-foreground tracking-wide animate-logo-in"
            style={{ textShadow: "0 0 60px hsl(45 40% 60% / 0.2)" }}
          >
            Greenways
          </h1>
          <p className="text-muted-foreground text-xs tracking-[0.3em] uppercase mt-3 animate-fade-in delay-300">
            Private Access
          </p>
        </div>

        {/* Step: password */}
        {step === "password" && (
          <form
            onSubmit={handlePasswordSubmit}
            className="space-y-4 animate-fade-in-up"
            data-testid="form-password"
          >
            <div className="space-y-1.5">
              <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
                Passphrase
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-card/80 backdrop-blur border border-border text-foreground px-4 py-3.5 text-sm focus:outline-none focus:border-primary/60 transition-all duration-300 focus:bg-card focus:shadow-[0_0_20px_hsl(45_40%_60%/0.08)]"
                  placeholder="Enter passphrase"
                  autoFocus
                  data-testid="input-password"
                />
              </div>
            </div>

            {error && (
              <p className="text-destructive text-xs tracking-wide animate-fade-in" data-testid="text-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!password || verifyPassword.isPending}
              className="btn-shimmer w-full text-primary-foreground py-3.5 text-xs tracking-[0.25em] uppercase font-medium disabled:opacity-40 transition-all duration-300 hover:shadow-[0_0_30px_hsl(45_40%_60%/0.3)]"
              data-testid="button-submit-password"
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
            <div className="relative bg-black border border-border/60 overflow-hidden aspect-video shadow-[0_0_40px_hsl(160_60%_5%/0.8)]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                data-testid="video-camera"
              />

              {/* Scan line */}
              <div
                className="absolute left-0 right-0 h-px animate-scan-line pointer-events-none z-10"
                style={{ background: "linear-gradient(to right, transparent, hsl(45 40% 60% / 0.9), transparent)" }}
              />

              {/* Corner brackets */}
              {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-4 h-4 pointer-events-none`}>
                  <div
                    className="absolute inset-0"
                    style={{
                      borderTop: i < 2 ? "1px solid hsl(45 40% 60% / 0.7)" : "none",
                      borderBottom: i >= 2 ? "1px solid hsl(45 40% 60% / 0.7)" : "none",
                      borderLeft: i % 2 === 0 ? "1px solid hsl(45 40% 60% / 0.7)" : "none",
                      borderRight: i % 2 === 1 ? "1px solid hsl(45 40% 60% / 0.7)" : "none",
                    }}
                  />
                </div>
              ))}

              {/* Countdown overlay */}
              {step === "capturing" && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                  <span
                    className="text-8xl font-serif text-primary animate-glow-pulse"
                    style={{ textShadow: "0 0 40px hsl(45 40% 60% / 0.6)" }}
                  >
                    {countdown}
                  </span>
                </div>
              )}

              {/* Status badge */}
              <div className="absolute top-2 left-2 flex items-center gap-2 z-10">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                <span className="text-[10px] text-foreground/60 tracking-[0.2em] uppercase">Face ID</span>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground/70 leading-relaxed">
              Position your face in frame. Your photo will be sent for owner approval.
            </p>

            {error && <p className="text-destructive text-xs text-center animate-fade-in">{error}</p>}

            <button
              onClick={captureAndSubmit}
              disabled={step === "capturing"}
              className="btn-shimmer w-full text-primary-foreground py-3.5 text-xs tracking-[0.25em] uppercase font-medium disabled:opacity-50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(45_40%_60%/0.3)]"
              data-testid="button-capture"
            >
              {step === "capturing" ? `Capturing in ${countdown}…` : "Scan Face"}
            </button>
          </div>
        )}

        {/* Step: submitting */}
        {step === "submitting" && (
          <div className="text-center space-y-6 py-10 animate-fade-in">
            <div className="relative w-12 h-12 mx-auto">
              <div className="w-12 h-12 border border-primary/20 rounded-full" />
              <div className="absolute inset-0 border border-primary border-t-transparent rounded-full animate-spin" />
              <div
                className="absolute inset-2 border border-primary/30 border-b-transparent rounded-full animate-ring-spin"
                style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
              />
            </div>
            <p className="text-muted-foreground text-sm tracking-wide">Submitting for approval…</p>
          </div>
        )}
      </div>
    </div>
  );
}
