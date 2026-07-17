import { afterEach, describe, expect, it, vi } from "vitest";
import { handleNearEarthObjects } from "../src/tools/nearEarthObjects.js";

function makeNeo(name: string, km: string, hazardous = false) {
  return {
    id: name,
    name,
    is_potentially_hazardous_asteroid: hazardous,
    estimated_diameter: {
      meters: { estimated_diameter_min: 10, estimated_diameter_max: 20 },
    },
    close_approach_data: [
      {
        close_approach_date: "2024-01-01",
        relative_velocity: { kilometers_per_hour: "50000" },
        miss_distance: { kilometers: km, lunar: "1.0" },
      },
    ],
  };
}

describe("asteroides_cercanos", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sorts asteroids by closest miss distance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          element_count: 2,
          near_earth_objects: {
            "2024-01-01": [
              makeNeo("(Far)", "2000000"),
              makeNeo("(Near)", "100000"),
            ],
          },
        }),
      }),
    );

    const result = await handleNearEarthObjects({
      fecha_inicio: "2024-01-01",
      fecha_fin: "2024-01-02",
    });
    const payload = result.structuredContent as {
      asteroides: Array<{ nombre: string }>;
    };

    expect(payload.asteroides[0].nombre).toBe("(Near)");
    expect(payload.asteroides[1].nombre).toBe("(Far)");
    expect(result.content[0].text).toContain("| Asteroide |");
  });

  it("rejects ranges longer than 7 days", async () => {
    const result = await handleNearEarthObjects({
      fecha_inicio: "2024-01-01",
      fecha_fin: "2024-01-15",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/7 días/i);
  });

  it("surfaces NASA HTTP errors clearly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
        text: async () => "boom",
      }),
    );

    const result = await handleNearEarthObjects({
      fecha_inicio: "2024-01-01",
      fecha_fin: "2024-01-02",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/HTTP 500/);
  });
});
