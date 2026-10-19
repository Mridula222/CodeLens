import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_URL = "http://127.0.0.1:8000";

const suggestions = [
  {
    icon: "⌘",
    title: "Explain this codebase",
    prompt: "Explain the overall architecture of this repository.",
  },
  {
    icon: "⇄",
    title: "Trace a request",
    prompt: "Trace how a request flows through the backend.",
  },
  {
    icon: "{}",
    title: "Understand authentication",
    prompt: "Explain how user authentication works in this project.",
  },
  {
    icon: "⌕",
    title: "Find important files",
    prompt: "Which files are most important to understand this project?",
  },
];

function getErrorMessage(data) {
  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (data?.detail) {
    return JSON.stringify(data.detail);
  }

  return "Something went wrong. Please try again.";
}

export default function AssistantPage({ analysis }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const repositoryUrl = analysis?.url || "";
  const repositoryName = analysis?.data?.repository || "your repository";

  async function handleSend(event) {
    event.preventDefault();

    const text = question.trim();

    if (!text || isLoading) return;

    if (!repositoryUrl) {
      setNotice("Analyze a repository from Overview first.");
      return;
    }

    setNotice("");
    setQuestion("");
    setIsLoading(true);

    setMessages((previous) => [...previous, { role: "user", content: text }]);

    try {
      const response = await fetch(`${API_URL}/api/assistant/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repository: repositoryUrl,
          question: text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.answer || "The assistant returned no answer.",
          sources: data.sources || [],
        },
      ]);
    } catch (error) {
      setNotice(
        `Could not get an answer: ${error.message}. Check that the backend is running.`,
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSuggestion(prompt) {
    setQuestion(prompt);
    setNotice("");
  }

  return (
    <div className="assistant-page">
      <header className="assistant-heading">
        <div>
          <div className="assistant-eyebrow">CODELENS AI</div>
          <h2>AI Assistant</h2>
          <p>
            Understand your codebase by asking questions about its actual code.
          </p>
        </div>

        <div className="assistant-status">
          <span className="assistant-status-dot" />
          {analysis ? "Repository selected" : "No repository"}
        </div>
      </header>

      <div className="assistant-repository">
        <span className="assistant-repository-icon">⌘</span>
        <div>
          <span className="assistant-muted">CURRENT REPOSITORY</span>
          <strong>{repositoryName}</strong>
        </div>
      </div>

      <section className="assistant-chat">
        {messages.length === 0 ? (
          <div className="assistant-welcome">
            <div className="assistant-orb">✳</div>

            <h3>Let's understand your code.</h3>
            <p>
              Ask about architecture, authentication, database models, routes,
              or how different files work together.
            </p>

            <div className="assistant-suggestions">
              {suggestions.map((item) => (
                <button
                  type="button"
                  className="assistant-suggestion"
                  key={item.title}
                  onClick={() => handleSuggestion(item.prompt)}
                >
                  <span className="assistant-suggestion-icon">{item.icon}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.prompt}</small>
                  </span>
                  <span className="assistant-suggestion-arrow">↗</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="assistant-messages">
            {messages.map((message, index) => (
              <div
                className={`assistant-message ${
                  message.role === "assistant" ? "assistant-ai-message" : ""
                }`}
                key={`${index}-${message.role}`}
              >
                <span className="assistant-avatar">
                  {message.role === "assistant" ? "AI" : "You"}
                </span>

                <div className="assistant-message-content">
                  <strong>
                    {message.role === "assistant" ? "CodeLens AI" : "You"}
                  </strong>

                  <div className="assistant-answer">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <h2>{children}</h2>,
                        table: ({ children }) => (
                          <div className="assistant-table-wrap">
                            <table>{children}</table>
                          </div>
                        ),
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noreferrer">
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {message.content
                        .replace(/<br\s*\/?>/gi, "\n")
                        .replace(/&lt;br\s*\/?&gt;/gi, "\n")
                        .replace(/\n{3,}/g, "\n\n")}
                    </ReactMarkdown>
                  </div>

                  {message.sources?.length > 0 && (
                    <div className="assistant-sources">
                      <strong>Source files</strong>
                      <ul>
                        {message.sources.map((source) => (
                          <li key={source.path}>
                            <code>{source.path}</code>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="assistant-message">
                <span className="assistant-avatar">AI</span>
                <div className="assistant-message-content">
                  <strong>CodeLens AI</strong>
                  <p role="status">
                    Searching your code and generating an answer...
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {notice && (
          <p className="assistant-notice" role="alert">
            {notice}
          </p>
        )}

        <form className="assistant-composer" onSubmit={handleSend}>
          <textarea
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value);
              setNotice("");
            }}
            placeholder={
              analysis
                ? "Ask anything about your codebase..."
                : "Analyze a repository to get started..."
            }
            aria-label="Ask a question about the repository"
            rows={2}
            disabled={isLoading}
          />

          <div className="assistant-composer-footer">
            <span>Answers use retrieved repository code as context.</span>

            <button type="submit" disabled={!question.trim() || isLoading}>
              {isLoading ? "Thinking..." : "Send"} <span>↑</span>
            </button>
          </div>
        </form>

        <p className="assistant-disclaimer">
          AI-generated answers can be incorrect. Verify important details
          against the source code.
        </p>
      </section>
    </div>
  );
}
