import { X, MessageSquarePlus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ChatErrorBox({
  onDismiss,
  error,
  onStartNewChat,
}: {
  onDismiss: () => void;
  error: string;
  onStartNewChat?: () => void;
}) {
  if (error.includes("doesn't have a free quota tier")) {
    return (
      <ChatErrorContainer onDismiss={onDismiss}>
        {error}. Check your model/provider configuration or switch to another
        model.
      </ChatErrorContainer>
    );
  }

  // Keep a dedicated path for generic rate-limit style errors.
  if (
    error.includes("Resource has been exhausted") ||
    error.includes("https://ai.google.dev/gemini-api/docs/rate-limits") ||
    error.includes("Provider returned error")
  ) {
    return (
      <ChatErrorContainer onDismiss={onDismiss}>
        {error}. Try another model or provider.
      </ChatErrorContainer>
    );
  }

  if (error.includes("LiteLLM Virtual Key expected")) {
    return (
      <ChatInfoContainer onDismiss={onDismiss}>
        <span>
          Looks like your configured AI key is invalid. Check provider settings
          and try again.
        </span>
      </ChatInfoContainer>
    );
  }
  // This is a very long list of model fallbacks that clutters the error message.
  //
  // We are matching "Fallbacks=[{" and not just "Fallbacks=" because the fallback
  // model itself can error and we want to include the fallback model error in the error message.
  const fallbackPrefix = "Fallbacks=[{";
  if (error.includes(fallbackPrefix)) {
    error = error.split(fallbackPrefix)[0];
  }

  return (
    <ChatErrorContainer onDismiss={onDismiss}>
      {error}
      <div className="mt-2 space-y-2 space-x-2">
        {onStartNewChat && (
          <Tooltip>
            <TooltipTrigger
              onClick={onStartNewChat}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
            >
              <span>Start new chat</span>
              <MessageSquarePlus size={18} />
            </TooltipTrigger>
            <TooltipContent>
              Starting a new chat can fix some issues
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </ChatErrorContainer>
  );
}

function ChatErrorContainer({
  onDismiss,
  children,
}: {
  onDismiss: () => void;
  children: React.ReactNode | string;
}) {
  return (
    <div
      data-testid="chat-error-box"
      className="relative mt-2 bg-red-50 border border-red-200 rounded-md shadow-sm p-2 mx-4"
    >
      <button
        onClick={onDismiss}
        className="absolute top-2.5 left-2 p-1 hover:bg-red-100 rounded"
      >
        <X size={14} className="text-red-500" />
      </button>
      <div className="pl-8 py-1 text-sm">
        <div className="text-red-700 text-wrap">
          {typeof children === "string" ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {children}
            </ReactMarkdown>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

function ChatInfoContainer({
  onDismiss,
  children,
}: {
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative mt-2 bg-sky-50 border border-sky-200 rounded-md shadow-sm p-2 mx-4">
      <button
        onClick={onDismiss}
        className="absolute top-2.5 left-2 p-1 hover:bg-sky-100 rounded"
      >
        <X size={14} className="text-sky-600" />
      </button>
      <div className="pl-8 py-1 text-sm">
        <div className="text-sky-800 text-wrap">{children}</div>
      </div>
    </div>
  );
}
