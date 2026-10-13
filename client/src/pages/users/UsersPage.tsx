
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { isAxiosError } from "axios";

import { useAuth } from "../../context/AuthContext";

import {
  getUsers,
  createUser,
  updateUserRole,
  deactivateUser,
  reactivateUser,
} from "../../services/userService";

import type { UserRole } from "../../types/auth";

import type {
  UserCreateRequest,
  UserListItem,
} from "../../types/users";

import "./UsersPage.css";

// ========================================
// CONSTANTS
// ========================================

const ROLES: UserRole[] = [
  "admin",
  "hangar_manager",
  "team_lead",
  "technician",
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  hangar_manager: "Hangar Manager",
  team_lead: "Team Lead",
  technician: "Technician",
};

type RoleFilter = UserRole | "all";
type StatusFilter = "all" | "active" | "inactive";

interface Feedback {
  type: "success" | "error";
  message: string;
}

const EMPTY_FORM: UserCreateRequest = {
  display_name: "",
  email: "",
  password: "",
  role: "technician",
};

// ========================================
// ERROR HANDLING
// ========================================

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot connect to the Backend.";
    }

    const status = error.response.status;

    const data: unknown = error.response.data;

    if (typeof data === "object" && data !== null) {
      if ("detail" in data) {
        const detail = data.detail;

        if (typeof detail === "string") {
          return detail;
        }

        if (Array.isArray(detail)) {
          const messages = detail
            .filter(
              (item): item is { msg: string } =>
                typeof item === "object" &&
                item !== null &&
                "msg" in item &&
                typeof item.msg === "string",
            )
            .map((item) => item.msg);

          if (messages.length > 0) {
            return messages.join(" ");
          }
        }
      }
    }

    if (status === 401) {
      return "Your session has expired. Please log in again.";
    }

    if (status === 403) {
      return "You do not have permission for this action.";
    }

    if (status === 404) {
      return "The requested user or endpoint was not found.";
    }

    if (status === 409) {
      return "The operation conflicts with existing user data.";
    }

    return `Request failed. HTTP ${status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

// ========================================
// USERS PAGE
// ========================================

function UsersPage() {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const isTeamLead = user?.role === "team_lead";

  // Users from the Backend
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Search and filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] =
    useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  // Admin controls
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] =
    useState<UserCreateRequest>({ ...EMPTY_FORM });

  const [roleDrafts, setRoleDrafts] =
    useState<Record<string, UserRole>>({});

  // Request state
  const [busyAction, setBusyAction] =
    useState<string | null>(null);

  const [feedback, setFeedback] =
    useState<Feedback | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  // ========================================
  // LOAD USERS
  // ========================================

  useEffect(() => {
    let isActive = true;

    async function loadUsers(): Promise<void> {
      setIsLoading(true);
      setLoadError("");

      try {
        const result = await getUsers();

        if (!isActive) {
          return;
        }

        setUsers(result);

        const drafts: Record<string, UserRole> = {};

        for (const item of result) {
          drafts[item.id] = item.role;
        }

        setRoleDrafts(drafts);
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        setUsers([]);
        setLoadError(getErrorMessage(error));
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
  }, [refreshKey]);

  function refreshUsers(): void {
    setRefreshKey((current) => current + 1);
  }

  // ========================================
  // FILTER USERS
  // ========================================

  // Team leads see technicians only.
  // Backend must enforce permissions as well.
  const visibleUsers = isTeamLead
    ? users.filter((item) => item.role === "technician")
    : users;

  const normalizedSearch = search.trim().toLowerCase();

  const filteredUsers = visibleUsers
    .filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
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
        (statusFilter === "active" && item.is_active) ||
        (statusFilter === "inactive" && !item.is_active);

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
  // CREATE USER
  // ========================================

  async function handleCreateUser(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!isAdmin || busyAction) {
      return;
    }

    setBusyAction("create");
    setFeedback(null);

    try {
      await createUser(createForm);

      setCreateForm({ ...EMPTY_FORM });
      setShowCreateForm(false);

      setFeedback({
        type: "success",
        message: "User created successfully.",
      });

      refreshUsers();
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  }

  // ========================================
  // CHANGE ROLE
  // ========================================

  async function handleUpdateRole(
    target: UserListItem,
  ): Promise<void> {
    if (!isAdmin || busyAction) {
      return;
    }

    const newRole = roleDrafts[target.id] ?? target.role;

    if (newRole === target.role) {
      return;
    }

    const confirmed = window.confirm(
      `Change ${target.display_name}'s role to ${ROLE_LABELS[newRole]}?`,
    );

    if (!confirmed) {
      return;
    }

    setBusyAction(target.id);
    setFeedback(null);

    try {
      await updateUserRole(target.id, newRole);

      setFeedback({
        type: "success",
        message: "User role updated successfully.",
      });

      refreshUsers();
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  }

  // ========================================
  // DEACTIVATE / REACTIVATE
  // ========================================

  async function handleToggleStatus(
    target: UserListItem,
  ): Promise<void> {
    if (!isAdmin || busyAction) {
      return;
    }

    // Avoid self-deactivation in the UI
    if (target.id === user?.id && target.is_active) {
      setFeedback({
        type: "error",
        message: "You cannot deactivate your own account here.",
      });

      return;
    }

    if (target.is_active) {
      const confirmed = window.confirm(
        `Deactivate ${target.display_name}?\n\n` +
        "This user will no longer be able to access the system.",
      );

      if (!confirmed) {
        return;
      }
    }

    setBusyAction(target.id);
    setFeedback(null);

    try {
      if (target.is_active) {
        await deactivateUser(target.id);
      } else {
        await reactivateUser(target.id);
      }

      setFeedback({
        type: "success",
        message: target.is_active
          ? "User deactivated successfully."
          : "User reactivated successfully.",
      });

      refreshUsers();
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <section className="users-page">

      {/* PAGE HEADER */}
      <div className="page-heading users-page-heading">
        <div>
          <p className="page-eyebrow">
            User Management
          </p>

          <h1>Users</h1>

          <p className="page-description">
            {isTeamLead
              ? "View technicians in your organization."
              : "Manage users and permissions."}
          </p>
        </div>

        <div className="users-header-actions">
          <button
            type="button"
            className="users-button users-button-secondary"
            onClick={refreshUsers}
            disabled={isLoading || busyAction !== null}
          >
            Refresh
          </button>

          {isAdmin && (
            <button
              type="button"
              className="users-button"
              onClick={() => {
                setShowCreateForm((current) => !current);
                setFeedback(null);
              }}
              disabled={busyAction !== null}
            >
              {showCreateForm ? "Close Form" : "+ Add User"}
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`users-feedback users-feedback-${feedback.type}`}
        >
          {feedback.message}
        </div>
      )}

      {/* CREATE USER FORM */}
      {isAdmin && showCreateForm && (
        <form
          className="users-create-form"
          onSubmit={(event) => void handleCreateUser(event)}
        >
          <h2>Add New User</h2>

          <div className="users-form-grid">
            <div className="users-filter">
              <label htmlFor="new-user-name">
                Display Name
              </label>

              <input
                id="new-user-name"
                type="text"
                value={createForm.display_name}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    display_name: event.target.value,
                  }))
                }
                required
                minLength={1}
                disabled={busyAction !== null}
              />
            </div>

            <div className="users-filter">
              <label htmlFor="new-user-email">
                Email
              </label>

              <input
                id="new-user-email"
                type="email"
                autoComplete="off"
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
                disabled={busyAction !== null}
              />
            </div>

            <div className="users-filter">
              <label htmlFor="new-user-password">
                Password
              </label>

              <input
                id="new-user-password"
                type="password"
                autoComplete="new-password"
                value={createForm.password}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                required
                minLength={8}
                disabled={busyAction !== null}
              />
            </div>

            <div className="users-filter">
              <label htmlFor="new-user-role">
                Role
              </label>

              <select
                id="new-user-role"
                value={createForm.role}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    role: event.target.value as UserRole,
                  }))
                }
                disabled={busyAction !== null}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="users-button"
            disabled={busyAction !== null}
          >
            {busyAction === "create"
              ? "Creating..."
              : "Create User"}
          </button>
        </form>
      )}

      {/* FILTERS */}
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
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="users-filter">
          <label htmlFor="users-role">
            Role
          </label>

          <select
            id="users-role"
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as RoleFilter)
            }
          >
            <option value="all">All roles</option>

            {(isTeamLead
              ? ROLES.filter((role) => role === "technician")
              : ROLES
            ).map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>

        <div className="users-filter">
          <label htmlFor="users-status">
            Status
          </label>

          <select
            id="users-status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as StatusFilter,
              )
            }
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* LOADING */}
      {isLoading && (
        <div className="users-state" role="status">
          Loading users...
        </div>
      )}

      {/* ERROR */}
      {!isLoading && loadError && (
        <div
          className="users-state users-state-error"
          role="alert"
        >
          <h2>Unable to load users</h2>
          <p>{loadError}</p>

          <button
            type="button"
            className="users-button"
            onClick={refreshUsers}
          >
            Try Again
          </button>
        </div>
      )}

      {/* EMPTY LIST */}
      {!isLoading &&
        !loadError &&
        filteredUsers.length === 0 && (
          <div className="users-state">
            <h2>No users found</h2>
            <p>Try changing your filters.</p>
          </div>
        )}

      {/* USERS TABLE */}
      {!isLoading &&
        !loadError &&
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

                    {isAdmin && (
                      <th scope="col">Actions</th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((item) => {
                    const selectedRole =
                      roleDrafts[item.id] ?? item.role;

                    const isBusy = busyAction !== null;

                    return (
                      <tr key={item.id}>
                        <td className="users-name">
                          {item.display_name}
                        </td>

                        <td>{item.email}</td>

                        <td>
                          {isAdmin ? (
                            <div className="users-role-control">
                              <select
                                aria-label={`Role for ${item.display_name}`}
                                value={selectedRole}
                                disabled={isBusy}
                                onChange={(event) =>
                                  setRoleDrafts((current) => ({
                                    ...current,
                                    [item.id]:
                                      event.target.value as UserRole,
                                  }))
                                }
                              >
                                {ROLES.map((role) => (
                                  <option
                                    key={role}
                                    value={role}
                                  >
                                    {ROLE_LABELS[role]}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                className="users-button users-button-secondary"
                                disabled={
                                  isBusy ||
                                  selectedRole === item.role
                                }
                                onClick={() =>
                                  void handleUpdateRole(item)
                                }
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <span className="users-role-badge">
                              {ROLE_LABELS[item.role]}
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            className={`users-status-badge ${
                              item.is_active
                                ? "is-active"
                                : "is-inactive"
                            }`}
                          >
                            {item.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        {isAdmin && (
                          <td>
                            <button
                              type="button"
                              className={`users-button ${
                                item.is_active
                                  ? "users-button-danger"
                                  : "users-button-secondary"
                              }`}
                              disabled={
                                isBusy ||
                                (item.id === user?.id &&
                                  item.is_active)
                              }
                              onClick={() =>
                                void handleToggleStatus(item)
                              }
                            >
                              {busyAction === item.id
                                ? "Saving..."
                                : item.is_active
                                  ? "Deactivate"
                                  : "Reactivate"}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
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
