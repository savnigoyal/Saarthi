# Saarthi++ — Safe Route Finder

React + Vite application for reviewing route safety estimates.

## Development

Run `npm install`, then `npm run dev` to start the local development server.

## Build

Run `npm run build`, then serve the generated `dist/` directory on a static host.

## Firebase Authentication

Firebase email/password sign-in, account creation, and password reset use the web app configuration in `.env.local`. Copy `.env.example` and fill in the Firebase web app values from **Project settings → General → Your apps**. Enable **Email/Password** under **Authentication → Sign-in method** in the Firebase Console. Restart Vite after changing environment variables.

Firebase web configuration is public client configuration. Access to Firebase data must still be protected with Firebase Security Rules; do not add Admin SDK credentials to this client app.

## Google Maps Embed setup

The route detail screen uses the Maps Embed API in a responsive, lazy-loaded iframe. To enable it:

1. Create or select a Google Cloud project and enable billing for it. Google currently lists Maps Embed API requests as no-charge, but a billing account is still required.
2. Enable **Maps Embed API** and create an API key.
3. Restrict the key to the Maps Embed API and to the websites that host this app (HTTP referrer restrictions).
4. Create `.env.local` in this project directory with `VITE_GOOGLE_MAPS_EMBED_API_KEY=your_key`, then restart Vite.

Vite exposes variables beginning with `VITE_` in the browser bundle. This key is therefore visible to users; it is not a server-side secret and must be restricted in Google Cloud. Without a configured key, the page shows setup guidance and the Open in Google Maps fallback remains available.

Location is requested only after the user selects **Use my location**. A destination can be searched without location; walking directions require both a destination and the real location returned by the browser. The Embed API displays the map and route, but this app does not receive structured route distance or duration from the iframe. Use a separate supported routing API only if the product needs those exact values. Map content is provided by Google and retains Google's attribution and controls.
