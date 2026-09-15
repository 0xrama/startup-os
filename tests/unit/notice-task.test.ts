import { describe, expect, it } from "vitest";
import { noticeDraftTaskSchema } from "@/modules/compliance/notice-task";

describe("notice task drafts", () => {
  it("accepts an ISO calendar date", () => {
    expect(
      noticeDraftTaskSchema.safeParse({
        title: "Respond to notice",
        dueDate: "2026-10-15",
      }).success
    ).toBe(true);
  });

  it("rejects natural-language and impossible dates", () => {
    expect(
      noticeDraftTaskSchema.safeParse({
        title: "Respond to notice",
        dueDate: "October 15",
      }).success
    ).toBe(false);
    expect(
      noticeDraftTaskSchema.safeParse({
        title: "Respond to notice",
        dueDate: "2026-02-30",
      }).success
    ).toBe(false);
  });
});
