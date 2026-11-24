import { Card, Notice, Page } from '../components/ui';

export function InstallPage() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone;
  return (
    <Page title="Instal·lar" back="/mes">
      {standalone && <Notice tone="ok">Ja és instal·lada.</Notice>}
      <Card title="iPhone">
        <ol className="list-decimal space-y-2 pl-5 text-[15px]">
          <li>Obre la web amb Safari.</li>
          <li>Compartir → <strong>Afegir a la pantalla d'inici</strong>.</li>
          <li>Obre Forma sempre des de la icona.</li>
        </ol>
      </Card>
      <Card>
        <ul className="space-y-2 text-sm text-muted">
          <li>· Les dades de la icona i les de Safari són diferents.</li>
          <li>· El descans avisa amb so: treu el mode silenci.</li>
          <li>· S'actualitza sola en obrir-la amb connexió.</li>
        </ul>
      </Card>
    </Page>
  );
}
