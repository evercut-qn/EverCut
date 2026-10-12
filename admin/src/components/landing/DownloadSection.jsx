'use client';

import React from 'react';
import { UserCheck, Scissors, Check } from 'lucide-react';

export function DownloadSection() {
  return (
    <section id="download-section" className="py-20 bg-evercut-cardDark/70 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-evercut-green/10 text-evercut-green border border-evercut-green/20">
            Two Apps &bull; One Connected Ecosystem
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-white mt-3">
            Download Evercut from Google Play
          </h2>
          <p className="text-slate-400 mt-3 text-sm sm:text-base">
            Select your application below to download the Android build immediately.
          </p>
        </div>

        {/* Dual Cards */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto">
          
          {/* Customer App Card */}
          <div className="bg-[#0D1219] rounded-3xl p-8 border border-slate-800 hover:border-evercut-green transition-all duration-300 flex flex-col justify-between shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-evercut-green/10 rounded-full blur-3xl group-hover:bg-evercut-green/20 transition-all"></div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#092B19] border border-evercut-green/40 flex items-center justify-center text-evercut-green shadow">
                  <UserCheck className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-evercut-green/10 text-evercut-green border border-evercut-green/20">
                  For Clients
                </span>
              </div>

              <h3 className="text-2xl font-bold font-heading text-white mb-2">Evercut: Customer App</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Skip salon waiting rooms permanently. Browse neighborhood salons, choose your favorite barber, and reserve guaranteed 5-minute appointment slots.
              </p>

              <div className="space-y-3 mb-8 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-evercut-green shrink-0" />
                  <span>Discover top rated salons like Men Super Salon & Artwood</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-evercut-green shrink-0" />
                  <span>Select your specific stylist (e.g. Shankya Mali)</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-evercut-green shrink-0" />
                  <span>Zero surprise bills: transparent summary with platform fee</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-evercut-green shrink-0" />
                  <span>Instant notifications on booking status & barber confirmations</span>
                </div>
              </div>
            </div>

            {/* Direct Google Play Link */}
            <div className="pt-6 border-t border-slate-800">
              <a
                href="https://play.google.com/store/apps/details?id=in.evercut.customer"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3.5 px-6 py-4 rounded-2xl bg-black border border-slate-700 hover:border-evercut-green text-white font-bold transition shadow-lg group-hover:shadow-emerald-950/50"
              >
                <svg className="w-7 h-7 shrink-0" viewBox="0 0 512 512">
                  <path fill="#4285F4" d="M32.5 24.1c-3.1 3.4-4.9 8.6-4.9 15.3v433.2c0 6.7 1.8 11.9 4.9 15.3l1.8 1.8L259 265v-18L34.3 22.3l-1.8 1.8z"/>
                  <path fill="#FBBC04" d="M334.3 340.3l-75.3-75.3v-18l75.3-75.3 1.7 1 89.2 50.7c25.5 14.5 25.5 38.3 0 52.8l-89.2 50.7-1.7-6.6z"/>
                  <path fill="#EA4335" d="M336 339.3L259 262.3 32.5 488.7c8.4 8.9 22.3 9.9 38 1l265.5-150.4"/>
                  <path fill="#34A853" d="M336 172.7L70.5 22.3c-15.7-8.9-29.6-7.9-38 1L259 249.7 336 172.7z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] uppercase font-bold text-slate-400">GET IT ON</div>
                  <div className="text-base font-bold text-white leading-tight">Google Play</div>
                </div>
              </a>
            </div>
          </div>

          {/* Merchant App Card */}
          <div
            id="merchants"
            className="bg-[#0D1219] rounded-3xl p-8 border border-slate-800 hover:border-emerald-400 transition-all duration-300 flex flex-col justify-between shadow-xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#14231E] border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow">
                  <Scissors className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-400/20">
                  For Salons & Stylists
                </span>
              </div>

              <h3 className="text-2xl font-bold font-heading text-white mb-2">Evercut: Merchant Partner</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Empower your salon business. Maximize chair utilization, eliminate idle hours, manage barbers&apos; schedules, and receive verified client bookings.
              </p>

              <div className="space-y-3 mb-8 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Real-time queue & digital appointment management</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Roster control: assign walk-ins or online bookings to specific chairs</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Instant reply to client reviews & ratings directly from the app</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Direct UPI bank settlements with complete commission transparency</span>
                </div>
              </div>
            </div>

            {/* Direct Google Play Link for Merchant */}
            <div className="pt-6 border-t border-slate-800">
              <a
                href="https://play.google.com/store/apps/details?id=in.evercut.merchant"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3.5 px-6 py-4 rounded-2xl bg-black border border-slate-700 hover:border-emerald-400 text-white font-bold transition shadow-lg group-hover:shadow-emerald-950/50"
              >
                <svg className="w-7 h-7 shrink-0" viewBox="0 0 512 512">
                  <path fill="#4285F4" d="M32.5 24.1c-3.1 3.4-4.9 8.6-4.9 15.3v433.2c0 6.7 1.8 11.9 4.9 15.3l1.8 1.8L259 265v-18L34.3 22.3l-1.8 1.8z"/>
                  <path fill="#FBBC04" d="M334.3 340.3l-75.3-75.3v-18l75.3-75.3 1.7 1 89.2 50.7c25.5 14.5 25.5 38.3 0 52.8l-89.2 50.7-1.7-6.6z"/>
                  <path fill="#EA4335" d="M336 339.3L259 262.3 32.5 488.7c8.4 8.9 22.3 9.9 38 1l265.5-150.4"/>
                  <path fill="#34A853" d="M336 172.7L70.5 22.3c-15.7-8.9-29.6-7.9-38 1L259 249.7 336 172.7z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] uppercase font-bold text-slate-400">GET IT ON</div>
                  <div className="text-base font-bold text-white leading-tight">Google Play Partner</div>
                </div>
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
