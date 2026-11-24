import { useState } from 'react';
import { PasteShortcut } from '../components/Habits';
import { ClipboardPaste } from 'lucide-react';
import { Button, Card, Page } from '../components/ui';

const TEMPLATE = 'FORMA passos=[Estadístiques] pes=[Mostres de Salut]';

export function ShortcutsPage() {
  const [copied, setCopied] = useState(false);
  return (
    <Page title="Dreceres" back="/mes">
      <p className="-mt-2 text-sm text-muted">Passos i pes de l'app Salut → porta-retalls → Forma (Avui · <ClipboardPaste size={13} className="inline" />).</p>
      <Card title="Crear la drecera">
        <ol className="list-decimal space-y-2.5 pl-5 text-sm leading-relaxed">
          <li>Obre l'app <strong>Dreceres</strong> → <strong>+</strong> (drecera nova) i posa-li el nom <em>Forma</em>.</li>
          <li>Afegeix l'acció <strong>Cerca mostres de Salut</strong> (<em>Find Health Samples</em>): tipus <strong>Passos</strong>, data d'inici <strong>és avui</strong>.</li>
          <li>Afegeix <strong>Calcula estadístiques</strong> (<em>Calculate Statistics</em>): <strong>Suma</strong> de les mostres.</li>
          <li><em>Opcional, pes:</em> una altra <strong>Cerca mostres de Salut</strong> amb tipus <strong>Pes</strong>, data d'inici <strong>és avui</strong>, ordenades per data (la més recent primer) i límit <strong>1</strong>.</li>
          <li>Afegeix l'acció <strong>Text</strong> i escriu-hi (inserint les variables dels passos anteriors on hi ha els claudàtors):
            <div className="mt-1.5 rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs">{TEMPLATE}</div>
            <Button size="sm" className="mt-1.5" onClick={async () => { try { await navigator.clipboard.writeText('FORMA passos= pes='); setCopied(true); } catch { /* ignore */ } }}>{copied ? 'Copiat ✓' : 'Copiar el text base'}</Button>
          </li>
          <li>Afegeix <strong>Copia al porta-retalls</strong> (<em>Copy to Clipboard</em>).</li>
          <li><em>Opcional:</em> <strong>Mostra una notificació</strong> amb «Obre Forma i enganxa».</li>
        </ol>
      </Card>

      <Card title="Automàtica (opcional)">
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          <li>A Dreceres, pestanya <strong>Automatització</strong> → <strong>+</strong> → <strong>Hora del dia</strong>, per exemple a les 21.30, cada dia.</li>
          <li>Tria <strong>Executar immediatament</strong> i selecciona la drecera <em>Forma</em>.</li>
          <li>Quan obris Forma, toca <strong>Dreceres</strong> a la targeta d'hàbits i confirma.</li>
        </ol>
      </Card>

      <Card title="Provar">
        <PasteShortcut onDone={() => undefined} />
      </Card>
    </Page>
  );
}
