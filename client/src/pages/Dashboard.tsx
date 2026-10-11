function Dashboard() {
  return (
    <section>
      <div className="page-heading">
        <p className="page-eyebrow">Overview</p>

        <h1>Dashboard</h1>

        <p className="page-description">
          Overview of the aircraft fleet and its operational status.
        </p>
      </div>

      <div className="placeholder-panel">
        <h2>Fleet Overview</h2>

        <p>
          Aircraft statistics, maintenance activity, and upcoming
          inspections will be displayed here.
        </p>

        <p>
          Real dashboard data will be connected after the Backend
          API contract has been agreed upon.
        </p>
      </div>
    </section>
  );
}

export default Dashboard;