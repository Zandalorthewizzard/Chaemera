import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { isChatPanelHiddenAtom, isPreviewOpenAtom } from "@/atoms/viewAtoms";
import { useChats } from "@/hooks/useChats";
import { usePlanImplementation } from "@/hooks/usePlanImplementation";
import { cn } from "@/lib/utils";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import {
  type ImperativePanelHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { ChatPanel } from "../components/ChatPanel";
import { RightActionSidebar } from "../components/RightActionSidebar";
import { PreviewPanel } from "../components/preview_panel/PreviewPanel";

const DEFAULT_CHAT_PANEL_SIZE = 50;

export default function ChatPage() {
  const { id: chatId } = useSearch({ from: "/chat" });
  const navigate = useNavigate();
  const [isPreviewOpen, setIsPreviewOpen] = useAtom(isPreviewOpenAtom);
  const [isChatPanelHidden, setIsChatPanelHidden] = useAtom(
    isChatPanelHiddenAtom,
  );
  const [isResizing, setIsResizing] = useState(false);
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const { chats, loading } = useChats(selectedAppId);
  const previousSizeRef = useRef<number>(DEFAULT_CHAT_PANEL_SIZE);
  const isInitialMountRef = useRef(true);

  // Handle plan implementation when a plan is accepted
  usePlanImplementation();

  useEffect(() => {
    if (!chatId && chats.length && !loading) {
      // Not a real navigation, just a redirect, when the user navigates to /chat
      // without a chatId, we redirect to the first chat
      setSelectedAppId(chats[0].appId);
      navigate({ to: "/chat", search: { id: chats[0].id }, replace: true });
    }
  }, [chatId, chats, loading, navigate]);

  useEffect(() => {
    if (isPreviewOpen) {
      ref.current?.expand();
    } else {
      ref.current?.collapse();
    }
  }, [isPreviewOpen]);
  const ref = useRef<ImperativePanelHandle>(null);
  const chatPanelRef = useRef<ImperativePanelHandle>(null);

  // Keep chat panel size in sync with hidden state (from toolbar button / other views)
  useEffect(() => {
    if (!chatPanelRef.current) return;
    // Skip the initial mount to preserve persisted panel size from autoSaveId
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    if (isChatPanelHidden) {
      // Save current size before collapsing
      const currentSize = chatPanelRef.current.getSize();
      if (currentSize > 5) {
        previousSizeRef.current = currentSize;
      }
      chatPanelRef.current.resize(0);
    } else {
      // Restore to previous size when re-opened via button
      chatPanelRef.current.resize(previousSizeRef.current);
    }
  }, [isChatPanelHidden]);

  return (
    <PanelGroup
      autoSaveId="persistence"
      className="flex h-full min-h-0 w-full"
      direction="horizontal"
    >
      <Panel
        id="chat-panel"
        ref={chatPanelRef}
        collapsible
        minSize={0}
        className={cn(!isResizing && "transition-all duration-100 ease-in-out")}
      >
        <div className="h-full w-full">
          {!isChatPanelHidden && (
            <ChatPanel
              chatId={chatId}
              isPreviewOpen={isPreviewOpen}
              onTogglePreview={() => {
                setIsPreviewOpen(!isPreviewOpen);
                if (isPreviewOpen) {
                  ref.current?.collapse();
                } else {
                  ref.current?.expand();
                }
              }}
            />
          )}
        </div>
      </Panel>
      <PanelResizeHandle
        onDragging={(isDragging) => {
          setIsResizing(isDragging);
          // When dragging ends, sync the hidden state based on final width
          if (!isDragging) {
            // Small delay to let the panel settle
            requestAnimationFrame(() => {
              const panel = document.getElementById("chat-panel");
              if (panel) {
                const panelWidth = panel.getBoundingClientRect().width;
                const containerWidth =
                  panel.parentElement?.getBoundingClientRect().width || 1;
                const percentage = (panelWidth / containerWidth) * 100;
                // Consider hidden if panel is less than 5% width
                setIsChatPanelHidden(percentage < 5);
              }
            });
          }
        }}
        className={cn(
          "relative bg-transparent transition-colors",
          !isChatPanelHidden &&
            "cursor-col-resize after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border after:content-[''] hover:after:bg-muted-foreground/50",
          isChatPanelHidden
            ? "w-0 opacity-0 pointer-events-none"
            : "w-1 opacity-100",
        )}
      />

      <Panel
        collapsible
        ref={ref}
        id="preview-panel"
        minSize={20}
        className={cn(!isResizing && "transition-all duration-100 ease-in-out")}
      >
        <PreviewPanel />
      </Panel>
      <RightActionSidebar />
    </PanelGroup>
  );
}
