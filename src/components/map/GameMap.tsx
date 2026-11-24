"use client";

import { FallbackMap } from "./FallbackMap";
import { GoogleGameMap } from "./GoogleGameMap";
import { MAPS_API_KEY, type MapMarkers } from "./mapConfig";

export function GameMap(props: MapMarkers & { recenterSignal: number }) {
  return MAPS_API_KEY ? <GoogleGameMap {...props} /> : <FallbackMap {...props} />;
}
