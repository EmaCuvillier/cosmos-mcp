import { z } from "zod";
import {
  nasaFetch,
  todayIsoDate,
  toolErrorResult,
  toolMarkdownResult,
} from "../nasaClient.js";
import type { EpicImage } from "../types.js";

const MAX_IMAGES = 5;
const EPIC_ARCHIVE = "https://epic.gsfc.nasa.gov/archive/natural";

export const earthImageryInputSchema = {
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Usá el formato YYYY-MM-DD")
    .optional()
    .describe(
      "Fecha YYYY-MM-DD. Si no se pasa, usa la fecha más reciente disponible (o hoy).",
    ),
};

function buildEpicImageUrl(image: EpicImage): string {
  // EPIC date format: "YYYY-MM-DD HH:mm:ss"
  const datePart = image.date.slice(0, 10);
  const [year, month, day] = datePart.split("-");
  return `${EPIC_ARCHIVE}/${year}/${month}/${day}/png/${image.image}.png`;
}

export async function handleEarthImagery(args: { fecha?: string }) {
  try {
    const path = args.fecha
      ? `/EPIC/api/natural/date/${args.fecha}`
      : "/EPIC/api/natural";

    const data = await nasaFetch<EpicImage[]>(path);

    if (!Array.isArray(data) || data.length === 0) {
      const payload = {
        fecha_pedida: args.fecha ?? todayIsoDate(),
        imagenes: [],
        mensaje:
          "No hay imágenes EPIC para esa fecha. Probá otra fecha (a veces hay un delay de unos días).",
      };
      return toolMarkdownResult(
        `# Tierra desde DSCOVR\n\nNo hay imágenes EPIC para **${payload.fecha_pedida}**. Probá una fecha anterior: la publicación puede demorarse algunos días.`,
        payload,
      );
    }

    const limited = data.slice(0, MAX_IMAGES).map((img) => ({
      identifier: img.identifier,
      caption: img.caption,
      fecha_hora_captura: img.date,
      image_name: img.image,
      url: buildEpicImageUrl(img),
    }));

    const payload = {
      fecha_pedida: args.fecha ?? limited[0]?.fecha_hora_captura.slice(0, 10),
      total_encontradas: data.length,
      devolviendo: limited.length,
      imagenes: limited,
      nota:
        data.length > MAX_IMAGES
          ? `Se limitó la respuesta a ${MAX_IMAGES} imágenes.`
          : null,
    };
    const gallery = limited
      .map(
        (image, index) =>
          `### ${index + 1}. ${image.fecha_hora_captura} UTC\n\n![Tierra desde DSCOVR · ${image.fecha_hora_captura}](${image.url})\n\n[Ver imagen original](${image.url})`,
      )
      .join("\n\n");
    const markdown = [
      `# La Tierra desde el espacio · ${payload.fecha_pedida}`,
      `**NASA EPIC / DSCOVR · ${limited.length} de ${data.length} capturas**`,
      gallery,
      data.length > MAX_IMAGES
        ? `*La galería se limitó a ${MAX_IMAGES} imágenes.*`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return toolMarkdownResult(markdown, payload);
  } catch (error) {
    return toolErrorResult(error);
  }
}
