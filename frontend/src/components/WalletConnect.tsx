"use client";

import { useState, useEffect } from "react";
import { neutron, API_URL } from "@/lib/constants";
import { useAccount, useConnect, useDisconnect } from "graz";

export const WalletConnect = () => {
  const { connect, status, error: connectError } = useConnect();
  const { data: accounts, isConnected } = useAccount({
    chainId: [neutron.chainId],
  });
  const account = accounts?.[neutron.chainId];
  const { disconnect } = useDisconnect();

  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [isCheckingMembership, setIsCheckingMembership] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Check membership status when wallet is connected
  useEffect(() => {
    const checkMembership = async () => {
      if (!isConnected || !account?.bech32Address) {
        setIsMember(null);
        return;
      }

      setIsCheckingMembership(true);
      try {
        const response = await fetch(
          `${API_URL}/api/is-member?address=${account.bech32Address}`
        );

        if (response.ok) {
          const data = await response.json();
          setIsMember(data.is_member);
        } else {
          console.error("Failed to check membership status");
          setIsMember(null);
        }
      } catch (error) {
        console.error("Error checking membership:", error);
        setIsMember(null);
      } finally {
        setIsCheckingMembership(false);
      }
    };

    checkMembership();
  }, [isConnected, account?.bech32Address]);

  const handleConnect = () => {
    connect({ chainId: neutron.chainId });
  };

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    setIsMember(null);
  };

  // Handle join
  const handleJoin = async () => {
    if (!account?.bech32Address) return;

    setIsJoining(true);
    setJoinError(null);

    try {
      const response = await fetch(`${API_URL}/api/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: account.bech32Address }),
      });

      if (response.ok) {
        // Successfully joined - refresh membership status
        setIsMember(true);
      } else {
        const data = (await response.json());
        setJoinError(data.error || "Failed to join");
      }
    } catch (error) {
      console.error("Error joining:", error);
      setJoinError("Failed to join. Please try again.");
    } finally {
      setIsJoining(false);
    }
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
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-md text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>{formatAddress(account.bech32Address)}</span>
          </div>

          {/* Membership status */}
          {isCheckingMembership ? (
            <div className="text-white/60 text-sm">
              Checking membership...
            </div>
          ) : isMember === true ? (
            <div className="text-green-400 text-sm font-medium">
              ✓ Member of Wind Trust
            </div>
          ) : isMember === false ? (
            <div className="flex flex-col items-center gap-2">
              <div className="text-white/60 text-sm">
                Not a member yet
              </div>
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
              >
                {isJoining ? "Joining..." : "Join Wind Trust"}
              </button>
              {joinError && (
                <div className="text-red-400 text-xs max-w-xs text-center">
                  {joinError}
                </div>
              )}
            </div>
          ) : null}

          <button
            onClick={handleDisconnect}
            className="text-center text-sm text-white/60 hover:text-white cursor-pointer"
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
            Connect to Wind Trust
          </button>
          {status === "pending" && (
            <div className="text-center text-xs text-white/60">
              Connecting...
            </div>
          )}
          {connectError && (
            <div className="text-center text-xs text-red-400">
              {connectError.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
