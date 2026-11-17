import { Card, Notice, Page } from '../components/ui';

export function InstallPage() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone;
  return (
    <Page title="Instal·lar l'app" back="/mes">
      {standalone
        ? <Notice tone="ok">Ja l'estàs fent servir com a app instal·lada. 👍</Notice>
        : <Notice tone="info">Ara l'estàs obrint des del navegador. Instal·la-la perquè s'obri a pantalla completa i funcioni sense connexió.</Notice>}
      <Card title="iPhone (Safari)">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>Obre aquesta web amb <strong>Safari</strong> (des de Chrome a l'iPhone també funciona a iOS 16.4 o posterior).</li>
          <li>Toca el botó <strong>Compartir</strong> (el quadrat amb la fletxa cap amunt).</li>
          <li>Tria <strong>«Afegir a la pantalla d'inici»</strong>.</li>
          <li>Comprova que «Obrir com a app web» està activat i toca <strong>Afegir</strong>.</li>
          <li>Obre «Forma» des de la icona. A partir d'aquí funciona sense connexió.</li>
        </ol>
      </Card>
      <Card title="Coses a saber a l'iPhone">
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>Les dades de l'app instal·lada són <strong>diferents</strong> de les de Safari. Fes servir sempre la icona.</li>
          <li>L'iPhone no deixa vibrar les webs: quan acaba el descans sona un avís i la barra s'il·lumina. Puja el volum i treu el mode silenci.</li>
          <li>Si bloqueges la pantalla, el temporitzador continua comptant, però l'avís només sona amb l'app oberta. Durant l'entrenament l'app intenta mantenir la pantalla encesa.</li>
          <li>Fes una <strong>còpia de seguretat</strong> cada una o dues setmanes (Més → Dades → Exportar → Desa a Fitxers).</li>
        </ul>
      </Card>
      <Card title="Actualitzacions">
        <p className="text-sm">Quan publiquis una versió nova, l'app s'actualitza sola la propera vegada que l'obris amb connexió. Les dades es conserven.</p>
      </Card>
    </Page>
  );
}
