import clsx from 'clsx';
import { CalendarCheck, Dumbbell, LineChart, Menu, Scale, Waves } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router';

const TABS = [
  { to: '/', label: 'Avui', icon: CalendarCheck, end: true },
  { to: '/pes', label: 'Pes', icon: Scale },
  { to: '/entrenar', label: 'Entrenar', icon: Dumbbell },
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
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 px-3">
          <div className="glass-strong mx-auto mb-2 flex max-w-xl items-center justify-between rounded-[26px] px-1.5 py-1.5">
            {TABS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => clsx('flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-[20px] py-1.5 text-[10px] font-medium transition',
                  isActive ? 'bg-text/10 text-text' : 'text-muted')}>
                {({ isActive }) => (<><Icon size={21} strokeWidth={isActive ? 2.2 : 1.7} className={isActive ? 'text-accent' : ''} />{label}</>)}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
