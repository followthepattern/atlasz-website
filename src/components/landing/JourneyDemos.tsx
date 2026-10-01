import { useState } from "react";
import type { LandingCopy } from "./content";

export function Assignment({ c }: { c: LandingCopy }) {
  return (
    <div className="journey-demo">
      <div className="demo-top">
        <span>SO-4471</span>
        <span className="demo-status">{c.assigned}</span>
      </div>
      <div className="route-line">
        Budapest <span>→</span> Vienna
      </div>
      <dl className="demo-ledger">
        <div>
          <dt>{c.vehicle}</dt>
          <dd>ATZ-104 · Volvo FH</dd>
        </div>
        <div>
          <dt>{c.driver}</dt>
          <dd>Kovács Péter</dd>
        </div>
        <div>
          <dt>{c.cargo}</dt>
          <dd>{c.pallets}</dd>
        </div>
        <div>
          <dt>{c.delivery}</dt>
          <dd>17:00</dd>
        </div>
      </dl>
    </div>
  );
}

export function Pricing({ c }: { c: LandingCopy }) {
  const [margin, setMargin] = useState(25);
  const cost = 1170;
  const quote = Math.round(cost / (1 - margin / 100));
  return (
    <div className="journey-demo">
      <div className="demo-top">
        <span>Budapest → Vienna</span>
        <span>EUR</span>
      </div>
      <div className="cost-bars">
        {[
          [c.fuel, 520],
          [c.tolls, 180],
          [c.driverCost, 360],
          [c.other, 110],
        ].map(([name, value]) => (
          <div key={name}>
            <span>{name}</span>
            <div>
              <i style={{ width: `${Number(value) / 6}%` }} />
            </div>
            <b>€{value}</b>
          </div>
        ))}
      </div>
      <div className="demo-total">
        <span>{c.total}</span>
        <strong>€1,170</strong>
      </div>
      <label className="margin-label" htmlFor="spot-margin">
        {c.margin}
        <strong>{margin}%</strong>
      </label>
      <input
        id="spot-margin"
        type="range"
        min="10"
        max="40"
        value={margin}
        onChange={(e) => setMargin(Number(e.target.value))}
      />
      <div className="quote-result" aria-live="polite">
        <div>
          <span>{c.quote}</span>
          <strong>€{quote.toLocaleString("en-US")}</strong>
        </div>
        <div>
          <span>{c.profit}</span>
          <b>€{quote - cost}</b>
        </div>
      </div>
    </div>
  );
}

export function FuelingPhone({ c }: { c: LandingCopy }) {
  const [unlocked, setUnlocked] = useState(false);
  return (
    <div className="fuel-phone">
      <div className="phone-camera" />
      <div className="phone-header">
        <b>ATLASZ</b>
        <span>{c.app}</span>
      </div>
      <div
        className={`fuel-symbol ${unlocked ? "is-unlocked" : ""}`}
        aria-hidden="true"
      >
        {unlocked ? (
          "✓"
        ) : (
          <svg
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="9" y="8" width="20" height="32" rx="3" />
            <path d="M13 13h12v11H13zM29 19h5l5 6v10a3 3 0 0 1-6 0v-7M35 12l5 6v7M6 40h26" />
          </svg>
        )}
      </div>
      <span className="phone-station">{c.station}</span>
      <h3 aria-live="polite">{unlocked ? c.unlocked : "ATZ-104"}</h3>
      <p>{unlocked ? c.ready : c.authorize}</p>
      <span className="phone-verified">✓ {c.secure}</span>
      <button
        type="button"
        className="phone-action"
        onClick={() => setUnlocked(!unlocked)}
      >
        {unlocked ? c.reset : c.unlock}
      </button>
    </div>
  );
}

export function Forecast({ c }: { c: LandingCopy }) {
  return (
    <div className="journey-demo">
      <div className="demo-top">
        <span>ATLASZ AI</span>
        <span>{c.forecast}</span>
      </div>
      <strong className="forecast-value">{c.forecastValue}</strong>
      <svg
        viewBox="0 0 320 90"
        className="forecast-chart"
        role="img"
        aria-label={c.forecast}
      >
        <path
          d="M0 80H320M0 45H320M0 10H320"
          stroke="var(--hairline)"
          fill="none"
        />
        <path
          d="M0 75L35 65L70 70L105 45L140 50L175 30"
          stroke="var(--fg)"
          fill="none"
          strokeWidth="3"
        />
        <path
          d="M175 30L210 35L245 15L280 18L320 4"
          stroke="var(--positive)"
          fill="none"
          strokeWidth="3"
          strokeDasharray="5 5"
        />
      </svg>
      <p>{c.insight}</p>
      <small>{c.insightNote}</small>
    </div>
  );
}

export function Depot({
  c,
  service = false,
}: {
  c: LandingCopy;
  service?: boolean;
}) {
  return (
    <div className="journey-demo">
      <div className="demo-top">
        <span>
          {service ? "ATZ-104 · Volvo FH" : "SO-4471 · Budapest → Vienna"}
        </span>
        <span className="demo-status">✓</span>
      </div>
      {service ? (
        <dl className="demo-ledger">
          <div>
            <dt>{c.serviceLabel}</dt>
            <dd>{c.serviceValue}</dd>
          </div>
          <div>
            <dt>{c.stock}</dt>
            <dd>{c.stockValue}</dd>
          </div>
          <div>
            <dt>{c.vehicle}</dt>
            <dd>{c.reserved}</dd>
          </div>
        </dl>
      ) : (
        <>
          <p>{c.complete}</p>
          <div className="invoice-sheet">
            <span>{c.invoiceLabel} #1043</span>
            <strong>€1,560</strong>
            <span className="demo-status">{c.invoiceStatus}</span>
          </div>
        </>
      )}
    </div>
  );
}
