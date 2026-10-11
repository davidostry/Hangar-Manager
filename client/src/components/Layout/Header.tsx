import { NavLink } from "react-router";

function Header() {
  return (
    <header className="app-header">
      <NavLink
        to="/app/dashboard"
        className="app-brand"
        aria-label="HangarManager Dashboard"
      >
        <span className="brand-icon">H</span>

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
    </header>
  );
}

export default Header;