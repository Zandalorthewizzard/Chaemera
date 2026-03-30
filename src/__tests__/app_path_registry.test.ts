import { describe, expect, it, beforeEach } from "vitest";
import {
  clearResolvedAppPaths,
  forgetResolvedAppPath,
  getResolvedAppPath,
  hasResolvedAppPath,
  registerResolvedAppPath,
} from "@/ipc/runtime/app_path_registry";

describe("app path registry", () => {
  beforeEach(() => {
    clearResolvedAppPaths();
  });

  it("tracks resolved app paths by app id", () => {
    expect(hasResolvedAppPath(42)).toBe(false);
    expect(getResolvedAppPath(42)).toBe(null);

    registerResolvedAppPath(42, "C:/Work/chaemera-apps/demo");

    expect(hasResolvedAppPath(42)).toBe(true);
    expect(getResolvedAppPath(42)).toBe("C:/Work/chaemera-apps/demo");

    forgetResolvedAppPath(42);

    expect(hasResolvedAppPath(42)).toBe(false);
    expect(getResolvedAppPath(42)).toBe(null);
  });
});
