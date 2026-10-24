import { describe, expect, it } from "vitest";
import { authorAge } from "@/lib/author-dates";

describe("author ages", () => {
  it("updates living age on the birthday", () => {
    expect(authorAge("24 October 2000", null, new Date(2026, 9, 23))).toBe(25);
    expect(authorAge("24 October 2000", null, new Date(2026, 9, 24))).toBe(26);
  });
  it("uses age at death rather than current age", () => {
    expect(authorAge("2000-10-24", "2020-10-23", new Date(2026, 9, 24))).toBe(19);
  });
  it("does not invent precise ages from missing or year-only dates", () => {
    expect(authorAge("2000", null, new Date(2026, 9, 24))).toBeNull();
    expect(authorAge(null, null, new Date(2026, 9, 24))).toBeNull();
    expect(authorAge("2000-10-24", "2020", new Date(2026, 9, 24))).toBeNull();
  });
});