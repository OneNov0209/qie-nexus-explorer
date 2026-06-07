import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// --- API Proxy handlers ---
async function handleApiRpc(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/rpc", "");
  const targetUrl = `https://rpc.qie.onenov.xyz${path}${url.search}`;

  try {
    const response = await fetch(targetUrl, {
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "RPC unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}

async function handleApiRest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/rest", "");
  const targetUrl = `https://api.qie.onenov.xyz${path}${url.search}`;

  try {
    const response = await fetch(targetUrl, {
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "API unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}

async function handleApiEvm(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const response = await fetch("https://rpc-evm.qie.onenov.xyz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "EVM RPC unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}

// --- AI Proxy (Gemini) with retry ---
async function handleApiAI(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const apiKey = process.env.AI_API_KEY; // ganti nama variable

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://qie.explorer.onenov.xyz",
        "X-Title": "QIE Explorer",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: body.messages || [
          { role: "user", content: body.contents?.[0]?.parts?.[0]?.text || "Hello" }
        ],
        max_tokens: body.generationConfig?.maxOutputTokens || 300,
      }),
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "AI unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      // API Proxy routes
      if (url.pathname.startsWith("/api/ai")) {
        return handleApiAI(request);
      }
      if (url.pathname.startsWith("/api/rpc")) {
        return handleApiRpc(request);
      }
      if (url.pathname.startsWith("/api/rest")) {
        return handleApiRest(request);
      }
      if (url.pathname.startsWith("/api/evm")) {
        return handleApiEvm(request);
      }

      // Normal SSR handler
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
