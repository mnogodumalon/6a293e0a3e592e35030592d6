import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichWartungsplan } from '@/lib/enrich';
import type { EnrichedWartungsplan } from '@/types/enriched';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { formatDate, lookupKey } from '@/lib/formatters';
import { useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconClock, IconCircleCheck,
  IconAlertTriangle, IconCalendarDue, IconSettings,
  IconFilterOff, IconEngine, IconChevronRight,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { WartungsplanDialog } from '@/components/dialogs/WartungsplanDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { differenceInDays, parseISO, isValid } from 'date-fns';

const APPGROUP_ID = '6a293e0a3e592e35030592d6';
const REPAIR_ENDPOINT = '/claude/build/repair';

type FilterKey = 'all' | 'ueberfaellig' | 'bald_faellig' | 'geplant' | 'abgeschlossen';

function getDaysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return null;
    return differenceInDays(d, new Date());
  } catch {
    return null;
  }
}

type UrgencyLevel = 'ueberfaellig' | 'bald_faellig' | 'geplant' | 'abgeschlossen' | 'unbekannt';

function getUrgency(w: EnrichedWartungsplan): UrgencyLevel {
  const statusKey = lookupKey(w.fields.status);
  if (statusKey === 'abgeschlossen') return 'abgeschlossen';
  if (statusKey === 'ueberfaellig') return 'ueberfaellig';
  const days = getDaysUntil(w.fields.naechste_wartung);
  if (days === null) return 'unbekannt';
  if (days < 0) return 'ueberfaellig';
  if (days <= 14) return 'bald_faellig';
  return 'geplant';
}

function urgencyOrder(u: UrgencyLevel): number {
  return { ueberfaellig: 0, bald_faellig: 1, geplant: 2, abgeschlossen: 3, unbekannt: 4 }[u];
}

