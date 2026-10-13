import { useEffect, useState } from "react";

import { isAxiosError } from "axios";

import { Link } from "react-router";
import {
  AlertCircle,
  Ban,
  CalendarCheck2,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  LoaderCircle,
  Plane,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import api from "../../services/api";

import {

  getInspections,

  updateInspectionStatus,

} from "../../services/inspectionService";

import type {

  Inspection,

  InspectionStatus,

} from "../../types/inspection";

import "./Inspections.css";

// The aircraft endpoint returns a list. Support both an array and { items: [] }.

function isRecord(value: unknown): value is Record<string, unknown> {

  return typeof value === "object" && value !== null && !Array.isArray(value);

}

function parseAircraftTailNumbers(data: unknown): Record<string, string> {

  const items: unknown[] = Array.isArray(data)

    ? data

    : isRecord(data) && Array.isArray(data.items)

      ? data.items

      : [];

  const result: Record<string, string> = {};

  for (const item of items) {

    if (

      isRecord(item) &&

      typeof item.id === "string" &&

      typeof item.tail_number === "string" &&

      item.tail_number.trim()

    ) {

      result[item.id] = item.tail_number;

    }

  }

  return result;

}

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

    return `Request failed. HTTP status: ${error.response.status}.`;

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

  const { user } = useAuth();

  const canManageInspections = user?.role === "admin" || user?.role === "hangar_manager";

  const [inspections, setInspections] = useState<Inspection[]>([]);

  // Aircraft IDs are used internally; registration numbers are displayed.

  const [aircraftTailNumbers, setAircraftTailNumbers] =

    useState<Record<string, string>>({});

  const [loadingAircraftNames, setLoadingAircraftNames] = useState(true);

  const [total, setTotal] = useState(0);

  const [status, setStatus] = useState<StatusFilter>("All");

  const [dueAfter, setDueAfter] = useState("");

  const [dueBefore, setDueBefore] = useState("");

  const [overdueOnly, setOverdueOnly] = useState(false);

  const [page, setPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  const [updatingInspectionId, setUpdatingInspectionId] =

    useState<string | null>(null);

  const [actionError, setActionError] = useState("");

  const [actionSuccess, setActionSuccess] = useState("");

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {

    let isActive = true;

    async function loadAircraftTailNumbers(): Promise<void> {

      setLoadingAircraftNames(true);

      try {

        const response = await api.get<unknown>("/aircraft");

        if (isActive) {

          setAircraftTailNumbers(parseAircraftTailNumbers(response.data));

        }

      } catch {

        if (isActive) {

          setAircraftTailNumbers({});

        }

      } finally {

        if (isActive) {

          setLoadingAircraftNames(false);

        }

      }

    }

    void loadAircraftTailNumbers();

    return () => {

      isActive = false;

    };

  }, []);

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

  async function handleUpdateStatus(

    inspection: Inspection,

    newStatus: InspectionStatus,

  ): Promise<void> {

    if (updatingInspectionId) {

      return;

    }

    let completionNotes: string | undefined;

    if (newStatus === "Completed") {

      const input = window.prompt("Enter inspection completion notes (required):", "Inspection completed successfully.");

      if (input === null) return;

      completionNotes = input.trim();

      if (!completionNotes) {

        setActionError("Completion notes are required.");

        return;

      }

    }

    if (newStatus === "Cancelled" && !window.confirm("Cancel this inspection?")) return;

    setUpdatingInspectionId(inspection.id);

    setActionError("");

    setActionSuccess("");

    try {

      const updated = await updateInspectionStatus(inspection.id, newStatus, completionNotes);

      if (updated.status !== newStatus) throw new Error("Inspection status was not updated.");

      setActionSuccess(

        newStatus === "Completed"

          ? "Inspection marked as completed."

          : "Inspection cancelled successfully.",

      );

      setRetryCount((count) => count + 1);

    } catch (error: unknown) {

      setActionError(

        `Could not update the inspection. ${getErrorMessage(error)}`,

      );

    } finally {

      setUpdatingInspectionId(null);

    }

  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="hm-inspect-page">
      {/* Premium page heading, consistent with the aircraft and maintenance screens */}
      <header className="hm-inspect-hero">
        <div className="hm-inspect-hero-content">
          <div className="hm-inspect-eyebrow">
            <span className="hm-inspect-pulse" aria-hidden="true" />
            COMPLIANCE &amp; SAFETY / INSPECTION REGISTER
          </div>
          <p className="hm-inspect-kicker">AIRWORTHINESS OPERATIONS</p>
          <h1>Inspections</h1>
          <p className="hm-inspect-hero-description">
            Monitor scheduled inspections, track due dates and keep your fleet compliant.
          </p>
          <div className="hm-inspect-hero-footer">
            <span className="hm-inspect-hero-note">
              <ShieldCheck size={18} aria-hidden="true" /> Aircraft safety &amp; compliance
            </span>
            {canManageInspections && (
              <Link to="/app/inspections/new" className="hm-inspect-create">
                <Plus size={19} aria-hidden="true" /> Add Inspection
              </Link>
            )}
          </div>
        </div>
        <ClipboardCheck className="hm-inspect-hero-watermark" size={235} strokeWidth={0.7} aria-hidden="true" />
      </header>

      {/* Filters retain the original server-side status, date and overdue behavior. */}
      <section className="hm-inspect-toolbar" aria-label="Inspection filters">
        <div className="hm-inspect-filter hm-inspect-filter--status">
          <label htmlFor="inspection-status">
            <SlidersHorizontal size={17} aria-hidden="true" /> Status
          </label>
          <select
            id="inspection-status"
            value={status}
            onChange={(event) => handleStatusChange(event.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="hm-inspect-filter hm-inspect-filter--date">
          <label htmlFor="inspection-due-after">
            <CalendarDays size={17} aria-hidden="true" /> Due after
          </label>
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

        <div className="hm-inspect-filter hm-inspect-filter--date">
          <label htmlFor="inspection-due-before">
            <CalendarDays size={17} aria-hidden="true" /> Due before
          </label>
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

        <label className="hm-inspect-overdue">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(event) => {
              setOverdueOnly(event.target.checked);
              setPage(1);
            }}
          />
          <span className="hm-inspect-overdue-text">
            <Clock3 size={17} aria-hidden="true" /> Overdue only
          </span>
        </label>

        <button
          type="button"
          className="hm-inspect-clear"
          onClick={handleClearFilters}
        >
          <X size={17} aria-hidden="true" /> Clear filters
        </button>
      </section>

      {actionError && (
        <div className="hm-inspect-feedback hm-inspect-feedback--error" role="alert">
          <AlertCircle size={19} aria-hidden="true" /> {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="hm-inspect-feedback hm-inspect-feedback--success" role="status">
          <CheckCheck size={19} aria-hidden="true" /> {actionSuccess}
        </div>
      )}
      {overdueOnly && (
        <p className="hm-inspect-filter-note">
          <Clock3 size={16} aria-hidden="true" />
          Showing inspections identified as overdue by the Backend.
        </p>
      )}

      {!isLoading && !errorMessage && (
        <div className="hm-inspect-register-heading">
          <div>
            <span className="hm-inspect-section-eyebrow">OPERATIONS OVERVIEW</span>
            <h2>Inspection Register</h2>
            <p>Aircraft inspections and their current completion status.</p>
          </div>
          <span className="hm-inspect-total">
            <ClipboardList size={17} aria-hidden="true" />
            {total} {total === 1 ? "inspection" : "inspections"}
          </span>
        </div>
      )}

      {isLoading && (
        <div className="hm-inspect-state" role="status">
          <LoaderCircle className="hm-inspect-spinner" size={34} aria-hidden="true" />
          <p>Loading inspections...</p>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="hm-inspect-state hm-inspect-state--error">
          <AlertCircle size={34} aria-hidden="true" />
          <h2>Unable to load inspections</h2>
          <p role="alert">{errorMessage}</p>
          {!hasInvalidDateRange && (
            <button
              type="button"
              className="hm-inspect-retry"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              <RotateCcw size={17} aria-hidden="true" /> Try again
            </button>
          )}
        </div>
      )}

      {!isLoading && !errorMessage && inspections.length === 0 && (
        <div className="hm-inspect-state">
          <ClipboardCheck size={36} aria-hidden="true" />
          <h2>No inspections found</h2>
          <p>Try changing the status, date range or overdue filter.</p>
          <button type="button" className="hm-inspect-retry" onClick={handleClearFilters}>
            <RotateCcw size={17} aria-hidden="true" /> Clear filters
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && inspections.length > 0 && (
        <>
          <div className="hm-inspect-table-wrap">
            <table className="hm-inspect-table">
              <caption className="hm-inspect-sr-only">Inspections in the fleet</caption>
              <thead>
                <tr>
                  <th scope="col">Inspection</th>
                  <th scope="col">Aircraft</th>
                  <th scope="col">Due date</th>
                  <th scope="col">Status</th>
                  <th scope="col">Completed at</th>
                  <th scope="col">Notes</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((inspection) => {
                  const isUpdating = updatingInspectionId === inspection.id;
                  const tailNumber = inspection.aircraft_tail_number ||
                    aircraftTailNumbers[inspection.aircraft_id] ||
                    (loadingAircraftNames ? "Loading aircraft..." : "Aircraft unavailable");

                  return (
                    <tr key={inspection.id}>
                      <td data-label="Inspection">
                        <div className="hm-inspect-type">
                          <ClipboardCheck size={17} aria-hidden="true" />
                          <span>{inspection.inspection_type}</span>
                        </div>
                        <span className="hm-inspect-id" title={inspection.id}>
                          #{inspection.id.slice(0, 8)}
                        </span>
                      </td>
                      <td data-label="Aircraft">
                        <span className="hm-inspect-aircraft" title={tailNumber}>
                          <Plane size={17} aria-hidden="true" /> {tailNumber}
                        </span>
                      </td>
                      <td data-label="Due date">
                        <span className="hm-inspect-date">
                          <CalendarDays size={16} aria-hidden="true" />
                          {formatDate(inspection.due_date)}
                        </span>
                      </td>
                      <td data-label="Status">
                        <span className={`hm-inspect-status hm-inspect-status--${inspection.status.toLowerCase()}`}>
                          {formatStatus(inspection.status)}
                        </span>
                      </td>
                      <td data-label="Completed at">
                        <span className="hm-inspect-date">
                          <CalendarCheck2 size={16} aria-hidden="true" />
                          {formatDate(inspection.completed_at)}
                        </span>
                      </td>
                      <td data-label="Notes">
                        <span className="hm-inspect-notes" title={inspection.notes || undefined}>
                          {inspection.notes || "—"}
                        </span>
                      </td>
                      <td data-label="Actions">
                        {inspection.status === "Scheduled" ? (
                          <div className="hm-inspect-actions">
                            <button
                              type="button"
                              className="hm-inspect-action hm-inspect-action--complete"
                              disabled={Boolean(updatingInspectionId)}
                              onClick={() => void handleUpdateStatus(inspection, "Completed")}
                            >
                              <CheckCheck size={16} aria-hidden="true" />
                              {isUpdating ? "Saving..." : "Complete"}
                            </button>
                            {canManageInspections && (
                              <button
                                type="button"
                                className="hm-inspect-action hm-inspect-action--cancel"
                                disabled={Boolean(updatingInspectionId)}
                                onClick={() => void handleUpdateStatus(inspection, "Cancelled")}
                              >
                                <Ban size={16} aria-hidden="true" /> Cancel
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="hm-inspect-no-actions">No actions</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="hm-inspect-pagination">
            <p>Showing <strong>{inspections.length}</strong> of <strong>{total}</strong> inspections</p>
            <div className="hm-inspect-page-controls">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft size={17} aria-hidden="true" /> Previous
              </button>
              <span>Page <strong>{page}</strong> of {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next <ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default Inspections;
