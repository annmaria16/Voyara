import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, ShieldCheck, ArrowRight, Users } from 'lucide-react';
import { resolveImageUrl } from '../../utils/imageUrl';

export const PropertyCard = ({ property }) => {
  const rawImg =
    property.images?.find((img) => img.is_primary)?.image_url ||
    property.images?.[0]?.image_url ||
    (typeof property.images?.[0] === 'string' ? property.images[0] : null) ||
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';

  const primaryImg = resolveImageUrl(rawImg);

  const getTypeBadge = (type) => {
    switch (type?.toLowerCase()) {
      case 'resort':
        return 'bg-[#087F8C] text-white';
      case 'villa':
        return 'bg-[#F97316] text-white';
      case 'homestay':
        return 'bg-[#0F9D9A] text-white';
      case 'camp':
        return 'bg-[#35A66F] text-white';
      case 'cottage':
        return 'bg-[#17324D] text-white';
      default:
        return 'bg-[#087F8C] text-white';
    }
  };

  const startingPrice = property.min_price || property.rooms?.[0]?.base_price || 3500;
  const maxCapacity = property.max_capacity || property.rooms?.[0]?.capacity || 2;

  return (
    <div className="group card-voyara card-lift rounded-3xl overflow-hidden flex flex-col justify-between">
      {/* Image Container */}
      <div className="relative aspect-4/3 overflow-hidden bg-slate-100 dark:bg-slate-800 img-zoom-container">
        <img
          src={primaryImg}
          alt={property.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Property Type Badge */}
        <span
          className={`absolute top-3.5 left-3.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm ${getTypeBadge(
            property.property_type
          )}`}
        >
          {property.property_type}
        </span>

        {/* Voyara Trust indicator */}
        <div className="absolute top-3.5 right-3.5">
          <span
            title="This property has passed Voyara's platform verification and administrative review."
            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white/95 dark:bg-[#091B29]/90 backdrop-blur-md rounded-full text-[11px] font-bold text-[#236C48] dark:text-[#35A66F] shadow-xs border border-[#35A66F]/30"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#35A66F]" />
            <span>✓ Voyara Verified Stay</span>
          </span>
        </div>

        {/* Location & Rating on overlay bottom */}
        <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-white text-xs">
          <div className="flex items-center space-x-1 drop-shadow-md truncate">
            <MapPin className="w-3.5 h-3.5 text-[#27B7A8] shrink-0" />
            <span className="font-medium truncate">{property.city || property.district || 'Kerala'}, {property.state || 'India'}</span>
          </div>
          <div className="flex items-center space-x-1 bg-black/40 backdrop-blur-xs px-2.5 py-0.5 rounded-full shrink-0">
            <Star className="w-3 h-3 text-[#F6C945] fill-[#F6C945]" />
            <span className="font-bold">{property.rating?.toFixed(1) || '4.8'}</span>
            <span className="text-white/70 text-[10px]">({property.review_count || 14})</span>
          </div>
        </div>
      </div>

      {/* Body Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3 bg-white dark:bg-[#0F273D]">
        <div>
          <h3 className="text-base sm:text-lg font-bold font-serif text-[#17324D] dark:text-white group-hover:text-[#087F8C] dark:group-hover:text-[#27B7A8] transition-colors line-clamp-1">
            {property.name}
          </h3>
          {(property.provider_business_name || property.host_name) && (
            <span className="text-[11px] font-semibold text-[#087F8C] dark:text-[#27B7A8] block mt-0.5">
              Stay Partner: {property.provider_business_name || property.host_name}
            </span>
          )}
          <p className="text-xs text-[#607080] dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed font-light">
            {property.description}
          </p>

          <div className="flex items-center space-x-3 mt-3 text-xs text-[#607080] dark:text-slate-400 font-medium">
            <span className="inline-flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-[#087F8C] dark:text-[#27B7A8]" />
              <span>Up to {maxCapacity} Guests</span>
            </span>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Starting from</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-lg font-bold text-[#F97316] font-serif">
                ₹{Number(startingPrice).toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-slate-400">/ night</span>
            </div>
          </div>

          <Link
            to={`/properties/${property.id}`}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F97316] to-[#FF8A3D] hover:from-[#FF8A3D] hover:to-[#F97316] text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 group-hover:shadow-lg cursor-pointer font-sans"
          >
            <span>View Stay</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;


