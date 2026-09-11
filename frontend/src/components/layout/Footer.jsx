import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Compass, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-[#087F8C] dark:bg-[#091B29] text-white pt-16 pb-12 border-t border-white/15 shadow-inner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-4">
            <Link to="/" className="inline-block group">
              <img
                src="/logo.png"
                alt="VOYARA"
                className="h-16 w-auto object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
            <p className="text-xs text-white/80 leading-relaxed">
              Voyara connects discerning travelers with extraordinary accommodations and curated local adventures, secured by the VeriNova transaction verification layer.
            </p>
            <div className="pt-2 flex items-center space-x-2 text-xs text-[#F6C945]">
              <ShieldCheck className="w-4 h-4 text-[#F6C945]" />
              <span className="font-bold tracking-wide">Stay. Explore. Experience.</span>
            </div>
          </div>

          {/* Stays & Types */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#F6C945] mb-4">Stay Categories</h4>
            <ul className="space-y-2.5 text-xs text-white/90 font-medium">
              <li><Link to="/search?property_type=Resort" className="hover:text-[#F97316] transition-colors">Luxury Resorts</Link></li>
              <li><Link to="/search?property_type=Villa" className="hover:text-[#F97316] transition-colors">Seaside & Cliff Villas</Link></li>
              <li><Link to="/search?property_type=Homestay" className="hover:text-[#F97316] transition-colors">Authentic Homestays</Link></li>
              <li><Link to="/search?property_type=Camp" className="hover:text-[#F97316] transition-colors">Glamping & Beach Camps</Link></li>
              <li><Link to="/search?property_type=Cottage" className="hover:text-[#F97316] transition-colors">Mountain Cottages</Link></li>
              <li><Link to="/search?property_type=Hotel" className="hover:text-[#F97316] transition-colors">Boutique & Heritage Hotels</Link></li>
            </ul>
          </div>

          {/* Experiences */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#F6C945] mb-4">Experiences</h4>
            <ul className="space-y-2.5 text-xs text-white/90 font-medium">
              <li><Link to="/experiences" className="hover:text-[#F97316] transition-colors">Guided Mountain Treks</Link></li>
              <li><Link to="/experiences" className="hover:text-[#F97316] transition-colors">Starlit Campfires & Nights</Link></li>
              <li><Link to="/experiences" className="hover:text-[#F97316] transition-colors">Spice Trails & Cooking</Link></li>
              <li><Link to="/experiences" className="hover:text-[#F97316] transition-colors">Sea Kayaking & Adventures</Link></li>
              <li><Link to="/experiences" className="hover:text-[#F97316] transition-colors">Heritage Walks</Link></li>
            </ul>
          </div>

          {/* Providers, Trust & Support */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#F6C945] mb-4">Support & Trust</h4>
            <ul className="space-y-2.5 text-xs text-white/90 font-medium">
              <li><Link to="/support" className="hover:text-[#F97316] transition-colors text-[#DDF3E7] font-semibold">Help & Support Desk</Link></li>
              <li><a href="mailto:adminvoyara@gmail.com" className="hover:text-[#F97316] transition-colors font-semibold text-white/90">Contact: adminvoyara@gmail.com</a></li>
              <li><Link to="/register?role=HOST" className="hover:text-[#F97316] transition-colors">Become a Stay Partner</Link></li>
              <li><Link to="/login" className="hover:text-[#F97316] transition-colors">Stay Partner Portal</Link></li>
              <li><Link to="/#verinova" className="hover:text-[#F97316] transition-colors">VeriNova Trust Standards</Link></li>
              <li><span className="text-white/60 cursor-default">Terms & Booking Protection</span></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between text-xs text-white/75">
          <p>© {new Date().getFullYear()} Voyara Marketplace Inc. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 flex items-center space-x-1">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-[#F97316] fill-[#F97316]" />
            <span>for authentic travel discovery across India</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

