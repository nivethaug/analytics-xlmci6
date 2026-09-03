import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Twitter, Plug, Menu, X, RefreshCw, MessagesSquare } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/x", label: "X", icon: Twitter, end: false },
  { to: "/reddit", label: "Reddit", icon: MessagesSquare, end: false },
  { to: "/integrations", label: "Integrations", icon: Plug, end: false },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleRefresh = () => {
    if (syncing) return;
    setSyncing(true);
    window.dispatchEvent(new CustomEvent("app:refresh"));
    window.setTimeout(() => setSyncing(false), 1600);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[hsl(240,10%,3%)]/85 backdrop-blur-xl">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 flex items-center justify-between h-14">
        <NavLink to="/" className="flex items-center gap-2.5 group" data-testid="navbar-brand">
          <span className="flex -space-x-1.5" aria-hidden="true">
            <span className="p-1.5 rounded-lg bg-gradient-to-br from-red-600 to-rose-500 text-white shadow-[0_0_16px_-2px_rgba(239,68,68,0.5)]">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z"/></svg>
            </span>
            <span className="p-1.5 rounded-lg bg-white text-black shadow-[0_0_16px_-4px_rgba(255,255,255,0.6)]">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M18.9 1.2h3.7l-8.1 9.3L24 22.8h-7.5l-5.8-7.6-6.7 7.6H.3l8.7-9.9L0 1.2h7.7l5.3 7 5.9-7zm-1.3 19.4h2.1L6.6 3.3H4.4l13.2 17.3z"/></svg>
            </span>
          </span>
          <span className="font-semibold text-sm md:text-[15px] tracking-tight text-gradient-brand">
            My X &amp; YouTube Stats
          </span>
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              data-testid={`navbar-link-${l.label.toLowerCase().split(" ")[0].replace(/[^a-z]/g, "")}`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-300 min-h-[36px] ${
                  isActive
                    ? "bg-violet-500/[0.12] text-violet-300 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.25),0_0_20px_-4px_rgba(139,92,246,0.45)]"
                    : "text-[hsl(240,6%,62%)] hover:text-foreground hover:bg-white/[0.05]"
                }`
              }
            >
              <l.icon className="w-4 h-4" aria-hidden="true" />{l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          {/* System-status indicator */}
          <span
            className="hidden sm:flex items-center gap-1.5 text-[11px] text-soft"
            data-testid="navbar-sync-indicator"
            aria-live="polite"
            title="All systems connected"
          >
            <span className="relative flex h-[7px] w-[7px]">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50"></span>
              <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
            </span>
            Connected
          </span>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            aria-label="Refresh data"
            data-testid="navbar-refresh-button"
            className="p-2 rounded-xl text-[hsl(240,6%,62%)] hover:text-violet-300 hover:bg-violet-500/10 hover:shadow-[0_0_18px_-4px_rgba(139,92,246,0.5)] transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin text-violet-400" : ""}`} aria-hidden="true" />
          </button>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-xl hover:bg-white/[0.06] text-[hsl(240,6%,62%)] hover:text-foreground transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            data-testid="sidebar-toggle-button"
          >
            {open ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
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
                `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium min-h-[44px] transition-all ${
                  isActive
                    ? "bg-violet-500/[0.12] text-violet-300 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.25)]"
                    : "text-[hsl(240,6%,62%)] hover:text-foreground hover:bg-white/[0.05]"
                }`
              }
            >
              <l.icon className="w-4 h-4" aria-hidden="true" />{l.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
