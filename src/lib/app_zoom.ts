import { DEFAULT_ZOOM_LEVEL } from "@/lib/schemas";

function normalizeZoomLevel(value: string | undefined): number {
  const parsed = Number(value ?? DEFAULT_ZOOM_LEVEL);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Number(DEFAULT_ZOOM_LEVEL) / 100;
  }
  return parsed / 100;
}

function applyDomZoom(zoomFactor: number): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.style.setProperty(
    "--chaemera-app-zoom-factor",
    String(zoomFactor),
  );
  document.documentElement.style.zoom = String(zoomFactor);
}

export function applyAppZoom(zoomLevel: string | undefined): () => void {
  const zoomFactor = normalizeZoomLevel(zoomLevel);
  const defaultZoomFactor = Number(DEFAULT_ZOOM_LEVEL) / 100;

  applyDomZoom(zoomFactor);
  return () => {
    applyDomZoom(defaultZoomFactor);
  };
}
