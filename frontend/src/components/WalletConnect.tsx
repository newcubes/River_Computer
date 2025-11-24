"use client";

import { neutron } from "@/lib/constants";
import { useAccount, useConnect, useDisconnect } from "graz";

export const WalletConnect = () => {
  const { connect, status, error: connectError } = useConnect();
  const { data: accounts, isConnected } = useAccount({
    chainId: [neutron.chainId],
  });
  const account = accounts?.[neutron.chainId];
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    connect({ chainId: neutron.chainId });
  };

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.substring(0, 8)}...${address.substring(
      address.length - 6
    )}`;
  };

  return (
    <div className="relative">
      {isConnected && account ? (
        <div className="flex flex-col items-center gap-2">
          <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-md text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>{formatAddress(account.bech32Address)}</span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 cursor-pointer"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleConnect}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
          >
            Connect Wallet
          </button>
          {status !== "idle" && status !== "error" && (
            <div className="text-center text-xs text-gray-600 dark:text-gray-400">
              {status === "pending" ? "Connecting..." : status}
            </div>
          )}
          {connectError && (
            <div className="text-center text-xs text-red-600 dark:text-red-400">
              {connectError.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
