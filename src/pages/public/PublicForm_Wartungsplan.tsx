import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a293dfb99d8252c0ae62355';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormWartungsplan() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Wartungsplan — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="wartungsart">Wartungsart</Label>
            <Select
              value={lookupKey(fields.wartungsart) ?? ''}
              onValueChange={v => setFields(f => ({ ...f, wartungsart: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="wartungsart"><SelectValue placeholder="" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="reparatur">Reparatur</SelectItem>
                <SelectItem value="austausch">Austausch</SelectItem>
                <SelectItem value="inspektion">Inspektion</SelectItem>
                <SelectItem value="schmierung">Schmierung</SelectItem>
                <SelectItem value="reinigung">Reinigung</SelectItem>
                <SelectItem value="kalibrierung">Kalibrierung</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wartungsintervall">Wartungsintervall</Label>
            <Select
              value={lookupKey(fields.wartungsintervall) ?? ''}
              onValueChange={v => setFields(f => ({ ...f, wartungsintervall: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="wartungsintervall"><SelectValue placeholder="" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="woechentlich">Wöchentlich</SelectItem>
                <SelectItem value="monatlich">Monatlich</SelectItem>
                <SelectItem value="vierteljaehrlich">Vierteljährlich</SelectItem>
                <SelectItem value="halbjaehrlich">Halbjährlich</SelectItem>
                <SelectItem value="jaehrlich">Jährlich</SelectItem>
                <SelectItem value="nach_bedarf">Nach Bedarf</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="letzte_wartung">Datum der letzten Wartung</Label>
            <DatePicker
              id="letzte_wartung"
              placeholder=""
              mode="date"
              value={fields.letzte_wartung ?? null}
              onChange={v => setFields(f => ({ ...f, letzte_wartung: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="naechste_wartung">Nächstes Wartungsdatum (fällig)</Label>
            <DatePicker
              id="naechste_wartung"
              placeholder=""
              mode="date"
              value={fields.naechste_wartung ?? null}
              onChange={v => setFields(f => ({ ...f, naechste_wartung: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status) === 'ausstehend'}
                onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'ausstehend' ? undefined : 'ausstehend') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status) === 'ausstehend'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Ausstehend
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status) === 'in_bearbeitung'}
                onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'in_bearbeitung' ? undefined : 'in_bearbeitung') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status) === 'in_bearbeitung'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                In Bearbeitung
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status) === 'abgeschlossen'}
                onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'abgeschlossen' ? undefined : 'abgeschlossen') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status) === 'abgeschlossen'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Abgeschlossen
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status) === 'ueberfaellig'}
                onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'ueberfaellig' ? undefined : 'ueberfaellig') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status) === 'ueberfaellig'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Überfällig
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="verantwortlich_vorname">Vorname (Verantwortliche/r)</Label>
            <Input
              id="verantwortlich_vorname"
              placeholder=""
              value={fields.verantwortlich_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, verantwortlich_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verantwortlich_nachname">Nachname (Verantwortliche/r)</Label>
            <Input
              id="verantwortlich_nachname"
              placeholder=""
              value={fields.verantwortlich_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, verantwortlich_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="durchgefuehrt_vorname">Vorname (Durchgeführt von)</Label>
            <Input
              id="durchgefuehrt_vorname"
              placeholder=""
              value={fields.durchgefuehrt_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, durchgefuehrt_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="durchgefuehrt_nachname">Nachname (Durchgeführt von)</Label>
            <Input
              id="durchgefuehrt_nachname"
              placeholder=""
              value={fields.durchgefuehrt_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, durchgefuehrt_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bemerkungen">Bemerkungen zur Wartung</Label>
            <Textarea
              id="bemerkungen"
              placeholder=""
              value={fields.bemerkungen ?? ''}
              onChange={e => setFields(f => ({ ...f, bemerkungen: e.target.value }))}
              rows={3}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
