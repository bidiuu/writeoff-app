import Anthropic from "@anthropic-ai/sdk";

// No module-level singleton — create fresh per request so key changes in
// .env.local take effect after dev-server restart without stale-cache issues.
export function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey });
}