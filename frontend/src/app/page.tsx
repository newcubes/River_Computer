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
const WindArrow = ({ direction }: { direction: number }) => {
  return (
    <div className="relative w-32 h-32">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ transform: `rotate(${direction - 90}deg)` }}
      >
        {/* Circle background */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="#d1d5db"
          strokeWidth="4"
        />

        {/* Arrow */}
        <g>
          <line
            x1="10"
            y1="50"
            x2="90"
            y2="50"
            stroke="#3b82f6"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <polygon
            points="75,40 90,50 75,60"
            fill="#3b82f6"
            stroke="#3b82f6"
            strokeWidth="1"
          />
        </g>
      </svg>
    </div>
  );
};

// Status indicator component
const StatusIndicator = ({ isOpen }: { isOpen: boolean }) => {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded-full ${
          isOpen ? "bg-green-500" : "bg-red-500"
        }`}
      ></div>
      <span
        className={`font-medium ${
          isOpen
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        }`}
      >
        {isOpen ? "Open" : "Closed"}
      </span>
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

  // Function to handle join button click
  const handleJoin = async () => {
    if (!account) return;
    
    try {
      // Set joining state to true to show loading
      setJoiningWallet(true);
      
      console.log(`Joining with address ${account.bech32Address}`);
      
      // Call join route
      const response = await fetch("http://167.172.135.195:8000/join", {
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
        const response = await fetch("http://167.172.135.195:8000/wind");

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <main className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-white">
          Wind Dashboard
        </h1>

        {windData.loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Loading wind data...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-8">
            <StatusIndicator isOpen={windData.isOpen} />

            <WindArrow direction={windData.direction} />

            <div className="text-center space-y-2">
              <div className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                Wind Direction: {getCardinalDirection(windData.direction)} (
                {windData.direction}°)
              </div>
              <div className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                Wind Speed: {windData.speed} mph
              </div>
            </div>

            {windData.isOpen && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 w-full">
                <h3 className="text-center text-gray-700 dark:text-gray-300 mb-4">Wind conditions favorable</h3>
                
                <div className="flex flex-col items-center space-y-4">
                  {/* Wallet Connect */}
                  <WalletConnect />
                  
                  {/* Join Button (only show when wallet is connected) */}
                  {isConnected && !joinData && !joiningWallet && (
                    <button
                      onClick={handleJoin}
                      className="mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Join with Wallet
                    </button>
                  )}
                </div>
              </div>
            )}
            
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
        {windData.updated ? (
          <>
            Last updated: {windData.updated.toLocaleTimeString()}
          </>
        ) : (
          <>Waiting for wind data...</>
        )}
      </footer>
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
