import { afterEach, describe, expect, it, vi } from "vitest";
import { handleMarsPhotos } from "../src/tools/marsPhotos.js";

const samplePhoto = {
  id: 1,
  sol: 1000,
  earth_date: "2024-01-01",
  img_src: "https://example.com/mars.jpg",
  camera: { id: 1, name: "NAVCAM", full_name: "Navigation Camera" },
  rover: { name: "Curiosity" },
};

describe("fotos_marte", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses latest_photos when no sol/date is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ latest_photos: [samplePhoto] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await handleMarsPhotos({ rover: "curiosity" });
    const payload = result.structuredContent as {
      fotos: Array<{ camara: string }>;
    };

    expect(fetchMock.mock.calls[0][0].toString()).toContain("latest_photos");
    expect(payload.fotos).toHaveLength(1);
    expect(payload.fotos[0].camara).toBe("NAVCAM");
    expect(result.content[0].text).toContain("![Marte");
  });

  it("limits results to 10 photos", async () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      ...samplePhoto,
      id: i + 1,
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ photos: many }),
      }),
    );

    const result = await handleMarsPhotos({ rover: "curiosity", sol: 100 });
    const payload = result.structuredContent as {
      total_encontradas: number;
      devolviendo: number;
      fotos: unknown[];
    };

    expect(payload.total_encontradas).toBe(15);
    expect(payload.devolviendo).toBe(10);
    expect(payload.fotos).toHaveLength(10);
  });

  it("rejects sol and earth date together", async () => {
    const result = await handleMarsPhotos({
      rover: "curiosity",
      sol: 10,
      fecha_terrestre: "2024-01-01",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/solo sol o fecha_terrestre/i);
  });
});
