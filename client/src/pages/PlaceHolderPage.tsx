type PlaceholderPageProps = {
  title: string;
};

function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section>
      <div className="page-heading">
        <p className="page-eyebrow">HangarManager</p>

        <h1>{title}</h1>

        <p className="page-description">
          Manage and monitor your aircraft fleet.
        </p>
      </div>

      <div className="placeholder-panel">
        <h2>{title}</h2>

        <p>
          This page is not implemented yet. Its functionality
          will be added in a later development step.
        </p>
      </div>
    </section>
  );
}

export default PlaceholderPage;