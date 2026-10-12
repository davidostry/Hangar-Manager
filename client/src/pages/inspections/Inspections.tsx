import { useEffect, useState } from "react";
import { isAxiosError } from "axios";

import { getInspections } from "../../services/inspectionService";

import type {
  Inspection,
  InspectionStatus,
} from "../../types/inspection";

import "./Inspections.css";

type StatusFilter = InspectionStatus | "All";

const PAGE_SIZE = 10;

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot connect to the Backend. Check that the server is running.";
    }

    const data = error.response.data as
      | { detail?: unknown }
      | undefined;

    const detail = data?.detail;

    if (typeof detail === "string" && detail.trim()) {
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

    return `Failed to load inspections. HTTP status: ${error.response.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    ...(value.includes("T")
      ? { timeStyle: "short" as const }
      : {}),
  }).format(date);
}

function formatStatus(status: InspectionStatus): string {
  switch (status) {
    case "Scheduled":
      return "Scheduled";
    case "Completed":
      return "Completed";
    case "Cancelled":
      return "Cancelled";
  }
}

function Inspections() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [total, setTotal] = useState(0);

  const [status, setStatus] = useState<StatusFilter>("All");
  const [dueAfter, setDueAfter] = useState("");
  const [dueBefore, setDueBefore] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const hasInvalidDateRange =
    Boolean(dueAfter) &&
    Boolean(dueBefore) &&
    dueAfter > dueBefore;

  useEffect(() => {
    let isActive = true;

    async function loadInspections(): Promise<void> {
      setIsLoading(true);
      setErrorMessage("");

      if (hasInvalidDateRange) {
        setInspections([]);
        setTotal(0);
        setErrorMessage(
          "'Due after' must be earlier than or equal to 'Due before'.",
        );
        setIsLoading(false);
        return;
      }

      try {
        const result = await getInspections({
          status: status === "All" ? undefined : status,
          due_after: dueAfter || undefined,
          due_before: dueBefore || undefined,
          overdue: overdueOnly ? true : undefined,
          page,
          page_size: PAGE_SIZE,
        });

        if (!isActive) {
          return;
        }

        setInspections(result.items);
        setTotal(result.total);
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        setInspections([]);
        setTotal(0);
        setErrorMessage(getErrorMessage(error));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadInspections();

    return () => {
      isActive = false;
    };
  }, [
    status,
    dueAfter,
    dueBefore,
    overdueOnly,
    page,
    retryCount,
    hasInvalidDateRange,
  ]);

  function handleStatusChange(value: string): void {
    if (
      value === "All" ||
      value === "Scheduled" ||
      value === "Completed" ||
      value === "Cancelled"
    ) {
      setStatus(value);
      setPage(1);
    }
  }

  function handleClearFilters(): void {
    setStatus("All");
    setDueAfter("");
    setDueBefore("");
    setOverdueOnly(false);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="inspections-page">
      <div className="page-heading">
        <p className="page-eyebrow">Compliance & Safety</p>

        <h1>Inspections</h1>

        <p className="page-description">
          Monitor scheduled inspections and review their completion status.
        </p>
      </div>

      <section
        className="inspections-toolbar"
        aria-label="Inspection filters"
      >
        <div className="inspection-filter">
          <label htmlFor="inspection-status">Status</label>

          <select
            id="inspection-status"
            value={status}
            onChange={(event) =>
              handleStatusChange(event.target.value)
            }
          >
            <option value="All">All statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="inspection-filter">
          <label htmlFor="inspection-due-after">Due after</label>

          <input
            id="inspection-due-after"
            type="date"
            value={dueAfter}
            max={dueBefore || undefined}
            onChange={(event) => {
              setDueAfter(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="inspection-filter">
          <label htmlFor="inspection-due-before">Due before</label>

          <input
            id="inspection-due-before"
            type="date"
            value={dueBefore}
            min={dueAfter || undefined}
            onChange={(event) => {
              setDueBefore(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <label className="inspection-overdue-filter">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(event) => {
              setOverdueOnly(event.target.checked);
              setPage(1);
            }}
          />

          <span>Overdue only</span>
        </label>

        <button
          type="button"
          className="inspection-button inspection-button-secondary"
          onClick={handleClearFilters}
        >
          Clear filters
        </button>
      </section>

      {overdueOnly && (
        <p className="inspection-filter-note">
          Showing inspections identified as overdue by the Backend.
        </p>
      )}

      {isLoading && (
        <div className="inspection-state" role="status">
          <span className="inspection-spinner" aria-hidden="true" />
          <p>Loading inspections...</p>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="inspection-state inspection-state-error">
          <h2>Unable to load inspections</h2>

          <p role="alert">{errorMessage}</p>

          {!hasInvalidDateRange && (
            <button
              type="button"
              className="inspection-button"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Try again
            </button>
          )}
        </div>
      )}

      {!isLoading &&
        !errorMessage &&
        inspections.length === 0 && (
          <div className="inspection-state">
            <h2>No inspections found</h2>

            <p>
              Try changing the status, date range, or overdue filter.
            </p>
          </div>
        )}

      {!isLoading &&
        !errorMessage &&
        inspections.length > 0 && (
          <>
            <div className="inspections-table-wrapper">
              <table className="inspections-table">
                <thead>
                  <tr>
                    <th scope="col">Inspection</th>
                    <th scope="col">Aircraft ID</th>
                    <th scope="col">Due Date</th>
                    <th scope="col">Status</th>
                    <th scope="col">Completed At</th>
                    <th scope="col">Notes</th>
                  </tr>
                </thead>

                <tbody>
                  {inspections.map((inspection) => (
                    <tr key={inspection.id}>
                      <td>
                        <div className="inspection-name">
                          {inspection.inspection_type}
                        </div>

                        <div
                          className="inspection-id"
                          title={inspection.id}
                        >
                          {inspection.id.slice(0, 8)}
                        </div>
                      </td>

                      <td>
                        <span
                          className="inspection-uuid"
                          title={inspection.aircraft_id}
                        >
                          {inspection.aircraft_id.slice(0, 8)}
                        </span>
                      </td>

                      <td>{formatDate(inspection.due_date)}</td>

                      <td>
                        <span
                          className={`inspection-status status-${inspection.status.toLowerCase()}`}
                        >
                          {formatStatus(inspection.status)}
                        </span>
                      </td>

                      <td>{formatDate(inspection.completed_at)}</td>

                      <td>
                        <span className="inspection-notes">
                          {inspection.notes || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="inspections-pagination">
              <p>
                Showing {inspections.length} of {total} inspections
              </p>

              <div className="inspections-pagination-controls">
                <button
                  type="button"
                  className="inspection-button inspection-button-secondary"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                >
                  Previous
                </button>

                <span>
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  className="inspection-button inspection-button-secondary"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1),
                    )
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
    </section>
  );
}

export default Inspections;