"use client";

import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { ACTIVITY_CATEGORY_ICON } from "@/lib/activities/category-style";
import type { ActivityCategory } from "@/lib/activities/geoapify-client";
import type { LatLng } from "@/lib/activities/distance";

export interface MapPoint {
  key: string;
  location: LatLng;
  title: string;
  subtitle: string;
  category: ActivityCategory | "event";
  isSaved: boolean;
}

function divIcon(emoji: string, highlight: boolean): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:30px;height:30px;border-radius:9999px;
      background:${highlight ? "var(--primary)" : "var(--card)"};
      border:2px solid ${highlight ? "var(--primary)" : "var(--border)"};
      box-shadow:0 1px 4px rgba(0,0,0,0.25);font-size:15px;
    ">${emoji}</div>`,
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

const ORIGIN_ICON = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:9999px;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 2px rgba(59,130,246,0.4);"></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function InteractiveMapInner({
  center,
  points,
  onBoundsChanged,
  onLongPress,
  onSave,
}: {
  center: LatLng;
  points: MapPoint[];
  onBoundsChanged: (center: LatLng, radiusKm: number) => void;
  onLongPress: (location: LatLng) => void;
  onSave: (point: MapPoint) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const markersLayerRef = React.useRef<L.LayerGroup | null>(null);
  const onSaveRef = React.useRef(onSave);
  const onBoundsChangedRef = React.useRef(onBoundsChanged);
  const onLongPressRef = React.useRef(onLongPress);

  React.useEffect(() => {
    onSaveRef.current = onSave;
    onBoundsChangedRef.current = onBoundsChanged;
    onLongPressRef.current = onLongPress;
  });

  // Map/tile/listener setup runs once — center/points updates are applied
  // imperatively below rather than re-creating the map every render.
  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true }).setView([center.lat, center.lng], 14);
    mapRef.current = map;

    L.tileLayer("/api/activities/map-tile?style=osm-bright&z={z}&x={x}&y={y}", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

    L.marker([center.lat, center.lng], { icon: ORIGIN_ICON, keyboard: false }).addTo(map);

    let moveTimeout: ReturnType<typeof setTimeout>;
    map.on("moveend", () => {
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        const c = map.getCenter();
        const bounds = map.getBounds();
        const radiusKm =
          (bounds.getNorthEast().distanceTo(bounds.getSouthWest()) / 2 / 1000) * 1;
        onBoundsChangedRef.current({ lat: c.lat, lng: c.lng }, Math.max(0.5, Math.round(radiusKm * 10) / 10));
      }, 300);
    });

    // Leaflet has no built-in long-press; a manual press-and-hold timer
    // (cleared on move/lift) covers "long press to explore an area" on touch
    // and mouse alike.
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let pressStart: L.LatLng | null = null;

    function clearPress() {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
      pressStart = null;
    }

    function handlePressStart(e: L.LeafletEvent) {
      pressStart = (e as L.LeafletMouseEvent).latlng;
      pressTimer = setTimeout(() => {
        if (pressStart) onLongPressRef.current({ lat: pressStart.lat, lng: pressStart.lng });
      }, 600);
    }
    map.on("mousedown", handlePressStart);
    map.on("touchstart", handlePressStart);
    map.on("mouseup", clearPress);
    map.on("touchend", clearPress);
    map.on("mousemove", clearPress);
    map.on("touchmove", clearPress);
    map.on("dragstart", clearPress);

    return () => {
      clearPress();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-time setup; center/points sync imperatively below
  }, []);

  // Re-centers the view when the parent explicitly changes location (e.g. a
  // geocoded "search another location" result), without tearing down the map.
  React.useEffect(() => {
    mapRef.current?.setView([center.lat, center.lng], mapRef.current.getZoom());
  }, [center.lat, center.lng]);

  React.useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const point of points) {
      const emoji = point.category === "event" ? "🎫" : ACTIVITY_CATEGORY_ICON[point.category];
      const marker = L.marker([point.location.lat, point.location.lng], {
        icon: divIcon(emoji, point.isSaved),
      });

      const popupNode = document.createElement("div");
      popupNode.style.minWidth = "160px";
      popupNode.innerHTML = `<p style="font-weight:600;font-size:13px;margin:0 0 2px">${point.title}</p><p style="font-size:11px;color:var(--muted-foreground);margin:0 0 6px">${point.subtitle}</p>`;

      if (!point.isSaved) {
        const button = document.createElement("button");
        button.textContent = "★ Save";
        button.style.cssText =
          "font-size:11px;padding:4px 8px;border-radius:9999px;border:1px solid var(--border);background:var(--card);cursor:pointer;";
        button.onclick = () => onSaveRef.current(point);
        popupNode.appendChild(button);
      }

      marker.bindPopup(popupNode);
      marker.addTo(layer);
    }
  }, [points]);

  return <div ref={containerRef} className="h-full w-full" />;
}
