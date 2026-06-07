import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    {
      role: "ai",
      text: "Hi! I'm QIE AI Assistant. Ask me anything about the QIE blockchain — blocks, transactions, staking, validators, governance, or how to use this explorer! 🚀",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function getPageContext(): string {
    if (pathname === "/" || pathname === "/dashboard") return "Dashboard - overview of network stats";
    if (pathname.includes("/blocks")) return "Blocks page - viewing block details";
    if (pathname.includes("/transactions") || pathname.includes("/tx/")) return "Transactions page - viewing transaction details";
    if (pathname.includes("/staking")) return "Staking page - viewing validators and delegation info";
    if (pathname.includes("/governance")) return "Governance page - viewing proposals and voting";
    if (pathname.includes("/uptime")) return "Uptime page - viewing validator uptime statistics";
    if (pathname.includes("/gas-tracker")) return "Gas Tracker - viewing gas prices and fees";
    if (pathname.includes("/address")) return "Address detail page - viewing account portfolio";
    if (pathname.includes("/parameters")) return "Chain Parameters - viewing network configuration";
    if (pathname.includes("/consensus")) return "Consensus State - viewing live consensus";
    if (pathname.includes("/ibc")) return "IBC page - viewing channels and connections";
    return "QIE Explorer";
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const prompt = `You are QIE AI Assistant embedded in the QIE blockchain explorer (qie.explorer.onenov.xyz).

**About QIE Blockchain:**
- QIE is a hybrid blockchain built on Cosmos SDK with EVM compatibility (Ethermint)
- Chain ID: 1990 (Cosmos chain ID: qie_1990-1)
- Native token: QIE (18 decimals, denom: aqie)
- CoinGecko ID: qie
- Total supply: ~85M QIE
- 25 active validators, ~22% staking ratio
- Block time: ~3.6 seconds
- Supports IBC, CosmWasm (disabled), EVM smart contracts
- Official website: qie.digital
- Official wallet: qiewallet.me

**Current page the user is on:** ${getPageContext()}

**Your role:**
- Answer questions concisely (2-4 sentences max)
- Be helpful and friendly
- If asked about live data you don't have, suggest checking the relevant explorer page
- Never make up fake data
- Use emojis occasionally

User question: ${userMsg}`;

      const res = await fetch("/api/ai", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: userMsg }
    ],
    max_tokens: 300,
    temperature: 0.7,
  }),
});
const data = await res.json();
const aiText = data?.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
      
      setMessages((prev) => [...prev, { role: "ai", text: aiText }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Error connecting to AI. Please try again later." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([
      {
        role: "ai",
        text: "Chat cleared! How can I help you with QIE blockchain? 🚀",
      },
    ]);
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 rounded-2xl shadow-2xl transition-all duration-300 flex items-center justify-center ${
          open
            ? "w-12 h-12 bg-muted border border-border/60"
            : "w-14 h-14 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:scale-110 hover:shadow-violet-500/30"
        }`}
        title="QIE AI Assistant"
      >
        {open ? (
          <X className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Bot className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] rounded-2xl border-2 border-border/60 bg-card shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/60 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">QIE AI Assistant</h3>
                <p className="text-[10px] text-muted-foreground">Powered by Gemini</p>
              </div>
            </div>
            <button
              onClick={clearChat}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-br-md"
                      : "bg-muted/50 text-foreground rounded-bl-md"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border/60">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask about QIE blockchain..."
                className="flex-1 rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 text-sm focus:border-violet-500/50 focus:outline-none transition-colors placeholder:text-muted-foreground/50"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 grid place-items-center disabled:opacity-40 hover:shadow-lg hover:shadow-violet-500/25 transition-all shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">
              QIE AI can make mistakes. Verify important info on the explorer.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
