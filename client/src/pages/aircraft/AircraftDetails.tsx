
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Link, useNavigate, useParams } from "react-router";
import { useAuth } from "../../context/AuthContext";

import { deleteAircraft, getAircraftById } from "../../services/aircraftService";

import type {
  Aircraft,
  AircraftStatus,
} from "../../types/aircraft";

import "./AircraftDetails.css";

// ========================================
// DATE FORMATTING
// ========================================

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

// ========================================
// AIRCRAFT STATUS
// ========================================

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

// ========================================
// ERROR HANDLING
// ========================================

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

    return `Failed to load aircraft. HTTP status: ${error.response.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

// ========================================
// AIRCRAFT DETAILS PAGE
// ========================================

function AircraftDetails() {
  // Aircraft UUID from the URL
  // Used for API requests, not displayed to the user
  const { aircraftId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageAircraft = user?.role === "admin" || user?.role === "hangar_manager";

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [aircraft, setAircraft] = useState<Aircraft | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // ========================================
  // LOAD AIRCRAFT
  // ========================================

  useEffect(() => {
    let isActive = true;

    async function loadAircraft(): Promise<void> {
      setIsLoading(true);
      setAircraft(null);
      setIsNotFound(false);
      setErrorMessage("");

      if (!aircraftId) {
        setIsNotFound(true);
        setIsLoading(false);
        return;
      }

      try {
        const result = await getAircraftById(aircraftId);

        if (!isActive) {
          return;
        }

        if (!result) {
          setIsNotFound(true);
          return;
        }

        setAircraft(result);
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

    void loadAircraft();

    return () => {
      isActive = false;
    };
  }, [aircraftId, retryCount]);

  // ========================================
  // DELETE (MANAGERS ONLY)
  // ========================================

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

  // ========================================
  // LOADING
  // ========================================

  if (isLoading) {
    return (
      <section className="aircraft-details-page">
        <div
          className="aircraft-details-state"
          role="status"
        >
          <span
            className="aircraft-spinner"
            aria-hidden="true"
          />

          <p>Loading aircraft details...</p>
        </div>
      </section>
    );
  }

  // ========================================
  // NOT FOUND
  // ========================================

  if (isNotFound) {
    return (
      <section className="aircraft-details-page">
        <Link
          className="aircraft-back-link"
          to="/app/aircraft"
        >
          Back to Aircraft
        </Link>

        <div className="aircraft-details-state">
          <h1>Aircraft not found</h1>

          <p>
            The requested aircraft does not exist
            or is no longer available.
          </p>
        </div>
      </section>
    );
  }

  // ========================================
  // ERROR
  // ========================================

  if (!aircraft || errorMessage) {
    return (
      <section className="aircraft-details-page">
        <Link
          className="aircraft-back-link"
          to="/app/aircraft"
        >
          Back to Aircraft
        </Link>

        <div className="aircraft-details-state aircraft-state-error">
          <h1>Unable to load aircraft</h1>

          <p role="alert">
            {errorMessage || "An unexpected error occurred."}
          </p>

          <button
            type="button"
            className="aircraft-button"
            onClick={() =>
              setRetryCount((current) => current + 1)
            }
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  // ========================================
  // AIRCRAFT INFORMATION
  // ========================================

  return (
    <section className="aircraft-details-page">
      <Link
        className="aircraft-back-link"
        to="/app/aircraft"
      >
        Back to Aircraft
      </Link>

      {/* PAGE HEADER */}
      <div className="page-heading">
        <p className="page-eyebrow">
          Fleet Management
        </p>

        {/* Display tail number instead of UUID */}
        <h1>{aircraft.tail_number}</h1>

        <p className="page-description">
          {aircraft.manufacturer} {aircraft.model}
        </p>

        {canManageAircraft && (
          <div className="aircraft-row-actions">
            <Link
              to={`/app/aircraft/${aircraft.id}/edit`}
              className="aircraft-button"
            >
              Edit Aircraft
            </Link>
            <button
              type="button"
              className="aircraft-button aircraft-button-secondary"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Aircraft"}
            </button>
          </div>
        )}
        {deleteError && (
          <p role="alert">{deleteError}</p>
        )}
      </div>

      {/* AIRCRAFT DETAILS CARD */}
      <section className="aircraft-details-card">
        <div className="aircraft-details-card-heading">
          <div>
            <h2>Aircraft Information</h2>

            <p>
              Current aircraft details and operational status.
            </p>
          </div>

          <span
            className={`aircraft-status-badge status-${aircraft.status.toLowerCase()}`}
          >
            {formatStatus(aircraft.status)}
          </span>
        </div>

        <dl className="aircraft-details-grid">
          <div className="aircraft-detail-field">
            <dt>Tail Number</dt>
            <dd>{aircraft.tail_number}</dd>
          </div>

          <div className="aircraft-detail-field">
            <dt>Manufacturer</dt>
            <dd>{aircraft.manufacturer}</dd>
          </div>

          <div className="aircraft-detail-field">
            <dt>Model</dt>
            <dd>{aircraft.model}</dd>
          </div>

          <div className="aircraft-detail-field">
            <dt>Serial Number</dt>
            <dd>{aircraft.serial_number}</dd>
          </div>

          <div className="aircraft-detail-field">
            <dt>Manufacture Year</dt>
            <dd>{aircraft.manufacture_year}</dd>
          </div>

          <div className="aircraft-detail-field">
            <dt>Created At</dt>
            <dd>{formatDate(aircraft.created_at)}</dd>
          </div>

          <div className="aircraft-detail-field">
            <dt>Last Updated</dt>
            <dd>{formatDate(aircraft.updated_at)}</dd>
          </div>
        </dl>
      </section>
    </section>
  );
}

export default AircraftDetails;
