import type { MetadataRoute } from 'next';
import { PWA_MANIFEST } from '@/constants/pwa';

export default function manifest(): MetadataRoute.Manifest {
  return PWA_MANIFEST;
}
