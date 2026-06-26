import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Checkbox } from "@/components/ui/Checkbox";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { ArrowRight, Check } from "@/icons";
import { MapHero } from "@/components/MapHero";
import { RouteEconomics } from "@/components/RouteEconomics";
import { Features } from "@/components/Features";
import { Integrations } from "@/components/Integrations";
import { References } from "@/components/References";
import { Onboarding } from "@/components/Onboarding";
import { Footer } from "@/components/Footer";
import { Privacy } from "@/components/Privacy";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { QUIZ } from "./quiz";
import { subscribe } from "./api";

type Stage = "intro" | "quiz" | "form" | "success";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lead-qualification quiz. Disabled for early access so users subscribe
// directly; flip to true to collect quiz answers again for lead ranking.
const QUIZ_ENABLED = false;

export default function App() {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gdpr, setGdpr] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");

  const [route, setRoute] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function goHome() {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setRoute("");
    setStage("intro");
    setStep(0);
    window.scrollTo({ top: 0 });
  }

  function answer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (step < QUIZ.length - 1) {
      setStep(step + 1);
    } else {
      setStage("form");
    }
  }

  function validateForm() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = t("form.errors.name");
    if (!EMAIL_RE.test(email.trim())) next.email = t("form.errors.email");
    if (phone.trim().length < 3) next.phone = t("form.errors.phone");
    if (!gdpr) next.gdpr = t("form.errors.gdpr");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    setSubmitError("");
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await subscribe({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        gdprConsent: gdpr,
        marketingConsent: marketing,
        flowVersion: QUIZ_ENABLED ? "quiz" : "direct",
        source: "landing",
        answers: QUIZ_ENABLED ? answers : undefined,
      });
      setStage("success");
    } catch {
      // Subscribe endpoint isn't live yet — show a friendly notice rather than
      // leaking the raw server/network error.
      setSubmitError(t("form.errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  if (route === "#privacy") {
    return <Privacy onBack={goHome} />;
  }

  return (
    <div className="flex min-h-full flex-col">
      {stage === "intro" ? (
        <>
        <section className="relative flex min-h-[88vh] flex-col overflow-hidden">
          <MapHero />
          <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-8">
            <button
              type="button"
              onClick={goHome}
              className="text-lg font-semibold tracking-tight text-fg hover:opacity-80"
            >
              atlasz
            </button>
            <LanguageSwitcher />
          </header>
          <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-20">
            <div className="flex max-w-xl flex-col items-start gap-6">
              <span className="rounded-full border border-hairline bg-canvas/60 px-3 py-1 text-xs text-muted backdrop-blur-sm">
                {t("hero.badge")}
              </span>
              <h1 className="text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
                {t("hero.titleLine1")}
                <br />
                {t("hero.titleLine2")}
              </h1>
              <Text className="max-w-xl text-base">{t("hero.subtitle")}</Text>
              <Button variant="primary" onClick={() => setStage(QUIZ_ENABLED ? "quiz" : "form")} className="mt-2">
                {t("hero.cta")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
        <RouteEconomics />
        <Features />
        <Onboarding />
        <Integrations />
        <References />
        </>
      ) : (
        <>
          <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 pt-8">
            <button
              type="button"
              onClick={goHome}
              className="text-lg font-semibold tracking-tight text-fg hover:opacity-80"
            >
              atlasz
            </button>
            <LanguageSwitcher />
          </header>
          <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
            {stage === "quiz" && (
          <section className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              {QUIZ.map((q, i) => (
                <span
                  key={q.id}
                  className={`h-1 flex-1 rounded-full ${
                    i <= step ? "bg-accent" : "bg-fg/15"
                  }`}
                />
              ))}
            </div>
            <Text className="text-xs">
              {t("quiz.progress", { current: step + 1, total: QUIZ.length })}
            </Text>
            <Heading>{t(`quiz.${QUIZ[step].id}.question`)}</Heading>
            <div className="flex flex-col gap-2">
              {QUIZ[step].options.map((opt) => {
                const selected = answers[QUIZ[step].id] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => answer(QUIZ[step].id, opt)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                      selected
                        ? "border-accent bg-fg/5 text-fg"
                        : "border-hairline text-fg hover:bg-fg/5"
                    }`}
                  >
                    {t(`quiz.${QUIZ[step].id}.options.${opt}`)}
                    <ArrowRight className="h-4 w-4 text-muted" />
                  </button>
                );
              })}
            </div>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="self-start text-xs text-muted hover:text-fg"
              >
                {t("quiz.back")}
              </button>
            )}
          </section>
        )}

        {stage === "form" && (
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Heading>{t("form.heading")}</Heading>
              <Text>{t("form.subtitle")}</Text>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-hairline bg-surface p-6">
              <Field label={t("form.name.label")} error={errors.name}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  invalid={!!errors.name}
                  placeholder={t("form.name.placeholder")}
                  autoComplete="name"
                />
              </Field>
              <Field label={t("form.email.label")} error={errors.email}>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  invalid={!!errors.email}
                  placeholder={t("form.email.placeholder")}
                  autoComplete="email"
                />
              </Field>
              <Field
                label={t("form.phone.label")}
                error={errors.phone}
                hint={t("form.phone.hint")}
              >
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  invalid={!!errors.phone}
                  placeholder={t("form.phone.placeholder")}
                  autoComplete="tel"
                />
              </Field>

              <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={gdpr}
                    onChange={() => setGdpr((v) => !v)}
                    aria-label={t("form.gdpr.link")}
                  />
                  <span className="text-sm text-muted">
                    {t("form.gdpr.before")}
                    <a
                      href="#privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fg underline hover:opacity-80"
                    >
                      {t("form.gdpr.link")}
                    </a>
                    {t("form.gdpr.after")} <span className="text-negative">*</span>
                  </span>
                </div>
                {errors.gdpr && <span className="text-xs text-negative">{errors.gdpr}</span>}

                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={marketing}
                    onChange={() => setMarketing((v) => !v)}
                    aria-label={t("form.marketing")}
                  />
                  <span className="text-sm text-muted">{t("form.marketing")}</span>
                </div>
              </div>

              {submitError && (
                <div className="rounded-md bg-negative-bg px-3 py-2 text-sm text-negative">
                  {submitError}
                </div>
              )}

              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting}
                className="mt-1"
              >
                {submitting ? t("form.submitting") : t("form.submit")}
              </Button>
            </div>
          </section>
        )}

        {stage === "success" && (
          <section className="flex flex-col items-start gap-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-positive-bg text-positive">
              <Check className="h-6 w-6" />
            </span>
            <Heading>{t("success.heading")}</Heading>
            <Text className="max-w-lg text-base">
              {name
                ? t("success.bodyWithName", { name: name.trim().split(" ")[0], email })
                : t("success.body", { email })}
            </Text>
          </section>
        )}
          </main>
        </>
      )}

      <Footer />
    </div>
  );
}
