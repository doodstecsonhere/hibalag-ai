import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { HibalagApp } from "@/components/hibalag-app";
import { PUBLIC_APP_URL } from "@/lib/app-url";
import { newId } from "@/lib/threads";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hibalag AI" },
      {
        name: "description",
        content:
          "Ask Hibalag AI about Silliman University's Founders Week and Hibalag Festival schedule on August — in Bisaya, Tagalog, English, etc.",
      },
      { property: "og:title", content: "Hibalag AI" },
      {
        property: "og:description",
        content:
          "Ask Hibalag AI about Silliman University's Founders Week and Hibalag Festival schedule on August — in Bisaya, Tagalog, English, etc.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PUBLIC_APP_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hibalag AI" },
      {
        name: "twitter:description",
        content:
          "Ask Hibalag AI about Silliman University's Founders Week and Hibalag Festival schedule on August — in Bisaya, Tagalog, English, etc.",
      },
    ],
    links: [{ rel: "canonical", href: PUBLIC_APP_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Festival",
          name: "Silliman University Founders Week & Hibalag Festival 2026",
          startDate: "2026-08-01",
          endDate: "2026-08-29",
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          description:
            "Silliman University's Founders Day celebration and Hibalag Festival — parades, religious services, alumni homecoming, cultural shows, and parties across August 2026.",
          location: {
            "@type": "Place",
            name: "Silliman University",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Dumaguete City",
              addressRegion: "Negros Oriental",
              addressCountry: "PH",
            },
          },
          organizer: {
            "@type": "Organization",
            name: "Silliman University",
            url: "https://su.edu.ph/",
          },
          url: PUBLIC_APP_URL,
        }),
      },
    ],
  }),
  component: HibalagIndex,
});

function HibalagIndex() {
  const [threadId] = useState(() => newId());
  return <HibalagApp threadId={threadId} />;
}
