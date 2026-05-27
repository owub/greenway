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
            setError("Incorrect password. Access denied.");
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

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-block w-12 h-px bg-primary mb-4" />
          <h1 className="text-4xl font-serif text-foreground tracking-wide">Greenways</h1>
          <p className="text-muted-foreground text-xs tracking-widest uppercase">Private Access</p>
        </div>

        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4" data-testid="form-password">
            <div className="space-y-1">
              <label className="text-xs tracking-widest uppercase text-muted-foreground">
                Passphrase
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-card border border-border text-foreground px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                placeholder="Enter passphrase"
                autoFocus
                data-testid="input-password"
              />
            </div>
            {error && (
              <p className="text-destructive text-xs" data-testid="text-error">{error}</p>
            )}
            <button
              type="submit"
              disabled={!password || verifyPassword.isPending}
              className="w-full bg-primary text-primary-foreground py-3 text-xs tracking-widest uppercase font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              data-testid="button-submit-password"
            >
              {verifyPassword.isPending ? "Verifying..." : "Enter"}
            </button>
          </form>
        )}

        {(step === "camera" || step === "capturing") && (
          <div className="space-y-4">
            <div className="relative bg-card border border-border overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                data-testid="video-camera"
              />
              {step === "capturing" && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="text-7xl font-serif text-primary">{countdown}</span>
                </div>
              )}
              <div className="absolute top-2 left-2 right-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-xs text-foreground/70 tracking-widest uppercase">Face ID</span>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Position your face in the frame. Your photo will be sent for owner approval.
            </p>
            {error && <p className="text-destructive text-xs text-center">{error}</p>}
            <button
              onClick={captureAndSubmit}
              disabled={step === "capturing"}
              className="w-full bg-primary text-primary-foreground py-3 text-xs tracking-widest uppercase font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              data-testid="button-capture"
            >
              {step === "capturing" ? `Capturing in ${countdown}...` : "Scan Face"}
            </button>
          </div>
        )}

        {step === "submitting" && (
          <div className="text-center space-y-4 py-8">
            <div className="w-8 h-8 border border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm">Submitting for approval...</p>
          </div>
        )}
      </div>
    </div>
  );
}
