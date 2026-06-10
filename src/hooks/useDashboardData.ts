import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Wartungsplan, Maschinen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [wartungsplan, setWartungsplan] = useState<Wartungsplan[]>([]);
  const [maschinen, setMaschinen] = useState<Maschinen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [wartungsplanData, maschinenData] = await Promise.all([
        LivingAppsService.getWartungsplan(),
        LivingAppsService.getMaschinen(),
      ]);
      setWartungsplan(wartungsplanData);
      setMaschinen(maschinenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [wartungsplanData, maschinenData] = await Promise.all([
          LivingAppsService.getWartungsplan(),
          LivingAppsService.getMaschinen(),
        ]);
        setWartungsplan(wartungsplanData);
        setMaschinen(maschinenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const maschinenMap = useMemo(() => {
    const m = new Map<string, Maschinen>();
    maschinen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [maschinen]);

  return { wartungsplan, setWartungsplan, maschinen, setMaschinen, loading, error, fetchAll, maschinenMap };
}