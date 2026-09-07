import { useResource } from "./api";
import { ErrorState, Loading } from "./components";
import { TicketsPage } from "./TicketsPage";
import { date, type User } from "./types";

export function ProfilePage() {
  const profile = useResource<User>("/users/me");
  if (profile.loading) return <Loading />;
  if (profile.error || !profile.data)
    return (
      <ErrorState
        message={profile.error || "Profile unavailable."}
        retry={profile.reload}
      />
    );
  return (
    <>
      <section className="panel profile-card">
        <span className="avatar large">
          {profile.data.name.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <span className="eyebrow">YOUR PROFILE</span>
          <h1>{profile.data.name}</h1>
          <p>{profile.data.email}</p>
        </div>
        <span className="subtle">
          Member since {date(profile.data.createdAt)}
        </span>
      </section>
      <TicketsPage mine />
    </>
  );
}
