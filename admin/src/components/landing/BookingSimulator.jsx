'use client';

import React, { useState } from 'react';

const SALONS = ['Men Super Salon', 'Artwood Salon'];
const SERVICES = [
  { n: 'Haircut', p: 150, m: 30 },
  { n: 'Beard Trim', p: 80, m: 15 },
  { n: 'Classic Facial', p: 400, m: 45 }
];
const STYLISTS = ['Shankya Mali', 'Next Available'];
const NUM_SLOTS = 12;

function formatTime(min) {
  let h = Math.floor(min / 60);
  const m = min % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m < 10 ? '0' : ''}${m} ${ap}`;
}

export function BookingSimulator() {
  const [selectedSalon, setSelectedSalon] = useState(1); // Artwood Salon
  const [selectedServices, setSelectedServices] = useState([true, true, false]);
  const [selectedStylist, setSelectedStylist] = useState(0); // Shankya Mali
  const [selectedSlot, setSelectedSlot] = useState(3); // 10:15
  const [isReserved, setIsReserved] = useState(false);

  // Slot availability algorithm from main.js
  const isTaken = (k, salon = selectedSalon, stylist = selectedStylist) => {
    return (k * 7 + salon * 3 + stylist * 5) % 4 === 0;
  };

  const handleSalonChange = (idx) => {
    setSelectedSalon(idx);
    setIsReserved(false);
    if (isTaken(selectedSlot, idx, selectedStylist)) {
      for (let k = 0; k < NUM_SLOTS; k++) {
        if (!isTaken(k, idx, selectedStylist)) {
          setSelectedSlot(k);
          break;
        }
      }
    }
  };

  const handleStylistChange = (idx) => {
    setSelectedStylist(idx);
    setIsReserved(false);
    if (isTaken(selectedSlot, selectedSalon, idx)) {
      for (let k = 0; k < NUM_SLOTS; k++) {
        if (!isTaken(k, selectedSalon, idx)) {
          setSelectedSlot(k);
          break;
        }
      }
    }
  };

  const toggleService = (idx) => {
    setSelectedServices((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
    setIsReserved(false);
  };

  const handleSlotSelect = (k) => {
    if (!isTaken(k)) {
      setSelectedSlot(k);
      setIsReserved(false);
    }
  };

  const activeServices = SERVICES.filter((_, idx) => selectedServices[idx]);
  const subtotal = activeServices.reduce((acc, s) => acc + s.p, 0);
  const duration = activeServices.reduce((acc, s) => acc + s.m, 0);
  const coupon = subtotal >= 200 ? 30 : 0;
  const platformFee = subtotal > 0 ? 4 : 0;
  const total = subtotal - coupon + platformFee;

  const startMinutes = 600 + 5 * selectedSlot;
  const timeFormatted = subtotal
    ? `${formatTime(startMinutes)} to ${formatTime(startMinutes + duration)}`
    : formatTime(startMinutes);

  return (
    <section className="block" id="try">
      <div className="field" style={{ width: 460, height: 460, top: 120, right: -120 }}></div>
      <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
        <div className="head">
          <h2>Try a Booking.</h2>
          <p>
            Pick a salon, a stylist and a 5-minute slot, and watch the bill build up. Sample rates, for demonstration only.
          </p>
        </div>

        <div className="sim">
          <div className="panel raised">
            <div className="grp">
              <h4>Salon</h4>
              <div className="opts" id="simSalon">
                {SALONS.map((salon, i) => (
                  <button
                    key={salon}
                    type="button"
                    className="opt"
                    aria-pressed={selectedSalon === i}
                    onClick={() => handleSalonChange(i)}
                  >
                    {salon}
                  </button>
                ))}
              </div>
            </div>

            <div className="grp">
              <h4>Services</h4>
              <div className="opts" id="simSvc">
                {SERVICES.map((svc, i) => (
                  <button
                    key={svc.n}
                    type="button"
                    className="opt"
                    aria-pressed={selectedServices[i]}
                    onClick={() => toggleService(i)}
                  >
                    {svc.n} ₹{svc.p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grp">
              <h4>Stylist</h4>
              <div className="opts" id="simSty">
                {STYLISTS.map((sty, i) => (
                  <button
                    key={sty}
                    type="button"
                    className="opt"
                    aria-pressed={selectedStylist === i}
                    onClick={() => handleStylistChange(i)}
                  >
                    {sty}
                  </button>
                ))}
              </div>
            </div>

            <div className="grp">
              <h4>Morning slots</h4>
              <div className="slotgrid" id="simSlots">
                {Array.from({ length: NUM_SLOTS }).map((_, k) => {
                  const m = 600 + 5 * k;
                  const label = `${Math.floor(m / 60)}:${(m % 60) < 10 ? '0' : ''}${m % 60}`;
                  const taken = isTaken(k);
                  return (
                    <button
                      key={label}
                      type="button"
                      className="opt"
                      disabled={taken}
                      aria-pressed={selectedSlot === k && !taken}
                      onClick={() => handleSlotSelect(k)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="receipt glass" aria-live="polite">
            <h3>Your Booking</h3>
            <div className="rrow">
              <span>Salon</span>
              <span id="rSalon">{SALONS[selectedSalon]}</span>
            </div>
            <div className="rrow">
              <span>Stylist</span>
              <span id="rSty">{STYLISTS[selectedStylist]}</span>
            </div>
            <div className="rrow">
              <span>Time</span>
              <span id="rTime">{timeFormatted}</span>
            </div>
            <div className="rrow">
              <span>Services</span>
              <span id="rSvc">
                {activeServices.length > 0 ? activeServices.map((s) => s.n).join(', ') : 'None selected'}
              </span>
            </div>
            <div className="rrow">
              <span>Subtotal</span>
              <span id="rSub">₹{subtotal}</span>
            </div>
            <div className="rrow">
              <span>Sample coupon</span>
              <span id="rCoupon">{coupon ? `−₹${coupon}` : '₹0'}</span>
            </div>
            <div className="rrow">
              <span>Platform fee</span>
              <span id="rFee">₹{platformFee}</span>
            </div>
            <div className="rrow">
              <span>Duration</span>
              <span id="rDur">{duration} min</span>
            </div>
            <div className="rtotal">
              <span>Total</span>
              <strong id="rTotal">₹{total}</strong>
            </div>

            <button
              className="btn solid"
              id="rBtn"
              type="button"
              disabled={subtotal === 0}
              onClick={() => setIsReserved(true)}
            >
              {isReserved ? 'Chair Reserved' : 'Reserve Chair'}
            </button>
            <p className="rmsg" id="rMsg">
              {subtotal === 0
                ? 'Select at least one service to continue.'
                : isReserved
                ? 'This is a demo, so no booking was made. Download the app to book for real.'
                : ''}
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
