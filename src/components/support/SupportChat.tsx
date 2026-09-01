"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import {
  Headphones,
  Send,
  PhoneOff,
  Sparkles,
  Mic,
  MicOff,
  MessageSquare,
  AudioLines,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import AgentNotConfigured from "@/components/support/AgentNotConfigured";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

const SUGGESTED = [
  "Where is my order?",
  "Help me find wireless headphones under $150",
  "I want to return something",
  "What is your return policy?",
];

type Mode = "text" | "voice";

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  /** Agent text-mode messages animate in with a typewriter reveal. */
  stream?: boolean;
}

/** Small headphones avatar used beside Sarah's messages and in the header. */
function SarahAvatar({ className }: { className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-linear-to-br from-primary to-violet-500 text-white">
        <Headphones className="size-4" />
      </AvatarFallback>
    </Avatar>
  );
}

/** Three bouncing dots shown while Sarah is composing a reply. */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <SarahAvatar className="size-7" />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border bg-card px-4 py-3 shadow-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="typing-dot size-2 rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Parse inline markdown (**bold**, *italic* / _italic_, `code`) into React
 * nodes. Builds elements directly (React escapes text) — no dangerouslySetHTML,
 * so it's XSS-safe. Unclosed markers mid-stream just render as literal text.
 */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={`${keyBase}-${i}`}>{m[2]}</strong>);
    else if (m[3] !== undefined) nodes.push(<em key={`${keyBase}-${i}`}>{m[3]}</em>);
    else if (m[4] !== undefined) nodes.push(<em key={`${keyBase}-${i}`}>{m[4]}</em>);
    else if (m[5] !== undefined)
      nodes.push(
        <code key={`${keyBase}-${i}`} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
          {m[5]}
        </code>,
      );
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/**
 * Minimal, dependency-free markdown renderer for chat bubbles. Supports
 * numbered/bulleted lists, short paragraphs and inline emphasis — enough to make
 * Sarah's formatted product lists read cleanly. Anything unrecognised falls
 * through as plain text.
 */
function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let b = 0;

  const flush = () => {
    if (!list) return;
    const items = list.items.map((it, i) => (
      <li key={i} className="pl-1">
        {renderInline(it, `li-${b}-${i}`)}
      </li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={`b-${b++}`} className="my-1 ml-4 list-decimal space-y-1">
          {items}
        </ol>
      ) : (
        <ul key={`b-${b++}`} className="my-1 ml-4 list-disc space-y-1">
          {items}
        </ul>
      ),
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const ul = line.match(/^\s*[-*•]\s+(.*)$/);
    if (ol) {
      if (!list || !list.ordered) {
        flush();
        list = { ordered: true, items: [] };
      }
      list.items.push(ol[1]);
    } else if (ul) {
      if (!list || list.ordered) {
        flush();
        list = { ordered: false, items: [] };
      }
      list.items.push(ul[1]);
    } else {
      flush();
      if (line.trim()) {
        blocks.push(
          <p key={`b-${b++}`} className="my-1 first:mt-0 last:mb-0">
            {renderInline(line, `p-${b}`)}
          </p>,
        );
      }
    }
  }
  flush();
  return <>{blocks}</>;
}

/**
 * Reveals `text` progressively so a complete agent message (ElevenLabs delivers
 * them whole) reads like a live stream, rendering markdown as it goes. In voice
 * mode the reveal is paced to roughly match speech so the transcript tracks the
 * audio instead of dumping instantly or lagging far behind.
 */
