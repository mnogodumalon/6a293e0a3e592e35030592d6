import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Wartungsplan, Maschinen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { WartungsplanDialog } from '@/components/dialogs/WartungsplanDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Wartungsplan';
import { evalComputed } from '@/config/form-enhancements/types';

export default function WartungsplanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Wartungsplan | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [maschinenList, setMaschinenList] = useState<Maschinen[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, maschinenData] = await Promise.all([
        LivingAppsService.getWartungsplan(),
        LivingAppsService.getMaschinen(),
      ]);
      setMaschinenList(maschinenData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Wartungsplan['fields']) {
    if (!record) return;
    await LivingAppsService.updateWartungsplanEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteWartungsplanEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/wartungsplan');
  }

  function getMaschinenDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return maschinenList.find(r => r.record_id === refId)?.fields.seriennummer ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/wartungsplan')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/wartungsplan')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.verantwortlich_vorname ?? 'Wartungsplan'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          maschine: maschinenList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title="Details" cols={2}>
        <RecordField label="Maschine" value={getMaschinenDisplayName(record.fields.maschine)} format="text" />
        <RecordField label="Wartungsart" value={record.fields.wartungsart} format="pill" />
        <RecordField label="Wartungsintervall" value={record.fields.wartungsintervall} format="pill" />
        <RecordField label="Datum der letzten Wartung" value={record.fields.letzte_wartung} format="date" />
        <RecordField label="Nächstes Wartungsdatum (fällig)" value={record.fields.naechste_wartung} format="date" />
        <RecordField label="Status" value={record.fields.status} format="pill" />
        <RecordField label="Vorname (Verantwortliche/r)" value={record.fields.verantwortlich_vorname} format="text" />
        <RecordField label="Nachname (Verantwortliche/r)" value={record.fields.verantwortlich_nachname} format="text" />
        <RecordField label="Vorname (Durchgeführt von)" value={record.fields.durchgefuehrt_vorname} format="text" />
        <RecordField label="Nachname (Durchgeführt von)" value={record.fields.durchgefuehrt_nachname} format="text" />
        <RecordField label="Bemerkungen zur Wartung" value={record.fields.bemerkungen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.WARTUNGSPLAN} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <WartungsplanDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        maschinenList={maschinenList}
        enablePhotoScan={AI_PHOTO_SCAN['Wartungsplan']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Wartungsplan']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Wartungsplan löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
