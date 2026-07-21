import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  getGetAuthStatusQueryKey,
  getListChatMessagesQueryKey,
  type ChatMessage,
  useGetAuthStatus,
  useListChatMessages,
  useLogout,
  useSendChatMessage,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { VideoLibrary } from "../components/video-library";
import {
  CheckCircle2,
  LoaderCircle,
  LogOut,
  MessageCircle,
  RefreshCw,
  Send,
} from "lucide-react";
import { schoolPortraitUrl } from "../local-media";

function getErrorStatus(error: unknown): number | undefined {
  return (error as { status?: number } | null)?.status;
}

export function HomePage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [sendError, setSendError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const statusQuery = useGetAuthStatus({
    query: {
      queryKey: getGetAuthStatusQueryKey(),
      retry: false,
    },
  });
  const messagesQuery = useListChatMessages({
    query: {
      queryKey: getListChatMessagesQueryKey(),
      enabled: statusQuery.data?.status === "approved",
      retry: false,
      refetchInterval: 2_000,
      refetchIntervalInBackground: false,
    },
  });
  const sendMessage = useSendChatMessage();
  const logout = useLogout();
  const handleUnauthorized = useCallback(() => setLocation("/"), [setLocation]);

  useEffect(() => {
    if (
      statusQuery.data?.status === "none" ||
      getErrorStatus(messagesQuery.error) === 401
    ) {
      handleUnauthorized();
    }
  }, [handleUnauthorized, messagesQuery.error, statusQuery.data?.status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messagesQuery.data?.length]);

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || sendMessage.isPending) return;
    setSendError("");

    sendMessage.mutate(
      { data: { text } },
      {
        onSuccess: (created) => {
          setMessage("");
          queryClient.setQueryData<ChatMessage[]>(
            getListChatMessagesQueryKey(),
            (current = []) => {
              if (current.some((item) => item.id === created.id))
                return current;
              return [...current, created].slice(-100);
            },
          );
        },
        onError: (error) => {
          if (getErrorStatus(error) === 401) {
            handleUnauthorized();
            return;
          }
          setSendError(
            getErrorStatus(error) === 429
              ? "Please wait before sending another message."
              : "Message could not be sent.",
          );
        },
      },
    );
  };

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        queryClient.clear();
        setLocation("/");
      },
    });
  };

  return (
    <main className="school-shell home-shell">
      <div className="home-container">
        <header className="site-header">
          <div className="brand-lockup">
            <span className="school-mark">GW</span>
            <div>
              <p>Private community</p>
              <h1>Greenways School</h1>
            </div>
          </div>
          <div className="header-actions">
            <span className="session-status">
              <CheckCircle2 aria-hidden="true" />
              Connected
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="icon-button header-button"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut />
            </button>
          </div>
        </header>

        <div className="home-grid">
          <aside className="app-card profile-card">
            <div className="profile-image">
              <img src={schoolPortraitUrl} alt="Greenways School profile" />
              <span>GW</span>
            </div>
            <div className="profile-copy">
              <p className="eyebrow">School profile</p>
              <h2>Greenways</h2>
              <p>Private school archive and community space.</p>
            </div>
            <dl className="profile-details">
              <div>
                <dt>Library</dt>
                <dd>Local archive</dd>
              </div>
              <div>
                <dt>Access</dt>
                <dd>Members</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd className="online-value">
                  <span aria-hidden="true" />
                  Online
                </dd>
              </div>
            </dl>
          </aside>

          <VideoLibrary />

          <section
            className="app-card chat-card"
            aria-labelledby="chat-heading"
          >
            <header className="card-header">
              <div>
                <p className="eyebrow">Community</p>
                <h2 id="chat-heading">Shared room</h2>
              </div>
              <button
                type="button"
                onClick={() => messagesQuery.refetch()}
                className="icon-button"
                title="Refresh messages"
                aria-label="Refresh messages"
              >
                <RefreshCw className={messagesQuery.isFetching ? "spin" : ""} />
              </button>
            </header>

            <div className="chat-feed">
              {messagesQuery.isLoading ? (
                <div className="chat-state">
                  <LoaderCircle className="spin" aria-hidden="true" />
                  <span>Opening room</span>
                </div>
              ) : messagesQuery.isError ? (
                <div className="chat-state error-state">
                  <MessageCircle aria-hidden="true" />
                  <span>Room is unavailable</span>
                </div>
              ) : messagesQuery.data?.length ? (
                <div className="message-list">
                  {messagesQuery.data.map((item) => (
                    <article key={item.id} className="message-item">
                      <div className="message-meta">
                        <strong>{item.author}</strong>
                        <time dateTime={item.createdAt}>
                          {new Date(item.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                      <p>{item.text}</p>
                    </article>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="chat-state">
                  <MessageCircle aria-hidden="true" />
                  <span>No messages yet</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="message-form">
              <div className="message-field">
                <input
                  type="text"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write a message"
                  maxLength={500}
                  aria-label="Chat message"
                />
                <button
                  type="submit"
                  disabled={!message.trim() || sendMessage.isPending}
                  className="icon-button send-button"
                  title="Send message"
                  aria-label="Send message"
                >
                  {sendMessage.isPending ? (
                    <LoaderCircle className="spin" />
                  ) : (
                    <Send />
                  )}
                </button>
              </div>
              {sendError && (
                <p className="form-error" role="alert">
                  {sendError}
                </p>
              )}
            </form>
          </section>
        </div>

        <footer className="site-footer">
          <span>Greenways School</span>
          <span>Local media archive · Private session</span>
        </footer>
      </div>
    </main>
  );
}
