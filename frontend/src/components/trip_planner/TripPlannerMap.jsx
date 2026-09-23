import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const TripPlannerMap = ({ stay, experiences = [], days = [] }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up previous map instance if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Default center (e.g. South India / Kerala)
    const defaultLat = stay?.latitude || 10.0889;
    const defaultLng = stay?.longitude || 77.0595;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 12,
      scrollWheelZoom: false,
    });
    mapInstanceRef.current = map;

    // Tile Layer: OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const latLngBounds = [];

    // Helper for custom HTML pins
    const createCustomIcon = (bgColor, label, iconText = '') => {
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            background: ${bgColor};
            color: white;
            font-weight: bold;
            font-size: 11px;
            font-family: sans-serif;
            padding: 4px 8px;
            border-radius: 9999px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            border: 2px solid white;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          ">
            <span>${iconText}</span>
            <span>${label}</span>
          </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [40, 15],
      });
    };

    // 1. Plot Stay Location
    if (stay && stay.latitude && stay.longitude) {
      const stayMarker = L.marker([stay.latitude, stay.longitude], {
        icon: createCustomIcon('#087F8C', 'STAY', '🏨'),
      }).addTo(map);

      stayMarker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 180px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: bold; color: #087F8C;">${stay.property_name}</h4>
          <p style="margin: 0; font-size: 11px; color: #555;">${stay.property_type} • ${stay.city}</p>
          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: bold; color: #17324D;">${stay.room_name} (₹${stay.price_per_night.toLocaleString('en-IN')}/night)</p>
        </div>
      `);
      latLngBounds.push([stay.latitude, stay.longitude]);
    }

    // 2. Plot Experiences
    experiences.forEach((exp) => {
      // If experience property matches stay, use stay coordinates, or search itinerary items
      const lat = stay?.latitude;
      const lng = stay?.longitude;
      if (lat && lng) {
        const expMarker = L.marker([lat + 0.003, lng + 0.003], {
          icon: createCustomIcon('#9333EA', 'EXPERIENCE', '✨'),
        }).addTo(map);

        expMarker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 180px;">
            <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: bold; color: #9333EA;">${exp.title}</h4>
            <p style="margin: 0; font-size: 11px; color: #555;">${exp.duration} • ₹${exp.price.toLocaleString('en-IN')}</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #333;">Time: ${exp.start_time} - ${exp.end_time}</p>
          </div>
        `);
      }
    });

    // 3. Plot Attractions from Days Itinerary
    days.forEach((d) => {
      d.items.forEach((item) => {
        if (item.latitude && item.longitude && item.item_type === 'EXTERNAL_ATTRACTION') {
          const attrMarker = L.marker([item.latitude, item.longitude], {
            icon: createCustomIcon('#EA580C', `D${d.day_number}`, '📍'),
          }).addTo(map);

          attrMarker.bindPopup(`
            <div style="font-family: sans-serif; min-width: 200px;">
              <span style="display: inline-block; padding: 2px 6px; background: #FFF7ED; color: #EA580C; font-size: 10px; font-weight: bold; border-radius: 4px; margin-bottom: 4px;">DAY ${d.day_number} • ${item.time_slot.toUpperCase()}</span>
              <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: bold; color: #17324D;">${item.title}</h4>
              <p style="margin: 0; font-size: 11px; color: #555; line-height: 1.3;">${item.description}</p>
              ${item.distance_km > 0 ? `<p style="margin: 4px 0 0 0; font-size: 10px; color: #777;">~${item.distance_km} km (${item.travel_time_minutes} mins travel)</p>` : ''}
            </div>
          `);
          latLngBounds.push([item.latitude, item.longitude]);
        }
      });
    });

    // Fit map bounds to show all pins
    if (latLngBounds.length > 0) {
      map.fitBounds(latLngBounds, { padding: [40, 40], maxZoom: 13 });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [stay, experiences, days]);

  return (
    <div className="w-full h-80 sm:h-96 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-sm">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-[11px] flex items-center space-x-3 shadow-md z-10">
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#087F8C]" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Stay</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Experience</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-600" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Attraction</span>
        </div>
      </div>
    </div>
  );
};

export default TripPlannerMap;
