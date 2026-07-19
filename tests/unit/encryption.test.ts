import { beforeAll, describe, expect, it } from "vitest";

describe("encryptSecret / decryptSecret", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://placeholder.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "placeholder-anon-key";
    process.env.TOKEN_ENCRYPTION_KEY = "8czyBdxIfURDjpK8YJxYfSE2a3QFjPFByYIyEgzWTGA=";
  });

  it("round-trips a plaintext value", async () => {
    const { encryptSecret, decryptSecret } = await import("@/lib/security/encryption");
    const plaintext = "ya29.some-google-refresh-token";
    const encrypted = encryptSecret(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", async () => {
    const { encryptSecret } = await import("@/lib/security/encryption");
    const a = encryptSecret("same-input");
    const b = encryptSecret("same-input");
    expect(a).not.toBe(b);
  });

  it("rejects a tampered ciphertext", async () => {
    const { encryptSecret, decryptSecret } = await import("@/lib/security/encryption");
    const encrypted = encryptSecret("sensitive-value");
    const [iv, authTag, ciphertext] = encrypted.split(":");
    const tampered = [iv, authTag, ciphertext.slice(0, -4) + "abcd"].join(":");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
