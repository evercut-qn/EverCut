'use client';

import React, { useState } from 'react';

export function TimeCalculator() {
  const [visits, setVisits] = useState(2);
  const [wait, setWait] = useState(25);

  const hours = (visits * 12 * wait) / 60;
  const hoursDisplay = hours >= 10 ? Math.round(hours) : hours.toFixed(1);
  const daysDisplay = (hours / 8).toFixed(1);

  return (
    <section className="block" id="saved">
      <div className="wrap">
        <div className="head">
          <h2>Time You Get Back.</h2>
          <p>A reserved chair means no waiting room. Move the sliders to see what that adds up to in a year.</p>
        </div>

        <div className="calc raised">
          <div>
            <label htmlFor="cVisits">
              Visits per month <b>{visits}</b>
            </label>
            <input
              type="range"
              id="cVisits"
              min="1"
              max="6"
              value={visits}
              onChange={(e) => setVisits(Number(e.target.value))}
            />

            <label htmlFor="cWait">
              Usual wait per visit <b>{wait} min</b>
            </label>
            <input
              type="range"
              id="cWait"
              min="5"
              max="60"
              step="5"
              value={wait}
              onChange={(e) => setWait(Number(e.target.value))}
            />
          </div>

          <div className="res inset" aria-live="polite">
            <strong>{hoursDisplay} hours</strong>
            <span>
              saved each year, about {daysDisplay} working days. An estimate that assumes your chair is ready when you arrive.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
