"use client";

import { useState } from "react";

export default function Home() {
  const [threadId] = useState(crypto.randomUUID());
  const [runId, setRunId] = useState(crypto.randomUUID());
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [messageIdMapping, setMessageIdMapping] = useState<{ [messageId: string]: string }>({});
  const [upvotedMessages, setUpvotedMessages] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);

    // Add the user's message to the chat
    const userMessage = { id: crypto.randomUUID(), role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      // Send the message to the backend API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage], threadId, runId }),
      });

      if (!response.ok) throw new Error("Failed to fetch response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let assistantMessageContent = "";
      const assistantMessageId = crypto.randomUUID();

      // Stream the response from the backend
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        assistantMessageContent += chunk;

        // Update the assistant's message in real-time
        setMessages((prev) => {
          const existingMessageIndex = prev.findIndex((msg) => msg.id === assistantMessageId);
          if (existingMessageIndex === -1) {
            return [...prev, { id: assistantMessageId, role: "assistant", content: assistantMessageContent }];
          } else {
            return prev.map((msg, index) =>
              index === existingMessageIndex ? { ...msg, content: assistantMessageContent } : msg
            );
          }
        });
      }

      // Store the mapping between the message ID and the run ID
      setMessageIdMapping((prev) => ({
        ...prev,
        [assistantMessageId]: runId,
      }));

      // Generate a new run ID for the next message
      setRunId(crypto.randomUUID());
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScore = ({
    messageId,
    upvotedRunId,
    upvote,
  }: {
    messageId: string;
    upvotedRunId: string;
    upvote: boolean;
  }) => {
    fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: upvotedRunId, score: upvote ? 1 : 0 }),
    }).then(() => {
      if (upvote) {
        setUpvotedMessages([...upvotedMessages, messageId]);
      }
    });
  };

  return (
    <main className="min-h-screen">
      <section className="mx-auto w-2/3 mt-10 mb-20">
        {messages.map((message) => {
          const mappedRunId = messageIdMapping[message.id];
          const isAlreadyUpvoted = upvotedMessages.includes(message.id);

          return (
            <article key={message.id} className="flex gap-3 my-3">
              <div className="border border-gray-500 p-1">
                {message.role === "user" ? "🧑‍💻" : "🤖"}
              </div>
              {message.role === "user" && (
                <div className="flex-1">{message.content}</div>
              )}
              {message.role !== "user" && (
                <pre className="flex-1 text-pretty">{message.content}</pre>
              )}
              {!!mappedRunId && (
                <button
                  onClick={() =>
                    handleScore({
                      messageId: message.id,
                      upvotedRunId: mappedRunId,
                      upvote: true,
                    })
                  }
                  disabled={isAlreadyUpvoted}
                  className={isAlreadyUpvoted ? "" : "grayscale"}
                >
                  👍
                </button>
              )}
            </article>
          );
        })}
      </section>

      <form onSubmit={handleSubmit} className="fixed inset-x-0 bottom-0 mx-auto">
        <div className="px-4 py-2">
          <div className="flex gap-2 w-2/3 mx-auto border border-gray-600 rounded-md">
            <input
              placeholder="Send a message."
              className="flex-1 p-2 rounded-md"
              autoComplete="off"
              value={input}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            <button
              className="bg-gray-300 rounded-md"
              type="submit"
              disabled={!input || isLoading}
            >
              <span className="p-2">{isLoading ? "Sending..." : "Send message"}</span>
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}