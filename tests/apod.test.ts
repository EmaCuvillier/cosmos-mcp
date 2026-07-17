import { afterEach, describe, expect, it, vi } from "vitest";
import { handleApod } from "../src/tools/apod.js";

describe("apod_por_fecha", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns image metadata for a given date", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          date: "2024-01-01",
          title: "Test Nebula",
          explanation: "A beautiful nebula.",
          url: "https://example.com/apod.jpg",
          hdurl: "https://example.com/apod-hd.jpg",
          media_type: "image",
        }),
      }),
    );

    const result = await handleApod({ fecha: "2024-01-01" });
    const payload = result.structuredContent!;

    expect(payload.titulo).toBe("Test Nebula");
    expect(payload.es_video).toBe(false);
    expect(payload.url).toContain("apod.jpg");
    expect(result.content[0].text).toContain("![Test Nebula]");
  });

  it("flags video media_type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          date: "2024-02-01",
          title: "Space Video",
          explanation: "A video day.",
          url: "https://youtube.com/watch?v=abc",
          media_type: "video",
        }),
      }),
    );

    const result = await handleApod({ fecha: "2024-02-01" });
    const payload = result.structuredContent!;

    expect(payload.es_video).toBe(true);
    expect(payload.media_type).toBe("video");
  });

  it("returns a clear error on rate limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        text: async () => "rate limit",
      }),
    );

    const result = await handleApod({ fecha: "2024-01-01" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/rate limit/i);
  });
});
