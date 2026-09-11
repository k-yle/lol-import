import { useContext } from 'react';
import { MapContainer, Marker, ScaleControl, TileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Drawer } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FullFile, LatLon } from '@lol-import/parser';
import { InnerLightPage } from '../LightPage';
import { MAP_ICONS } from '../../components/icons';
import { DataContext } from '../../context/DataContext';

export const CountryPageMap: React.FC<{
  data: FullFile[string];
  centre: LatLon;
  hidden: Record<string, boolean>;
}> = ({ data, centre, hidden }) => {
  const { idLookup } = useContext(DataContext);
  const { hash } = useLocation();
  const navigate = useNavigate();
  const selectedId = idLookup?.[hash.slice(2)]?.[0];
  const selected = (selectedId && data[selectedId]) || undefined;

  return (
    <>
      <MapContainer
        center={[centre.lat, centre.lon]}
        zoom={6}
        scrollWheelZoom
        zoomSnap={0}
        zoomDelta={0.2}
        maxZoom={23}
        style={{
          position: 'fixed',
          top: 50,
          right: 0,
          bottom: 0,
          width: '50vw',
        }}
      >
        <ScaleControl position="bottomleft" />
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          referrerPolicy="strict-origin-when-cross-origin"
          maxNativeZoom={19}
          maxZoom={23}
          attribution='<a href="https://osm.org/copyright">&copy; OpenStreetMap contributors</a>'
          noWrap
        />
        <TileLayer
          url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
          referrerPolicy="strict-origin-when-cross-origin"
          maxNativeZoom={18}
          maxZoom={23}
          noWrap
        />
        <MarkerClusterGroup>
          {Object.entries(data)
            .filter(
              ([, light]) => hidden[light.osm?.verdict || 'missing'] !== true,
            )
            .map(([id, light]) => {
              return (
                <Marker
                  key={id}
                  position={{ lat: light.lat, lng: light.lon }}
                  title={`${id} / ${light.tags['seamark:name']}`}
                  icon={
                    light.osm?.verdict === 'existsAndPerfect' ||
                    light.osm?.verdict === 'existsAndSuggestionsIgnored'
                      ? MAP_ICONS.GREEN
                      : light.osm?.verdict === 'existsButNeedsUpdate'
                        ? MAP_ICONS.YELLOW
                        : MAP_ICONS.RED
                  }
                  eventHandlers={{
                    click: () =>
                      navigate(`#/${id.replaceAll(' ', '')}`, {
                        replace: true,
                      }),
                  }}
                />
              );
            })}
        </MarkerClusterGroup>
      </MapContainer>
      <Drawer
        opened={!!selected}
        title={selected?.tags['seamark:name']}
        onClose={() => navigate('#', { replace: true })}
        size="xl"
      >
        {selected && selectedId && (
          <InnerLightPage
            country={selected.country}
            countryFromUrl={selected.country}
            id={selectedId}
          />
        )}
      </Drawer>
    </>
  );
};
