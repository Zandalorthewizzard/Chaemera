import { describe, expect, it } from "vitest";

import { escapeDyadTags, stringifyDyadTagContent } from "../helpers";

describe("stringifyDyadTagContent", () => {
  it("returns strings unchanged", () => {
    expect(stringifyDyadTagContent("hello")).toBe("hello");
  });

  it("serializes plain objects to JSON", () => {
    expect(stringifyDyadTagContent({ text: "3" })).toBe('{"text":"3"}');
  });

  it("returns empty string for nullish values", () => {
    expect(stringifyDyadTagContent(undefined)).toBe("");
    expect(stringifyDyadTagContent(null)).toBe("");
  });

  it("falls back to String coercion for unserializable values", () => {
    const value: { self?: unknown; toString: () => string } = {
      toString: () => "[custom-output]",
    };
    value.self = value;

    expect(stringifyDyadTagContent(value)).toBe("[custom-output]");
  });
});

describe("escapeDyadTags", () => {
  it("handles unexpected non-string values without throwing", () => {
    expect(escapeDyadTags({ text: "<dyad-test>" } as never)).toBe(
      '{"text":"пјњdyad-test>"}',
    );
  });
});
