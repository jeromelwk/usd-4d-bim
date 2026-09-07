import { t } from "./i18n/fr";
import { MenuBar } from "./components/MenuBar/MenuBar";
import { PrimTree } from "./components/PrimTree/PrimTree";
import { AssignmentPanel } from "./components/AssignmentPanel/AssignmentPanel";
import { GanttGrid } from "./components/Timeline/GanttGrid";
import { ImportPanel } from "./components/ImportPanel/ImportPanel";
import { Viewer3DPanel } from "./components/Viewer3D/Viewer3DPanel";

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <MenuBar />
        <h1>{t.app.title}</h1>
        <p className="app-subtitle">{t.app.subtitle}</p>
      </header>

      <main className="app-main">
        <aside className="app-sidebar">
          <PrimTree />
        </aside>

        <section className="app-content">
          <Viewer3DPanel />
          <AssignmentPanel />
          <GanttGrid />
          <ImportPanel />
        </section>
      </main>
    </div>
  );
}

export default App;
