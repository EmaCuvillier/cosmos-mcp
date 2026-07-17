import { z } from "zod";
import { nasaFetch, toolErrorResult, toolMarkdownResult } from "../nasaClient.js";
import type {
  MarsLatestPhotosResponse,
  MarsPhoto,
  MarsPhotosResponse,
} from "../types.js";

const ROVERS = ["curiosity", "opportunity", "spirit", "perseverance"] as const;

const CAMERAS = [
  "FHAZ",
  "RHAZ",
  "MAST",
  "CHEMCAM",
  "MAHLI",
  "MARDI",
  "NAVCAM",
  "PANCAM",
  "MINITES",
  "EDL_RUCAM",
  "EDL_RDCAM",
  "EDL_DDCAM",
  "EDL_PUCAM1",
  "EDL_PUCAM2",
  "NAVCAM_LEFT",
  "NAVCAM_RIGHT",
  "MCZ_LEFT",
  "MCZ_RIGHT",
  "FRONT_HAZCAM_LEFT_A",
  "FRONT_HAZCAM_RIGHT_A",
  "REAR_HAZCAM_LEFT",
  "REAR_HAZCAM_RIGHT",
  "SKYCAM",
  "SHERLOC_WATSON",
] as const;

const MAX_PHOTOS = 10;

export const marsPhotosInputSchema = {
  rover: z
    .enum(ROVERS)
    .describe("Rover de Marte: curiosity, opportunity, spirit o perseverance."),
  sol: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Día marciano (sol). Opcional."),
  fecha_terrestre: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Usá el formato YYYY-MM-DD")
    .optional()
    .describe("Fecha terrestre YYYY-MM-DD. Opcional."),
  camara: z
    .enum(CAMERAS)
    .optional()
    .describe("Cámara del rover (ej. NAVCAM, MAST, FHAZ). Opcional."),
};

function mapPhoto(photo: MarsPhoto) {
  return {
    id: photo.id,
    url: photo.img_src,
    camara: photo.camera.name,
    camara_nombre: photo.camera.full_name,
    fecha_terrestre: photo.earth_date,
    sol: photo.sol,
    rover: photo.rover.name,
  };
}

export async function handleMarsPhotos(args: {
  rover: (typeof ROVERS)[number];
  sol?: number;
  fecha_terrestre?: string;
  camara?: (typeof CAMERAS)[number];
}) {
  try {
    const { rover, sol, fecha_terrestre, camara } = args;

    if (sol !== undefined && fecha_terrestre) {
      return toolErrorResult(
        new Error("Pasá solo sol o fecha_terrestre, no los dos a la vez."),
      );
    }

    let photos: MarsPhoto[];

    if (sol === undefined && !fecha_terrestre) {
      const data = await nasaFetch<MarsLatestPhotosResponse>(
        `/mars-photos/api/v1/rovers/${rover}/latest_photos`,
        { camera: camara },
      );
      photos = data.latest_photos ?? [];
    } else {
      const data = await nasaFetch<MarsPhotosResponse>(
        `/mars-photos/api/v1/rovers/${rover}/photos`,
        {
          sol,
          earth_date: fecha_terrestre,
          camera: camara,
        },
      );
      photos = data.photos ?? [];
    }

    const limited = photos.slice(0, MAX_PHOTOS).map(mapPhoto);

    const payload = {
      rover,
      total_encontradas: photos.length,
      devolviendo: limited.length,
      fotos: limited,
      nota:
        photos.length > MAX_PHOTOS
          ? `Se limitó la respuesta a ${MAX_PHOTOS} fotos.`
          : null,
    };
    const gallery = limited
      .map(
        (photo, index) =>
          `### ${index + 1}. ${photo.camara_nombre}\n\n![Marte · ${photo.rover} · sol ${photo.sol}](${photo.url})\n\n[Imagen original](${photo.url}) · Sol ${photo.sol} · ${photo.fecha_terrestre}`,
      )
      .join("\n\n");
    const markdown = [
      `# Fotos de ${rover}`,
      `**${limited.length} de ${photos.length} fotos encontradas**`,
      gallery || "No se encontraron fotos para esos filtros.",
      photos.length > MAX_PHOTOS
        ? `*La galería se limitó a ${MAX_PHOTOS} imágenes.*`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return toolMarkdownResult(markdown, payload);
  } catch (error) {
    return toolErrorResult(error);
  }
}
