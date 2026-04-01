import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        signUp: mockSignUp,
        signInWithPassword: mockSignInWithPassword,
        signInWithOtp: mockSignInWithOtp,
        signOut: mockSignOut,
      },
    })
  ),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { signUp, signIn, signInWithMagicLink, signOut } from "../actions";

function createFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value);
  }
  return fd;
}

describe("Auth Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signUp", () => {
    it("calls supabase signUp with email, password, and brand name", async () => {
      mockSignUp.mockResolvedValue({ error: null });

      const fd = createFormData({
        email: "test@test.com",
        password: "123456",
        brand: "Test Brand",
      });

      await expect(signUp(fd)).rejects.toThrow("REDIRECT:/");

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "123456",
        options: { data: { brand_name: "Test Brand" } },
      });
    });

    it("returns error on failure", async () => {
      mockSignUp.mockResolvedValue({ error: { message: "User already exists" } });

      const fd = createFormData({
        email: "test@test.com",
        password: "123456",
        brand: "Test Brand",
      });

      const result = await signUp(fd);
      expect(result).toEqual({ error: "User already exists" });
    });
  });

  describe("signIn", () => {
    it("calls supabase signInWithPassword", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      const fd = createFormData({
        email: "test@test.com",
        password: "123456",
      });

      await expect(signIn(fd)).rejects.toThrow("REDIRECT:/");

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "123456",
      });
    });

    it("returns error on invalid credentials", async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: "Invalid login credentials" },
      });

      const fd = createFormData({
        email: "test@test.com",
        password: "wrong",
      });

      const result = await signIn(fd);
      expect(result).toEqual({ error: "Invalid login credentials" });
    });
  });

  describe("signInWithMagicLink", () => {
    it("calls supabase signInWithOtp", async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      const fd = createFormData({ email: "test@test.com" });
      const result = await signInWithMagicLink(fd);

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: "test@test.com",
        options: { shouldCreateUser: false },
      });
      expect(result).toEqual({ success: "Link enviado! Verifique seu e-mail." });
    });

    it("returns error on failure", async () => {
      mockSignInWithOtp.mockResolvedValue({
        error: { message: "Email not found" },
      });

      const fd = createFormData({ email: "none@test.com" });
      const result = await signInWithMagicLink(fd);
      expect(result).toEqual({ error: "Email not found" });
    });
  });

  describe("signOut", () => {
    it("calls supabase signOut and redirects to login", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      await expect(signOut()).rejects.toThrow("REDIRECT:/login");
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
