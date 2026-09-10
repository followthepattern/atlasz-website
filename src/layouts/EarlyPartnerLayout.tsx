import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { JourneyNavigation } from "@/components/JourneyNavigation";
import { SandboxScene } from "@/scene/sandbox/SandboxScene";

/** Partner presentation using the journey, without the sandbox's debug chrome. */
export function EarlyPartnerLayout() {
  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    document.title = "atlasz — Early Partner Program";
    document.documentElement.lang = "hu";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
      robots.remove();
    };
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <SandboxScene />
      <Outlet />
      <JourneyNavigation />
    </div>
  );
}
