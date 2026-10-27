import { REGION_NAMES, type RegionNameKey } from '@/constants/errors';
import type { InterfaceLocale } from './interface-locales';

export const REGION_INTERFACE_MESSAGES: Record<
  InterfaceLocale,
  Record<RegionNameKey, string>
> = {
  'en-GB': REGION_NAMES,
  'fr-FR': {
    scoreboard: 'Le tableau de score',
    preview: "L'aperçu à l'antenne",
    pitch: 'La carte du terrain',
    moments: 'Les moments clés',
    events: 'Les événements du match',
    stats: 'Les statistiques du match',
    controls: 'Les commandes de production',
    evidence: 'Le panneau des preuves',
    matches: 'La liste des matchs',
    replays: 'Les rediffusions récentes',
    recap: 'Le récapitulatif',
    checks: 'Les vérifications factuelles',
    activity: "Le journal d'activité",
    playerFocus: 'Le suivi du joueur',
  },
  'es-ES': {
    scoreboard: 'El marcador',
    preview: 'La vista previa en emisión',
    pitch: 'El mapa del campo',
    moments: 'Los momentos clave',
    events: 'Los eventos del partido',
    stats: 'Las estadísticas del partido',
    controls: 'Los controles de producción',
    evidence: 'El panel de pruebas',
    matches: 'La lista de partidos',
    replays: 'Las repeticiones recientes',
    recap: 'El resumen',
    checks: 'Las verificaciones de datos',
    activity: 'El registro de actividad',
    playerFocus: 'El seguimiento del jugador',
  },
};
