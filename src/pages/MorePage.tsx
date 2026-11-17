import { ChevronRight, ClipboardList, Database, Dumbbell, Flame, Smartphone, User } from 'lucide-react';
import { Link } from 'react-router';
import { Page } from '../components/ui';

const ITEMS = [
  { to: '/mes/perfil', icon: User, label: 'Perfil', sub: 'Dades, fites i preferències' },
  { to: '/mes/calories', icon: Flame, label: 'Referència calòrica', sub: 'Calories i proteïna' },
  { to: '/mes/rutina', icon: ClipboardList, label: 'Rutina', sub: 'Dies A / B / C' },
  { to: '/mes/maquines', icon: Dumbbell, label: 'Màquines', sub: 'Catàleg i preferències' },
  { to: '/mes/dades', icon: Database, label: 'Dades', sub: 'Còpia de seguretat i dades de prova' },
  { to: '/mes/installar', icon: Smartphone, label: "Instal·lar l'app", sub: 'Afegir a la pantalla d\'inici' },
];

export function MorePage() {
  return (
    <Page title="Més">
      <nav className="overflow-hidden rounded-2xl border border-line bg-surface">
        {ITEMS.map(({ to, icon: Icon, label, sub }) => (
          <Link key={to} to={to} className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-0 active:bg-surface-2">
            <Icon size={22} className="text-accent" />
            <div className="flex-1">
              <div className="font-semibold">{label}</div>
              <div className="text-xs text-muted">{sub}</div>
            </div>
            <ChevronRight size={18} className="text-muted" />
          </Link>
        ))}
      </nav>
      <p className="text-center text-xs text-muted">Forma · totes les dades es guarden només en aquest dispositiu.</p>
    </Page>
  );
}
