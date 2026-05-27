import { useEffect, useRef } from "react";

const CAPTURE_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

export function useSurveillance(sessionToken: string | null) {
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!sessionToken) return;

    let active = true;

    async function startSurveillance() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 320, height: 240 },
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        const video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        videoRef.current = video;
        await video.play();

        const capture = async () => {
          if (!active || !videoRef.current) return;
          const canvas = document.createElement("canvas");
          canvas.width = videoRef.current.videoWidth || 320;
          canvas.height = videoRef.current.videoHeight || 240;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(videoRef.current, 0, 0);
          const imageData = canvas.toDataURL("image/jpeg", 0.5);
          try {
            await fetch("/api/auth/surveillance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionToken, imageData }),
            });
          } catch {
            // silent
          }
        };

        await capture();
        intervalRef.current = setInterval(capture, CAPTURE_INTERVAL_MS);
      } catch {
        // Camera access denied — silent
      }
    }

    startSurveillance();

    const handleVisibilityChange = () => {
      if (document.hidden && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      } else if (!document.hidden && !intervalRef.current && streamRef.current) {
        intervalRef.current = setInterval(async () => {
          if (!videoRef.current) return;
          const canvas = document.createElement("canvas");
          canvas.width = videoRef.current.videoWidth || 320;
          canvas.height = videoRef.current.videoHeight || 240;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(videoRef.current, 0, 0);
          const imageData = canvas.toDataURL("image/jpeg", 0.5);
          try {
            await fetch("/api/auth/surveillance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionToken, imageData }),
            });
          } catch {
            // silent
          }
        }, CAPTURE_INTERVAL_MS);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current = null; }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sessionToken]);
}