export default function DashboardOverview() {
  const {
    wartungsplan, maschinen,
    maschinenMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedWartungsplan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedWartungsplan | null>(null);

  const enrichedWartungsplan = useMemo(
    () => enrichWartungsplan(wartungsplan, { maschinenMap }),
    [wartungsplan, maschinenMap]
  );

  const sorted = useMemo(
    () => [...enrichedWartungsplan].sort((a, b) => {
      const ua = urgencyOrder(getUrgency(a));
      const ub = urgencyOrder(getUrgency(b));
      if (ua !== ub) return ua - ub;
      const da = a.fields.naechste_wartung ?? '';
      const db = b.fields.naechste_wartung ?? '';
      return da.localeCompare(db);
    }),
    [enrichedWartungsplan]
  );

  const overdue = useMemo(() => sorted.filter(w => getUrgency(w) === 'ueberfaellig'), [sorted]);
  const soon = useMemo(() => sorted.filter(w => getUrgency(w) === 'bald_faellig'), [sorted]);
  const planned = useMemo(() => sorted.filter(w => getUrgency(w) === 'geplant'), [sorted]);
  const done = useMemo(() => sorted.filter(w => getUrgency(w) === 'abgeschlossen'), [sorted]);

  const filtered = useMemo(() => {
    if (filter === 'all') return sorted;
    if (filter === 'ueberfaellig') return overdue;
    if (filter === 'bald_faellig') return soon;
    if (filter === 'geplant') return planned;
    if (filter === 'abgeschlossen') return done;
    return sorted;
  }, [filter, sorted, overdue, soon, planned, done]);

  const handleCreate = useCallback(async (fields: Parameters<typeof LivingAppsService.createWartungsplanEntry>[0]) => {
    await LivingAppsService.createWartungsplanEntry(fields);
    fetchAll();
  }, [fetchAll]);

  const handleEdit = useCallback(async (fields: Parameters<typeof LivingAppsService.updateWartungsplanEntry>[1]) => {
    if (!editRecord) return;
    await LivingAppsService.updateWartungsplanEntry(editRecord.record_id, fields);
    fetchAll();
  }, [editRecord, fetchAll]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteWartungsplanEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  }, [deleteTarget, fetchAll]);

  const openEdit = useCallback((w: EnrichedWartungsplan) => {
    setEditRecord(w);
    setDialogOpen(true);
  }, []);

  const openCreate = useCallback(() => {
    setEditRecord(null);
    setDialogOpen(true);
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const toggleFilter = (f: FilterKey) => setFilter(prev => prev === f ? 'all' : f);

  // most overdue = worst days value
  const worstDays = overdue.length > 0
    ? Math.min(...overdue.map(w => getDaysUntil(w.fields.naechste_wartung) ?? 0))
    : null;

  return (
    <div className="space-y-6">
      {/* ── Alert banner ─────────────────────────────────────────── */}
      {overdue.length > 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
              <IconAlertTriangle size={18} className="text-destructive" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-destructive">
                {overdue.length === 1
                  ? '1 Wartung überfällig'
                  : `${overdue.length} Wartungen überfällig`}
                {worstDays !== null && worstDays < 0 && (
                  <span className="font-normal text-destructive/80 ml-1">
                    — längste Überfälligkeit: {Math.abs(worstDays)} Tage
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {overdue.map(w => w.maschineName || w.fields.bemerkungen || 'Unbekannte Maschine').slice(0, 3).join(', ')}
                {overdue.length > 3 ? ` +${overdue.length - 3} weitere` : ''}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="shrink-0 self-start sm:self-auto"
            onClick={() => toggleFilter('ueberfaellig')}
          >
            Jetzt anzeigen
          </Button>
        </div>
      )}

      {/* ── KPI row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Überfällig"
          value={overdue.length}
          description="Sofort handeln"
          icon={<IconAlertCircle size={18} className="text-muted-foreground" />}
          tone={overdue.length > 0 ? 'destructive' : 'default'}
          onClick={() => toggleFilter('ueberfaellig')}
          active={filter === 'ueberfaellig'}
        />
        <StatCard
          title="Bald fällig"
          value={soon.length}
          description="In den nächsten 14 Tagen"
          icon={<IconCalendarDue size={18} className="text-muted-foreground" />}
          tone={soon.length > 0 ? 'warning' : 'default'}
          onClick={() => toggleFilter('bald_faellig')}
          active={filter === 'bald_faellig'}
        />
        <StatCard
          title="Geplant"
          value={planned.length}
          description="Zukünftige Wartungen"
          icon={<IconClock size={18} className="text-muted-foreground" />}
          tone="default"
          onClick={() => toggleFilter('geplant')}
          active={filter === 'geplant'}
        />
        <StatCard
          title="Abgeschlossen"
          value={done.length}
          description="Erfolgreich durchgeführt"
          icon={<IconCircleCheck size={18} className="text-muted-foreground" />}
          tone={done.length > 0 ? 'success' : 'default'}
          onClick={() => toggleFilter('abgeschlossen')}
          active={filter === 'abgeschlossen'}
        />
      </div>

      {/* ── Main surface header ───────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-semibold text-foreground text-base">Wartungsplan</h2>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg bg-muted"
            >
              <IconFilterOff size={12} className="shrink-0" />
              Filter zurücksetzen
            </button>
          )}
        </div>
        <Button size="sm" onClick={openCreate}>
          <IconPlus size={14} className="mr-1 shrink-0" />
          Neue Wartung
        </Button>
      </div>

      {/* ── Wartungsliste Desktop ─────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-border">
          <IconSettings size={40} stroke={1.5} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Keine Wartungen in dieser Ansicht</p>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <IconPlus size={14} className="mr-1" />Wartung anlegen
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs">
                  <th className="text-left px-4 py-3 font-medium">Maschine</th>
                  <th className="text-left px-4 py-3 font-medium">Art</th>
                  <th className="text-left px-4 py-3 font-medium">Intervall</th>
                  <th className="text-left px-4 py-3 font-medium">Letzte Wartung</th>
                  <th className="text-left px-4 py-3 font-medium">Nächste Wartung</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Verantwortlich</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(w => (
                  <WartungsRow
                    key={w.record_id}
                    w={w}
                    onEdit={() => openEdit(w)}
                    onDelete={() => setDeleteTarget(w)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(w => (
              <WartungsCard
                key={w.record_id}
                w={w}
                onEdit={() => openEdit(w)}
                onDelete={() => setDeleteTarget(w)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Maschinen-Übersicht ───────────────────────────────────── */}
      {maschinen.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground text-base flex items-center gap-2">
            <IconEngine size={16} className="text-muted-foreground shrink-0" />
            Maschinen ({maschinen.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {maschinen.map(m => {
              const machineWartungen = enrichedWartungsplan.filter(
                w => extractRecordId(w.fields.maschine) === m.record_id
              );
              const nextMaintenance = machineWartungen
                .filter(w => w.fields.naechste_wartung && getUrgency(w) !== 'abgeschlossen')
                .sort((a, b) => (a.fields.naechste_wartung ?? '').localeCompare(b.fields.naechste_wartung ?? ''))[0];
              const hasOverdue = machineWartungen.some(w => getUrgency(w) === 'ueberfaellig');
              const hasSoon = machineWartungen.some(w => getUrgency(w) === 'bald_faellig');

              return (
                <a
                  key={m.record_id}
                  href={`#/maschinen/${m.record_id}`}
                  className="block rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-foreground">
                        {m.fields.maschinenname || m.fields.seriennummer || 'Unbenannt'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.fields.maschinentyp?.label ?? '—'}
                        {m.fields.hersteller ? ` · ${m.fields.hersteller}` : ''}
                        {m.fields.standort_gebaeude ? ` · ${m.fields.standort_gebaeude}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {hasOverdue && (
                        <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          Überfällig
                        </span>
                      )}
                      {!hasOverdue && hasSoon && (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          Bald fällig
                        </span>
                      )}
                      <IconChevronRight size={14} className="text-muted-foreground shrink-0" />
                    </div>
                  </div>
                  {nextMaintenance && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Nächste Wartung: <span className="font-medium text-foreground">{formatDate(nextMaintenance.fields.naechste_wartung)}</span>
                      {nextMaintenance.fields.wartungsart && (
                        <span className="ml-1 text-muted-foreground">· {nextMaintenance.fields.wartungsart.label}</span>
                      )}
                    </p>
                  )}
                  {machineWartungen.length === 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">Keine Wartungen erfasst</p>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Dialogs ───────────────────────────────────────────────── */}
      <WartungsplanDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={editRecord ? handleEdit : handleCreate}
        defaultValues={editRecord?.fields}
        recordId={editRecord?.record_id}
        maschinenList={maschinen}
        enablePhotoScan={AI_PHOTO_SCAN['Wartungsplan']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Wartungsplan']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Wartung löschen"
        description={`Wartung für "${deleteTarget?.maschineName || 'diese Maschine'}" wirklich löschen?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function UrgencyBadge({ w }: { w: EnrichedWartungsplan }) {
  const u = getUrgency(w);
  const days = getDaysUntil(w.fields.naechste_wartung);

  if (u === 'abgeschlossen') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
        <IconCircleCheck size={11} className="shrink-0" />Abgeschlossen
      </span>
    );
  }
  if (u === 'ueberfaellig') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        <IconAlertTriangle size={11} className="shrink-0" />
        {days !== null && days < 0 ? `${Math.abs(days)}T überfällig` : 'Überfällig'}
      </span>
    );
  }
  if (u === 'bald_faellig') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
        <IconClock size={11} className="shrink-0" />
        {days !== null ? `In ${days}T fällig` : 'Bald fällig'}
      </span>
    );
  }
  if (u === 'geplant') {
    const statusKey = lookupKey(w.fields.status);
    const statusLabel = statusKey
      ? (LOOKUP_OPTIONS.wartungsplan?.status?.find(o => o.key === statusKey)?.label ?? statusKey)
      : 'Geplant';
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
        <IconCalendarDue size={11} className="shrink-0" />{statusLabel}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

function WartungsRow({
  w, onEdit, onDelete,
}: {
  w: EnrichedWartungsplan;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const verantwortlich = [w.fields.verantwortlich_vorname, w.fields.verantwortlich_nachname]
    .filter(Boolean).join(' ') || '—';

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <span className="font-medium truncate block max-w-[140px]">
          {w.maschineName || '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {w.fields.wartungsart?.label ?? '—'}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {w.fields.wartungsintervall?.label ?? '—'}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatDate(w.fields.letzte_wartung)}
      </td>
      <td className="px-4 py-3 font-medium">
        {formatDate(w.fields.naechste_wartung)}
      </td>
      <td className="px-4 py-3">
        <UrgencyBadge w={w} />
      </td>
      <td className="px-4 py-3 text-muted-foreground max-w-[120px] truncate">
        {verantwortlich}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="Bearbeiten"
          >
            <IconPencil size={14} className="shrink-0" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            title="Löschen"
          >
            <IconTrash size={14} className="shrink-0" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function WartungsCard({
  w, onEdit, onDelete,
}: {
  w: EnrichedWartungsplan;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const verantwortlich = [w.fields.verantwortlich_vorname, w.fields.verantwortlich_nachname]
    .filter(Boolean).join(' ');

  return (
    <div className="rounded-2xl border border-border bg-card p-4 overflow-hidden">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">
            {w.maschineName || '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            {w.fields.wartungsart?.label ?? '—'}
            {w.fields.wartungsintervall ? ` · ${w.fields.wartungsintervall.label}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
          >
            <IconPencil size={14} className="shrink-0" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground"
          >
            <IconTrash size={14} className="shrink-0" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
        {w.fields.naechste_wartung && (
          <span>Fällig: <span className="font-medium text-foreground">{formatDate(w.fields.naechste_wartung)}</span></span>
        )}
        {w.fields.letzte_wartung && (
          <span>Letzte: <span className="text-foreground">{formatDate(w.fields.letzte_wartung)}</span></span>
        )}
        {verantwortlich && (
          <span>{verantwortlich}</span>
        )}
      </div>
      <div className="mt-2">
        <UrgencyBadge w={w} />
      </div>
    </div>
  );
}

// ── Skeleton & Error (keep from scaffold) ────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
