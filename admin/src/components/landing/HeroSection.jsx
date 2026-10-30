'use client';

import React, { useRef, useState, useEffect } from 'react';

export function HeroSection() {
  const stageRef = useRef(null);
  const tiltRef = useRef(null);
  const [isLive, setIsLive] = useState(false);
  const [baseTransform, setBaseTransform] = useState('rotateX(6deg) rotateY(-16deg) rotateZ(1deg)');
  const [customStyle, setCustomStyle] = useState({});

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
          ticking = false;
          const p = Math.min(Math.max(window.scrollY / 650, 0), 1);
          const x = 6 * (1 - p);
          const y = -16 * (1 - p);
          const z = 1 - p;
          const transform = `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;
          setBaseTransform(transform);
          if (!isLive) {
            setCustomStyle({ transform });
          }
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLive]);

  const handlePointerMove = (e) => {
    if (e.pointerType === 'touch') return;
    const host = stageRef.current;
    if (!host) return;

    const rect = host.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;

    setIsLive(true);
    setCustomStyle({
      transform: `rotateX(${6 - py * 10}deg) rotateY(${-16 + px * 14}deg) rotateZ(1deg)`
    });
  };

  const handlePointerLeave = () => {
    setIsLive(false);
    setCustomStyle({ transform: baseTransform });
  };

  return (
    <header className="hero" id="top">
      <div className="field" style={{ width: 380, height: 380, bottom: -60, right: '18%' }}></div>
      <div className="wrap">
        <div>
          <div className="status raised">
            <i></i>Live on Google Play. Instant salon booking.
          </div>
          <h1>Book nearby salons and stylists in seconds.</h1>
          <p className="lede">
            Discover premier salons like Artwood Salon and Men Super Salon. Pick your barber, book an exact 5-minute slot, and unlock instant discounts on every haircut, trim and facial.
          </p>
          <div className="cta">
            <a
              className="btn solid"
              href="https://play.google.com/store/apps/details?id=com.quantneural.evercut.customer"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download for customers
            </a>
            <a
              className="btn soft"
              href="https://play.google.com/store/apps/details?id=com.quantneural.evercut.merchant"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download for merchants
            </a>
          </div>
        </div>

        <div
          className="stage"
          id="heroStage"
          ref={stageRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <div
            className={`tilt ${isLive ? 'live' : ''}`}
            ref={tiltRef}
            style={customStyle}
          >
            <div className="phone">
              <div className="screen" id="heroScreen">
                <div className="scr on">
                  <small>Nearby salons</small>
                  <h4>Find your next haircut</h4>
                  <div className="search">Search salons, styles, treatments</div>
                  <div className="seg">
                    <span className="a">Male</span>
                    <span>Female</span>
                  </div>
                  <div className="sc">
                    <div className="row">
                      <b>Men Super Salon</b>
                      <span className="tag">Open</span>
                    </div>
                    <small>Haircut, beard, facial</small>
                  </div>
                  <div className="sc">
                    <div className="row">
                      <b>Artwood Salon</b>
                      <span className="tag">Open</span>
                    </div>
                    <small>Styling, color, spa</small>
                  </div>
                  <div className="sc">
                    <small>Suggestions are based on your location.</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="chip glass c1">
              <b>Artwood Salon</b>
              <span>Open now</span>
            </div>
            <div className="chip glass c2">
              <b>10:15 am with Shankya Mali</b>
              <span>5-minute slot reserved</span>
            </div>
            <div className="chip glass c3">
              <b>Booking confirmed</b>
              <span>Your chair is waiting</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
