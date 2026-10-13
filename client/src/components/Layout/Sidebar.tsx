
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";

import {
  LayoutDashboard,
  Plane,
  Wrench,
  ClipboardCheck,
  Users,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../BrandLogo";

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);

  // Preserve the original Users Management permissions.
  const canViewUsers =
    user?.role === "admin" ||
    user?.role === "hangar_manager" ||
    user?.role === "team_lead";

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Allow the Escape key to close the mobile menu.
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function handleLogout(): void {
    setIsOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  const navigationItems = [
    {
      label: "Dashboard",
      to: "/app/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Aircraft",
      to: "/app/aircraft",
      icon: Plane,
    },
    {
      label: "Maintenance",
      to: "/app/maintenance",
      icon: Wrench,
    },
    {
      label: "Inspections",
      to: "/app/inspections",
      icon: ClipboardCheck,
    },
    ...(canViewUsers
      ? [
          {
            label: "Users",
            to: "/app/users",
            icon: Users,
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile top navigation */}
      <div className="hm-mobile-bar">
        <button
          type="button"
          className="hm-mobile-toggle"
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation"
          aria-controls="hm-sidebar"
          aria-expanded={isOpen}
        >
          <Menu size={23} />
        </button>

        <span className="hm-mobile-title">
          HangarManager
        </span>
      </div>

      {/* Mobile backdrop */}
      {isOpen && (
        <button
          type="button"
          className="hm-sidebar-backdrop"
          onClick={() => setIsOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* Main sidebar */}
      <aside
        id="hm-sidebar"
        className={`hm-sidebar ${isOpen ? "hm-sidebar--open" : ""}`}
      >
        {/* Brand */}
        <div className="hm-sidebar-brand">
          <NavLink
            to="/app/dashboard"
            className="hm-brand-link"
            onClick={() => setIsOpen(false)}
          >
            <span className="hm-brand-logo">
              <BrandLogo />
            </span>

            <span className="hm-brand-text">
              <strong>HangarManager</strong>
              <small>AVIATION CONTROL</small>
            </span>
          </NavLink>

          <button
            type="button"
            className="hm-sidebar-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation"
          >
            <X size={21} />
          </button>
        </div>

        {/* Navigation */}
        <div className="hm-sidebar-navigation">
          <p className="hm-nav-heading">WORKSPACE</p>

          <nav className="hm-nav" aria-label="Main navigation">
            {navigationItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/app/dashboard"}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `hm-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <Icon size={20} strokeWidth={1.9} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom area */}
        <div className="hm-sidebar-bottom">
          <div className="hm-system-status">
            <ShieldCheck size={16} />
            <span>Fleet Management System</span>
          </div>

          {/* Clickable user profile card */}
          <NavLink
            to="/app/profile"
            className={({ isActive }) =>
              `hm-user-card hm-user-card-link ${
                isActive ? "hm-user-card--active" : ""
              }`
            }
            onClick={() => setIsOpen(false)}
            aria-label="Open my profile"
          >
            <div className="hm-user-avatar">
              <UserRound size={22} />
            </div>

            <div className="hm-user-details">
              <strong>
                {user?.display_name || user?.email || "Account"}
              </strong>

              <span>
                {user?.role?.replaceAll("_", " ")}
              </span>
            </div>
          </NavLink>

          <button
            type="button"
            className="hm-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
