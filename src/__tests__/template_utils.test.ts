import { describe, expect, it, vi } from "vitest";
import { fetchApiTemplates } from "@/ipc/utils/template_utils";

describe("template utils", () => {
  it("uses local templates only in the public release", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const templates = await fetchApiTemplates();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(templates).toEqual([]);

    fetchSpy.mockRestore();
  });
});
