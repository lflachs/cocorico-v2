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
  const barsRef = useRef<number[]>([]);
  const smoothedBarsRef = useRef<number[]>([]);

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

    // Color scheme based on state - updated for brand colors
    const getColors = () => {
      switch (state) {
        case "recording":
          return {
            primary: "#e63946",
            secondary: "#f1faee",
            tertiary: "#457b9d",
            glow: "rgba(230, 57, 70, 0.3)"
          };
        case "transcribing":
        case "parsing":
          return {
            primary: "#457b9d",
            secondary: "#a8dadc",
            tertiary: "#1d3557",
            glow: "rgba(69, 123, 157, 0.3)"
          };
        case "speaking":
          return {
            primary: "#a8dadc",
            secondary: "#f1faee",
            tertiary: "#457b9d",
            glow: "rgba(168, 218, 220, 0.3)"
          };
        case "executing":
          return {
            primary: "#457b9d",
            secondary: "#e63946",
            tertiary: "#1d3557",
            glow: "rgba(69, 123, 157, 0.3)"
          };
        default:
          return {
            primary: "#1d3557",
            secondary: "#457b9d",
            tertiary: "#a8dadc",
            glow: "rgba(29, 53, 87, 0.3)"
          };
      }
    };

    const colors = getColors();

    // Smooth amplitude transition
    const targetAmplitude = isActive ? (audioLevel > 0 ? audioLevel * 1.2 : 0.35) : 0.08;

    // Initialize bars if needed
    const numBars = 60; // Increased for smoother visualization
    if (barsRef.current.length === 0) {
      barsRef.current = new Array(numBars).fill(0);
      smoothedBarsRef.current = new Array(numBars).fill(0);
    }

    const animate = () => {
      // Smooth amplitude interpolation
      amplitudeRef.current += (targetAmplitude - amplitudeRef.current) * 0.15;

      // Clear canvas with slight trail effect for smoother visuals
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);
      ctx.clearRect(0, 0, width, height);

      // Update phase for wave animation
      phaseRef.current += isActive ? 0.08 : 0.03;

      // Generate frequency-like data with multiple sine waves
      for (let i = 0; i < numBars; i++) {
        // Create frequency distribution (higher in middle, lower at edges)
        const normalizedPosition = (i - numBars / 2) / (numBars / 2);
        const frequencyWeight = Math.exp(-normalizedPosition * normalizedPosition * 2);

        // Multiple sine waves with different frequencies to simulate audio spectrum
        const lowFreq = Math.sin(i * 0.05 + phaseRef.current) * amplitudeRef.current;
        const midFreq = Math.sin(i * 0.15 + phaseRef.current * 1.3) * amplitudeRef.current * 0.7;
        const highFreq = Math.sin(i * 0.25 - phaseRef.current * 0.8) * amplitudeRef.current * 0.5;

        // Add randomness for natural feel (more when active)
        const randomness = isActive ? (Math.random() - 0.5) * 0.3 * amplitudeRef.current : 0;

        // Combine waves with frequency distribution
        const targetValue = (lowFreq + midFreq + highFreq + randomness) * frequencyWeight;
        barsRef.current[i] = Math.abs(targetValue);

        // Smooth the bars for fluid animation
        smoothedBarsRef.current[i] += (barsRef.current[i] - smoothedBarsRef.current[i]) * 0.25;
      }

      // Draw the visualization with rounded bars and gradients
      const barWidth = (width / numBars) * 0.75;
      const gap = (width / numBars) * 0.25;

      for (let i = 0; i < numBars; i++) {
        const x = (i / numBars) * width + gap / 2;
        const barValue = smoothedBarsRef.current[i];
        const barHeight = Math.max(barValue * height * 0.6 + (isActive ? 8 : 3), 3);

        // Create vertical gradient for each bar
        const barGradient = ctx.createLinearGradient(x, centerY - barHeight / 2, x, centerY + barHeight / 2);

        // Color intensity based on bar height and position
        const intensity = Math.min(barValue / amplitudeRef.current, 1);
        const positionFactor = Math.sin((i / numBars) * Math.PI);

        if (isActive && intensity > 0.3) {
          barGradient.addColorStop(0, colors.secondary + '60');
          barGradient.addColorStop(0.5, colors.primary);
          barGradient.addColorStop(1, colors.tertiary + '60');
        } else {
          barGradient.addColorStop(0, colors.primary + '40');
          barGradient.addColorStop(0.5, colors.primary + '80');
          barGradient.addColorStop(1, colors.primary + '40');
        }

        ctx.fillStyle = barGradient;

        // Draw rounded bars
        const radius = Math.min(barWidth / 2, barHeight / 2, 3);
        const barY = centerY - barHeight / 2;

        ctx.beginPath();
        ctx.roundRect(x, barY, barWidth, barHeight, radius);
        ctx.fill();

        // Add glow effect for active state
        if (isActive && intensity > 0.4) {
          ctx.shadowBlur = 10 * intensity;
          ctx.shadowColor = colors.primary;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Add central glow effect with pulsing
      if (isActive) {
        const pulseIntensity = 0.3 + Math.sin(phaseRef.current * 0.5) * 0.15;
        const glowGradient = ctx.createRadialGradient(
          width / 2, centerY, 0,
          width / 2, centerY, width * 0.6
        );
        glowGradient.addColorStop(0, colors.glow);
        glowGradient.addColorStop(0.3, `${colors.primary}10`);
        glowGradient.addColorStop(1, 'transparent');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = glowGradient;
        ctx.globalAlpha = pulseIntensity;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
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
    <div className="relative w-full h-40 sm:h-48 flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full transition-opacity duration-500"
        style={{ opacity: isActive ? 1 : 0.6 }}
      />
      {/* Animated blur effect behind with brand colors */}
      <div
        className="absolute inset-0 -z-10 blur-2xl opacity-40 transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse at center, ${
            state === "recording" ? "#e63946" :
            state === "speaking" ? "#a8dadc" :
            state === "transcribing" || state === "parsing" ? "#457b9d" :
            "#1d3557"
          }40, transparent 70%)`
        }}
      />
      {/* Additional subtle particle effect */}
      {isActive && (
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full animate-ping opacity-20"
            style={{
              backgroundColor: state === "recording" ? "#e63946" :
                              state === "speaking" ? "#a8dadc" : "#457b9d"
            }}
          />
        </div>
      )}
    </div>
  );
}
