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
  thresholdLowerBound?: number;
  thresholdUpperBound?: number;
}

export const ConcentricCircles = ({
  readings,
  containerSize,
  isAnimating,
  onAnimationComplete,
  thresholdLowerBound,
  thresholdUpperBound,
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
  
  // Calculate the smallest circle radius (innermost circle)
  const smallestRadius = PADDING + RADIUS_STEP;

  // Helper function to convert degrees to radians
  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  // Helper function to get point on circle at given angle
  const getPointOnCircle = (angle: number, radius: number) => {
    // Convert angle: 0° = up (12 o'clock), adjust for SVG coordinate system
    const adjustedAngle = angle - 90; // 0° becomes -90° in SVG (pointing up)
    const rad = degToRad(adjustedAngle);
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad),
    };
  };

  // Generate arc path for threshold range
  const getThresholdArcPath = () => {
    if (thresholdLowerBound === undefined || thresholdUpperBound === undefined) {
      return null;
    }

    // Calculate the arc sweep
    const startAngle = thresholdLowerBound;
    const endAngle = thresholdUpperBound;
    const sweepFlag = 1; // 1 for clockwise, 0 for counter-clockwise

    // Handle wrap-around case
    if (startAngle > endAngle) {
      // Range wraps around 0/360
      // We'll draw two arcs: from startAngle to 360, and from 0 to endAngle
      const startPoint1 = getPointOnCircle(startAngle, smallestRadius);
      const endPoint1 = getPointOnCircle(360, smallestRadius);
      const startPoint2 = getPointOnCircle(0, smallestRadius);
      const endPoint2 = getPointOnCircle(endAngle, smallestRadius);
      
      const sweepAngle1 = 360 - startAngle;
      const sweepAngle2 = endAngle;
      
      return (
        <>
          <path
            d={`M ${startPoint1.x} ${startPoint1.y} A ${smallestRadius} ${smallestRadius} 0 ${sweepAngle1 > 180 ? 1 : 0} ${sweepFlag} ${endPoint1.x} ${endPoint1.y}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d={`M ${startPoint2.x} ${startPoint2.y} A ${smallestRadius} ${smallestRadius} 0 ${sweepAngle2 > 180 ? 1 : 0} ${sweepFlag} ${endPoint2.x} ${endPoint2.y}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      );
    } else {
      // Normal range (no wrap-around)
      const startPoint = getPointOnCircle(startAngle, smallestRadius);
      const endPoint = getPointOnCircle(endAngle, smallestRadius);
      const sweepAngle = endAngle - startAngle;
      
      return (
        <path
          d={`M ${startPoint.x} ${startPoint.y} A ${smallestRadius} ${smallestRadius} 0 ${sweepAngle > 180 ? 1 : 0} ${sweepFlag} ${endPoint.x} ${endPoint.y}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      );
    }
  };

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
      {/* Threshold arc segment on smallest circle */}
      {getThresholdArcPath()}
      
      {/* Render circles and tick marks */}
      {circles.map(({ radius, index, reading }) => {
        const isAnimated = animatedIndices.has(index);
        const windDirection = reading?.wind_direction ?? 0;

        // Use shortest rotation path: if angle > 180°, rotate negative instead
        const rotationAngle = windDirection > 180 ? windDirection - 360 : windDirection;

        // Calculate tick mark position (pointing straight up at 12 o'clock)
        const tickLength = radius * 0.02; // 2% of radius
        const startX = centerX;
        const startY = centerY - radius;
        const endX = centerX;
        const endY = centerY - radius - tickLength;

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
            {/* Tick mark - using transform rotation for smooth animation */}
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke="white"
              strokeWidth="1"
              opacity={isAnimated ? 1 : 0.3}
              style={{
                transformOrigin: `${centerX}px ${centerY}px`,
                transform: `rotate(${isAnimated ? rotationAngle : 0}deg)`,
                transition: isAnimated
                  ? "opacity 0.3s ease-out, transform 0.3s ease-out"
                  : "none",
              }}
            />
          </g>
        );
      })}
    </svg>
  );
};

