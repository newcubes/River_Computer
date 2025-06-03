"use client";

import { useState, useEffect } from "react";
import { WalletConnect } from "../components/WalletConnect";
import { GrazProvider, GrazProviderProps, useAccount } from "graz";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ChainInfo } from "@keplr-wallet/types";

// Create a client
const queryClient = new QueryClient();

const neutron: ChainInfo = {
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

// Define types for our data
interface WindData {
  updated: Date | null;
  direction: number;
  speed: number;
  isOpen: boolean;
  loading: boolean;
}

interface ApiResponse {
  wind_direction: number;
  wind_speed: number;
  azimuth: number;
  destination: [number, number];
  is_open: boolean;
  threshold_percent: number;
}

interface JoinResponse {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

// Wind direction arrow component using SVG
const WindArrow = ({ direction, isOpen }: { direction: number, isOpen: boolean }) => {
  const strokeColor = isOpen ? "#3b82f6" : "#ef4444";
  const gradientColor = isOpen ? "#3b82f6" : "#ef4444";
  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-0"
      style={{ overflow: "visible" }}
    >
      <svg
        width={2000}
        height={1000}
        viewBox="0 0 2000 1000"
        className="block"
        style={{ overflow: "visible" }}
      >
        <g transform="translate(1000,500) scale(0.3) translate(-1000,-500)">
          <defs>
            <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" style={{ stopColor: gradientColor, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: gradientColor, stopOpacity: 0 }} />
            </radialGradient>
          </defs>

          {/* Large circle with radial gradient */}
          <circle
            cx="1000"
            cy="500"
            r="300"
            fill="url(#grad1)"
          />

          {/* flare_circle_1 */}
          <circle
            id="flare_circle_1"
            cx="1000"
            cy="500"
            r="480"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeDasharray="8,8"
            opacity="0.3"
          />

          {/* flare_circle_2 */}
          <circle
            id="flare_circle_2"
            cx="1000"
            cy="500"
            r="720"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeDasharray="8,8"
            opacity="0.2"
          />

          {/* flare_circle_3 */}
          <circle
            id="flare_circle_3"
            cx="1000"
            cy="500"
            r="1080"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeDasharray="8,8"
            opacity="0.15"
          />

          {/* flare_circle_4 */}
          <circle
            id="flare_circle_4"
            cx="1000"
            cy="500"
            r="1188"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeDasharray="8,8"
            opacity="0.1"
          />

          {/* flare_circle_5 */}
          <circle
            id="flare_circle_5"
            cx="1000"
            cy="500"
            r="1306.8"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeDasharray="8,8"
            opacity="0.07"
          />

          {/* flare_circle_6 */}
          <circle
            id="flare_circle_6"
            cx="1000"
            cy="500"
            r="1437.48"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeDasharray="8,8"
            opacity="0.05"
          />

          {/* flare_circle_7 */}
          <circle
            id="flare_circle_7"
            cx="1000"
            cy="500"
            r="1581.228"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeDasharray="8,8"
            opacity="0.03"
          />

          {/* Arrow */}
          <g>
            <line
              x1="1000"
              y1="500"
              x2="1600"
              y2="500"
              stroke={strokeColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <polygon
              points="1530,440 1600,500 1530,560"
              fill={strokeColor}
              stroke={strokeColor}
              strokeWidth="4"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};

const Home = () => {
  const { data: account, isConnected } = useAccount();
  const [windData, setWindData] = useState<WindData>({
    updated: null,
    direction: 0,
    speed: 0,
    isOpen: false,
    loading: true,
  });
  const [joinData, setJoinData] = useState<JoinResponse | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [dataReceived, setDataReceived] = useState(false);
  const [joiningWallet, setJoiningWallet] = useState(false);

  // Initialize state for wind direction readings
  const [windDirections, setWindDirections] = useState<number[]>([]);
  const [currentDirection, setCurrentDirection] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const [initialAnimationDone, setInitialAnimationDone] = useState<boolean>(false);

  // Function to handle join button click
  const handleJoin = async () => {
    if (!account) return;
    
    try {
      // Set joining state to true to show loading
      setJoiningWallet(true);
      
      console.log(`Joining with address ${account.bech32Address}`);
      
      // Call join route
      const response = await fetch("http://167.172.135.195:8000/api/join", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address: account.bech32Address }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}. ${errorText}`);
      }

      const data = await response.json();
      console.log("Join response:", data);
      
      // Set join data in state to display on UI
      setJoinData(data);
      setJoinError(null);
      
    } catch (error) {
      console.error("Error joining:", error);
      setJoinError(error instanceof Error ? error.message : "Unknown error joining with wallet");
    } finally {
      // Set joining state back to false when done
      setJoiningWallet(false);
    }
  };

  useEffect(() => {
    // Reset join data when wallet disconnects
    if (!isConnected) {
      setJoinData(null);
      setJoinError(null);
    }
  }, [isConnected]);

  useEffect(() => {
    // Function to fetch wind data
    const fetchWindData = async () => {
      try {
        // Fetch wind data from the provided API endpoint
        const response = await fetch("http://167.172.135.195:8000/api/wind");

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Parse the JSON response
        const data = (await response.json()) as ApiResponse;

        // Extract wind_direction, wind_speed, and is_open from the data
        const { wind_direction, wind_speed, is_open } = data;

        // Update wind data
        setWindData({
          updated: new Date(),
          direction: wind_direction,
          speed: wind_speed,
          isOpen: is_open,
          loading: false,
        });
        
        // Mark that we've received data at least once
        if (!dataReceived) {
          setDataReceived(true);
        }

        // Fetch data and update windDirections
        const newDirection = wind_direction;
        setWindDirections((prev) => {
          const updated = [...prev, newDirection];
          return updated.length > 20 ? updated.slice(-20) : updated;
        });
      } catch (error) {
        // Just log the error, don't display it
        console.error("Error fetching wind data:", error);
        
        // If we've never successfully received data, keep showing loading
        if (!dataReceived) {
          // Do nothing to state, keep loading true
        }
        
        // Wait a second before retrying
        setTimeout(fetchWindData, 1000);
      }
    };

    // Start fetching data
    fetchWindData();
    
    // Set up interval for refreshing data
    const intervalId = setInterval(fetchWindData, 10 * 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [dataReceived]);

  // Initial animation on page load
  useEffect(() => {
    if (windDirections.length > 0 && !initialAnimationDone) {
      let index = 0;
      setIsAnimating(true);
      const interval = setInterval(() => {
        setCurrentDirection(windDirections[index]);
        index++;
        if (index >= windDirections.length) {
          clearInterval(interval);
          setIsAnimating(false);
          setInitialAnimationDone(true); // Mark animation as done
        }
      }, 50); // Adjust speed as needed

      return () => clearInterval(interval);
    }
  }, [windDirections, initialAnimationDone]);

  // Helper function to convert wind direction in degrees to cardinal direction
  const getCardinalDirection = (degrees: number): string => {
    const directions = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  return (
    <>
      {/* SVG overlay as background */}
      <WindArrow direction={currentDirection} isOpen={windData.isOpen} />
      {/* Main content stays centered */}
      <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4 relative z-10">
        <main className="bg-black shadow-xl rounded-lg p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-8 text-white">
            WIND TRUST
          </h1>

          {windData.loading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex justify-center">
                <img src="https://em-content.zobj.net/source/apple/419/wind-chime_1f390.png" alt="Wind Chime" className="h-16 w-16" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Loading wind data...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-8">
              <WindArrow direction={currentDirection} isOpen={windData.isOpen} />

              {joiningWallet && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md w-full">
                  <div className="flex items-center gap-3 justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                    <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">Joining with wallet...</span>
                  </div>
                </div>
              )}
              
              {joinError && !joiningWallet && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm w-full">
                  Error joining: {joinError}
                </div>
              )}
              
              {joinData && !joiningWallet && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md w-full">
                  <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">Join Status</h3>
                  <pre className="text-xs text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-[40rem]">
                    {JSON.stringify(joinData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          {isAnimating ? (
            <>Last updated: {new Date().toLocaleTimeString()}</>
          ) : (
            <>Last updated: {windData.updated?.toLocaleTimeString()}</>
          )}
        </footer>
      </div>
    </>
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
