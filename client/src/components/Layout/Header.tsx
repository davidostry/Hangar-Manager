
import { NavLink, useNavigate } from "react-router";

import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../BrandLogo";

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Determine who can access Users Management
  const canViewUsers =
    user?.role === "admin" ||
    user?.role === "hangar_manager" ||
    user?.role === "team_lead";

  function handleLogout(): void {
    logout();
    navigate("/login", { replace: true });
  }

  function navLinkClass({
    isActive,
  }: {
    isActive: boolean;
  }): string {
    return isActive
      ? "nav-link active"
      : "nav-link";
  }

  return (
    <header className="app-header">

      {/* ========================================
          BRAND
      ======================================== */}

      <NavLink
        to="/app/dashboard"
        className="app-brand"
        aria-label="HangarManager Dashboard"
      >
        <span className="brand-icon brand-icon--logo">
          <BrandLogo />
        </span>

        <span className="brand-text">
          <strong>HangarManager</strong>
          <small>Aircraft Fleet Management</small>
        </span>
      </NavLink>

      {/* ========================================
          MAIN NAVIGATION
      ======================================== */}

      <nav
        className="main-navigation"
        aria-label="Main navigation"
      >
        <NavLink
          to="/app/dashboard"
          end
          className={navLinkClass}
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/app/aircraft"
          className={navLinkClass}
        >
          Aircraft
        </NavLink>

        <NavLink
          to="/app/maintenance"
          className={navLinkClass}
        >
          Maintenance
        </NavLink>

        <NavLink
          to="/app/inspections"
          className={navLinkClass}
        >
          Inspections
        </NavLink>

        {/* Only authorized roles can view Users */}
        {canViewUsers && (
          <NavLink
            to="/app/users"
            className={navLinkClass}
          >
            Users
          </NavLink>
        )}
      </nav>

      {/* ========================================
          ACCOUNT INFORMATION
      ======================================== */}

      <div className="header-account">
        <div className="account-information">

          <span className="account-name">
            {user?.display_name || user?.email}
          </span>

          <span className="account-role">
            {user?.role}
          </span>

        </div>

        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          Log out
        </button>
      </div>

    </header>
  );
}

export default Header;
