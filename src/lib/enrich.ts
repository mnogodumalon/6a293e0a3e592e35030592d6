import type { EnrichedWartungsplan } from '@/types/enriched';
import type { Maschinen, Wartungsplan } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface WartungsplanMaps {
  maschinenMap: Map<string, Maschinen>;
}

export function enrichWartungsplan(
  wartungsplan: Wartungsplan[],
  maps: WartungsplanMaps
): EnrichedWartungsplan[] {
  return wartungsplan.map(r => ({
    ...r,
    maschineName: resolveDisplay(r.fields.maschine, maps.maschinenMap, 'seriennummer'),
  }));
}
