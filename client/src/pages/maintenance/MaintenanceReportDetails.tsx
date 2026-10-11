
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Link, useParams } from "react-router";

import {
  getMaintenanceReportById,
  updateMaintenanceReportStatus,
} from "../../services/maintenanceService";

import type {
  MaintenancePriority,
  MaintenanceReport,
  MaintenanceStatus,
} from "../../types/maintenance";

import "./MaintenanceReportDetails.css";

function formatDate(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

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

    const data = error.response.data as
      | { detail?: unknown }
      | undefined;

    if (
      typeof data?.detail === "string" &&
      data.detail.trim()
    ) {
      return data.detail;
    }

    return `Request failed. HTTP status: ${error.response.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

function MaintenanceReportDetails() {
  const { reportId } = useParams();

  const [report, setReport] =
    useState<MaintenanceReport | null>(null);

  const [selectedStatus, setSelectedStatus] =
    useState<MaintenanceStatus>("Open");

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] =
    useState(false);

  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadReport(): Promise<void> {
      setIsLoading(true);
      setIsNotFound(false);
      setErrorMessage("");
      setReport(null);

      if (!reportId) {
        setIsNotFound(true);
        setIsLoading(false);
        return;
      }

      try {
        const result = await getMaintenanceReportById(reportId);

        if (!isActive) {
          return;
        }

        if (!result) {
          setIsNotFound(true);
          return;
        }

        setReport(result);
        setSelectedStatus(result.status);
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        if (
          isAxiosError(error) &&
          error.response?.status === 404
        ) {
          setIsNotFound(true);
        } else {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      isActive = false;
    };
  }, [reportId, retryCount]);

  async function handleStatusUpdate(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!report || !reportId) {
      return;
    }

    if (selectedStatus === report.status) {
      setStatusError("Select a different status first.");
      setStatusSuccess("");
      return;
    }

    setIsUpdatingStatus(true);
    setStatusError("");
    setStatusSuccess("");

    try {
      const updatedReport =
        await updateMaintenanceReportStatus(
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
          <span
            className="maintenance-spinner"
            aria-hidden="true"
          />
          <p>Loading maintenance report...</p>
        </div>
      </section>
    );
  }

  if (isNotFound) {
    return (
      <section className="maintenance-detail-page">
        <Link
          className="maintenance-back-link"
          to="/app/maintenance"
        >
          ← Back to Maintenance Reports
        </Link>

        <div className="maintenance-detail-state">
          <h1>Report not found</h1>
          <p>
            The requested maintenance report does not exist or
            is no longer available.
          </p>
        </div>
      </section>
    );
  }

  if (errorMessage || !report) {
    return (
      <section className="maintenance-detail-page">
        <Link
          className="maintenance-back-link"
          to="/app/maintenance"
        >
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
      <Link
        className="maintenance-back-link"
        to="/app/maintenance"
      >
        ← Back to Maintenance Reports
      </Link>

      <div className="page-heading maintenance-detail-heading">
        <p className="page-eyebrow">Maintenance Report</p>

        <h1>{report.title}</h1>

        <p className="page-description">
          Review the report description, priority, status and
          associated aircraft.
        </p>
      </div>

      <div className="maintenance-detail-summary">
        <div>
          <span className="maintenance-detail-label">
            Priority
          </span>

          <span
            className={`maintenance-priority priority-${report.priority.toLowerCase()}`}
          >
            {report.priority as MaintenancePriority}
          </span>
        </div>

        <div>
          <span className="maintenance-detail-label">
            Current Status
          </span>

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
            <p>
              Change the status as the maintenance work progresses.
            </p>
          </div>
        </div>

        <form
          className="maintenance-status-form"
          onSubmit={handleStatusUpdate}
        >
          <div className="maintenance-status-control">
            <label htmlFor="maintenance-report-status">
              New status
            </label>

            <select
              id="maintenance-report-status"
              value={selectedStatus}
              onChange={(event) => {
                setSelectedStatus(
                  event.target.value as MaintenanceStatus,
                );
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
            disabled={
              isUpdatingStatus ||
              selectedStatus === report.status
            }
          >
            {isUpdatingStatus
              ? "Saving status..."
              : "Save status"}
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
            <dd className="maintenance-detail-uuid">
              {report.id}
            </dd>
          </div>

          <div className="maintenance-detail-field">
            <dt>Aircraft ID</dt>
            <dd className="maintenance-detail-uuid">
              {report.aircraft_id}
            </dd>
          </div>

          <div className="maintenance-detail-field">
            <dt>Reported By</dt>
            <dd className="maintenance-detail-uuid">
              {report.reported_by}
            </dd>
          </div>

          <div className="maintenance-detail-field">
            <dt>Assigned To</dt>
            <dd className="maintenance-detail-uuid">
              {report.assigned_to ?? "Unassigned"}
            </dd>
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
