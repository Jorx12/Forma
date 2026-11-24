import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useMeta } from '../db/hooks';
import { Button, Card, Notice, Page } from '../components/ui';
import { exportBackup, importBackup, parseBackup } from '../lib/backup';
import { fmtDate } from '../lib/dates';
import { clearDemo, hasDemo, loadDemo } from '../lib/demo';

export function DataPage() {
  const demo = useLiveQuery(hasDemo, []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);
  const lastExport = useMeta<string>('lastExportAt');
  const fileRef = useRef<HTMLInputElement>(null);

  async function onImport(file: File) {
    try {
      const b = parseBackup(await file.text());
      const n = (b.data.sessions?.length ?? 0), w = (b.data.weighIns?.length ?? 0);
      if (!confirm(`Importar la còpia del ${fmtDate(b.exportedAt.slice(0, 10))} (${w} pesades, ${n} entrenaments)? Substituirà TOTES les dades actuals.`)) return;
      await importBackup(b);
      setMsg({ tone: 'ok', text: 'Còpia importada correctament.' });
    } catch (e) {
      setMsg({ tone: 'danger', text: `No s'ha pogut importar: ${(e as Error).message}` });
    }
  }
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  return (
    <Page title="Dades" back="/mes">

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Card title="Còpia">
        <p className="mb-4 text-sm text-muted">Última: {lastExport ? fmtDate(lastExport.slice(0, 10)) : 'mai'}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" disabled={busy} onClick={() => run(async () => {
            const r = await exportBackup();
            if (r !== 'cancelled') setMsg({ tone: 'ok', text: 'Còpia exportada.' });
          })}><Download size={18} /> Exportar</Button>
          <Button disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={18} /> Importar</Button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void run(() => onImport(f)); }} />
      </Card>

      <Card title="Prova">
        {demo ? (
          <>
            <Button variant="danger" className="w-full" disabled={busy} onClick={() => confirm('Esborrar totes les dades de prova?') && run(clearDemo)}>Esborrar dades de prova</Button>
          </>
        ) : (
          <Button className="w-full" disabled={busy} onClick={() => run(loadDemo)}>Carregar dades de prova</Button>
        )}
      </Card>
    </Page>
  );
}
