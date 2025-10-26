"use client";

import { useEffect, useRef } from "react";

interface SiriWaveformProps {
  isActive: boolean;
  audioLevel?: number;
  state: "idle" | "recording" | "transcribing" | "parsing" | "confirming" | "executing" | "speaking" | "asking_price";
}

export function SiriWaveform({ isActive, audioLevel = 0, state }: SiriWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const phaseRef = useRef(0);
  const amplitudeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    // Color scheme based on state
    const getColors = () => {
      switch (state) {
        case "recording":
          return ["#FF0080", "#FF6B9D", "#FF3E9A"]; // Pink/Red
        case "transcribing":
        case "parsing":
          return ["#4F46E5", "#7C3AED", "#EC4899"]; // Purple/Pink gradient
        case "speaking":
          return ["#10B981", "#06B6D4", "#3B82F6"]; // Green/Cyan/Blue
        case "executing":
          return ["#F59E0B", "#EF4444", "#EC4899"]; // Orange/Red/Pink
        default:
          return ["#6366F1", "#8B5CF6", "#D946EF"]; // Default purple gradient
      }
    };

    const colors = getColors();

    // Smooth amplitude transition
    const targetAmplitude = isActive ? (audioLevel > 0 ? audioLevel : 0.3) : 0.05;

    const animate = () => {
      // Smooth amplitude interpolation
      amplitudeRef.current += (targetAmplitude - amplitudeRef.current) * 0.1;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Update phase for wave animation
      phaseRef.current += isActive ? 0.05 : 0.02;

      const numWaves = 3; // Number of wave layers
      const numBars = 40; // Number of bars across the width

      // Draw multiple wave layers
      for (let waveIndex = 0; waveIndex < numWaves; waveIndex++) {
        const waveOffset = waveIndex * Math.PI / 3;
        const opacity = 1 - (waveIndex * 0.3);

        // Create gradient for this wave
        const gradient = ctx.createLinearGradient(0, centerY - 50, 0, centerY + 50);
        gradient.addColorStop(0, `${colors[waveIndex % colors.length]}${Math.floor(opacity * 0.6 * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.5, `${colors[(waveIndex + 1) % colors.length]}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${colors[(waveIndex + 2) % colors.length]}${Math.floor(opacity * 0.6 * 255).toString(16).padStart(2, '0')}`);

        ctx.fillStyle = gradient;

        // Draw bars
        for (let i = 0; i < numBars; i++) {
          const x = (i / numBars) * width;
          const barWidth = (width / numBars) * 0.6;

          // Calculate wave height using sine waves with different frequencies
          const frequency = 0.02 + waveIndex * 0.01;
          const wave1 = Math.sin(i * frequency + phaseRef.current + waveOffset) * amplitudeRef.current;
          const wave2 = Math.sin(i * frequency * 1.5 - phaseRef.current + waveOffset) * amplitudeRef.current * 0.5;
          const wave3 = Math.sin(i * frequency * 0.5 + phaseRef.current * 1.5 + waveOffset) * amplitudeRef.current * 0.3;

          const combinedWave = wave1 + wave2 + wave3;
          const barHeight = Math.abs(combinedWave) * height * 0.4 + (isActive ? 5 : 2);

          // Draw bar (centered vertically)
          ctx.fillRect(
            x,
            centerY - barHeight / 2,
            barWidth,
            barHeight
          );
        }
      }

      // Add central glow effect
      if (isActive) {
        const glowGradient = ctx.createRadialGradient(width / 2, centerY, 0, width / 2, centerY, width / 2);
        glowGradient.addColorStop(0, `${colors[0]}40`);
        glowGradient.addColorStop(0.5, `${colors[1]}10`);
        glowGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, width, height);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioLevel, state]);

  return (
    <div className="relative w-full h-32 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ opacity: isActive ? 1 : 0.5 }}
      />
      {/* Optional: Add a subtle blur effect behind */}
      <div
        className="absolute inset-0 -z-10 blur-xl opacity-30"
        style={{
          background: `radial-gradient(circle, ${
            state === "recording" ? "#FF0080" :
            state === "speaking" ? "#10B981" :
            "#6366F1"
          }, transparent)`
        }}
      />
    </div>
  );
}
