
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import api from "../services/api";

import type { UserRole } from "../types/auth";

import "./ProfilePage.css";

interface Profile {
  id: string;
  display_name: string;
  email: string;
  role: UserRole;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  hangar_manager: "Hangar Manager",
  team_lead: "Team Lead",
  technician: "Technician",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await api.get<Profile>("/auth/me");

        if (!cancelled) {
          setProfile(response.data);
          setError("");
        }
      } catch (err: unknown) {
        if (cancelled) return;

        if (isAxiosError(err) && err.response?.status === 401) {
          setError("Your session has expired. Please log in again.");
        } else {
          setError("Failed to load your profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p role="status">Loading profile...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!profile) {
    return <p>Profile unavailable.</p>;
  }

  return (
    <section className="profile-page">
      <header className="profile-heading">
        <p className="profile-eyebrow">Account</p>
        <h1>My Profile</h1>
        <p>Your account details and system role.</p>
      </header>

      <div className="profile-card">
        <div className="profile-avatar">
          {profile.display_name.charAt(0).toUpperCase()}
        </div>

        <h2>{profile.display_name}</h2>
        <p className="profile-email">{profile.email}</p>

        <div className="profile-fields">
          <div>
            <span>Display Name</span>
            <strong>{profile.display_name}</strong>
          </div>

          <div>
            <span>Email</span>
            <strong>{profile.email}</strong>
          </div>

          <div>
            <span>Role</span>
            <strong>{ROLE_LABELS[profile.role]}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