function StreamingText({
  text,
  onTick,
  onDone,
  speechPaced,
}: {
  text: string;
  onTick: () => void;
  onDone?: () => void;
  speechPaced?: boolean;
}) {
  // Each message renders its own keyed StreamingText, so count starts at 0 and
  // the text prop is stable for the instance's lifetime — no in-effect reset.
  const [count, setCount] = useState(0);

  useEffect(() => {
    const len = text.length;
    // Voice: ~48ms/char ≈ natural speaking pace. Text: snappy, ~0.6–2.2s total.
    const totalMs = speechPaced
      ? len * 48
      : Math.min(2200, Math.max(600, len * 10));
    const tick = 24;
    const step = Math.max(1, Math.ceil(len / (totalMs / tick)));
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(len, i + step);
      setCount(i);
      onTick();
      if (i >= len) {
        clearInterval(id);
        onDone?.();
      }
    }, tick);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const done = count >= text.length;
  return (
    <>
      <MarkdownText text={text.slice(0, count)} />
      {!done && <span className="stream-caret ml-0.5 inline-block align-baseline">▍</span>}
    </>
  );
}

/**
 * Pulsing orb that scales with the agent's live output level while speaking and
 * the mic input level while listening. Driven by requestAnimationFrame writing
 * to a ref so it doesn't re-render the tree every frame.
 */
