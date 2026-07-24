import { useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import L, { type LatLngBounds } from 'leaflet';
import Supercluster from 'supercluster';
import type { Feature, Point } from 'geojson';
import type { IncidentCategory, OutageReport } from './types';

const TUNISIA_CENTER: [number, number] = [34.0, 9.4];

const createPinIcon = (category: IncidentCategory) =>
  L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:999px;border:2px solid #0f172a;background:${category === 'water' ? '#06b6d4' : category === 'fire' ? '#f97316' : '#facc15'};box-shadow:0 0 0 4px rgba(15,23,42,0.45)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

const createClusterIcon = (count: number) =>
  L.divIcon({
    className: '',
    html: `<div style="min-width:32px;height:32px;border-radius:999px;display:flex;align-items:center;justify-content:center;padding:0 8px;color:#0f172a;font-size:12px;font-weight:800;background:#f8fafc;border:2px solid #0f172a">${count}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  electricity: 'Electricity',
  water: 'Water',
  fire: 'Fire'
};

type ClusterFeature = Supercluster.ClusterFeature<{
  reportId: string;
  incidentCategory: IncidentCategory;
  details: string;
  location: string;
  status: string;
}>;

type ReportFeature = Supercluster.PointFeature<{
  reportId: string;
  incidentCategory: IncidentCategory;
  details: string;
  location: string;
  status: string;
}>;

function ClusterLayer({ reports }: { reports: OutageReport[] }) {
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [zoom, setZoom] = useState(6);
  const map = useMapEvents({
    moveend() {
      setBounds(map.getBounds());
      setZoom(Math.round(map.getZoom()));
    }
  });

  const points = useMemo<Feature<Point>[]>(() => {
    return reports
      .filter((report): report is OutageReport & { latitude: number; longitude: number } => typeof report.latitude === 'number' && typeof report.longitude === 'number')
      .map((report) => ({
        type: 'Feature',
        properties: {
          reportId: report.id,
          incidentCategory: report.incidentCategory ?? 'electricity',
          details: report.details,
          location: `${report.districtNameFr}, ${report.delegationNameFr}`,
          status: report.status
        },
        geometry: {
          type: 'Point',
          coordinates: [report.longitude, report.latitude]
        }
      }));
  }, [reports]);

  const index = useMemo(() => {
    const cluster = new Supercluster({
      radius: 55,
      maxZoom: 16
    });
    cluster.load(points);
    return cluster;
  }, [points]);

  const clusters = useMemo(() => {
    if (!bounds) return [] as Array<ClusterFeature | ReportFeature>;
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ];
    return index.getClusters(bbox, zoom) as Array<ClusterFeature | ReportFeature>;
  }, [bounds, zoom, index]);

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        if ('cluster' in feature.properties && feature.properties.cluster) {
          const clusterId = feature.properties.cluster_id;
          return (
            <Marker
              key={`cluster-${clusterId}`}
              position={[lat, lng]}
              icon={createClusterIcon(feature.properties.point_count)}
              eventHandlers={{
                click: () => {
                  const expansionZoom = Math.min(index.getClusterExpansionZoom(clusterId), 16);
                  map.flyTo([lat, lng], expansionZoom);
                }
              }}
            />
          );
        }

        return (
          <Marker
            key={feature.properties.reportId}
            position={[lat, lng]}
            icon={createPinIcon(feature.properties.incidentCategory)}
          >
            <Popup>
              <div className="space-y-1 text-xs">
                <p className="font-bold">{feature.properties.location}</p>
                <p>{CATEGORY_LABELS[feature.properties.incidentCategory]}</p>
                <p className="line-clamp-3">{feature.properties.details}</p>
                <p>Status: {feature.properties.status}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export default function TunisiaMapView({ reports }: { reports: OutageReport[] }) {
  return (
    <MapContainer center={TUNISIA_CENTER} zoom={6} minZoom={5} className="h-[440px] w-full rounded-2xl z-0" scrollWheelZoom>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClusterLayer reports={reports} />
    </MapContainer>
  );
}
