import { afterEach, describe, expect, it, vi } from "vitest";
import { handleEarthImagery } from "../src/tools/earthImagery.js";

describe("imagen_tierra", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("builds EPIC archive PNG URLs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            identifier: "20240101000000",
            caption: "Earth",
            image: "epic_1b_20240101000000",
            date: "2024-01-01 00:00:00",
          },
        ],
      }),
    );

    const result = await handleEarthImagery({ fecha: "2024-01-01" });
    const payload = result.structuredContent as {
      imagenes: Array<{ url: string; fecha_hora_captura: string }>;
    };

    expect(payload.imagenes).toHaveLength(1);
    expect(payload.imagenes[0].url).toBe(
      "https://epic.gsfc.nasa.gov/archive/natural/2024/01/01/png/epic_1b_20240101000000.png",
    );
    expect(payload.imagenes[0].fecha_hora_captura).toBe("2024-01-01 00:00:00");
    expect(result.content[0].text).toContain("![Tierra desde DSCOVR");
  });

  it("handles empty EPIC responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      }),
    );

    const result = await handleEarthImagery({ fecha: "2099-01-01" });
    const payload = result.structuredContent as {
      imagenes: unknown[];
      mensaje: string;
    };

    expect(payload.imagenes).toHaveLength(0);
    expect(payload.mensaje).toMatch(/No hay imágenes EPIC/i);
  });

  it("limits to 5 images", async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      identifier: `id-${i}`,
      caption: "Earth",
      image: `epic_${i}`,
      date: "2024-01-01 12:00:00",
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => many,
      }),
    );

    const result = await handleEarthImagery({ fecha: "2024-01-01" });
    const payload = result.structuredContent as {
      total_encontradas: number;
      devolviendo: number;
    };

    expect(payload.total_encontradas).toBe(8);
    expect(payload.devolviendo).toBe(5);
  });
});
