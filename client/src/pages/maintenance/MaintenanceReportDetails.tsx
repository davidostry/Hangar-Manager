import { useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link, useParams } from "react-router";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { getUsers } from "../../services/userService";
import {
  getMaintenanceReportById,
  updateMaintenanceReportStatus,
} from "../../services/maintenanceService";
import type {
  MaintenanceReport,
  MaintenanceStatus,
} from "../../types/maintenance";
import "./MaintenanceReportDetails.css";

function formatDate(value: string | null): string {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(status: MaintenanceStatus): string {
  switch (status) {
    case "Open":
      return "Open";
    case "InProgress":
      return "In Progress";
    case "Resolved":
      return "Resolved";
    case "Cancelled":
      return "Cancelled";
  }
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot connect to the Backend. Check that the server is running.";
    }

    const data: unknown = error.response.data;
    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof data.detail === "string" &&
      data.detail.trim()
    ) {
      return data.detail;
    }

    return `Request failed. HTTP status: ${error.response.status}.`;
  }

  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

function MaintenanceReportDetails() {
  const { reportId } = useParams();
  const { user } = useAuth();

  const [report, setReport] = useState<MaintenanceReport | null>(null);
  const [selectedStatus, setSelectedStatus] =
    useState<MaintenanceStatus>("Open");

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // Human-readable labels; these never replace IDs used in API calls.
  const [aircraftTailNumber, setAircraftTailNumber] =
    useState<string | null>(null);
  const [aircraftNameLoading, setAircraftNameLoading] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [userNamesLoading, setUserNamesLoading] = useState(false);

  const aircraftId = report?.aircraft_id;
  const canReadUsers =
    user?.role === "admin" ||
    user?.role === "hangar_manager" ||
    user?.role === "team_lead";

  // Fetch the report, keeping the existing loading/error/status behavior.
  useEffect(() => {
    let isActive = true;

    async function loadReport(): Promise<void> {
      setIsLoading(true);
      setIsNotFound(false);
      setErrorMessage("");
      setStatusError("");
      setStatusSuccess("");
      setReport(null);

      if (!reportId) {
        setIsNotFound(true);
        setIsLoading(false);
        return;
      }

      try {
        const result = await getMaintenanceReportById(reportId);
        if (!isActive) return;

        if (!result) {
          setIsNotFound(true);
          return;
        }

        setReport(result);
        setSelectedStatus(result.status);
      } catch (error: unknown) {
        if (!isActive) return;

        if (isAxiosError(error) && error.response?.status === 404) {
          setIsNotFound(true);
        } else {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadReport();
    return () => {
      isActive = false;
    };
  }, [reportId, retryCount]);

  // Fetch this aircraft by its real ID instead of downloading every aircraft.
  useEffect(() => {
    let isActive = true;
    setAircraftTailNumber(null);

    const id = aircraftId;
    if (typeof id !== "string" || !id.trim()) {
      setAircraftNameLoading(false);
      return;
    }

    async function loadAircraftName(validAircraftId: string): Promise<void> {
      setAircraftNameLoading(true);
      try {
        const response = await api.get<unknown>(
          `/aircraft/${encodeURIComponent(validAircraftId)}`,
        );
        const value = response.data;

        if (
          isActive &&
          typeof value === "object" &&
          value !== null &&
          "tail_number" in value &&
          typeof value.tail_number === "string"
        ) {
          setAircraftTailNumber(value.tail_number);
        }
      } catch {
        // A label lookup must not prevent the report from being displayed.
      } finally {
        if (isActive) setAircraftNameLoading(false);
      }
    }

    void loadAircraftName(id);
    return () => {
      isActive = false;
    };
  }, [aircraftId]);

  // The users API is role-protected. Technicians must not call it.
  useEffect(() => {
    let isActive = true;
    setUserNames({});

    if (!canReadUsers) {
      setUserNamesLoading(false);
      return;
    }

    async function loadUserNames(): Promise<void> {
      setUserNamesLoading(true);
      try {
        const users = await getUsers();
        const names: Record<string, string> = {};
        for (const item of users) {
          names[item.id] = item.display_name;
        }
        if (isActive) setUserNames(names);
      } catch {
        // Limited permissions may mean some names are unavailable.
      } finally {
        if (isActive) setUserNamesLoading(false);
      }
    }

    void loadUserNames();
    return () => {
      isActive = false;
    };
  }, [canReadUsers]);

  function displayUserName(id: string | null | undefined): string {
    if (!id) return "Unassigned";
    if (user && id === user.id) {
      return user.display_name || user.email;
    }
    if (userNames[id]) return userNames[id];
    return userNamesLoading ? "Loading name..." : "Name unavailable";
  }

  async function handleStatusUpdate(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!report || !reportId) return;

    if (selectedStatus === report.status) {
      setStatusError("Select a different status first.");
      setStatusSuccess("");
      return;
    }

    setIsUpdatingStatus(true);
    setStatusError("");
    setStatusSuccess("");

    try {
      const updatedReport = await updateMaintenanceReportStatus(
        reportId,
        selectedStatus,
      );
      setReport(updatedReport);
      setSelectedStatus(updatedReport.status);
      setStatusSuccess("Report status updated successfully.");
    } catch (error: unknown) {
      setStatusError(getErrorMessage(error));
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  if (isLoading) {
    return (
      <section className="maintenance-detail-page">
        <div className="maintenance-detail-state" role="status">
          <span className="maintenance-spinner" aria-hidden="true" />
          <p>Loading maintenance report...</p>
        </div>
      </section>
    );
  }

  if (isNotFound) {
    return (
      <section className="maintenance-detail-page">
        <Link className="maintenance-back-link" to="/app/maintenance">
          ← Back to Maintenance Reports
        </Link>
        <div className="maintenance-detail-state">
          <h1>Report not found</h1>
          <p>
            The requested maintenance report does not exist or is no longer
            available.
          </p>
        </div>
      </section>
    );
  }

  if (errorMessage || !report) {
    return (
      <section className="maintenance-detail-page">
        <Link className="maintenance-back-link" to="/app/maintenance">
          ← Back to Maintenance Reports
        </Link>
        <div className="maintenance-detail-state maintenance-state-error">
          <h1>Unable to load report</h1>
          <p role="alert">
            {errorMessage || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            className="maintenance-button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="maintenance-detail-page">
      <Link className="maintenance-back-link" to="/app/maintenance">
        ← Back to Maintenance Reports
      </Link>

      <div className="page-heading maintenance-detail-heading">
        <p className="page-eyebrow">Maintenance Report</p>
        <h1>{report.title}</h1>
        <p className="page-description">
          Review the report description, priority, status and associated
          aircraft.
        </p>
      </div>

      <div className="maintenance-detail-summary">
        <div>
          <span className="maintenance-detail-label">Priority</span>
          <span
            className={`maintenance-priority priority-${report.priority.toLowerCase()}`}
          >
            {report.priority}
          </span>
        </div>
        <div>
          <span className="maintenance-detail-label">Current Status</span>
          <span
            className={`maintenance-status status-${report.status.toLowerCase()}`}
          >
            {formatStatus(report.status)}
          </span>
        </div>
      </div>

      <section className="maintenance-detail-card">
        <div className="maintenance-status-heading">
          <div>
            <h2>Update Report Status</h2>
            <p>Change the status as the maintenance work progresses.</p>
          </div>
        </div>
        <form
          className="maintenance-status-form"
          onSubmit={(event) => void handleStatusUpdate(event)}
        >
          <div className="maintenance-status-control">
            <label htmlFor="maintenance-report-status">New status</label>
            <select
              id="maintenance-report-status"
              value={selectedStatus}
              onChange={(event) => {
                setSelectedStatus(event.target.value as MaintenanceStatus);
                setStatusError("");
                setStatusSuccess("");
              }}
              disabled={isUpdatingStatus}
            >
              <option value="Open">Open</option>
              <option value="InProgress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <button
            type="submit"
            className="maintenance-button"
            disabled={isUpdatingStatus || selectedStatus === report.status}
          >
            {isUpdatingStatus ? "Saving status..." : "Save status"}
          </button>
        </form>

        {statusError && (
          <p
            className="maintenance-status-message maintenance-status-message-error"
            role="alert"
          >
            {statusError}
          </p>
        )}
        {statusSuccess && (
          <p
            className="maintenance-status-message maintenance-status-message-success"
            role="status"
          >
            {statusSuccess}
          </p>
        )}
      </section>

      <section className="maintenance-detail-card">
        <h2>Report Information</h2>
        <dl className="maintenance-detail-grid">
          <div className="maintenance-detail-field">
            <dt>Report ID</dt>
            <dd className="maintenance-detail-uuid">{report.id}</dd>
          </div>

          <div className="maintenance-detail-field">
            <dt>Aircraft</dt>
            <dd>
              {aircraftTailNumber ??
                (aircraftNameLoading ? "Loading aircraft..." : "Aircraft unavailable")}
            </dd>
          </div>

          <div className="maintenance-detail-field">
            <dt>Reported By</dt>
            <dd>{displayUserName(report.reported_by)}</dd>
          </div>

          <div className="maintenance-detail-field">
            <dt>Assigned To</dt>
            <dd>{displayUserName(report.assigned_to)}</dd>
          </div>

          <div className="maintenance-detail-field">
            <dt>Reported At</dt>
            <dd>{formatDate(report.reported_at)}</dd>
          </div>

          <div className="maintenance-detail-field">
            <dt>Completed At</dt>
            <dd>{formatDate(report.completed_at)}</dd>
          </div>
        </dl>
      </section>

      <section className="maintenance-detail-card">
        <h2>Description</h2>
        <p className="maintenance-detail-description">
          {report.description || "No description provided."}
        </p>
      </section>
    </section>
  );
}

export default MaintenanceReportDetails;
