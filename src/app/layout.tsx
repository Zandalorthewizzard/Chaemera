import {
  appConsoleEntriesAtom,
  previewModeAtom,
  selectedAppIdAtom,
} from "@/atoms/appAtoms";
import { chatInputValueAtom } from "@/atoms/chatAtoms";
import { selectedComponentsPreviewAtom } from "@/atoms/previewAtoms";
import { ForceCloseDialog } from "@/components/ForceCloseDialog";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { usePlanEvents } from "@/hooks/usePlanEvents";
import { useAppOutputSubscription, useRunApp } from "@/hooks/useRunApp";
import { useSettings } from "@/hooks/useSettings";
import { useZoomShortcuts } from "@/hooks/useZoomShortcuts";
import i18n from "@/i18n";
import { ipc } from "@/ipc/types";
import { applyAppZoom } from "@/lib/app_zoom";
import { DEFAULT_ZOOM_LEVEL } from "@/lib/schemas";
import { LanguageSchema } from "@/lib/schemas";
import { useAtomValue, useSetAtom } from "jotai";
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { Toaster } from "sonner";
import { DeepLinkProvider } from "../contexts/DeepLinkContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { TitleBar } from "./TitleBar";

export default function RootLayout({ children }: { children: ReactNode }) {
  const { refreshAppIframe } = useRunApp();
  // Subscribe to app output events once at the root level to avoid duplicates
  useAppOutputSubscription();
  const previewMode = useAtomValue(previewModeAtom);
  const { settings } = useSettings();
  const setSelectedComponentsPreview = useSetAtom(
    selectedComponentsPreviewAtom,
  );
  const setChatInput = useSetAtom(chatInputValueAtom);
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const setConsoleEntries = useSetAtom(appConsoleEntriesAtom);
  const [forceCloseDialogOpen, setForceCloseDialogOpen] = useState(false);
  const [forceClosePerformanceData, setForceClosePerformanceData] =
    useState<ComponentProps<typeof ForceCloseDialog>["performanceData"]>();

  // Initialize plan events listener
  usePlanEvents();

  // Zoom keyboard shortcuts (Ctrl/Cmd + =/- /0)
  useZoomShortcuts();

  useEffect(() => {
    return applyAppZoom(settings?.zoomLevel ?? DEFAULT_ZOOM_LEVEL);
  }, [settings?.zoomLevel]);

  // Sync i18n language with persisted user setting
  useEffect(() => {
    const parsed = LanguageSchema.safeParse(settings?.language);
    const language = parsed.success ? parsed.data : "en";
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [settings?.language]);

  // Global keyboard listener for refresh events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+R (Windows/Linux) or Cmd+R (macOS)
      if (event.key === "r" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault(); // Prevent default browser refresh
        if (previewMode === "preview") {
          refreshAppIframe(); // Use our custom refresh function instead
        }
      }
    };

    // Add event listener to document
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup function to remove event listener
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [refreshAppIframe, previewMode]);

  useEffect(() => {
    setChatInput("");
    setSelectedComponentsPreview([]);
    setConsoleEntries([]);
  }, [selectedAppId]);

  useEffect(() => {
    return ipc.events.system.onForceCloseDetected((data) => {
      setForceClosePerformanceData(data.performanceData);
      setForceCloseDialogOpen(true);
    });
  }, []);

  return (
    <>
      <ThemeProvider>
        <DeepLinkProvider>
          <SidebarProvider>
            <ForceCloseDialog
              isOpen={forceCloseDialogOpen}
              onClose={() => setForceCloseDialogOpen(false)}
              performanceData={forceClosePerformanceData}
            />
            <TitleBar />
            <AppSidebar />
            <div
              id="layout-main-content-container"
              className="flex h-screenish min-h-0 w-full overflow-x-hidden mt-12 mb-4 mr-4 border-t border-l border-border rounded-none bg-background"
            >
              {children}
            </div>
            <Toaster
              richColors
              duration={settings?.isTestMode ? 500 : undefined}
            />
          </SidebarProvider>
        </DeepLinkProvider>
      </ThemeProvider>
    </>
  );
}
