
import { NavLink, useNavigate } from "react-router";

import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../BrandLogo";

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout(): void {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="app-header">
      <NavLink
        to="/app/dashboard"
        className="app-brand"
        aria-label="HangarManager Dashboard"
      >
        {/* HangarManager logo */}
        <span className="brand-icon brand-icon--logo">
          <BrandLogo />
        </span>

        <span className="brand-text">
          <strong>HangarManager</strong>
          <small>Aircraft Fleet Management</small>
        </span>
      </NavLink>

      <nav
        className="main-navigation"
        aria-label="Main navigation"
      >
        <NavLink
          to="/app/dashboard"
          end
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/app/aircraft"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Aircraft
        </NavLink>

        <NavLink
          to="/app/maintenance"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Maintenance
        </NavLink>

        <NavLink
          to="/app/inspections"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Inspections
        </NavLink>
      </nav>

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
