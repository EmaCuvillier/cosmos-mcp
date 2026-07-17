import { z } from "zod";
import { nasaFetch, toolErrorResult, toolMarkdownResult } from "../nasaClient.js";
import type { NearEarthObject, NeoFeedResponse } from "../types.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 7;
const MAX_ASTEROIDS = 15;

function parseIsoDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function daysBetween(start: string, end: string): number {
  const ms = parseIsoDate(end).getTime() - parseIsoDate(start).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export const nearEarthObjectsInputSchema = {
  fecha_inicio: z
    .string()
    .regex(DATE_RE, "Usá el formato YYYY-MM-DD")
    .describe("Inicio del rango (YYYY-MM-DD)."),
  fecha_fin: z
    .string()
    .regex(DATE_RE, "Usá el formato YYYY-MM-DD")
    .describe("Fin del rango (YYYY-MM-DD). Máximo 7 días desde fecha_inicio."),
};

function flattenNeos(feed: NeoFeedResponse): NearEarthObject[] {
  return Object.values(feed.near_earth_objects ?? {}).flat();
}

function closestApproach(neo: NearEarthObject) {
  return neo.close_approach_data[0];
}

export async function handleNearEarthObjects(args: {
  fecha_inicio: string;
  fecha_fin: string;
}) {
  try {
    const { fecha_inicio, fecha_fin } = args;
    const span = daysBetween(fecha_inicio, fecha_fin);

    if (Number.isNaN(span) || span < 0) {
      return toolErrorResult(
        new Error("fecha_fin tiene que ser igual o posterior a fecha_inicio."),
      );
    }
    if (span > MAX_RANGE_DAYS) {
      return toolErrorResult(
        new Error(
          `El rango máximo es de ${MAX_RANGE_DAYS} días. Pediste ${span} días.`,
        ),
      );
    }

    const data = await nasaFetch<NeoFeedResponse>("/neo/rest/v1/feed", {
      start_date: fecha_inicio,
      end_date: fecha_fin,
    });

    const asteroids = flattenNeos(data)
      .map((neo) => {
        const approach = closestApproach(neo);
        const missKm = approach
          ? Number.parseFloat(approach.miss_distance.kilometers)
          : Number.POSITIVE_INFINITY;

        return {
          nombre: neo.name,
          id: neo.id,
          diametro_metros_estimado: {
            min: neo.estimated_diameter.meters.estimated_diameter_min,
            max: neo.estimated_diameter.meters.estimated_diameter_max,
          },
          velocidad_kmh: approach
            ? Number.parseFloat(approach.relative_velocity.kilometers_per_hour)
            : null,
          distancia_minima_km: Number.isFinite(missKm) ? missKm : null,
          distancia_minima_lunares: approach
            ? Number.parseFloat(approach.miss_distance.lunar)
            : null,
          fecha_acercamiento: approach?.close_approach_date ?? null,
          potencialmente_peligroso: neo.is_potentially_hazardous_asteroid,
          _sort: missKm,
        };
      })
      .sort((a, b) => a._sort - b._sort)
      .slice(0, MAX_ASTEROIDS)
      .map(({ _sort: _, ...rest }) => rest);

    const payload = {
      fecha_inicio,
      fecha_fin,
      total_en_rango: data.element_count,
      devolviendo: asteroids.length,
      orden: "por cercanía (distancia mínima a la Tierra, ascendente)",
      asteroides: asteroids,
      nota:
        "\"potencialmente peligroso\" es una clasificación técnica de la NASA por tamaño/distancia orbital, no una alerta de impacto inminente.",
    };
    const rows = asteroids
      .map((asteroid) => {
        const diameter = `${Math.round(asteroid.diametro_metros_estimado.min)}–${Math.round(asteroid.diametro_metros_estimado.max)} m`;
        const distance =
          asteroid.distancia_minima_km === null
            ? "Sin dato"
            : `${Math.round(asteroid.distancia_minima_km).toLocaleString("es-AR")} km`;
        return `| ${asteroid.nombre} | ${diameter} | ${distance} | ${asteroid.potencialmente_peligroso ? "Sí" : "No"} |`;
      })
      .join("\n");
    const markdown = [
      `# Asteroides cercanos · ${fecha_inicio}${fecha_fin !== fecha_inicio ? ` al ${fecha_fin}` : ""}`,
      `**${data.element_count} objetos detectados · ordenados por cercanía**`,
      asteroids.length
        ? `| Asteroide | Diámetro estimado | Distancia mínima | Clasificación PHA |\n|---|---:|---:|:---:|\n${rows}`
        : "No se encontraron asteroides en el rango.",
      `> **Importante:** “Potencialmente peligroso” es una clasificación técnica de la NASA por tamaño y órbita; no significa que exista una alerta de impacto.`,
    ].join("\n\n");

    return toolMarkdownResult(markdown, payload);
  } catch (error) {
    return toolErrorResult(error);
  }
}
