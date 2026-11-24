import { useState } from 'react';
import { PasteShortcut } from '../components/Habits';
import { Button, Card, Notice, Page } from '../components/ui';

const TEMPLATE = 'FORMA passos=[Estadístiques] pes=[Mostres de Salut]';

export function ShortcutsPage() {
  const [copied, setCopied] = useState(false);
  return (
    <Page title="Dreceres de l'iPhone" back="/mes">
      <p className="-mt-2 text-sm text-muted">
        Una drecera llegeix els passos (i el pes, si la bàscula es sincronitza amb l'app Salut) i els copia. Després obres Forma, toques
        <strong className="text-text"> Dreceres → Enganxar</strong> a Avui i confirmes. Es fa una vegada i serveix per sempre.
      </p>
      <Notice tone="info">
        Per què cal enganxar? Quan una drecera obre una web, ho fa a Safari, i l'app instal·lada té les dades separades de Safari.
        Amb el porta-retalls les dades arriben a la teva app.
      </Notice>

      <Card title="1. Crear la drecera">
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
        <p className="mt-3 text-xs text-muted">Els noms de les accions poden variar una mica segons l'idioma de l'iPhone. La primera vegada et demanarà permís per llegir les dades de Salut.</p>
      </Card>

      <Card title="2. Que s'executi sola (opcional)">
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          <li>A Dreceres, pestanya <strong>Automatització</strong> → <strong>+</strong> → <strong>Hora del dia</strong>, per exemple a les 21.30, cada dia.</li>
          <li>Tria <strong>Executar immediatament</strong> i selecciona la drecera <em>Forma</em>.</li>
          <li>Quan obris Forma, toca <strong>Dreceres</strong> a la targeta d'hàbits i confirma.</li>
        </ol>
      </Card>

      <Card title="Com es desa">
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          <li>Els <strong>passos</strong> van al registre d'hàbits del dia (substitueixen els que hi hagi).</li>
          <li>El <strong>pes</strong> es desa com a pesada del dia, però <strong>mai</strong> sobreescriu una pesada que hagis apuntat a mà.</li>
          <li>Si el text porta <code>data=2026-11-24</code>, es desa en aquella data. Si no, avui.</li>
        </ul>
      </Card>

      <Card title="Provar-ho">
        <PasteShortcut onDone={() => undefined} />
      </Card>
    </Page>
  );
}
