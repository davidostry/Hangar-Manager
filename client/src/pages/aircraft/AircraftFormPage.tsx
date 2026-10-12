import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { isAxiosError } from "axios";
import { Link, useNavigate, useParams } from "react-router";

import {
  createAircraft,
  getAircraftById,
  updateAircraft,
} from "../../services/aircraftService";

import type {
  Aircraft,
  AircraftCreateRequest,
} from "../../types/aircraft";

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

      return "Please check the submitted information.";
    }

    if (data?.detail && typeof data.detail === "object") {
      return JSON.stringify(data.detail);
    }

    return `The request failed. HTTP status: ${error.response.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

function toFormValues(
  aircraft: Aircraft,
): AircraftFormValues {
  return {
    tail_number: aircraft.tail_number,
    manufacturer: aircraft.manufacturer,
    model: aircraft.model,
    serial_number: aircraft.serial_number,
    manufacture_year: String(aircraft.manufacture_year),
  };
}

function AircraftFormPage({
  mode,
}: AircraftFormPageProps) {
  const navigate = useNavigate();
  const { aircraftId } = useParams();

  const isEditMode = mode === "edit";

  const [form, setForm] =
    useState<AircraftFormValues>(INITIAL_FORM);

  const [isLoading, setIsLoading] =
    useState(isEditMode);

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
        const aircraft = await getAircraftById(aircraftId);

        if (!isActive) {
          return;
        }

        if (!aircraft) {
          setIsNotFound(true);
          return;
        }

        setForm(toFormValues(aircraft));
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
  }, [isEditMode, aircraftId, retryCount]);

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement
    >,
  ): void {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setErrorMessage("");

    const manufactureYear = Number(form.manufacture_year);

    if (
      !form.manufacture_year.trim() ||
      !Number.isSafeInteger(manufactureYear)
    ) {
      setErrorMessage(
        "Manufacture year must be a valid whole number.",
      );
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

      navigate(`/app/aircraft/${savedAircraft.id}`, {
        replace: true,
      });
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="aircraft-form-page">
        <div className="aircraft-form-state" role="status">
          Loading aircraft...
        </div>
      </section>
    );
  }

  if (isNotFound) {
    return (
      <section className="aircraft-form-page">
        <Link
          to="/app/aircraft"
          className="aircraft-form-back-link"
        >
          Back to Aircraft
        </Link>

        <div className="aircraft-form-state">
          <h1>Aircraft not found</h1>
          <p>The requested aircraft could not be found.</p>
        </div>
      </section>
    );
  }

  if (isEditMode && errorMessage && !form.tail_number) {
    return (
      <section className="aircraft-form-page">
        <Link
          to="/app/aircraft"
          className="aircraft-form-back-link"
        >
          Back to Aircraft
        </Link>

        <div className="aircraft-form-state aircraft-form-state-error">
          <h1>Unable to load aircraft</h1>
          <p role="alert">{errorMessage}</p>

          <button
            type="button"
            className="aircraft-form-button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="aircraft-form-page">
      <Link
        to={
          isEditMode && aircraftId
            ? `/app/aircraft/${aircraftId}`
            : "/app/aircraft"
        }
        className="aircraft-form-back-link"
      >
        {isEditMode
          ? "Back to Aircraft Details"
          : "Back to Aircraft"}
      </Link>

      <div className="page-heading">
        <p className="page-eyebrow">Fleet Management</p>

        <h1>
          {isEditMode ? "Edit Aircraft" : "Add Aircraft"}
        </h1>

        <p className="page-description">
          {isEditMode
            ? "Update the aircraft information."
            : "Register an aircraft in the fleet."}
        </p>
      </div>

      <form
        className="aircraft-form-card"
        onSubmit={handleSubmit}
      >
        <div className="aircraft-form-grid">
          <div className="aircraft-form-field">
            <label htmlFor="tail_number">
              Tail Number *
            </label>

            <input
              id="tail_number"
              name="tail_number"
              value={form.tail_number}
              onChange={handleChange}
              required
              maxLength={50}
              disabled={isSaving}
              autoComplete="off"
            />
          </div>

          <div className="aircraft-form-field">
            <label htmlFor="manufacturer">
              Manufacturer *
            </label>

            <input
              id="manufacturer"
              name="manufacturer"
              value={form.manufacturer}
              onChange={handleChange}
              required
              maxLength={100}
              disabled={isSaving}
            />
          </div>

          <div className="aircraft-form-field">
            <label htmlFor="model">Model *</label>

            <input
              id="model"
              name="model"
              value={form.model}
              onChange={handleChange}
              required
              maxLength={100}
              disabled={isSaving}
            />
          </div>

          <div className="aircraft-form-field">
            <label htmlFor="serial_number">
              Serial Number *
            </label>

            <input
              id="serial_number"
              name="serial_number"
              value={form.serial_number}
              onChange={handleChange}
              required
              maxLength={100}
              disabled={isSaving}
            />
          </div>

          <div className="aircraft-form-field">
            <label htmlFor="manufacture_year">
              Manufacture Year *
            </label>

            <input
              id="manufacture_year"
              name="manufacture_year"
              type="number"
              step="1"
              value={form.manufacture_year}
              onChange={handleChange}
              required
              disabled={isSaving}
            />
          </div>
        </div>

        {errorMessage && (
          <div className="aircraft-form-error" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="aircraft-form-actions">
          <Link
            className="aircraft-form-button aircraft-form-button-secondary"
            to={
              isEditMode && aircraftId
                ? `/app/aircraft/${aircraftId}`
                : "/app/aircraft"
            }
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="aircraft-form-button"
            disabled={isSaving}
          >
            {isSaving
              ? "Saving..."
              : isEditMode
                ? "Save Changes"
                : "Create Aircraft"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AircraftFormPage;