import { createFileRoute } from "@tanstack/react-router";

import { HibalagApp } from "@/components/hibalag-app";
import { appUrl } from "@/lib/app-url";

export const Route = createFileRoute("/chat/$threadId")({
  head: ({ params }) => ({
    meta: [
      { title: "Chat — Hibalag AI" },
      {
        name: "description",
        content:
          "Your Hibalag AI conversation about Silliman University's 125th Founders Day and Hibalag Festival schedule, venues, and itineraries.",
      },
      { property: "og:title", content: "Chat — Hibalag AI" },
      {
        property: "og:description",
        content:
          "Your Hibalag AI conversation about Silliman University's 125th Founders Day and Hibalag Festival schedule, venues, and itineraries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Chat — Hibalag AI" },
      {
        name: "twitter:description",
        content:
          "Your Hibalag AI conversation about Silliman University's 125th Founders Day and Hibalag Festival schedule, venues, and itineraries.",
      },
      { property: "og:url", content: appUrl(`/chat/${params.threadId}`) },
      { name: "robots", content: "noindex" },
    ],
    links: [
      { rel: "canonical", href: appUrl(`/chat/${params.threadId}`) },
    ],
  }),
  component: ChatThreadPage,
});

function ChatThreadPage() {
  const { threadId } = Route.useParams();
  return <HibalagApp threadId={threadId} />;
}
