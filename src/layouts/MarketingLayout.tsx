import { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { SandboxScene } from "@/scene/sandbox/SandboxScene";
import { useScrollStore } from "@/motion/ScrollProvider";
import { useDocumentMeta } from "@/i18n/useDocumentMeta";

export function MarketingLayout() {
  useDocumentMeta();
  const scroll = useScrollStore();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const hero = ref.current?.querySelector(".journey-hero");
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (ref.current)
        ref.current.dataset.touring = String(!entry.isIntersecting);
    });
    observer.observe(hero);
    const arrival = ref.current?.querySelector(".journey-arrival");
    const stopArrival = scroll.subscribe(() => {
      if (ref.current && arrival) {
        // Do not resize the mobile canvas while the service scene is still active.
        ref.current.dataset.arrived = String(arrival.getBoundingClientRect().top <= 0);
      }
    });
    return () => { observer.disconnect(); stopArrival(); };
  }, [scroll]);
  return (
    <div ref={ref} className="landing-journey">
      <SandboxScene marketplace />
      <Outlet />
    </div>
  );
}
