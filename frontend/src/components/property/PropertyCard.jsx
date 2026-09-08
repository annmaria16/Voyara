import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { resolveImageUrl } from '../../utils/imageUrl';

export const PropertyCard = ({ property }) => {
  const rawImg =
    property.images?.find((img) => img.is_primary)?.image_url ||
    property.images?.[0]?.image_url ||
    (typeof property.images?.[0] === 'string' ? property.images[0] : null) ||
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';

  const primaryImg = resolveImageUrl(rawImg);

  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'resort':
        return 'bg-emerald-600 text-white';
      case 'villa':
        return 'bg-orange-600 text-white';
      case 'homestay':
        return 'bg-amber-600 text-white';
      case 'camp':
        return 'bg-teal-700 text-white';
      case 'cottage':
        return 'bg-[#F97360] text-white';
      default:
        return 'bg-emerald-700 text-white';
    }
  };

  return (
    <div className="group bg-white dark:bg-[#131D2E] rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col hover:-translate-y-1">
      {/* Image Container */}
      <div className="relative aspect-4/3 overflow-hidden bg-gray-100 dark:bg-slate-800">
        <img
          src={primaryImg}
          alt={property.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-80" />

        {/* Property Type Badge */}
        <span
          className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md ${getTypeColor(
            property.property_type
          )}`}
        >
          {property.property_type}
        </span>

        {/* VeriNova Trust indicator */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-full text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Verified Stay</span>
          </span>
        </div>

        {/* Location & Rating on overlay bottom */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
          <div className="flex items-center space-x-1 drop-shadow-md truncate">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-medium truncate">{property.city}, {property.state}</span>
          </div>
          <div className="flex items-center space-x-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="font-bold">{property.rating?.toFixed(1) || '4.8'}</span>
            <span className="text-white/70 text-[10px]">({property.review_count || 12})</span>
          </div>
        </div>
      </div>

      {/* Body Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold font-serif text-[#102A43] dark:text-white group-hover:text-[#F97360] transition-colors line-clamp-1">
            {property.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {property.description}
          </p>

          {/* Amenities Preview */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {property.amenities.slice(0, 3).map((am, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold"
                >
                  {am.amenity_name || am}
                </span>
              ))}
              {property.amenities.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 text-slate-400 font-medium">
                  +{property.amenities.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Price & CTA */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Starting from</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-lg font-bold text-[#F97360] font-serif">
                ₹{property.min_price ? property.min_price.toLocaleString('en-IN') : '2,500'}
              </span>
              <span className="text-xs text-slate-400">/ night</span>
            </div>
          </div>

          <Link
            to={`/properties/${property.id}`}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white text-xs font-bold transition-all shadow-md shadow-[#F97360]/20 group-hover:shadow-lg cursor-pointer"
          >
            <span>View Place</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
