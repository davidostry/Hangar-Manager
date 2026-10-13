
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router";

import {
  Plane,
  Wrench,
  ClipboardCheck,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

import { getDashboardSummary } from "../services/dashboardService";

import type { DashboardSummary } from "../types/dashboard";
import type { AircraftStatus } from "../types/aircraft";

import "./Dashboard.css";

// ========================================
// CONSTANTS
// ========================================

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

const AIRCRAFT_STATUSES: {
  status: AircraftStatus;
  label: string;
  description: string;
}[] = [
  {
    status: "Available",
    label: "Available",
    description: "Ready for operation",
  },
  {
    status: "Maintenance",
    label: "Maintenance",
    description: "Under maintenance",
  },
  {
    status: "Inspection",
    label: "Inspection",
    description: "Under inspection",
  },
  {
    status: "Grounded",
    label: "Grounded",
    description: "Not available for operation",
  },
];

// ========================================
// HELPERS
// ========================================

function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(value);
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

    if (Array.isArray(data?.detail)) {
      const messages = data.detail
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

    return `Failed to load dashboard. HTTP status: ${error.response.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred while loading the dashboard.";
}

// ========================================
// DASHBOARD COMPONENT
// ========================================

function Dashboard() {
  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  const [retryCount, setRetryCount] = useState(0);

  // ========================================
  // LOAD DASHBOARD DATA
  // ========================================

  useEffect(() => {
    let isActive = true;

    async function loadDashboard(): Promise<void> {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getDashboardSummary();

        if (!isActive) {
          return;
        }

        setSummary(result);
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        setSummary(null);
        setErrorMessage(getErrorMessage(error));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [retryCount]);

  function handleRetry(): void {
    setRetryCount((current) => current + 1);
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <section className="dashboard-page">
      {/* PAGE HEADER */}
      <div className="page-heading dashboard-page-heading">
        <div>
          <p className="page-eyebrow">
            Fleet Management
          </p>

          <h1>Dashboard</h1>

          <p className="page-description">
            Monitor your aircraft fleet, maintenance activity,
            and inspection status from one place.
          </p>
        </div>
      </div>

      {/* LOADING STATE */}
      {isLoading && (
        <div
          className="dashboard-state"
          role="status"
        >
          <span
            className="dashboard-spinner"
            aria-hidden="true"
          />

          <p>Loading dashboard...</p>
        </div>
      )}

      {/* ERROR STATE */}
      {!isLoading && errorMessage && (
        <div className="dashboard-state dashboard-state-error">
          <h2>Unable to load dashboard</h2>

          <p role="alert">
            {errorMessage}
          </p>

          <button
            type="button"
            className="dashboard-button"
            onClick={handleRetry}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {/* DASHBOARD CONTENT */}
      {!isLoading && !errorMessage && summary && (
        <>
          {/* ========================================
              OVERVIEW STATISTICS
          ======================================== */}

          <div className="dashboard-overview-grid">
            {/* TOTAL AIRCRAFT */}
            <article className="dashboard-overview-card dashboard-overview-primary">
              <div className="dashboard-card-heading">
                <span className="dashboard-card-label">
                  Total Aircraft
                </span>

                <span
                  className="dashboard-card-icon"
                  aria-hidden="true"
                >
                  <Plane size={24} strokeWidth={2} />
                </span>
              </div>

              <strong className="dashboard-card-value">
                {formatNumber(summary.total_aircraft)}
              </strong>

              <p className="dashboard-card-description">
                Aircraft registered in the fleet
              </p>
            </article>

            {/* OPEN MAINTENANCE */}
            <article className="dashboard-overview-card dashboard-overview-maintenance">
              <div className="dashboard-card-heading">
                <span className="dashboard-card-label">
                  Open Maintenance Reports
                </span>

                <span
                  className="dashboard-card-icon dashboard-icon-warning"
                  aria-hidden="true"
                >
                  <Wrench size={23} strokeWidth={2} />
                </span>
              </div>

              <strong className="dashboard-card-value">
                {formatNumber(
                  summary.open_maintenance_reports
                )}
              </strong>

              <p className="dashboard-card-description">
                Reports requiring attention
              </p>
            </article>

            {/* OVERDUE INSPECTIONS */}
            <article className="dashboard-overview-card dashboard-overview-inspections">
              <div className="dashboard-card-heading">
                <span className="dashboard-card-label">
                  Overdue Inspections
                </span>

                <span
                  className="dashboard-card-icon dashboard-icon-danger"
                  aria-hidden="true"
                >
                  <ClipboardCheck size={23} strokeWidth={2} />
                </span>
              </div>

              <strong className="dashboard-card-value">
                {formatNumber(
                  summary.overdue_inspections
                )}
              </strong>

              <p className="dashboard-card-description">
                Inspections past their due date
              </p>
            </article>
          </div>

          {/* ========================================
              FLEET STATUS
          ======================================== */}

          <section
            className="dashboard-status-section"
            aria-labelledby="fleet-status-heading"
          >
            <div className="dashboard-section-heading">
              <div>
                <h2 id="fleet-status-heading">
                  Fleet Status
                </h2>

                <p>
                  Aircraft grouped by their current
                  operational status.
                </p>
              </div>

              <span className="dashboard-total-badge">
                <Plane
                  size={15}
                  aria-hidden="true"
                />

                {formatNumber(summary.total_aircraft)} aircraft
              </span>
            </div>

            {/* STATUS CARDS */}
            <div className="dashboard-status-grid">
              {AIRCRAFT_STATUSES.map((item) => {
                const count =
                  summary.aircraft_by_status[item.status] ?? 0;

                return (
                  <Link
                    key={item.status}
                    to="/app/aircraft"
                    className={`dashboard-status-card dashboard-status-${item.status.toLowerCase()}`}
                    aria-label={`Open aircraft list. ${item.label}: ${formatNumber(count)} aircraft`}
                  >
                    <div className="dashboard-status-card-heading">
                      <span
                        className="dashboard-status-indicator"
                        aria-hidden="true"
                      />

                      <h3>{item.label}</h3>

                      <ArrowUpRight
                        className="dashboard-status-arrow"
                        size={18}
                        aria-hidden="true"
                      />
                    </div>

                    <strong className="dashboard-status-count">
                      {formatNumber(count)}
                    </strong>

                    <p>{item.description}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

export default Dashboard;
