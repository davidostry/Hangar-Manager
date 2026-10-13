import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CircleAlert,
  ClipboardList,
  Factory,
  Hash,
  Info,
  LoaderCircle,
  Plane,
  Save,
} from "lucide-react";

import {
  createAircraft,
  getAircraftById,
  updateAircraft,
} from "../../services/aircraftService";
import type { Aircraft, AircraftCreateRequest } from "../../types/aircraft";

import "./AircraftFormPage.css";

interface AircraftFormPageProps {
  mode: "create" | "edit";
}

interface AircraftFormValues {
  tail_number: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  manufacture_year: string;
}

const INITIAL_FORM: AircraftFormValues = {
  tail_number: "",
  manufacturer: "",
  model: "",
  serial_number: "",
  manufacture_year: "",
};

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot connect to the Backend. Check that the server is running.";
    }

    const data = error.response.data as { detail?: unknown } | undefined;
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

      if (messages.length > 0) return messages.join(" ");
      return "Please check the submitted information.";
    }

    if (detail && typeof detail === "object") {
      return JSON.stringify(detail);
    }

    return `The request failed. HTTP status: ${error.response.status}.`;
  }

  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

function toFormValues(aircraft: Aircraft): AircraftFormValues {
  return {
    tail_number: aircraft.tail_number,
    manufacturer: aircraft.manufacturer,
    model: aircraft.model,
    serial_number: aircraft.serial_number,
    manufacture_year: String(aircraft.manufacture_year),
  };
}

