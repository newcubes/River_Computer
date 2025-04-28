"use client";

import { useAccount, useBalances } from "graz";

export const WalletBalance = () => {
  const { data: account } = useAccount();
  const { data: balances, isLoading } = useBalances({ bech32Address: account?.bech32Address });

  if (!account) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Wallet Balance</h2>
      
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : balances && balances.length > 0 ? (
        <div className="space-y-3">
          {balances.map((balance, index) => (
            <div key={index} className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {balance.denom.startsWith('u') 
                  ? balance.denom.slice(1).toUpperCase() 
                  : balance.denom}
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {(parseInt(balance.amount) / 1000000).toFixed(6)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400 py-4">No balances found</p>
      )}
    </div>
  );
}; 