import { describe, expect, it } from "vitest";
import { canPublishReview, countWords, dedupeKey, recometerPercents } from "@/lib/rules";

describe("community rules", () => {
  it("rejects a 99-word review and accepts a 100-word review", () => {
    const words = (n: number) => `<p>${Array.from({ length: n }, () => "word").join(" ")}</p>`;
    expect(canPublishReview(words(99))).toBe(false);
    expect(canPublishReview(words(100))).toBe(true);
  });

  it("does not count markup as words", () => {
    expect(countWords("<h2>Title</h2><p><strong>two</strong> words&nbsp;</p>")).toBe(3);
  });

  it("computes recometer percentages from counts", () => {
    expect(recometerPercents({ total: 9, recommend: 7, notRecommend: 2 })).toEqual({ recommend: 78, notRecommend: 22 });
    expect(recometerPercents({ total: 0, recommend: 0, notRecommend: 0 })).toEqual({ recommend: 0, notRecommend: 0 });
  });

  it("treats leading articles and punctuation as duplicates", () => {
    expect(dedupeKey("The Remains of the Day", "Kazuo Ishiguro")).toBe(dedupeKey("Remains of the Day!", "kazuo ishiguro"));
  });
});