function AircraftFormPage({ mode }: AircraftFormPageProps) {
  const navigate = useNavigate();
  const { aircraftId } = useParams();
  const isEditMode = mode === "edit";

  const [form, setForm] = useState<AircraftFormValues>(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadAircraft(): Promise<void> {
      if (!isEditMode) {
        setIsLoading(false);
        return;
      }

      if (!aircraftId) {
        setIsNotFound(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");
      setIsNotFound(false);

      try {
        const result = await getAircraftById(aircraftId);
        if (!isActive) return;
        if (!result) {
          setIsNotFound(true);
          return;
        }
        setForm(toFormValues(result));
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
  }, [isEditMode, aircraftId, retryCount]);

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSaving) return;
    setErrorMessage("");

    const manufactureYear = Number(form.manufacture_year);
    if (!form.manufacture_year.trim() || !Number.isSafeInteger(manufactureYear)) {
      setErrorMessage("Manufacture year must be a valid whole number.");
      return;
    }

    const payload: AircraftCreateRequest = {
      tail_number: form.tail_number.trim(),
      manufacturer: form.manufacturer.trim(),
      model: form.model.trim(),
      serial_number: form.serial_number.trim(),
      manufacture_year: manufactureYear,
    };

    if (
      !payload.tail_number ||
      !payload.manufacturer ||
      !payload.model ||
      !payload.serial_number
    ) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (isEditMode && !aircraftId) {
      setErrorMessage("The aircraft ID is missing.");
      return;
    }

    setIsSaving(true);
    try {
      const savedAircraft = isEditMode
        ? await updateAircraft(aircraftId!, payload)
        : await createAircraft(payload);

      navigate(`/app/aircraft/${savedAircraft.id}`, { replace: true });
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const backTo =
    isEditMode && aircraftId ? `/app/aircraft/${aircraftId}` : "/app/aircraft";

  if (isLoading) {
    return (
      <section className="hm-aircraft-form-page">
        <div className="hm-aircraft-form-state" role="status">
          <LoaderCircle className="hm-aircraft-form-spinner" size={30} aria-hidden="true" />
          <p>Loading aircraft...</p>
        </div>
      </section>
    );
  }

  if (isNotFound || (isEditMode && errorMessage && !form.tail_number)) {
    return (
      <section className="hm-aircraft-form-page">
        <Link to="/app/aircraft" className="hm-aircraft-form-back">
          <ArrowLeft size={17} aria-hidden="true" /> Back to Aircraft
        </Link>
        <div className="hm-aircraft-form-state" role={isNotFound ? undefined : "alert"}>
          <CircleAlert size={32} aria-hidden="true" />
          <h1>{isNotFound ? "Aircraft not found" : "Unable to load aircraft"}</h1>
          <p>
            {isNotFound
              ? "The requested aircraft could not be found."
              : errorMessage}
          </p>
          {!isNotFound && (
            <button
              type="button"
              className="hm-aircraft-form-retry"
              onClick={() => setRetryCount((current) => current + 1)}
            >
              Try again
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="hm-aircraft-form-page">
      <Link to={backTo} className="hm-aircraft-form-back">
        <ArrowLeft size={17} aria-hidden="true" />
        {isEditMode ? "Back to Aircraft Details" : "Back to Aircraft"}
      </Link>

      <header className="hm-aircraft-form-hero">
        <div className="hm-aircraft-form-hero-content">
          <span className="hm-aircraft-form-eyebrow">
            <span className="hm-aircraft-form-pulse" aria-hidden="true" />
            FLEET OPERATIONS / AIRCRAFT REGISTER
          </span>
          <p className="hm-aircraft-form-kicker">
            {isEditMode ? "AIRCRAFT RECORD EDITOR" : "NEW AIRCRAFT RECORD"}
          </p>
          <h1>{isEditMode ? "Edit Aircraft" : "Add Aircraft"}</h1>
          <p className="hm-aircraft-form-hero-description">
            {isEditMode
              ? `Update registration and manufacturing details${form.tail_number ? ` for ${form.tail_number}` : ""}.`
              : "Register a new aircraft and keep your fleet information organized."}
          </p>
        </div>
        <div className="hm-aircraft-form-hero-mark" aria-hidden="true">
          <Plane size={128} strokeWidth={0.8} />
        </div>
        <div className="hm-aircraft-form-mode">
          <BadgeCheck size={16} aria-hidden="true" />
          {isEditMode ? "EDIT MODE" : "NEW RECORD"}
        </div>
      </header>

      <form className="hm-aircraft-form" onSubmit={(event) => void handleSubmit(event)}>
        <section className="hm-aircraft-form-panel" aria-labelledby="aircraft-identity-heading">
          <div className="hm-aircraft-form-panel-heading">
            <span className="hm-aircraft-form-section-icon">
              <Plane size={22} aria-hidden="true" />
            </span>
            <div className="hm-aircraft-form-heading-text">
              <span className="hm-aircraft-form-section-eyebrow">SECTION 01 / 02</span>
              <h2 id="aircraft-identity-heading">Aircraft Identification</h2>
              <p>Registration, manufacturer and technical identity details.</p>
            </div>
          </div>

          <div className="hm-aircraft-form-grid">
            <div className="hm-aircraft-form-field">
              <label htmlFor="tail_number">
                <Hash size={16} aria-hidden="true" /> Tail Number <span aria-hidden="true">*</span>
              </label>
              <input
                id="tail_number"
                name="tail_number"
                value={form.tail_number}
                onChange={handleChange}
                placeholder="e.g. N123AB"
                required
                maxLength={50}
                disabled={isSaving}
                autoComplete="off"
              />
              <small>Unique registration number of the aircraft.</small>
            </div>

            <div className="hm-aircraft-form-field">
              <label htmlFor="manufacturer">
                <Factory size={16} aria-hidden="true" /> Manufacturer <span aria-hidden="true">*</span>
              </label>
              <input
                id="manufacturer"
                name="manufacturer"
                value={form.manufacturer}
                onChange={handleChange}
                placeholder="e.g. Airbus"
                required
                maxLength={100}
                disabled={isSaving}
              />
              <small>Aircraft manufacturer or brand.</small>
            </div>

            <div className="hm-aircraft-form-field">
              <label htmlFor="model">
                <Plane size={16} aria-hidden="true" /> Model <span aria-hidden="true">*</span>
              </label>
              <input
                id="model"
                name="model"
                value={form.model}
                onChange={handleChange}
                placeholder="e.g. A320neo"
                required
                maxLength={100}
                disabled={isSaving}
              />
              <small>Exact model or aircraft variant.</small>
            </div>

            <div className="hm-aircraft-form-field">
              <label htmlFor="serial_number">
                <ClipboardList size={16} aria-hidden="true" /> Serial Number <span aria-hidden="true">*</span>
              </label>
              <input
                id="serial_number"
                name="serial_number"
                value={form.serial_number}
                onChange={handleChange}
                placeholder="e.g. A320-123"
                required
                maxLength={100}
                disabled={isSaving}
              />
              <small>Manufacturer-assigned serial identifier.</small>
            </div>
          </div>
        </section>

        <section className="hm-aircraft-form-panel" aria-labelledby="aircraft-manufacture-heading">
          <div className="hm-aircraft-form-panel-heading">
            <span className="hm-aircraft-form-section-icon hm-aircraft-form-section-icon--teal">
              <CalendarDays size={22} aria-hidden="true" />
            </span>
            <div className="hm-aircraft-form-heading-text">
              <span className="hm-aircraft-form-section-eyebrow">SECTION 02 / 02</span>
              <h2 id="aircraft-manufacture-heading">Manufacturing Details</h2>
              <p>Complete the aircraft's manufacturing information.</p>
            </div>
          </div>

          <div className="hm-aircraft-form-manufacturing">
            <div className="hm-aircraft-form-field">
              <label htmlFor="manufacture_year">
                <CalendarDays size={16} aria-hidden="true" /> Manufacture Year <span aria-hidden="true">*</span>
              </label>
              <input
                id="manufacture_year"
                name="manufacture_year"
                type="number"
                step="1"
                value={form.manufacture_year}
                onChange={handleChange}
                placeholder="e.g. 2022"
                required
                disabled={isSaving}
              />
              <small>Enter a whole-number year.</small>
            </div>
            <div className="hm-aircraft-form-note">
              <Info size={20} aria-hidden="true" />
              <div>
                <strong>Before you save</strong>
                <p>Review the registration and serial number carefully. Required fields are marked with an asterisk.</p>
              </div>
            </div>
          </div>
        </section>

        {errorMessage && (
          <div className="hm-aircraft-form-error" role="alert">
            <CircleAlert size={19} aria-hidden="true" /> {errorMessage}
          </div>
        )}

        <div className="hm-aircraft-form-actions">
          <span className="hm-aircraft-form-actions-note">
            <BadgeCheck size={17} aria-hidden="true" /> 5 required fields
          </span>
          <div className="hm-aircraft-form-action-buttons">
            <Link to={backTo} className="hm-aircraft-form-cancel">
              Cancel
            </Link>
            <button type="submit" className="hm-aircraft-form-submit" disabled={isSaving}>
              {isSaving ? (
                <><LoaderCircle size={18} className="hm-aircraft-form-spinner" aria-hidden="true" /> Saving...</>
              ) : (
                <><Save size={18} aria-hidden="true" /> {isEditMode ? "Save Changes" : "Create Aircraft"}</>
              )}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

export default AircraftFormPage;
