import "dotenv/config";
import { NasaApiError } from "./types.js";

const NASA_BASE_URL = "https://api.nasa.gov";

export function getNasaApiKey(): string {
  return process.env.NASA_API_KEY?.trim() || "DEMO_KEY";
}

export type NasaFetchParams = Record<string, string | number | undefined>;

/**
 * HTTP wrapper for NASA Open APIs.
 * Logs only to stderr so stdio MCP transport stays clean.
 */
export async function nasaFetch<T>(
  path: string,
  params: NasaFetchParams = {},
): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${NASA_BASE_URL}${path}`);

  url.searchParams.set("api_key", getNasaApiKey());
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[cosmos-mcp] Network error calling NASA: ${message}`);
    throw new NasaApiError(
      `No se pudo conectar con la API de la NASA: ${message}`,
      0,
      "NETWORK_ERROR",
    );
  }

  if (response.status === 429) {
    console.error("[cosmos-mcp] NASA API rate limit (429)");
    throw new NasaApiError(
      "La API de la NASA devolvió rate limit (429). Probá más tarde o usá una NASA_API_KEY propia en vez de DEMO_KEY.",
      429,
      "RATE_LIMIT",
    );
  }

  if (!response.ok) {
    let detail = "";
    try {
      detail = (await response.text()).slice(0, 300);
    } catch {
      // ignore body parse failures
    }
    console.error(
      `[cosmos-mcp] NASA API error ${response.status}: ${detail || response.statusText}`,
    );
    throw new NasaApiError(
      `Error de la API de la NASA (HTTP ${response.status}): ${detail || response.statusText}`,
      response.status,
      "HTTP_ERROR",
    );
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[cosmos-mcp] Failed to parse NASA JSON: ${message}`);
    throw new NasaApiError(
      `La respuesta de la NASA no es JSON válido: ${message}`,
      response.status,
      "PARSE_ERROR",
    );
  }
}

export function toolErrorResult(error: unknown): {
  content: { type: "text"; text: string }[];
  isError: true;
} {
  const message =
    error instanceof NasaApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);

  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}

export function toolTextResult(payload: unknown): {
  content: { type: "text"; text: string }[];
} {
  return {
    content: [
      {
        type: "text",
        text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export function toolMarkdownResult(
  markdown: string,
  structuredContent: Record<string, unknown>,
): {
  content: { type: "text"; text: string }[];
  structuredContent: Record<string, unknown>;
} {
  return {
    content: [{ type: "text", text: markdown }],
    structuredContent,
  };
}

export function todayIsoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
