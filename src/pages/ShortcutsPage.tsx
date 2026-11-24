import { ClipboardPaste } from 'lucide-react';
import { useState } from 'react';
import { PasteShortcut } from '../components/Habits';
import { Card, Page, Segmented } from '../components/ui';

type Recipe = 'setmana' | 'avui';

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex gap-3">
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs text-muted">{n}</span>
    <span className="text-[15px] leading-snug">{children}</span>
  </li>
);
const A = ({ children }: { children: React.ReactNode }) => <strong className="font-semibold text-accent">{children}</strong>;

export function ShortcutsPage() {
  const [recipe, setRecipe] = useState<Recipe>('setmana');
  return (
    <Page title="Passos de Salut" back="/mes">
      <p className="-mt-2 text-sm text-muted">Una drecera copia els passos i a Avui toques <ClipboardPaste size={13} className="inline" />.</p>

      <Segmented value={recipe} onChange={setRecipe} options={[{ value: 'setmana', label: 'Últims 7 dies' }, { value: 'avui', label: 'Només avui' }]} />

      <Card title="Crear la drecera">
        {recipe === 'setmana' ? (
          <ol className="space-y-3">
            <Step n={1}>App <A>Dreceres</A> → <A>+</A> · nom: <em>Forma passos</em></Step>
            <Step n={2}><A>Cerca mostres de Salut</A><br /><span className="text-sm text-muted">Tipus: Passos · Data d'inici: últims 7 dies · Agrupar per: Dia</span></Step>
            <Step n={3}><A>Repeteix amb cada element</A> i, a dins:</Step>
            <Step n={4}><A>Formata la data</A><br /><span className="text-sm text-muted">Data d'inici de l'element · Personalitzat: <code>yyyy-MM-dd</code></span></Step>
            <Step n={5}><A>Text</A>: <code>[Data formatada] [Valor de l'element]</code></Step>
            <Step n={6}>Després de la repetició: <A>Combina el text</A> (resultats de la repetició, amb salts de línia)</Step>
            <Step n={7}><A>Copia al porta-retalls</A></Step>
          </ol>
        ) : (
          <ol className="space-y-3">
            <Step n={1}>App <A>Dreceres</A> → <A>+</A> · nom: <em>Forma passos</em></Step>
            <Step n={2}><A>Cerca mostres de Salut</A><br /><span className="text-sm text-muted">Tipus: Passos · Data d'inici: avui</span></Step>
            <Step n={3}><A>Calcula estadístiques</A>: Suma</Step>
            <Step n={4}><A>Text</A>: <code>FORMA passos=[Estadístiques]</code></Step>
            <Step n={5}><A>Copia al porta-retalls</A></Step>
          </ol>
        )}
        <p className="mt-4 text-xs text-muted">Els noms poden variar una mica segons l'idioma. Cerca «Salut» a la llista d'accions.</p>
      </Card>

      <Card title="Que s'executi sola">
        <ol className="space-y-3">
          <Step n={1}>Dreceres → <A>Automatització</A> → <A>+</A> → <A>Hora del dia</A> (p. ex. 21.30)</Step>
          <Step n={2}><A>Executar immediatament</A> · drecera <em>Forma passos</em></Step>
          <Step n={3}>Quan obris Forma: Avui → <ClipboardPaste size={14} className="inline" /> → Desar</Step>
        </ol>
      </Card>

      <Card title="Provar">
        <PasteShortcut onDone={() => undefined} />
      </Card>
    </Page>
  );
}
