import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Factory,
  FileText,
  Hash,
  Pencil,
  Plane,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { deleteAircraft, getAircraftById } from "../../services/aircraftService";

import type { Aircraft, AircraftStatus } from "../../types/aircraft";

import "./AircraftDetails.css";

// Date formatting stays independent of the page design.
function formatDate(value: string | null): string {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(status: AircraftStatus): string {
  switch (status) {
    case "Available":
      return "Available";
    case "Maintenance":
      return "Maintenance";
    case "Inspection":
      return "Inspection";
    case "Grounded":
      return "Grounded";
    default:
      return status;
  }
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot connect to the Backend. Check that the server is running.";
    }

    const data = error.response.data as { detail?: unknown } | undefined;
    if (typeof data?.detail === "string" && data.detail.trim()) {
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

      if (messages.length > 0) return messages.join(" ");
    }

    return `Failed to load aircraft. HTTP status: ${error.response.status}.`;
  }

  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

// Shared page-level states: loading, not found, and request errors.
function BackToAircraft() {
  return (
    <Link to="/app/aircraft" className="hm-profile-back-link">
      <ArrowLeft size={17} strokeWidth={2} aria-hidden="true" />
      <span>Back to Aircraft</span>
    </Link>
  );
}

function AircraftDetails() {
  const { aircraftId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Keep the exact original access policy for edit and delete.
  const canManageAircraft =
    user?.role === "admin" || user?.role === "hangar_manager";

  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Preserve the existing API request, retry flow, and 404 handling.
  useEffect(() => {
    let isActive = true;

    async function loadAircraft(): Promise<void> {
      setIsLoading(true);
      setAircraft(null);
      setIsNotFound(false);
      setErrorMessage("");
      setDeleteError("");

      if (!aircraftId) {
        setIsNotFound(true);
        setIsLoading(false);
        return;
      }

      try {
        const result = await getAircraftById(aircraftId);
        if (!isActive) return;

        if (!result) {
          setIsNotFound(true);
          return;
        }

        setAircraft(result);
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

    void loadAircraft();
    return () => {
      isActive = false;
    };
  }, [aircraftId, retryCount]);

  // Preserve confirmation before the original delete request.
  async function handleDelete(): Promise<void> {
    if (!canManageAircraft || !aircraft || isDeleting) return;

    const confirmed = window.confirm(
      `Delete aircraft ${aircraft.tail_number}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleteError("");
    setIsDeleting(true);
    try {
      await deleteAircraft(aircraft.id);
      navigate("/app/aircraft", { replace: true });
    } catch (error: unknown) {
      setDeleteError(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <section className="aircraft-details-page">
        <div className="hm-profile-state" role="status">
          <span className="hm-profile-spinner" aria-hidden="true" />
          <h1>Loading aircraft profile</h1>
          <p>Retrieving the latest fleet information...</p>
        </div>
      </section>
    );
  }

  if (isNotFound) {
    return (
      <section className="aircraft-details-page">
        <BackToAircraft />
        <div className="hm-profile-state">
          <Plane size={36} strokeWidth={1.6} aria-hidden="true" />
          <h1>Aircraft not found</h1>
          <p>
            The requested aircraft does not exist or is no longer available.
          </p>
        </div>
      </section>
    );
  }

  if (!aircraft || errorMessage) {
    return (
      <section className="aircraft-details-page">
        <BackToAircraft />
        <div className="hm-profile-state hm-profile-state--error">
          <h1>Unable to load aircraft</h1>
          <p role="alert">
            {errorMessage || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            className="hm-profile-btn hm-profile-btn--primary"
            onClick={() => setRetryCount((current) => current + 1)}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="aircraft-details-page">
      <BackToAircraft />

      {/* Aircraft identity: all values come from the existing API response. */}
      <header className="hm-profile-hero">
        <div className="hm-profile-hero-decor" aria-hidden="true">
          <Plane size={190} strokeWidth={0.75} />
        </div>

        <div className="hm-profile-hero-content">
          <div className="hm-profile-eyebrow">
            <span className="hm-profile-live-dot" aria-hidden="true" />
            Fleet Operations / Aircraft Profile
          </div>

          <div className="hm-profile-hero-heading">
            <div className="hm-profile-hero-title">
              <p className="hm-profile-hero-label">TAIL NUMBER</p>
              <h1>{aircraft.tail_number}</h1>
              <p className="hm-profile-hero-subtitle">
                {aircraft.manufacturer} <span aria-hidden="true">·</span>{" "}
                {aircraft.model}
              </p>
            </div>

            <span
              className={`hm-profile-status hm-profile-status--${aircraft.status.toLowerCase()}`}
              aria-label={`Operational status: ${formatStatus(aircraft.status)}`}
            >
              <span className="hm-profile-status-dot" aria-hidden="true" />
              {formatStatus(aircraft.status)}
            </span>
          </div>

          <div className="hm-profile-hero-bottom">
            <span className="hm-profile-hero-caption">
              <ShieldCheck size={17} aria-hidden="true" />
              Aircraft fleet record
            </span>

            {canManageAircraft && (
              <div className="hm-profile-hero-actions">
                <Link
                  to={`/app/aircraft/${aircraft.id}/edit`}
                  className="hm-profile-btn hm-profile-btn--hero"
                >
                  <Pencil size={17} aria-hidden="true" />
                  Edit Aircraft
                </Link>
                <button
                  type="button"
                  className="hm-profile-btn hm-profile-btn--delete"
                  onClick={() => void handleDelete()}
                  disabled={isDeleting}
                  aria-busy={isDeleting}
                >
                  <Trash2 size={17} aria-hidden="true" />
                  {isDeleting ? "Deleting..." : "Delete Aircraft"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {deleteError && (
        <div className="hm-profile-delete-error" role="alert">
          {deleteError}
        </div>
      )}

      {/* No fictional flight logs or maintenance history: only actual fields. */}
      <section className="hm-profile-panel" aria-labelledby="hm-profile-spec-heading">
        <div className="hm-profile-panel-heading">
          <div className="hm-profile-panel-heading-icon">
            <Plane size={21} aria-hidden="true" />
          </div>
          <div>
            <p className="hm-profile-panel-eyebrow">AIRCRAFT PROFILE</p>
            <h2 id="hm-profile-spec-heading">Technical Specifications</h2>
            <p>Identification and manufacturing details</p>
          </div>
          <span className="hm-profile-panel-mark" aria-hidden="true">01 / 02</span>
        </div>

        <dl className="hm-profile-spec-grid">
          <div className="hm-profile-detail-field">
            <dt><Hash size={16} aria-hidden="true" />Tail Number</dt>
            <dd className="hm-profile-detail-field--accent">{aircraft.tail_number}</dd>
          </div>
          <div className="hm-profile-detail-field">
            <dt><Factory size={16} aria-hidden="true" />Manufacturer</dt>
            <dd>{aircraft.manufacturer}</dd>
          </div>
          <div className="hm-profile-detail-field">
            <dt><Plane size={16} aria-hidden="true" />Model</dt>
            <dd>{aircraft.model}</dd>
          </div>
          <div className="hm-profile-detail-field">
            <dt><FileText size={16} aria-hidden="true" />Serial Number</dt>
            <dd>{aircraft.serial_number}</dd>
          </div>
          <div className="hm-profile-detail-field">
            <dt><CalendarDays size={16} aria-hidden="true" />Manufacture Year</dt>
            <dd>{aircraft.manufacture_year}</dd>
          </div>
        </dl>
      </section>

      <section className="hm-profile-panel hm-profile-panel--activity" aria-labelledby="hm-profile-record-heading">
        <div className="hm-profile-panel-heading">
          <div className="hm-profile-panel-heading-icon hm-profile-panel-heading-icon--teal">
            <Clock3 size={21} aria-hidden="true" />
          </div>
          <div>
            <p className="hm-profile-panel-eyebrow">RECORD INFORMATION</p>
            <h2 id="hm-profile-record-heading">Record Timeline</h2>
            <p>When this aircraft record was created and updated</p>
          </div>
          <span className="hm-profile-panel-mark" aria-hidden="true">02 / 02</span>
        </div>

        <dl className="hm-profile-timeline-grid">
          <div className="hm-profile-timeline-item">
            <div className="hm-profile-timeline-icon"><CalendarDays size={19} aria-hidden="true" /></div>
            <div>
              <dt>Created At</dt>
              <dd>{formatDate(aircraft.created_at)}</dd>
            </div>
          </div>
          <div className="hm-profile-timeline-item">
            <div className="hm-profile-timeline-icon"><RefreshCw size={19} aria-hidden="true" /></div>
            <div>
              <dt>Last Updated</dt>
              <dd>{formatDate(aircraft.updated_at)}</dd>
            </div>
          </div>
        </dl>
      </section>
    </section>
  );
}

export default AircraftDetails;
