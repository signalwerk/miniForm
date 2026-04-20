import { Navigate, createBrowserRouter, useParams, useSearchParams } from "react-router-dom";

function SurveyEntryPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const languageId = searchParams.get("lang") ?? "";

  return (
    <main className="viewer-page">
      <section className="viewer-panel">
        <p className="viewer-eyebrow">Viewer</p>
        <h1>Survey viewer placeholder</h1>
        <p>
          This standalone app is ready for the future respondent runtime.
        </p>
        <dl className="viewer-meta">
          <div>
            <dt>Survey ID</dt>
            <dd>{id ?? "Missing"}</dd>
          </div>
          <div>
            <dt>Language</dt>
            <dd>{languageId || "Default"}</dd>
          </div>
          <div>
            <dt>Route</dt>
            <dd><code>/s/:id?lang=:language-id</code></dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    path: "/s/:id",
    element: <SurveyEntryPage />,
  },
  {
    path: "*",
    element: <Navigate to="/s/example" replace />,
  },
]);
