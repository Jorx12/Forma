import { useNavigate, useSearchParams } from 'react-router';
import { PasteShortcut } from '../components/Habits';
import { Card, Page } from '../components/ui';
import { parseShortcut } from '../lib/habits';

/** #/importar?passos=8532&pes=83.4&data=2026-11-24 (per a dreceres que obren l'app directament) */
export function ImportPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const text = [...params.entries()].map(([k, v]) => `${k}=${v}`).join(' ');
  return (
    <Page title="Importar dades" back="/">
      <Card><PasteShortcut initial={parseShortcut(text)} onDone={() => nav('/')} /></Card>
    </Page>
  );
}
