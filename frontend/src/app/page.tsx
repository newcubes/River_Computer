"use client";

import { useState, useEffect, useRef } from "react";
import { WalletConnect } from "../components/WalletConnect";
import { ConcentricCircles } from "../components/ConcentricCircles";
import { GrazProvider, GrazProviderProps } from "graz";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ChainInfo } from "@keplr-wallet/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not set");
}

// Create a client
const queryClient = new QueryClient();

export const neutron: ChainInfo = {
  chainId: "neutron-1",
  chainName: "Neutron",
  rpc: "https://rpc.cosmos.directory/neutron",
  rest: "https://rest.cosmos.directory/neutron",
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: "neutron",
    bech32PrefixAccPub: "neutronpub",
    bech32PrefixValAddr: "neutronvaloper",
    bech32PrefixValPub: "neutronvaloperpub",
    bech32PrefixConsAddr: "neutronvalcons",
    bech32PrefixConsPub: "neutronvalconspub",
  },
  currencies: [
    {
      coinDenom: "NTRN",
      coinMinimalDenom: "untrn",
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: "NTRN",
      coinMinimalDenom: "untrn",
      coinDecimals: 6,
    },
  ],
  stakeCurrency: {
    coinDenom: "NTRN",
    coinMinimalDenom: "untrn",
    coinDecimals: 6,
  },
};

const grazOptions: GrazProviderProps["grazOptions"] = {
  chains: [neutron],
};

interface WindReading {
  timestamp: string;
  wind_direction: number;
  wind_speed: number;
  is_open: boolean;
}

interface ApiResponse {
  wind_direction: number;
  wind_speed: number;
  azimuth: number;
  destination: [number, number];
  is_open: boolean;
  threshold_percent: number;
  api_source?: string;
}

interface HistoryResponse {
  count: number;
  readings: WindReading[];
}

// Wind direction arrow component using SVG
const WindArrow = ({ direction }: { direction: number }) => {
  return (
    <div className="relative w-32 h-32 z-10">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ transform: `rotate(${direction - 90}deg)` }}
      >
        {/* Arrow */}
        <g>
          <line
            x1="10"
            y1="50"
            x2="90"
            y2="50"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <polygon
            points="75,40 90,50 75,60"
            fill="white"
            stroke="white"
            strokeWidth="1"
          />
        </g>
      </svg>
    </div>
  );
};

const Home = () => {
  // const { data: account, isConnected } = useAccount();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState(600);
  const [currentWind, setCurrentWind] = useState<ApiResponse | null>(null);
  const [windHistory, setWindHistory] = useState<WindReading[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Calculate container size based on narrowest dimension
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const narrowest = Math.min(width, height);
        setContainerSize(narrowest);
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Generate sample wind data (noise) for testing when API is unavailable
  const generateSampleWindData = (count: number): WindReading[] => {
    const now = new Date();
    return Array.from({ length: count }, (_, i) => {
      // Generate random wind directions (0-360 degrees)
      // Add some variation so ticks don't all point the same way
      const baseDirection = (i * 137.5) % 360; // Golden angle for good distribution
      const noise = (Math.random() - 0.5) * 30; // ±15 degrees of noise
      const windDirection = (baseDirection + noise + 360) % 360;

      return {
        timestamp: new Date(now.getTime() - i * 60000).toISOString(), // 1 min apart
        wind_direction: Math.round(windDirection),
        wind_speed: 5 + Math.random() * 15, // 5-20 mph
        is_open: Math.random() > 0.5,
      };
    });
  };

  // Fetch historical wind data on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_URL}/api/wind/history`);

        if (response.ok) {
          const data = (await response.json()) as HistoryResponse;
          const readings = data.readings || [];

          // If we have real data, use it; otherwise generate sample data
          if (readings.length > 0) {
            setWindHistory(readings);
          } else {
            // Generate 150 sample readings with noise
            setWindHistory(generateSampleWindData(150));
          }

          // Start animation if we haven't animated yet
          if (!hasAnimated) {
            setIsAnimating(true);
          }
        } else {
          // API failed, use sample data
          setWindHistory(generateSampleWindData(150));
          if (!hasAnimated) {
            setIsAnimating(true);
          }
        }
      } catch (error) {
        console.error("Error fetching wind history:", error);
        // On error, use sample data so we can still see the visualization
        setWindHistory(generateSampleWindData(150));
        if (!hasAnimated) {
          setIsAnimating(true);
        }
      }
    };

    fetchHistory();
  }, [hasAnimated]);

  // Fetch current wind data and poll for updates
  useEffect(() => {
    const fetchWindData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/wind`);

        if (response.ok) {
          const data = (await response.json()) as ApiResponse;
          setCurrentWind(data);
        } else {
          // If API fails, use sample current wind data
          const sampleData: ApiResponse = {
            wind_direction: Math.round(Math.random() * 360),
            wind_speed: 5 + Math.random() * 15,
            azimuth: 45,
            destination: [37.223194, 38.922325],
            is_open: Math.random() > 0.5,
            threshold_percent: 50,
          };
          setCurrentWind(sampleData);
        }
      } catch (error) {
        console.error("Error fetching wind data:", error);
        // Use sample data on error
        const sampleData: ApiResponse = {
          wind_direction: Math.round(Math.random() * 360),
          wind_speed: 5 + Math.random() * 15,
          azimuth: 45,
          destination: [37.223194, 38.922325],
          is_open: Math.random() > 0.5,
          threshold_percent: 50,
        };
        setCurrentWind(sampleData);
      }
    };

    fetchWindData();
    const intervalId = setInterval(fetchWindData, 10 * 60 * 1000); // Poll every 10 minutes (matches OpenWeatherMap refresh rate)
    return () => clearInterval(intervalId);
  }, []);

  const handleAnimationComplete = () => {
    setIsAnimating(false);
    setHasAnimated(true);
  };

  // Show wallet connect only if wind is "open"
  const showWalletConnect = currentWind?.is_open ?? false;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-black flex items-center justify-center"
    >
      {/* Concentric Circles Background */}
      <ConcentricCircles
        readings={windHistory}
        containerSize={containerSize}
        isAnimating={isAnimating}
        onAnimationComplete={handleAnimationComplete}
      />

      {/* "wind trust" text - horizontal center, vertical at 3/4 from top */}
      <div
        className="absolute z-20 text-white text-4xl font-light tracking-wider"
        style={{
          top: "25%", // 3/4 from top = 1/4 from top, so top: 25%
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        wind trust
      </div>

      {/* Center Arrow - vertically and horizontally centered */}
      <div
        className="absolute z-10"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      >
        {currentWind && <WindArrow direction={currentWind.wind_direction} />}
      </div>

      {/* Wallet Connect Button - horizontal center, vertical at 1/4 from bottom */}
      {showWalletConnect && (
        <div
          className="absolute z-20"
          style={{
            bottom: "25%", // 1/4 from bottom
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <WalletConnect />
        </div>
      )}
    </div>
  );
};

export default function HomePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <GrazProvider grazOptions={grazOptions}>
        <Home />
      </GrazProvider>
    </QueryClientProvider>
  );
}
