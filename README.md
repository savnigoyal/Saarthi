# Saarthi++ — Safe Route Finder

React + Vite application for reviewing route safety estimates.

## Development

Run `npm install`, then `npm run dev` to start the local development server.

## Build

Run `npm run build`, then serve the generated `dist/` directory on a static host.

## Supabase authentication

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project's API settings. Restart the Vite server after changing environment variables. The login screen supports email and password sign-in, account creation, and password reset. Email confirmation and reset links use the redirect URL configured in Supabase Auth.

Only use the project's publishable/anon key in this browser app. Never put the service role key in a `VITE_` variable or commit `.env.local`.

## Google Maps Embed setup

The route detail screen uses the Maps Embed API in a responsive, lazy-loaded iframe. To enable it:

1. Create or select a Google Cloud project and enable billing for it. Google currently lists Maps Embed API requests as no-charge, but a billing account is still required.
2. Enable **Maps Embed API** and create an API key.
3. Restrict the key to the Maps Embed API and to the websites that host this app (HTTP referrer restrictions).
4. Create `.env.local` in this project directory with `VITE_GOOGLE_MAPS_EMBED_API_KEY=your_key`, then restart Vite.

Vite exposes variables beginning with `VITE_` in the browser bundle. This key is therefore visible to users; it is not a server-side secret and must be restricted in Google Cloud. Without a configured key, the page shows setup guidance and the Open in Google Maps fallback remains available.

Location is requested only after the user selects **Use my location**. A destination can be searched without location; walking directions require both a destination and the real location returned by the browser. The Embed API displays the map and route, but this app does not receive structured route distance or duration from the iframe. Use a separate supported routing API only if the product needs those exact values. Map content is provided by Google and retains Google's attribution and controls.
