"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import { FallbackMap } from "./FallbackMap";
import { GoogleGameMap } from "./GoogleGameMap";
import { MAPS_API_KEY, type MapMarkers } from "./mapConfig";

type Props = MapMarkers & { recenterSignal: number };

/**
 * เลือกแผนที่: Google Maps (ถ้ามี key) หรือแผนที่จำลอง
 * ถ้า Google Maps โหลดไม่ได้ (key ผิด, ถูกจำกัด referrer, เกินโควตา, เน็ตมีปัญหา)
 * จะสลับไปใช้แผนที่จำลองอัตโนมัติ เกมยังเล่นต่อได้
 */
export function GameMap(props: Props) {
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!MAPS_API_KEY) return;
    // Google เรียกฟังก์ชันนี้เมื่อ key ใช้ไม่ได้ (InvalidKey, RefererNotAllowed, ฯลฯ)
    const w = window as unknown as { gm_authFailure?: () => void };
    w.gm_authFailure = () => setFailed("Google Maps API key ใช้ไม่ได้ (ตรวจการจำกัด key / billing)");
    return () => {
      delete w.gm_authFailure;
    };
  }, []);

  if (!MAPS_API_KEY) return <FallbackMap {...props} notice="แผนที่จำลอง (ยังไม่ได้ใส่ Google Maps API key)" />;
  if (failed) return <FallbackMap {...props} notice={`แผนที่จำลอง — ${failed}`} />;

  return (
    <MapErrorBoundary onError={() => setFailed("โหลด Google Maps ไม่สำเร็จ")}>
      <GoogleGameMap {...props} onLoadError={() => setFailed("โหลด Google Maps ไม่สำเร็จ")} />
    </MapErrorBoundary>
  );
}

class MapErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[map] Google Maps error, switching to fallback map", err);
    this.props.onError();
  }
  render() {
    return this.state.error ? null : this.props.children;
  }
}
