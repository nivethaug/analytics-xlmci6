import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, BarChart3, Plug, Settings, Youtube, Menu, X } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/analytics", label: "Analytics", icon: BarChart3, end: false },
  { to: "/integrations", label: "Integrations", icon: Plug, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 md:px-6 flex items-center justify-between h-16">
        <NavLink to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="p-1.5 rounded-lg bg-gradient-to-br from-red-600 to-rose-500 text-white">
            <Youtube className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="bg-gradient-to-r from-violet-600 to-blue-500 bg-clip-text text-transparent">Analytics</span>
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 min-h-[44px] ${
                  isActive ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300" : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                }`
              }
            >
              <span className="flex items-center gap-2"><l.icon className="w-4 h-4" aria-hidden="true" />{l.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile menu */}
      <nav
        className={`md:hidden overflow-hidden transition-all duration-300 ${open ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}
        aria-label="Mobile navigation"
      >
        <div className="px-4 pb-4 space-y-1">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
                  isActive ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300" : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                }`
              }
            >
              <span className="flex items-center gap-3"><l.icon className="w-4 h-4" aria-hidden="true" />{l.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
