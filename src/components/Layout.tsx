import clsx from 'clsx';
import { Dumbbell, Home, LineChart, Menu, Scale, Waves } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router';

const TABS = [
  { to: '/', label: 'Inici', icon: Home, end: true },
  { to: '/pes', label: 'Pes', icon: Scale },
  { to: '/entrenar', label: 'Entrenar', icon: Dumbbell, big: true },
  { to: '/natacio', label: 'Natació', icon: Waves },
  { to: '/progres', label: 'Progrés', icon: LineChart },
  { to: '/mes', label: 'Més', icon: Menu },
];

export function Layout() {
  const { pathname } = useLocation();
  // Durant l'entrenament amaguem la barra per guanyar espai
  const hideNav = pathname.startsWith('/entrenar/sessio');
  return (
    <>
      <Outlet />
      {!hideNav && (
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-end justify-around px-1 pt-1.5">
            {TABS.map(({ to, label, icon: Icon, end, big }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => clsx(
                  'flex min-w-0 flex-1 flex-col items-center gap-0.5 pb-1.5 text-[11px] font-medium',
                  isActive ? 'text-accent' : 'text-muted',
                )}
              >
                {({ isActive }) => big ? (
                  <>
                    <span className={clsx('-mt-5 flex h-14 w-14 items-center justify-center rounded-full shadow-lg', isActive ? 'bg-accent text-accent-ink' : 'bg-accent/90 text-accent-ink')}>
                      <Icon size={28} />
                    </span>
                    {label}
                  </>
                ) : (
                  <>
                    <Icon size={24} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
