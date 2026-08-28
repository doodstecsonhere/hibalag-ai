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

This private repository is the independent source of truth for Hibalag AI and retains the original revision history.

- Primary deployment: [hibalag-ai.pages.dev](https://hibalag-ai.pages.dev)
- Secondary known-good rollback: [hibalag-ai.doodstecson.workers.dev](https://hibalag-ai.doodstecson.workers.dev)

This ordering is release governance only. Both zero-dollar deployments remain active, and the retained Lovable site is a historical fallback rather than a development source.

Migration work should be performed on feature branches and merged through reviewed pull requests.

## Development

```sh
npm install
npm run dev
npm run lint
npm run build
```

The application depends on a separate Supabase project for schedule data, application configuration, and chat data. Secret values must remain in encrypted deployment environment variables and must not be committed to this repository.
