import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  it("merges class names correctly", () => {
    const result = cn("text-sm", "font-bold");
    expect(result).toBe("text-sm font-bold");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toContain("active");
  });

  it("handles conflicting tailwind classes", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });
});
