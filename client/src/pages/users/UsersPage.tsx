
import { useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";

import { useAuth } from "../../context/AuthContext";
import {
  getUsers,
  createUser,
  updateUserRole,
  setUserActive,
} from "../../services/userService";

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

    const detail: unknown = error.response.data;
    if (detail && typeof detail === "object" && "detail" in detail) {
      if (typeof detail.detail === "string") return detail.detail;
      if (Array.isArray(detail.detail)) {
        return detail.detail.map((item: { msg?: string }) => item.msg || "Invalid input").join("; ");
      }
    }
    return `Request failed. HTTP ${error.response.status}.`;
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
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("technician");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

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

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsCreating(true);
    setActionError("");
    setActionSuccess("");
    try {
      await createUser({
        display_name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("technician");
      setShowCreate(false);
      setActionSuccess("User created successfully.");
      handleRefresh();
    } catch (cause: unknown) {
      setActionError(getErrorMessage(cause));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRoleChange(item: UserListItem, role: UserRole): Promise<void> {
    if (role === item.role) return;
    if (!window.confirm(`Change ${item.display_name}'s role to ${ROLE_LABELS[role]}?`)) return;
    setSavingId(item.id);
    setActionError("");
    setActionSuccess("");
    try {
      await updateUserRole(item.id, role);
      setActionSuccess(`Role updated for ${item.display_name}.`);
      handleRefresh();
    } catch (cause: unknown) {
      setActionError(getErrorMessage(cause));
    } finally {
      setSavingId(null);
    }
  }

  async function handleActiveChange(item: UserListItem): Promise<void> {
    const activate = item.is_active === false;
    if (!window.confirm(`${activate ? "Reactivate" : "Deactivate"} ${item.display_name}?`)) return;
    setSavingId(item.id);
    setActionError("");
    setActionSuccess("");
    try {
      await setUserActive(item.id, activate);
      setActionSuccess(`${item.display_name} ${activate ? "reactivated" : "deactivated"}.`);
      handleRefresh();
    } catch (cause: unknown) {
      setActionError(getErrorMessage(cause));
    } finally {
      setSavingId(null);
    }
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

        <div>
          {isAdmin && (
            <button type="button" className="users-button" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? "Close Form" : "+ Add User"}
            </button>
          )}{" "}
          <button type="button" className="users-button" onClick={handleRefresh} disabled={isLoading}>
            Refresh
          </button>
        </div>
      </div>

      {isAdmin && showCreate && (
        <form onSubmit={(event) => void handleCreate(event)} className="users-state">
          <h2>Create User</h2>
          <div className="users-toolbar">
            <div className="users-filter"><label htmlFor="new-user-name">Name</label>
              <input id="new-user-name" value={newName} onChange={(event) => setNewName(event.target.value)} required minLength={1} />
            </div>
            <div className="users-filter"><label htmlFor="new-user-email">Email</label>
              <input id="new-user-email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required />
            </div>
            <div className="users-filter"><label htmlFor="new-user-password">Password (8+ characters)</label>
              <input id="new-user-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required autoComplete="new-password" />
            </div>
            <div className="users-filter"><label htmlFor="new-user-role">Role</label>
              <select id="new-user-role" value={newRole} onChange={(event) => setNewRole(event.target.value as UserRole)}>
                {Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="users-button" disabled={isCreating}>{isCreating ? "Creating..." : "Create User"}</button>
        </form>
      )}
      {actionError && <div className="users-state users-state-error" role="alert">{actionError}</div>}
      {actionSuccess && <div className="users-state" role="status">{actionSuccess}</div>}

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
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    {isAdmin && <th scope="col">Actions</th>}
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

                      {isAdmin && (
                        <td>
                          <label htmlFor={`role-${item.id}`} className="users-name">Change role</label>
                          <select
                            id={`role-${item.id}`}
                            aria-label={`Change role for ${item.display_name}`}
                            value={item.role}
                            disabled={savingId !== null}
                            onChange={(event) => void handleRoleChange(item, event.target.value as UserRole)}
                          >
                            {Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                          </select>{" "}
                          <button
                            type="button"
                            className="users-button"
                            disabled={savingId !== null || item.id === user?.id}
                            onClick={() => void handleActiveChange(item)}
                          >
                            {savingId === item.id ? "Saving..." : item.is_active === false ? "Reactivate" : "Deactivate"}
                          </button>
                        </td>
                      )}
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

    </section>
  );
}

export default UsersPage;
