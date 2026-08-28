import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText } from "ai";

import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";
import {
  CHAT_LIMITS,
  ChatRequestError,
  boundScheduleContext,
  parseChatRequest,
  readBoundedChatBody,
  type ChatLanguage,
} from "@/lib/chat-request.server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase";

let cachedSchedule: { markdown: string; at: number } | null = null;

async function getScheduleMarkdown(): Promise<string | null> {
  if (cachedSchedule && Date.now() - cachedSchedule.at < 5 * 60 * 1000) {
    return cachedSchedule.markdown;
  }
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/schedule_context?id=eq.1&select=markdown_context`,
      { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } },
    );
    if (!response.ok) return cachedSchedule?.markdown ?? null;
    const rows = (await response.json()) as Array<{ markdown_context: string | null }>;
    const markdown = boundScheduleContext(rows?.[0]?.markdown_context ?? null);
    if (markdown) cachedSchedule = { markdown, at: Date.now() };
    return markdown;
  } catch {
    return cachedSchedule?.markdown ?? null;
  }
}

function languageRule(language: ChatLanguage) {
  switch (language) {
    case "bisaya":
      return "The user picked BISAYA. Always answer in contemporary urban Cebuano/Bisaya as spoken in Dumaguete (natural Bisaya-English code-switching), regardless of the language they typed in.";
    case "tagalog":
      return "The user picked TAGALOG. Always answer in conversational Tagalog/Taglish, regardless of the language they typed in.";
    case "english":
      return "The user picked ENGLISH. Always answer in warm, casual English, regardless of the language they typed in.";
    default:
      return "Default to contemporary urban Cebuano/Bisaya (Dumaguete style, natural Bisaya-English mix). If the user writes in English, reply in English. If the user writes in Tagalog, reply in Tagalog. Match their language every turn.";
  }
}

function buildSystemPrompt(schedule: string | null, language: ChatLanguage) {
  return `You are "Hibalag AI", the official digital guide for Silliman University's 125th Founders Day and the Hibalag Festival (August 2026) in Dumaguete City, Philippines.

PERSONA
- Witty, warm, approachable — like a tech-savvy Sillimanian student or young alum.
- Proud of Silliman traditions (Parada Sillimaniana, Miss Silliman, Hibalag booths, Founders Day worship services).
- Keep answers tight and scannable. Use markdown: short paragraphs, bullet lists, bold event names.
- Use light local warmth ("bay", "uy", "sige") — never overdo it, never cringe.

LANGUAGE
${languageRule(language)}

GROUNDING RULES (strict)
- Answer ALL schedule questions ONLY from the OFFICIAL SCHEDULE DATA below.
- Never invent events, dates, times, venues, or people. If something is not in the data, say so plainly and suggest the closest matching events that ARE listed.
- Always include date, time, and venue when naming an event.
- Today's date is ${new Date().toISOString().slice(0, 10)}.
- For "what's happening today" style questions, use that date; if nothing is scheduled, say so and point to the next upcoming event.
- When the user asks for multi-day itineraries, category lists, or timelines, give a short chat summary and tell them the full breakdown is open in the Canvas panel beside the chat.

OFFICIAL SCHEDULE DATA
${schedule ?? "(The schedule failed to load. Tell the user honestly that the schedule is temporarily unavailable and to try again.)"}`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body;
        try {
          body = parseChatRequest(await readBoundedChatBody(request));
        } catch (error) {
          if (error instanceof ChatRequestError) {
            return new Response(error.message, { status: error.status });
          }
          return new Response("Invalid chat request", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const schedule = await getScheduleMarkdown();
        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(key, initialRunId);

        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          system: buildSystemPrompt(schedule, body.language ?? "auto"),
          messages: await convertToModelMessages(body.messages),
          maxOutputTokens: CHAT_LIMITS.outputTokens,
          abortSignal: AbortSignal.timeout(CHAT_LIMITS.timeoutMs),
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: body.messages,
          headers: getLovableAiGatewayResponseHeaders(undefined, {
            ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
          }),
        });

        return withLovableAiGatewayRunIdHeader(response, gateway);
      },
    },
  },
});
