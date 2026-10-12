'use client';

import React from 'react';
import { Store } from 'lucide-react';
import { AppPhoneMockup } from './AppPhoneMockup';

export function HeroSection() {
  return (
    <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Hero Text & Call to Actions */}
          <div className="lg:col-span-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-evercut-green/10 border border-evercut-green/30 text-evercut-green text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-evercut-green animate-ping"></span>
              Live On Google Play &bull; Instant Salon Booking
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-heading text-white tracking-tight leading-[1.14] mb-6">
              Book Nearby Salons & <br className="hidden sm:inline" />
              Stylists in <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500">Seconds</span>.
            </h1>

            <p className="text-slate-300 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto lg:mx-0 mb-8 leading-relaxed">
              Discover premier salons like <strong className="text-white">Artwood Salon</strong> & <strong className="text-white">Men Super Salon</strong>. Pick your barber, book exact 5-minute appointment slots, and unlock instant discounts on every haircut, trim, and facial.
            </p>

            {/* Google Play CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4">
              
              {/* Customer App */}
              <a
                href="https://play.google.com/store/search?q=evercut&c=apps"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 px-5 sm:px-6 py-3.5 rounded-2xl bg-black border border-slate-700 hover:border-evercut-green hover:shadow-lg hover:shadow-emerald-900/40 text-white transition-all transform hover:-translate-y-0.5 group w-full sm:w-auto justify-center sm:justify-start"
              >
                <svg className="w-8 h-8 shrink-0" viewBox="0 0 512 512">
                  <path fill="#4285F4" d="M32.5 24.1c-3.1 3.4-4.9 8.6-4.9 15.3v433.2c0 6.7 1.8 11.9 4.9 15.3l1.8 1.8L259 265v-18L34.3 22.3l-1.8 1.8z"/>
                  <path fill="#FBBC04" d="M334.3 340.3l-75.3-75.3v-18l75.3-75.3 1.7 1 89.2 50.7c25.5 14.5 25.5 38.3 0 52.8l-89.2 50.7-1.7-6.6z"/>
                  <path fill="#EA4335" d="M336 339.3L259 262.3 32.5 488.7c8.4 8.9 22.3 9.9 38 1l265.5-150.4"/>
                  <path fill="#34A853" d="M336 172.7L70.5 22.3c-15.7-8.9-29.6-7.9-38 1L259 249.7 336 172.7z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-slate-300">
                    Download For Customers
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white leading-tight flex items-center gap-1.5">
                    Google Play <span className="text-[10px] bg-evercut-green/20 text-evercut-green px-1.5 py-0.5 rounded font-mono font-semibold">User App</span>
                  </div>
                </div>
              </a>

              {/* Merchant App */}
              <a
                href="https://play.google.com/store/search?q=evercut%20partner&c=apps"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 px-5 sm:px-6 py-3.5 rounded-2xl bg-[#141A24] border border-slate-700/80 hover:border-emerald-400 hover:shadow-lg text-white transition-all transform hover:-translate-y-0.5 group w-full sm:w-auto justify-center sm:justify-start"
              >
                <Store className="w-7 h-7 text-evercut-green shrink-0" />
                <div className="text-left">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Download For Merchants
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white leading-tight flex items-center gap-1.5">
                    Google Play <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-semibold">Salon Partner</span>
                  </div>
                </div>
              </a>
            </div>

            {/* Feature Badges */}
            <div className="mt-8 sm:mt-10 grid grid-cols-3 gap-2 sm:gap-3 max-w-lg mx-auto lg:mx-0">
              <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center sm:text-left">
                <div className="text-base sm:text-xl font-extrabold text-evercut-green">Area Rates</div>
                <div className="text-[10px] sm:text-xs text-slate-400">Local Salon Pricing</div>
              </div>
              <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center sm:text-left">
                <div className="text-base sm:text-xl font-extrabold text-white">5 Mins</div>
                <div className="text-[10px] sm:text-xs text-slate-400">Time-Slot Precision</div>
              </div>
              <div className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center sm:text-left">
                <div className="text-base sm:text-xl font-extrabold text-emerald-400">0 Waiting</div>
                <div className="text-[10px] sm:text-xs text-slate-400">Reserved Chairs</div>
              </div>
            </div>
          </div>

          {/* Right Column: Phone Showcase with Ambient Glow */}
          <div className="lg:col-span-5 flex justify-center items-center mt-6 lg:mt-0">
            <div className="relative w-full max-w-[260px] xs:max-w-[280px] sm:max-w-[310px] lg:max-w-[330px] flex justify-center">
              {/* Ambient Glow */}
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/25 to-green-600/20 rounded-full blur-3xl opacity-70"></div>
              
              <div className="relative transition-transform duration-500 hover:scale-[1.02] flex justify-center w-full">
                <AppPhoneMockup
                  screenType="dashboard"
                  imageSrc="/screenshots/Screenshot_20261005_222943.png"
                  alt="Evercut Customer App Dashboard"
                  priority={true}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
