import { ThemeIcon, rem } from '@mantine/core';
import {
  IconAlertHexagon,
  IconAlertTriangle,
  IconCheck,
} from '@tabler/icons-react';
import { Icon } from 'leaflet';

export const MAP_ICONS = {
  GREEN: new Icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  YELLOW: new Icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  RED: new Icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
};

export const getListIcon = (verdict: string | undefined) => {
  if (verdict === 'existsAndPerfect') {
    return (
      <ThemeIcon color="green" size={24} radius="xl">
        <IconCheck style={{ width: rem(16), height: rem(16) }} />
      </ThemeIcon>
    );
  }

  if (verdict === 'existsButNeedsUpdate') {
    return (
      <ThemeIcon color="yellow" size={24} radius="xl">
        <IconAlertTriangle style={{ width: rem(16), height: rem(16) }} />
      </ThemeIcon>
    );
  }
  return (
    <ThemeIcon color="red" size={24} radius="xl">
      <IconAlertHexagon style={{ width: rem(16), height: rem(16) }} />
    </ThemeIcon>
  );
};
