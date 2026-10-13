
import { useEffect, useState } from "react";

import api from "../services/api";
import { getUsers } from "../services/userService";
import { useAuth } from "../context/AuthContext";

type LabelMap = Record<string, string>;

// Check whether an unknown value is an object
function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

// The Backend normally returns an array.
// Also supports { items: [...] } responses.
function getItems(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (isRecord(data) && Array.isArray(data.items)) {
    return data.items;
  }

  return [];
}

// ========================================
// AIRCRAFT LABELS
// ========================================

export function useAircraftTailNumbers() {
  const [labels, setLabels] = useState<LabelMap>({});

  useEffect(() => {
    let cancelled = false;

    async function loadAircraft() {
      try {
        const response = await api.get<unknown>("/aircraft");

        const items = getItems(response.data);
        const nextLabels: LabelMap = {};

        for (const item of items) {
          if (
            !isRecord(item) ||
            typeof item.id !== "string" ||
            typeof item.tail_number !== "string"
          ) {
            continue;
          }

          nextLabels[item.id] = item.tail_number;
        }

        if (!cancelled) {
          setLabels(nextLabels);
        }
      } catch (error) {
        console.error("Failed to load aircraft labels", error);
      }
    }

    void loadAircraft();

    return () => {
      cancelled = true;
    };
  }, []);

  function getAircraftName(
    aircraftId: string | null | undefined
  ): string {
    if (!aircraftId) {
      return "Not assigned";
    }

    return labels[aircraftId] ?? "Aircraft unavailable";
  }

  return getAircraftName;
}

// ========================================
// USER LABELS
// ========================================

export function useUserDisplayNames() {
  const { user } = useAuth();

  const [labels, setLabels] = useState<LabelMap>({});

  const canReadUsers =
    user?.role === "admin" ||
    user?.role === "hangar_manager" ||
    user?.role === "team_lead";

  useEffect(() => {
    let cancelled = false;

    if (!canReadUsers) {
      return;
    }

    async function loadUsers() {
      try {
        const users = await getUsers();
        const nextLabels: LabelMap = {};

        for (const item of users) {
          nextLabels[item.id] = item.display_name;
        }

        if (!cancelled) {
          setLabels(nextLabels);
        }
      } catch (error) {
        console.error("Failed to load user labels", error);
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [canReadUsers]);

  function getUserName(
    userId: string | null | undefined
  ): string {
    if (!userId) {
      return "Unassigned";
    }

    // The logged-in user's name is already available.
    if (user && userId === user.id) {
      return user.display_name || user.email;
    }

    return labels[userId] ?? "Name unavailable";
  }

  return getUserName;
}
