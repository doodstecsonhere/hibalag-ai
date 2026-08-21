# Hibalag AI

Hibalag AI is a mobile-first, multilingual digital guide for Silliman University’s Founders Day Celebration and Hibalag Festival in August.

## Product features

- Conversational event and schedule discovery
- Bisaya, English, and Tagalog interaction
- Schedule-grounded responses backed by Supabase
- Interactive canvas for itineraries and categorized event lists
- Responsive PWA experience for desktop and mobile

## Technology

React, TypeScript, TanStack Start, Vite, Supabase, Tailwind CSS, and an AI SDK integration.

## Development status

This private repository is the independent source of truth for Hibalag AI. It retains the original revision history while the application is being migrated away from Lovable.

Migration work should be performed on feature branches and merged through reviewed pull requests.

## Development

```sh
npm install
npm run dev
npm run lint
npm run build
```

The application depends on a separate Supabase project for schedule data, application configuration, and chat data. Secret values must remain in encrypted deployment environment variables and must not be committed to this repository.
