"use client";

import { useEffect, useRef, useState } from "react";

interface WindReading {
  timestamp: string;
  wind_direction: number;
  wind_speed: number;
  is_open: boolean;
}

interface ConcentricCirclesProps {
  readings: WindReading[];
  containerSize: number;
  isAnimating: boolean;
  onAnimationComplete: () => void;
}

export const ConcentricCircles = ({
  readings,
  containerSize,
  isAnimating,
  onAnimationComplete,
}: ConcentricCirclesProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [animatedIndices, setAnimatedIndices] = useState<Set<number>>(new Set());
  const animationRef = useRef<number | null>(null);

  const NUM_CIRCLES = 150;
  const PADDING = containerSize * 0.15; // 15% padding (generous padding)
  const MAX_RADIUS = (containerSize - PADDING * 2) / 2;
  const RADIUS_STEP = MAX_RADIUS / NUM_CIRCLES;

  // Calculate circle radii
  const circles = Array.from({ length: NUM_CIRCLES }, (_, i) => {
    const radius = PADDING + (i + 1) * RADIUS_STEP;
    return {
      radius,
      index: i,
      reading: readings[i] || null,
    };
  });

  useEffect(() => {
    if (!isAnimating || readings.length === 0) return;

    let currentIndex = 0;
    const ANIMATION_DELAY = 25; // ms per circle

    const animate = () => {
      if (currentIndex >= NUM_CIRCLES) {
        onAnimationComplete();
        return;
      }

      setAnimatedIndices((prev) => new Set([...prev, currentIndex]));
      currentIndex++;
      animationRef.current = window.setTimeout(animate, ANIMATION_DELAY);
    };

    // Initial pause before animation starts
    const initialDelay = setTimeout(() => {
      animate();
    }, 500);

    return () => {
      clearTimeout(initialDelay);
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isAnimating, readings.length, NUM_CIRCLES, onAnimationComplete]);

  const centerX = containerSize / 2;
  const centerY = containerSize / 2;

  return (
    <svg
      ref={svgRef}
      width={containerSize}
      height={containerSize}
      className="absolute"
      style={{ 
        pointerEvents: "none",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Render circles and tick marks */}
      {circles.map(({ radius, index, reading }) => {
        const isAnimated = animatedIndices.has(index);
        const windDirection = reading?.wind_direction ?? 0;
        
        // Start at 12 o'clock (0°), animate to actual direction
        // Use a smooth transition for the angle
        const targetAngle = windDirection;
        const currentAngle = isAnimated ? targetAngle : 0;
        
        // Convert degrees to radians, adjust for SVG coordinate system (0° = right, 90° = down)
        // We want 0° = up (12 o'clock), so subtract 90
        const angleRad = ((currentAngle - 90) * Math.PI) / 180;
        
        // Calculate tick mark endpoints
        const tickLength = radius * 0.02; // 2% of radius
        const startX = centerX + radius * Math.cos(angleRad);
        const startY = centerY + radius * Math.sin(angleRad);
        const endX = centerX + (radius + tickLength) * Math.cos(angleRad);
        const endY = centerY + (radius + tickLength) * Math.sin(angleRad);

        return (
          <g key={index}>
            {/* Circle */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="0.5"
            />
            {/* Tick mark */}
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke="white"
              strokeWidth="1"
              opacity={isAnimated ? 1 : 0.3}
              style={{
                transition: isAnimated ? "opacity 0.3s ease-out" : "none",
              }}
            />
          </g>
        );
      })}
    </svg>
  );
};

