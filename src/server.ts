import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  apodInputSchema,
  fetchApod,
  formatApodMarkdown,
  handleApod,
} from "./tools/apod.js";
import { earthImageryInputSchema, handleEarthImagery } from "./tools/earthImagery.js";
import { marsPhotosInputSchema, handleMarsPhotos } from "./tools/marsPhotos.js";
import {
  handleNearEarthObjects,
  nearEarthObjectsInputSchema,
} from "./tools/nearEarthObjects.js";

const server = new McpServer({
  name: "cosmos-mcp",
  version: "1.0.0",
});

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

server.registerTool(
  "apod_por_fecha",
  {
    title: "Imagen astronómica del día",
    description:
      "Trae la Astronomy Picture of the Day (APOD) de la NASA para una fecha. Si no pasás fecha, usa hoy. Úsala cuando el usuario pida la imagen astronómica del día, APOD o una foto del cosmos de cierta fecha.",
    inputSchema: apodInputSchema,
    annotations: readOnlyAnnotations,
  },
  async (args) => handleApod(args),
);

server.registerTool(
  "fotos_marte",
  {
    title: "Fotos de rovers en Marte",
    description:
      "Trae fotos de los rovers de Marte (Curiosity, Opportunity, Spirit, Perseverance). Podés filtrar por sol, fecha terrestre o cámara. Si no pasás sol/fecha, devuelve las más recientes. Úsala cuando pidan fotos de Marte o de un rover.",
    inputSchema: marsPhotosInputSchema,
    annotations: readOnlyAnnotations,
  },
  async (args) => handleMarsPhotos(args),
);

server.registerTool(
  "asteroides_cercanos",
  {
    title: "Asteroides cercanos a la Tierra",
    description:
      "Lista asteroides cercanos a la Tierra (NeoWs) en un rango de fechas de hasta 7 días. Ordena por cercanía. Úsala para acercamientos, NEOs o si hay algún asteroide relevante.",
    inputSchema: nearEarthObjectsInputSchema,
    annotations: readOnlyAnnotations,
  },
  async (args) => handleNearEarthObjects(args),
);

server.registerTool(
  "imagen_tierra",
  {
    title: "La Tierra desde DSCOVR",
    description:
      "Trae imágenes de la Tierra completa vistas desde el satélite DSCOVR (EPIC) para una fecha. Si no pasás fecha, usa las más recientes disponibles. Úsala cuando pidan ver la Tierra desde el espacio o fotos EPIC.",
    inputSchema: earthImageryInputSchema,
    annotations: readOnlyAnnotations,
  },
  async (args) => handleEarthImagery(args),
);

server.registerResource(
  "apod-hoy",
  "cosmos://apod/today",
  {
    title: "APOD de hoy",
    description:
      "Imagen astronómica del día de la NASA, lista para leer como Markdown.",
    mimeType: "text/markdown",
  },
  async () => {
    const data = await fetchApod();
    return {
      contents: [
        {
          uri: "cosmos://apod/today",
          mimeType: "text/markdown",
          text: formatApodMarkdown(data),
        },
      ],
    };
  },
);

server.registerPrompt(
  "briefing-del-dia",
  {
    title: "Briefing espacial del día",
    description:
      "Prepara un boletín visual y divulgativo combinando la APOD con los asteroides cercanos.",
    argsSchema: {
      fecha: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Fecha YYYY-MM-DD. Si se omite, usar hoy."),
    },
  },
  ({ fecha }) => {
    const target = fecha ?? "hoy";
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Armá un briefing espacial para ${target}.`,
              "1. Consultá apod_por_fecha para esa fecha.",
              "2. Consultá asteroides_cercanos usando esa misma fecha como inicio y fin.",
              "3. Respondé en español rioplatense, breve y divulgativo.",
              "4. Mostrá la imagen o link APOD y destacá el asteroide más cercano.",
              "5. Si aparece “potencialmente peligroso”, aclarar que es una clasificación técnica, no una alerta de impacto.",
            ].join("\n"),
          },
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("cosmos-mcp running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting cosmos-mcp:", error);
  process.exit(1);
});
