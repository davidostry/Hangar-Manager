
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";

import { useAuth } from "../../context/AuthContext";
import { getUsers } from "../../services/userService";

import type { UserRole } from "../../types/auth";
import type { UserListItem } from "../../types/users";

import "./UsersPage.css";

type RoleFilter = UserRole | "all";
type StatusFilter = "all" | "active" | "inactive";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  hangar_manager: "Hangar Manager",
  team_lead: "Team Lead",
  technician: "Technician",
};

function isRoleFilter(value: string): value is RoleFilter {
  return (
    value === "all" ||
    value === "admin" ||
    value === "hangar_manager" ||
    value === "team_lead" ||
    value === "technician"
  );
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot connect to the Backend.";
    }

    if (error.response.status === 401) {
      return "Your session has expired. Please sign in again.";
    }

    if (error.response.status === 403) {
      return "You do not have permission to view users.";
    }

    return `Failed to load users. HTTP ${error.response.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

function UsersPage() {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const isTeamLead = user?.role === "team_lead";

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] =
    useState<RoleFilter>("all");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [retryCount, setRetryCount] = useState(0);

  // ========================================
  // LOAD USERS
  // ========================================

  useEffect(() => {
    let isActive = true;

    async function loadUsers(): Promise<void> {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getUsers();

        if (!isActive) {
          return;
        }

        setUsers(result);
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        setUsers([]);
        setErrorMessage(getErrorMessage(error));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      isActive = false;
    };
  }, [retryCount]);

  // ========================================
  // ROLE-BASED VISIBILITY
  // ========================================

  // Team leads can see technicians only.
  // The Backend must enforce this restriction too.
  const visibleUsers = isTeamLead
    ? users.filter((item) => item.role === "technician")
    : users;

  // ========================================
  // SEARCH AND FILTERS
  // ========================================

  const normalizedSearch = search.trim().toLowerCase();

  const filteredUsers = visibleUsers
    .filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.display_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        item.email
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesRole =
        roleFilter === "all" ||
        item.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          item.is_active === true) ||
        (statusFilter === "inactive" &&
          item.is_active === false);

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    })
    .sort((a, b) =>
      a.display_name.localeCompare(b.display_name),
    );

  // ========================================
  // REFRESH
  // ========================================

  function handleRefresh(): void {
    setRetryCount((current) => current + 1);
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <section className="users-page">

      <div className="page-heading users-page-heading">
        <div>
          <p className="page-eyebrow">
            User Management
          </p>

          <h1>Users</h1>

          <p className="page-description">
            {isTeamLead
              ? "View technicians in your organization."
              : "View users and their assigned roles."}
          </p>
        </div>

        <button
          type="button"
          className="users-button"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      {/* Search and filters */}
      <div className="users-toolbar">

        <div className="users-filter">
          <label htmlFor="users-search">
            Search users
          </label>

          <input
            id="users-search"
            type="search"
            placeholder="Name or email..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <div className="users-filter">
          <label htmlFor="users-role">
            Role
          </label>

          <select
            id="users-role"
            value={roleFilter}
            onChange={(event) => {
              const value = event.target.value;

              if (isRoleFilter(value)) {
                setRoleFilter(value);
              }
            }}
          >
            <option value="all">All roles</option>

            {!isTeamLead && (
              <>
                <option value="admin">Admin</option>
                <option value="hangar_manager">
                  Hangar Manager
                </option>
                <option value="team_lead">
                  Team Lead
                </option>
              </>
            )}

            <option value="technician">
              Technician
            </option>
          </select>
        </div>

        <div className="users-filter">
          <label htmlFor="users-status">
            Status
          </label>

          <select
            id="users-status"
            value={statusFilter}
            onChange={(event) => {
              const value = event.target.value;

              if (
                value === "all" ||
                value === "active" ||
                value === "inactive"
              ) {
                setStatusFilter(value);
              }
            }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="users-state" role="status">
          Loading users...
        </div>
      )}

      {/* Error */}
      {!isLoading && errorMessage && (
        <div
          className="users-state users-state-error"
          role="alert"
        >
          <h2>Unable to load users</h2>
          <p>{errorMessage}</p>

          <button
            type="button"
            className="users-button"
            onClick={handleRefresh}
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading &&
        !errorMessage &&
        filteredUsers.length === 0 && (
          <div className="users-state">
            <h2>No users found</h2>

            <p>
              Try changing your search or filters.
            </p>
          </div>
        )}

      {/* Users table */}
      {!isLoading &&
        !errorMessage &&
        filteredUsers.length > 0 && (
          <>
            <div className="users-table-wrapper">
              <table className="users-table">

                <thead>
                  <tr>
                    <th scope="col">Display Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((item) => (
                    <tr key={item.id}>

                      <td className="users-name">
                        {item.display_name}
                      </td>

                      <td>{item.email}</td>

                      <td>
                        <span className="users-role-badge">
                          {ROLE_LABELS[item.role]}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`users-status-badge ${
                            item.is_active === true
                              ? "is-active"
                              : item.is_active === false
                                ? "is-inactive"
                                : "is-unknown"
                          }`}
                        >
                          {item.is_active === true
                            ? "Active"
                            : item.is_active === false
                              ? "Inactive"
                              : "Not provided"}
                        </span>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="users-results">
              Showing {filteredUsers.length} of{" "}
              {visibleUsers.length} users
            </p>
          </>
        )}

      {/* Admin actions will be added after API approval */}
      {isAdmin && (
        <p className="users-admin-note">
          User administration actions will become
          available after the Backend endpoints
          are finalized.
        </p>
      )}

    </section>
  );
}

export default UsersPage;
