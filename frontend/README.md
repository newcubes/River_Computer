# Wind Dashboard

A Next.js application that displays the current wind direction and speed with Cosmos blockchain wallet connectivity.

## Features

- Real-time wind direction and speed display
- Visual wind direction arrow using SVG
- Cardinal direction notation (N, NE, SW, etc.)
- Status indicator showing open/closed state
- Responsive design with dark mode support
- Auto-refreshes data every 10 seconds
- Connect to Cosmos ecosystem wallets (Keplr, Leap, Cosmostation, etc.)
- View wallet balances for connected accounts

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Technical Details

- Fetches wind data from a custom API endpoint
- Wind direction is measured 0-360° clockwise where 0° is North
- Wind speed is displayed in mph
- Data refreshes automatically every 10 seconds
- Uses React Query for efficient data fetching and caching

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
