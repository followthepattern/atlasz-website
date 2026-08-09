import { Link, Outlet } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/**
 * The lead funnel: a narrow column, centred, over the parked scene.
 *
 * Kept apart from DocumentLayout despite the similar shape — this page is a
 * form someone is part-way through, so its chrome offers a language switch and
 * the full site footer, where a legal page offers neither.
 */
export function FunnelLayout() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 pt-8">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight text-fg hover:opacity-80"
        >
          atlasz
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
