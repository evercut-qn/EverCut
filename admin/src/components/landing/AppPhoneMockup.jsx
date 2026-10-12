'use client';

import React, { useState } from 'react';
import { Compass, Scissors, Clock, Receipt, Bell, Star, ShieldCheck, MapPin, CheckCircle2 } from 'lucide-react';

/**
 * Realistic mobile phone frame with screen content.
 * Gracefully displays real screenshot or interactive high-fidelity fallback screen.
 */
export function AppPhoneMockup({
  screenType = 'dashboard',
  imageSrc,
  alt = 'EverCut App Screen',
  className = '',
  priority = false
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className={`relative w-full mx-auto select-none flex justify-center items-center ${className}`}>
      {imageSrc && !imageError ? (
        <div className="relative w-auto max-w-full flex justify-center transition-transform duration-300 hover:scale-[1.01]">
          <img
            src={imageSrc}
            alt={alt}
            className="w-auto max-w-full max-h-[60vh] sm:max-h-[72vh] lg:max-h-[620px] xl:max-h-[660px] h-auto object-contain real-phone-shadow mx-auto block rounded-[24px] sm:rounded-[28px]"
            onError={() => setImageError(true)}
            loading={priority ? 'eager' : 'lazy'}
          />
        </div>
      ) : (
        /* Fallback mockup if image fails to load */
        <div className="relative w-full max-w-[310px] sm:max-w-[340px] rounded-[40px] p-2.5 bg-[#0A0E15] border-[3px] border-slate-700/80 shadow-2xl real-phone-shadow overflow-hidden">
          {/* Dynamic Island / Speaker Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-20 flex items-center justify-end pr-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#18202C] border border-slate-700"></div>
          </div>

          <div className="relative rounded-[32px] overflow-hidden bg-[#0F141C] text-slate-100 min-h-[580px] flex flex-col justify-between p-4 pt-8">
              
              {/* Status Bar */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-4 px-1">
                <span>09:41</span>
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <div className="w-4 h-2 rounded-sm border border-slate-400 p-0.5 flex items-center">
                    <div className="w-full h-full bg-evercut-green rounded-2xs"></div>
                  </div>
                </div>
              </div>

              {screenType === 'dashboard' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Location</p>
                      <p className="text-xs font-bold text-white flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-evercut-green" /> Kandri, Nagpur
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-evercut-green/20 border border-evercut-green/40 flex items-center justify-center text-evercut-green font-bold text-xs">
                      A
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-evercut-green/30">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-evercut-green text-black">
                      Area Rates
                    </span>
                    <h5 className="text-xs font-extrabold text-white mt-1.5">Instant 5-Min Slot Booking</h5>
                    <p className="text-[10px] text-slate-300 mt-0.5">Skip salon waiting chairs permanently.</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-300 mb-2">Nearby Featured Parlors</p>
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">Artwood Salon</p>
                          <p className="text-[10px] text-slate-400">Haircut, Beard Trim • 0.8 km</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-evercut-green">From ₹84</span>
                          <span className="block text-[9px] text-emerald-400">Open Now</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">Men Super Salon</p>
                          <p className="text-[10px] text-slate-400">Styling, Facial • 1.2 km</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-evercut-green">From ₹99</span>
                          <span className="block text-[9px] text-emerald-400">4 Chairs Ready</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {screenType === 'services' && (
                <div className="space-y-3">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-xs font-bold text-white">Artwood Salon Menu</p>
                    <p className="text-[10px] text-slate-400">Verified Local Rates • Unisex</p>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-white">Beard Trimming & Shape</p>
                        <p className="text-[10px] text-slate-400">20 mins duration</p>
                        <span className="text-[9px] text-emerald-400 font-medium">₹15 OFF Applied</span>
                      </div>
                      <span className="text-xs font-bold text-evercut-green">₹84</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-white">Haircut + Scalp Massage</p>
                        <p className="text-[10px] text-slate-400">35 mins duration</p>
                        <span className="text-[9px] text-emerald-400 font-medium">₹25 OFF Applied</span>
                      </div>
                      <span className="text-xs font-bold text-evercut-green">₹149</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-white">Hair Colouring Pro</p>
                        <p className="text-[10px] text-slate-400">50 mins duration</p>
                        <span className="text-[9px] text-emerald-400 font-medium">₹50 OFF Applied</span>
                      </div>
                      <span className="text-xs font-bold text-evercut-green">₹319</span>
                    </div>
                  </div>
                </div>
              )}

              {screenType === 'schedule' && (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-400">Selected Specialist</p>
                    <p className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Shankya Mali</span>
                      <span className="text-[10px] text-evercut-green font-semibold">Master Barber</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 mb-1 font-semibold uppercase">Exact 5-Min Time Slots</p>
                    <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                      <div className="p-2 rounded-lg bg-slate-800 text-slate-400 line-through">09:00</div>
                      <div className="p-2 rounded-lg bg-slate-800 text-slate-400 line-through">09:05</div>
                      <div className="p-2 rounded-lg bg-evercut-green text-white font-bold ring-2 ring-emerald-400">09:10</div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200">09:15</div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200">09:20</div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200">09:25</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-evercut-green/30 text-[10px] text-slate-300">
                    <span className="font-bold text-evercut-green">Zero Wait Policy:</span> Chair reserved for exactly 09:10 AM.
                  </div>
                </div>
              )}

              {screenType === 'bill' && (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-xs font-bold text-white">Bill Breakdown</p>
                    <p className="text-[10px] text-slate-400">Artwood Salon • Shankya Mali</p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Haircut + Beard Trim</span>
                      <span>₹180.00</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>Salon Coupon Discount</span>
                      <span>- ₹25.00</span>
                    </div>
                    <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                      <span>Subtotal</span>
                      <span>₹155.00</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Platform Convenience Fee</span>
                      <span className="font-semibold text-slate-200">₹4.00</span>
                    </div>
                    <div className="flex justify-between font-bold text-white pt-2 border-t border-slate-700 text-sm">
                      <span>Grand Total</span>
                      <span className="text-evercut-green">₹159.00</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                    ✓ Protected by 100% Merchant Cancel Refund Guarantee
                  </div>
                </div>
              )}

              {screenType === 'notify' && (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-evercut-green" /> Live Notifications
                    </p>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-evercut-green/40">
                      <p className="font-bold text-white">Appointment Confirmed</p>
                      <p className="text-[10px] text-slate-400">Artwood Salon has locked your 09:10 AM chair.</p>
                      <span className="text-[9px] text-slate-500">2 mins ago</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <p className="font-bold text-white">Barber Replied to Review</p>
                      <p className="text-[10px] text-slate-400">Shankya Mali: &quot;Thank you! Looking forward to next visit.&quot;</p>
                      <span className="text-[9px] text-slate-500">1 hour ago</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <p className="font-bold text-white">Reminder Alert</p>
                      <p className="text-[10px] text-slate-400">Your appointment is scheduled for tomorrow.</p>
                      <span className="text-[9px] text-slate-500">Yesterday</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom In-App Nav Bar */}
              <div className="pt-4 border-t border-slate-800 flex justify-around text-slate-500">
                <Compass className={`w-4 h-4 ${screenType === 'dashboard' ? 'text-evercut-green' : ''}`} />
                <Scissors className={`w-4 h-4 ${screenType === 'services' ? 'text-evercut-green' : ''}`} />
                <Clock className={`w-4 h-4 ${screenType === 'schedule' ? 'text-evercut-green' : ''}`} />
                <Bell className={`w-4 h-4 ${screenType === 'notify' ? 'text-evercut-green' : ''}`} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
