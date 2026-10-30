'use client';

import React, { useState } from 'react';

const CHAIRS = ['Chair 1', 'Chair 2', 'Chair 3'];
const TIMES = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '1:00', '1:30'];
const INITIAL_GRID = [
  [1, 1, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 1, 0, 1, 1, 0],
  [0, 1, 1, 0, 0, 0, 1, 1]
];

export function SalonOwnerBoard() {
  // Store state for open cells: 'open' vs 'walk'
  const [walkIns, setWalkIns] = useState({});

  const toggleCell = (r, c) => {
    const key = `${r}-${c}`;
    setWalkIns((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const totalCells = CHAIRS.length * TIMES.length;
  let filledCount = 0;

  CHAIRS.forEach((_, r) => {
    TIMES.forEach((_, c) => {
      const isOnline = INITIAL_GRID[r][c] === 1;
      const isWalkIn = walkIns[`${r}-${c}`];
      if (isOnline || isWalkIn) {
        filledCount++;
      }
    });
  });

  const percentage = Math.round((filledCount / totalCells) * 100);

  return (
    <section className="block" id="partners">
      <div className="wrap">
        <div className="head">
          <h2>Built for Salon Owners.</h2>
          <p>
            Every open block is a chair sitting idle. Tap an open block to assign a walk-in and watch your chair time fill up. Demonstration only.
          </p>
        </div>

        <div className="board raised">
          <div className="legend">
            <span>
              <i className="sw-b"></i>Online booking
            </span>
            <span>
              <i className="sw-w"></i>Walk-in you assigned
            </span>
            <span>
              <i className="sw-o"></i>Open
            </span>
          </div>

          <div className="scroll-x">
            <div className="bgrid" id="board">
              <div></div>
              {TIMES.map((time) => (
                <div key={time} className="th">
                  {time}
                </div>
              ))}

              {CHAIRS.map((chair, r) => (
                <React.Fragment key={chair}>
                  <div className="rl">{chair}</div>
                  {TIMES.map((time, c) => {
                    const isOnline = INITIAL_GRID[r][c] === 1;
                    const isWalkIn = !!walkIns[`${r}-${c}`];

                    if (isOnline) {
                      return (
                        <button
                          key={time}
                          type="button"
                          className="cell booked"
                          disabled
                          aria-label={`${chair} at ${time}, online booking`}
                        />
                      );
                    }

                    return (
                      <button
                        key={time}
                        type="button"
                        className={`cell ${isWalkIn ? 'walk' : 'open'}`}
                        aria-label={`${chair} at ${time}, ${isWalkIn ? 'walk-in assigned' : 'open'}`}
                        onClick={() => toggleCell(r, c)}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="util">
            <span>Chair time filled</span>
            <div className="bar inset">
              <i id="uBar" style={{ width: `${percentage}%` }}></i>
            </div>
            <strong id="uTxt">{percentage}%</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
