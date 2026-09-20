import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { StatusBadge, SeverityBadge } from './StatusBadge';

// Create SVG colored marker icons
const createMarkerIcon = (color) => {
  return L.divIcon({
    className: 'custom-pin',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -26]
  });
};

const icons = {
  CRITICAL: createMarkerIcon('#991b1b'), // Dark Red
  HIGH: createMarkerIcon('#dc2626'),     // Red
  MEDIUM: createMarkerIcon('#d97706'),   // Amber
  LOW: createMarkerIcon('#16a34a')       // Emerald
};

// Component to handle map clicks for selecting coordinates
const LocationPicker = ({ onLocationSelected }) => {
  useMapEvents({
    click(e) {
      if (onLocationSelected) {
        onLocationSelected({
          latitude: Number(e.latlng.lat.toFixed(6)),
          longitude: Number(e.latlng.lng.toFixed(6)),
          address: `Location (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`
        });
      }
    }
  });
  return null;
};

export const LeafletMap = ({
  center = [18.5204, 73.8567],
  zoom = 13,
  complaints = [],
  selectedLocation = null,
  onLocationSelected = null,
  height = "450px"
}) => {
  return (
    <div style={{ height, width: '100%' }} className="rounded-xl overflow-hidden shadow-inner border border-slate-200">
      <MapContainer
        center={selectedLocation ? [selectedLocation.latitude, selectedLocation.longitude] : center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onLocationSelected && <LocationPicker onLocationSelected={onLocationSelected} />}

        {/* Selected location pin if in complaint submission mode */}
        {selectedLocation && selectedLocation.latitude && selectedLocation.longitude && (
          <Marker
            position={[selectedLocation.latitude, selectedLocation.longitude]}
            icon={icons.HIGH}
          >
            <Popup>
              <div className="text-xs p-1">
                <strong className="text-emerald-700 block mb-1 font-bold">Selected Issue Location:</strong>
                <p>{selectedLocation.address || 'Custom GPS Pin'}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  Lat: {selectedLocation.latitude}, Lng: {selectedLocation.longitude}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Render Complaint Markers */}
        {complaints.map((c) => {
          if (!c.latitude || !c.longitude) return null;
          const sev = (c.severity || 'MEDIUM').toUpperCase();
          const markerIcon = icons[sev] || icons.MEDIUM;

          return (
            <Marker key={c.id} position={[c.latitude, c.longitude]} icon={markerIcon}>
              <Popup>
                <div className="text-xs p-1 max-w-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="font-bold text-slate-900">#{c.id}</span>
                    <StatusBadge status={c.status} />
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">
                      {c.issue_type?.replace('_', ' ') || c.category?.replace('_', ' ')}
                    </h5>
                    <p className="text-slate-600 line-clamp-2 mt-0.5">{c.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <SeverityBadge severity={c.severity} />
                    <span className="truncate max-w-[120px]">{c.department_name || 'Department'}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <Link
                      to={`/track/${c.id}`}
                      className="block text-center py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                    >
                      View Complaint Details →
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
