import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { isAxiosError } from "axios";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Plane,
  Pencil,
  Factory,
  Wrench,
  Hash,
  CalendarDays,
  Clock3,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Info,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getAircraftById } from "../../services/aircraftService";
import type { Aircraft, AircraftStatus } from "../../types/aircraft";
import "./AircraftDetails.css";

// ----------------------------------------
// Helpers
// ----------------------------------------

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function displayText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }
  return String(value);
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot connect to the Backend. Check that the server is running.";
    }

    const data: unknown = error.response.data;

    if (typeof data === "object" && data !== null && "detail" in data) {
      const detail = data.detail;

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

        if (messages.length > 0) return messages.join(" ");
      }
    }

    return `Failed to load aircraft. HTTP ${error.response.status}.`;
  }

  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

type StatusInfo = {
  label: string;
  description: string;
  cssName: string;
};

const STATUS_CONFIG: Record<AircraftStatus, StatusInfo> = {
  Available: {
    label: "Available",
    description: "Ready for operation",
    cssName: "available",
  },
  Maintenance: {
    label: "Maintenance",
    description: "Under maintenance",
    cssName: "maintenance",
  },
  Inspection: {
    label: "Inspection",
    description: "Under inspection",
    cssName: "inspection",
  },
  Grounded: {
    label: "Grounded",
    description: "Not available for operation",
    cssName: "grounded",
  },
};

// Backend data is checked at runtime: TypeScript types do not validate API values.
function getStatusInfo(value: unknown): StatusInfo {
  if (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(STATUS_CONFIG, value)
  ) {
    return STATUS_CONFIG[value as AircraftStatus];
  }

  return {
    label: typeof value === "string" && value.trim() ? value : "Unknown",
    description: "Operational status is unavailable",
    cssName: "unknown",
  };
}

function isAircraftRecord(value: unknown): value is Aircraft {
  return (
    typeof value === "object" &&
    value !== null &&
    "tail_number" in value &&
    typeof value.tail_number === "string"
  );
}

interface DetailFieldProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}

function DetailField({ icon, label, value }: DetailFieldProps) {
  return (
    <div className="ad-field">
      <dt className="ad-field-label">
        <span className="ad-field-icon" aria-hidden="true">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="ad-field-value">{value}</dd>
    </div>
  );
}

function BackToAircraft() {
  return (
    <Link to="/app/aircraft" className="ad-back-link">
      <ArrowLeft size={17} aria-hidden="true" />
      Back to Aircraft
    </Link>
  );
}

// ----------------------------------------
// Page
// ----------------------------------------

