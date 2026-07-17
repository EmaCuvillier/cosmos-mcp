import { z } from "zod";
import {
  nasaFetch,
  todayIsoDate,
  toolErrorResult,
  toolMarkdownResult,
} from "../nasaClient.js";
import type { ApodResponse } from "../types.js";

export const apodInputSchema = {
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Usá el formato YYYY-MM-DD")
    .optional()
    .describe("Fecha en formato YYYY-MM-DD. Si no se pasa, usa la fecha de hoy."),
};

export async function fetchApod(fecha?: string): Promise<ApodResponse> {
  return nasaFetch<ApodResponse>("/planetary/apod", {
    date: fecha ?? todayIsoDate(),
  });
}

export function formatApodMarkdown(data: ApodResponse): string {
  const media =
    data.media_type === "image"
      ? `![${data.title}](${data.url})`
      : `[Ver video de la NASA](${data.url})`;
  const copyright = data.copyright ? `\n\n*Crédito: ${data.copyright}*` : "";

  return [
    `# ${data.title}`,
    `**APOD · ${data.date} · ${data.media_type === "image" ? "Imagen" : "Video"}**`,
    media,
    data.explanation,
    data.hdurl ? `[Abrir en alta resolución](${data.hdurl})` : "",
    copyright,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function handleApod(args: { fecha?: string }) {
  try {
    const data = await fetchApod(args.fecha);

    const payload = {
      fecha: data.date,
      titulo: data.title,
      explicacion: data.explanation,
      media_type: data.media_type,
      es_video: data.media_type === "video",
      url: data.url,
      hdurl: data.hdurl ?? null,
      copyright: data.copyright ?? null,
    };

    return toolMarkdownResult(formatApodMarkdown(data), payload);
  } catch (error) {
    return toolErrorResult(error);
  }
}
