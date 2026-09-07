import { useEffect, useRef, useState } from "react";
import { useScheduleStore } from "../../state/scheduleStore";
import { FileMenu } from "../FileMenu/FileMenu";
import { SampleGeneratorButton } from "../SampleGenerator/SampleGeneratorButton";
import { ModeToggle } from "../ModeToggle/ModeToggle";
import { ProjectDateRange } from "../ProjectDateRange/ProjectDateRange";
import { PhaseListEditor } from "../PhaseListEditor/PhaseListEditor";
import { ExportPanel } from "../ExportPanel/ExportPanel";
import { ViewerSettingsMenu } from "./ViewerSettingsMenu";
import { t } from "../../i18n/fr";
import openUsdLogo from "../../assets/OpenUSD_Dark_Horizontal.png";

type MenuKey = "file" | "timeline" | "export" | "settings";

export function MenuBar() {
  const mode = useScheduleStore((s) => s.mode);
  const sessionId = useScheduleStore((s) => s.sessionId);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const prevSessionIdRef = useRef(sessionId);
  useEffect(() => {
    if (sessionId !== prevSessionIdRef.current) {
      prevSessionIdRef.current = sessionId;
      setOpenMenu(null);
    }
  }, [sessionId]);

  function toggle(key: MenuKey) {
    setOpenMenu((current) => (current === key ? null : key));
  }

  return (
    <nav className="menu-bar" ref={containerRef}>
      <div className="menu-bar-items">
        <div className="menu-item">
          <button
            className={`menu-bar-btn${openMenu === "file" ? " active" : ""}`}
            onClick={() => toggle("file")}
          >
            {t.menu.file}
          </button>
          {openMenu === "file" && (
            <div className="menu-dropdown menu-dropdown-wide">
              <div className="menu-section">
                <FileMenu />
              </div>
              <div className="menu-or">ou</div>
              <div className="menu-section">
                <SampleGeneratorButton />
              </div>
            </div>
          )}
        </div>

        <div className="menu-item">
          <button
            className={`menu-bar-btn${openMenu === "timeline" ? " active" : ""}`}
            onClick={() => toggle("timeline")}
            disabled={!sessionId}
          >
            {t.menu.timeline}
          </button>
          {openMenu === "timeline" && (
            <div className="menu-dropdown menu-dropdown-wide">
              <div className="menu-section">
                <ModeToggle />
              </div>
              <div className="menu-section">
                {mode === "calendar" ? <ProjectDateRange /> : <PhaseListEditor />}
              </div>
            </div>
          )}
        </div>

        <div className="menu-item">
          <button
            className={`menu-bar-btn${openMenu === "export" ? " active" : ""}`}
            onClick={() => toggle("export")}
            disabled={!sessionId}
          >
            {t.menu.export}
          </button>
          {openMenu === "export" && (
            <div className="menu-dropdown menu-dropdown-wide">
              <ExportPanel />
            </div>
          )}
        </div>

        <div className="menu-item">
          <button
            className={`menu-bar-btn${openMenu === "settings" ? " active" : ""}`}
            onClick={() => toggle("settings")}
          >
            {t.menu.settings}
          </button>
          {openMenu === "settings" && (
            <div className="menu-dropdown">
              <ViewerSettingsMenu />
            </div>
          )}
        </div>
      </div>

      <img src={openUsdLogo} alt="OpenUSD" className="openusd-logo" />
    </nav>
  );
}
