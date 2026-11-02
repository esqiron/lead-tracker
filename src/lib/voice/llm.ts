import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI, type Content, type Part } from "@google/genai";
import type { VoiceConfig } from "@/lib/voice/config";

// One tool-calling loop over three providers. The conversation crosses turns
// as plain text, so switching provider never strands provider-specific state;
// tool calls and their results live only inside a single turn.

export type Turn = { role: "user" | "assistant"; text: string };

export type AgentTool = {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  run: (input: unknown) => Promise<unknown>;
};

// Enough for "find the lead, log the call, set the next step" with a retry.
const MAX_STEPS = 8;

async function runTool(tools: AgentTool[], name: string, input: unknown): Promise<string> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return JSON.stringify({ error: `Unknown tool ${name}` });
  try {
    return JSON.stringify(await tool.run(input) ?? { ok: true });
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : "Something went wrong" });
  }
}

export async function runAgent(cfg: VoiceConfig, system: string, history: Turn[], tools: AgentTool[]): Promise<string> {
  switch (cfg.provider) {
    case "anthropic":
      return runClaude(cfg, system, history, tools);
    case "openai":
      return runOpenAI(cfg, system, history, tools);
    case "google":
      return runGemini(cfg, system, history, tools);
  }
}

async function runClaude(cfg: VoiceConfig, system: string, history: Turn[], tools: AgentTool[]) {
  const client = new Anthropic({ apiKey: cfg.llmKey });
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((t) => ({ role: t.role, content: t.text }));
  const defs: Anthropic.Beta.BetaTool[] = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await client.beta.messages.create({
      model: cfg.model,
      max_tokens: 16000,
      // Spoken replies want speed over depth.
      output_config: { effort: "low" },
      // On a safety decline, the API retries on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      tools: defs,
      messages,
    });
    if (response.stop_reason === "refusal") return "Sorry, I can't help with that one.";
    messages.push({ role: "assistant", content: response.content });
    if (response.stop_reason === "pause_turn") continue;

    const calls = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || calls.length === 0) {
      return response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join(" ")
        .trim();
    }
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const call of calls) {
      results.push({ type: "tool_result", tool_use_id: call.id, content: await runTool(tools, call.name, call.input) });
    }
    messages.push({ role: "user", content: results });
  }
  return "That took more steps than I expected. Could you break it into smaller requests?";
}

async function runOpenAI(cfg: VoiceConfig, system: string, history: Turn[], tools: AgentTool[]) {
  const client = new OpenAI({ apiKey: cfg.llmKey });
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...history.map((t) => ({ role: t.role, content: t.text })),
  ];
  const defs: OpenAI.Chat.ChatCompletionTool[] = tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await client.chat.completions.create({ model: cfg.model, messages, tools: defs });
    const message = response.choices[0]?.message;
    if (!message) break;
    messages.push(message);
    const calls = (message.tool_calls ?? []).filter((c) => c.type === "function");
    if (calls.length === 0) return (message.content ?? message.refusal ?? "").trim();
    for (const call of calls) {
      let input: unknown = {};
      try {
        input = JSON.parse(call.function.arguments || "{}");
      } catch {
        // Hand the bad arguments back as an error result so the model can retry.
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: await runTool(tools, call.function.name, input) });
    }
  }
  return "That took more steps than I expected. Could you break it into smaller requests?";
}

async function runGemini(cfg: VoiceConfig, system: string, history: Turn[], tools: AgentTool[]) {
  const ai = new GoogleGenAI({ apiKey: cfg.llmKey });
  const contents: Content[] = history.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] }));
  const config = {
    systemInstruction: system,
    tools: [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.parameters })) }],
  };

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await ai.models.generateContent({ model: cfg.model, contents, config });
    const content = response.candidates?.[0]?.content;
    if (!content) break;
    // Keep the model's turn as returned: Gemini needs its thought signatures back.
    contents.push(content);
    const calls = response.functionCalls ?? [];
    if (calls.length === 0) return (response.text ?? "").trim();
    const parts: Part[] = [];
    for (const call of calls) {
      const output = await runTool(tools, call.name ?? "", call.args ?? {});
      parts.push({ functionResponse: { id: call.id, name: call.name, response: { output: JSON.parse(output) } } });
    }
    contents.push({ role: "user", parts });
  }
  return "That took more steps than I expected. Could you break it into smaller requests?";
}
