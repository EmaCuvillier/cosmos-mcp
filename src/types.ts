export class NasaApiError extends Error {
  readonly status: number;
  readonly code: "RATE_LIMIT" | "HTTP_ERROR" | "NETWORK_ERROR" | "PARSE_ERROR";

  constructor(
    message: string,
    status: number,
    code: NasaApiError["code"] = "HTTP_ERROR",
  ) {
    super(message);
    this.name = "NasaApiError";
    this.status = status;
    this.code = code;
  }
}

export type ApodResponse = {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: "image" | "video" | string;
  copyright?: string;
};

export type MarsCamera = {
  id: number;
  name: string;
  full_name: string;
};

export type MarsPhoto = {
  id: number;
  sol: number;
  earth_date: string;
  img_src: string;
  camera: MarsCamera;
  rover: { name: string };
};

export type MarsPhotosResponse = {
  photos: MarsPhoto[];
};

export type MarsLatestPhotosResponse = {
  latest_photos: MarsPhoto[];
};

export type NeoCloseApproach = {
  close_approach_date: string;
  relative_velocity: { kilometers_per_hour: string };
  miss_distance: { kilometers: string; lunar: string };
};

export type NearEarthObject = {
  id: string;
  name: string;
  is_potentially_hazardous_asteroid: boolean;
  estimated_diameter: {
    meters: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  close_approach_data: NeoCloseApproach[];
};

export type NeoFeedResponse = {
  element_count: number;
  near_earth_objects: Record<string, NearEarthObject[]>;
};

export type EpicImage = {
  identifier: string;
  caption: string;
  image: string;
  date: string; // "YYYY-MM-DD HH:mm:ss"
};