function VoiceOrb({
  getLevel,
  speaking,
  active,
}: {
  getLevel: () => number;
  speaking: boolean;
  active: boolean;
}) {
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let smoothed = 0;
    const tick = () => {
      let level = 0;
      try {
        level = getLevel() || 0;
      } catch {
        level = 0;
      }
      smoothed += (level - smoothed) * 0.25;
      const scale = 1 + Math.min(smoothed, 1) * 0.35;
      if (orbRef.current) {
        orbRef.current.style.transform = `scale(${scale.toFixed(3)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getLevel, active]);

  return (
    <div className="relative grid place-items-center">
      <span
        className={cn(
          "absolute size-24 rounded-full transition-opacity duration-500",
          speaking ? "bg-primary/20 opacity-100" : "bg-primary/10 opacity-60",
        )}
      />
      <div
        ref={orbRef}
        className="relative grid size-16 place-items-center rounded-full bg-linear-to-br from-primary to-violet-500 shadow-lg shadow-primary/30 transition-transform duration-75"
      >
        <Headphones className="size-7 text-white" />
      </div>
    </div>
  );
}

function ChatInner() {
  const [mode, setMode] = useState<Mode>("text");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const seq = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<Mode>("text");
  const router = useRouter();
  // Message ids whose stream reveal has finished. Once done, a message renders
  // statically — so switching panels or ending the call doesn't replay the
  // typewriter animation from scratch.
  const doneRef = useRef<Set<string>>(new Set());
  // Per-session conversation id + session token, used to log the transcript to
  // the admin (see /api/ai/session-log). Refs so callbacks read fresh values.
  const convIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string>("");
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const wasConnectedRef = useRef(false);

  const nextId = () => `m${seq.current++}`;

  // The ElevenLabs WebRTC transport logs transient/benign errors to
  // console.error (connection teardown at end-of-call, momentary server
  // hiccups). In Next.js dev these pop the red error overlay and alarm testers
  // even though the call keeps working. While the chat is mounted, downgrade
  // just these known-benign messages to console.warn (no overlay); everything
  // else is forwarded untouched. Original console.error is restored on unmount.
  useEffect(() => {
    const BENIGN = [
      "error reading from signal stream",
      "Server error: Unknown error",
      "Server error",
      "Unknown error",
    ];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      const first = args[0];
      if (typeof first === "string" && BENIGN.some((s) => first.includes(s))) {
        console.warn("[Sarah] (transient)", ...args);
        return;
      }
      original(...args);
    };
    return () => {
      console.error = original;
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  // Persist the running transcript to the admin. Best-effort; keyed by the
  // client-generated conversation id so tool calls and the transcript land on
  // the same conversation row regardless of the ElevenLabs webhook config.
  const logSession = useCallback((ended: boolean) => {
    const conversationId = convIdRef.current;
    if (!conversationId) return;
    const payload = {
      conversationId,
      channel: modeRef.current,
      ended,
      messages: messagesRef.current.map((m) => ({ role: m.role, text: m.text })),
    };
    const body = JSON.stringify(payload);
    // On teardown, sendBeacon survives the page/connection closing; otherwise fetch.
    if (ended && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/ai/session-log", new Blob([body], { type: "application/json" }));
      return;
    }
    fetch("/api/ai/session-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shopai-session-token": tokenRef.current,
      },
      body,
      keepalive: true,
    }).catch(() => {
      /* best-effort logging */
    });
  }, []);

  const conversation = useConversation({
    onMessage: (payload: { message: string; source: string }) => {
      const voice = modeRef.current === "voice";
      if (payload.source === "user") {
        // In voice mode the user's turn arrives as a transcript — show it, and
        // show the typing indicator until Sarah's reply comes back.
        // In text mode we already echo it locally on send.
        if (voice) {
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "user", text: payload.message },
          ]);
          setAwaitingReply(true);
        }
        return;
      }
      setAwaitingReply(false);
      setMessages((prev) => [
        ...prev,
        // Stream the reveal in both text and voice so the transcript animates in.
        { id: nextId(), role: "agent", text: payload.message, stream: true },
      ]);
      // Sarah's tool (add/remove from cart, cancel order, book, etc.) has already
      // run server-side by the time her reply arrives. Re-fetch the server
      // components for this route so the navbar cart badge — and any other
      // server-rendered state — reflects what she just did. Client state (the
      // live conversation) is preserved across a refresh.
      router.refresh();
    },
    onError: (message: string) => {
      // Transient/benign SDK errors are downgraded to a warning so they don't
      // pop the dev overlay or interrupt the demo; the call keeps working.
      console.warn("[Sarah] conversation error:", message);
    },
  });

  const {
    status,
    isSpeaking,
    isListening,
    isMuted,
    setMuted,
    getOutputVolume,
    getInputVolume,
  } = conversation;
  const isConnected = status === "connected";
  const isVoice = mode === "voice";

  useEffect(() => {
    scrollToBottom();
  }, [messages, awaitingReply, scrollToBottom]);

  // Sync the transcript to the admin as it grows (debounced), so a conversation
  // shows up with its messages even if it's never cleanly ended.
  useEffect(() => {
    if (!convIdRef.current || messages.length === 0) return;
    const id = setTimeout(() => logSession(false), 800);
    return () => clearTimeout(id);
  }, [messages, logSession]);

  // Finalise the log when the session disconnects (End call / end chat / drop).
  useEffect(() => {
    if (isConnected) {
      wasConnectedRef.current = true;
    } else if (wasConnectedRef.current) {
      wasConnectedRef.current = false;
      logSession(true);
    }
  }, [isConnected, logSession]);

  // Best-effort finalise if the user navigates away mid-conversation.
  useEffect(() => {
    return () => {
      if (convIdRef.current) logSession(true);
    };
  }, [logSession]);

  const connect = useCallback(
    async (selected: Mode) => {
      if (!AGENT_ID) return;
      setMicError(null);
      modeRef.current = selected;
      setMode(selected);
      setMessages([]);

      if (selected === "voice") {
        // Pre-flight the mic so we can surface a clear error before connecting.
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
        } catch {
          setMicError(
            "Microphone access is blocked. Allow mic permission in your browser and try again.",
          );
          return;
        }
      }

      // A fresh conversation id per session so tool calls + transcript group
      // under one admin conversation row.
      convIdRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `conv-${Date.now()}-${seq.current}`;

      try {
        const res = await fetch("/api/ai/session-token", { method: "POST" });
        const data = await res.json();
        tokenRef.current = data.token ?? "";
        conversation.startSession({
          agentId: AGENT_ID,
          connectionType: selected === "voice" ? "webrtc" : "websocket",
          ...(selected === "text" ? { textOnly: true } : {}),
          dynamicVariables: {
            session_token: data.token ?? "",
            conversation_channel: selected,
            app_conversation_id: convIdRef.current,
          },
        });
      } catch {
        /* surfaced via status */
      }
    },
    [conversation],
  );

  const pushUser = useCallback(
    (text: string) => {
      setMessages((prev) => [...prev, { id: nextId(), role: "user", text }]);
      setAwaitingReply(true);
      conversation.sendUserMessage(text);
    },
    [conversation],
  );

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || !isConnected) return;
    pushUser(text);
    setInput("");
  }, [input, isConnected, pushUser]);

  const voiceLevel = useCallback(() => {
    return isSpeaking ? getOutputVolume() : getInputVolume();
  }, [isSpeaking, getOutputVolume, getInputVolume]);

  const statusLabel = isConnected
    ? "Online"
    : status === "connecting"
      ? "Connecting"
      : "Offline";

  return (
    <Card className="mx-auto flex h-[72vh] max-w-2xl flex-col overflow-hidden p-0 shadow-xl ring-1 ring-black/5">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-linear-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="relative">
            <SarahAvatar className="size-10" />
            <span
              className={cn(
                "absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-card",
                isConnected
                  ? "bg-emerald-500"
                  : status === "connecting"
                    ? "bg-amber-500"
                    : "bg-muted-foreground/40",
              )}
            />
          </div>
          <div>
            <p className="flex items-center gap-1.5 font-semibold leading-tight">
              Sarah
              <Sparkles className="size-3.5 text-primary" />
            </p>
            <p className="text-xs text-muted-foreground">AI Support Agent</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-card/70 px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
          <span
            className={cn(
              "size-1.5 rounded-full",
              isConnected
                ? "bg-emerald-500"
                : status === "connecting"
                  ? "bg-amber-500"
                  : "bg-muted-foreground/40",
            )}
          />
          {isConnected && isVoice ? "Voice call" : statusLabel}
        </span>
      </div>

      {/* Body */}
      {isConnected && isVoice ? (
        /* ── Voice call panel ─────────────────────────────────────── */
        <div className="flex flex-1 flex-col overflow-hidden bg-muted/20">
          <div className="flex shrink-0 flex-col items-center justify-center gap-2 py-3">
            <VoiceOrb getLevel={voiceLevel} speaking={isSpeaking} active />
            <div className="text-center">
              <p className="text-sm font-semibold">
                {isSpeaking ? "Sarah is speaking…" : isListening ? "Listening…" : "Connected"}
              </p>
              <p className="mt-0.5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <AudioLines className="size-3.5" />
                Speak naturally — Sarah is listening live
              </p>
            </div>
          </div>

          {/* Live transcript — the primary area. It's flex-1 so it always takes
              the remaining height, which is larger than the compact orb block
              above (fixed, shrink-0). */}
          <div
            ref={scrollRef}
            className="min-h-[200px] flex-1 space-y-3 overflow-y-auto border-t px-4 py-4 sm:px-5"
          >
            {messages.length === 0 && !awaitingReply ? (
              <p className="pt-2 text-center text-sm text-muted-foreground">
                Your conversation transcript will appear here.
              </p>
            ) : (
              <>
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[82%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                        {m.text}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex items-end justify-start gap-2">
                      <SarahAvatar className="size-7" />
                      <div className="max-w-[82%] rounded-2xl rounded-bl-md border bg-card px-3.5 py-2 text-sm leading-relaxed text-foreground">
                        {m.stream && !doneRef.current.has(m.id) ? (
                          <StreamingText
                            text={m.text}
                            onTick={scrollToBottom}
                            onDone={() => doneRef.current.add(m.id)}
                            speechPaced
                          />
                        ) : (
                          <MarkdownText text={m.text} />
                        )}
                      </div>
                    </div>
                  ),
                )}
                {awaitingReply && <TypingIndicator />}
              </>
            )}
          </div>
        </div>
      ) : (
        /* ── Text chat panel ──────────────────────────────────────── */
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto bg-muted/20 px-4 py-5 sm:px-5"
        >
          {messages.length === 0 && !awaitingReply && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <SarahAvatar className="size-12" />
              <div>
                <p className="font-medium">
                  {isConnected ? "You're connected to Sarah" : "Chat with Sarah"}
                </p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  {isConnected
                    ? "Ask about products, orders, returns, or policies — pick a prompt below to start."
                    : "Choose text or voice below to get help with products, orders, returns and policies."}
                </p>
                {micError && (
                  <p className="mx-auto mt-3 max-w-xs text-sm text-destructive">{micError}</p>
                )}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex items-end justify-start gap-2">
                <SarahAvatar className="size-7" />
                <div className="max-w-[82%] rounded-2xl rounded-bl-md border bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
                  {m.stream && !doneRef.current.has(m.id) ? (
                    <StreamingText
                      text={m.text}
                      onTick={scrollToBottom}
                      onDone={() => doneRef.current.add(m.id)}
                    />
                  ) : (
                    <MarkdownText text={m.text} />
                  )}
                </div>
              </div>
            ),
          )}

          {awaitingReply && <TypingIndicator />}
        </div>
      )}

      {/* Suggested questions (text mode, fresh session) */}
      {isConnected && !isVoice && messages.length === 0 && (
        <div className="flex flex-wrap gap-2 border-t bg-card px-4 py-3 sm:px-5">
          {SUGGESTED.map((q) => (
            <Button
              key={q}
              variant="outline"
              size="xs"
              onClick={() => pushUser(q)}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              {q}
            </Button>
          ))}
        </div>
      )}

      {/* Composer / controls */}
      <div className="border-t bg-card p-3">
        {!isConnected ? (
          <div className="flex flex-col gap-3">
            {/* Mode switch */}
            <div className="mx-auto flex rounded-full bg-muted p-1 text-sm">
              <button
                onClick={() => setMode("text")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium transition-colors",
                  mode === "text"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <MessageSquare className="size-4" />
                Text chat
              </button>
              <button
                onClick={() => setMode("voice")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium transition-colors",
                  mode === "voice"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <Mic className="size-4" />
                Voice call
              </button>
            </div>
            <Button
              onClick={() => connect(mode)}
              disabled={status === "connecting"}
              size="lg"
              className="h-11 w-full"
            >
              {isVoice ? <Mic className="size-4" /> : <Sparkles className="size-4" />}
              {status === "connecting"
                ? "Connecting…"
                : isVoice
                  ? "Start voice call"
                  : "Start conversation"}
            </Button>
          </div>
        ) : isVoice ? (
          /* Voice controls */
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={() => setMuted(!isMuted)}
              variant={isMuted ? "default" : "outline"}
              size="lg"
              className="h-11 rounded-full px-5"
            >
              {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              {isMuted ? "Unmute" : "Mute"}
            </Button>
            <Button
              onClick={() => conversation.endSession()}
              variant="destructive"
              size="lg"
              className="h-11 rounded-full px-5"
            >
              <PhoneOff className="size-4" />
              End call
            </Button>
          </div>
        ) : (
          /* Text composer */
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                conversation.sendUserActivity();
              }}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type your question…"
              className="h-11 rounded-full px-4"
            />
            <Button
              onClick={send}
              disabled={!input.trim()}
              size="icon-lg"
              className="shrink-0 rounded-full"
            >
              <Send className="size-4" />
            </Button>
            <Button
              onClick={() => conversation.endSession()}
              variant="outline"
              size="icon-lg"
              title="End conversation"
              className="shrink-0 rounded-full text-muted-foreground hover:text-destructive"
            >
              <PhoneOff className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function SupportChat() {
  if (!AGENT_ID) {
    return <AgentNotConfigured />;
  }
  return (
    <ConversationProvider>
      <ChatInner />
    </ConversationProvider>
  );
}