function AircraftDetails() {
  const { aircraftId } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

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
        const result: unknown = await getAircraftById(aircraftId);
        if (!isActive) return;

        if (result === null || result === undefined) {
          setIsNotFound(true);
          return;
        }

        if (!isAircraftRecord(result)) {
          setErrorMessage("The server returned an invalid aircraft record.");
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

  function handleRetry(): void {
    setRetryCount((current) => current + 1);
  }

  if (isLoading) {
    return (
      <section className="ad-page">
        <div className="ad-state" role="status">
          <span className="ad-spinner" aria-hidden="true" />
          <h2>Loading aircraft</h2>
          <p>Retrieving aircraft information...</p>
        </div>
      </section>
    );
  }

  if (isNotFound) {
    return (
      <section className="ad-page">
        <BackToAircraft />
        <div className="ad-state">
          <AlertCircle size={38} className="ad-state-icon" aria-hidden="true" />
          <h1>Aircraft not found</h1>
          <p>This aircraft does not exist or is no longer available.</p>
        </div>
      </section>
    );
  }

  if (errorMessage || !aircraft) {
    return (
      <section className="ad-page">
        <BackToAircraft />
        <div className="ad-state ad-state-error">
          <AlertCircle size={38} aria-hidden="true" />
          <h1>Unable to load aircraft</h1>
          <p role="alert">{errorMessage || "An unexpected error occurred."}</p>
          <button
            type="button"
            className="ad-button ad-button-primary"
            onClick={handleRetry}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Try again
          </button>
        </div>
      </section>
    );
  }

  const statusInfo = getStatusInfo(aircraft.status);
  const statusClass = `ad-status ad-status--${statusInfo.cssName}`;

  return (
    <section className="ad-page">
      <BackToAircraft />

      <header className="ad-hero">
        <Plane
          className="ad-hero-watermark"
          size={180}
          strokeWidth={1}
          aria-hidden="true"
        />

        <div className="ad-hero-content">
          <p className="ad-hero-eyebrow">
            FLEET MANAGEMENT / AIRCRAFT DETAILS
          </p>

          <div className="ad-hero-title-row">
            <span className="ad-hero-plane-icon" aria-hidden="true">
              <Plane size={27} strokeWidth={1.9} />
            </span>
            <div>
              <h1>{displayText(aircraft.tail_number)}</h1>
              <p className="ad-hero-subtitle">
                {displayText(aircraft.manufacturer)} {displayText(aircraft.model)}
              </p>
            </div>
          </div>

          <div className="ad-hero-meta">
            <span className={statusClass}>
              <span className="ad-status-dot" aria-hidden="true" />
              {statusInfo.label}
            </span>
            <span className="ad-hero-description">{statusInfo.description}</span>
          </div>
        </div>

        {isAdmin && aircraftId && (
          <Link
            to={`/app/aircraft/${aircraftId}/edit`}
            className="ad-button ad-button-edit"
          >
            <Pencil size={17} aria-hidden="true" />
            Edit Aircraft
          </Link>
        )}
      </header>

      <section className="ad-card" aria-labelledby="aircraft-information-heading">
        <div className="ad-card-heading">
          <div className="ad-card-heading-copy">
            <div className="ad-section-icon">
              <Info size={21} aria-hidden="true" />
            </div>
            <div>
              <h2 id="aircraft-information-heading">Aircraft Information</h2>
              <p>Technical specifications and registration details.</p>
            </div>
          </div>
          <span className="ad-card-caption">AIRCRAFT RECORD</span>
        </div>

        <dl className="ad-fields-grid">
          <DetailField
            icon={<Plane size={19} />}
            label="Tail Number"
            value={
              <span className="ad-value-highlight">
                {displayText(aircraft.tail_number)}
              </span>
            }
          />
          <DetailField
            icon={<Factory size={19} />}
            label="Manufacturer"
            value={displayText(aircraft.manufacturer)}
          />
          <DetailField
            icon={<Wrench size={19} />}
            label="Model"
            value={displayText(aircraft.model)}
          />
          <DetailField
            icon={<Hash size={19} />}
            label="Serial Number"
            value={displayText(aircraft.serial_number)}
          />
          <DetailField
            icon={<CalendarDays size={19} />}
            label="Manufacture Year"
            value={displayText(aircraft.manufacture_year)}
          />
          <DetailField
            icon={<ShieldCheck size={19} />}
            label="Operational Status"
            value={
              <span className={statusClass}>
                <span className="ad-status-dot" aria-hidden="true" />
                {statusInfo.label}
              </span>
            }
          />
        </dl>
      </section>

      <section
        className="ad-card ad-history-card"
        aria-labelledby="aircraft-history-heading"
      >
        <div className="ad-card-heading">
          <div className="ad-card-heading-copy">
            <div className="ad-section-icon">
              <Clock3 size={21} aria-hidden="true" />
            </div>
            <div>
              <h2 id="aircraft-history-heading">Record History</h2>
              <p>When this aircraft was added and last updated.</p>
            </div>
          </div>
        </div>

        <dl className="ad-fields-grid ad-history-grid">
          <DetailField
            icon={<CalendarDays size={19} />}
            label="Created At"
            value={formatDate(aircraft.created_at)}
          />
          <DetailField
            icon={<Clock3 size={19} />}
            label="Last Updated"
            value={formatDate(aircraft.updated_at)}
          />
        </dl>
      </section>
    </section>
  );
}

export default AircraftDetails;
