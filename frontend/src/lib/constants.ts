import { ChainInfo } from "@keplr-wallet/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not set");
}

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
