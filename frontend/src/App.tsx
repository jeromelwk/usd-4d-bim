import { t } from "./i18n/fr";
import { MenuBar } from "./components/MenuBar/MenuBar";
import { PrimTree } from "./components/PrimTree/PrimTree";
import { GanttGrid } from "./components/Timeline/GanttGrid";
import { Viewer3DPanel } from "./components/Viewer3D/Viewer3DPanel";
import { SelectionPopup } from "./components/SelectionPopup/SelectionPopup";

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <MenuBar />
        <h1>{t.app.title}</h1>
      </header>

      <main className="app-main">
        <aside className="app-sidebar">
          <PrimTree />
        </aside>

        <section className="app-content">
          <Viewer3DPanel />
          <GanttGrid />
        </section>
      </main>

      <SelectionPopup />
    </div>
  );
}

export default App;
