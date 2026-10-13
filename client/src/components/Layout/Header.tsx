
import { NavLink, useNavigate } from "react-router";

import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../BrandLogo";

import type { UserRole } from "../../types/auth";

import "./Header.css";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  hangar_manager: "Hangar Manager",
  team_lead: "Team Lead",
  technician: "Technician",
};

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // These roles are allowed to access the Users page.
  const canViewUsers =
    user?.role === "admin" ||
    user?.role === "hangar_manager" ||
    user?.role === "team_lead";

  // React Router automatically marks the active link.
  function navClass({ isActive }: { isActive: boolean }) {
    return isActive
      ? "hm-nav-link hm-nav-link-active"
      : "hm-nav-link";
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="hm-header">
      <div className="hm-header-inner">

        {/* BRAND */}
        <NavLink
          to="/app/dashboard"
          className="hm-brand"
          aria-label="HangarManager home"
        >
          <span className="hm-brand-logo">
            <BrandLogo />
          </span>

          <span className="hm-brand-name">
            HangarManager
          </span>
        </NavLink>

        {/* NAVIGATION */}
        <nav className="hm-navigation" aria-label="Main navigation">

          <NavLink
            to="/app/dashboard"
            className={navClass}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/app/aircraft"
            className={navClass}
          >
            Aircraft
          </NavLink>

          <NavLink
            to="/app/maintenance"
            className={navClass}
          >
            Maintenance
          </NavLink>

          <NavLink
            to="/app/inspections"
            className={navClass}
          >
            Inspections
          </NavLink>

          {/* Users: Admin, Hangar Manager, Team Lead */}
          {canViewUsers && (
            <NavLink
              to="/app/users"
              className={navClass}
            >
              Users
            </NavLink>
          )}

          {/* Profile: ALL authenticated users */}
          <NavLink
            to="/app/profile"
            className={navClass}
          >
            My Profile
          </NavLink>

        </nav>

        {/* ACCOUNT */}
        <div className="hm-account">

          {user && (
            <div className="hm-account-details">
              <span className="hm-account-name">
                {user.display_name || user.email}
              </span>

              <span className="hm-account-role">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          )}

          <button
            type="button"
            className="hm-logout"
            onClick={() => void handleLogout()}
          >
            Logout
          </button>

        </div>
      </div>
    </header>
  );
}

export { Header };
export default Header;
