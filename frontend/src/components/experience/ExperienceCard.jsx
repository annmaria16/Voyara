import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, Flame, Compass, Utensils, Map, Sparkles, ArrowRight } from 'lucide-react';

export const ExperienceCard = ({ experience }) => {
  const getIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'campfire':
        return <Flame className="w-4 h-4 text-[#F97360]" />;
      case 'guided trek':
      case 'adventure':
        return <Compass className="w-4 h-4 text-emerald-500" />;
      case 'local food experience':
        return <Utensils className="w-4 h-4 text-orange-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
    }
  };

  const img =
    experience.image_url ||
    'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="group bg-white dark:bg-[#131D2E] rounded-2xl overflow-hidden border border-[#FDBA9A]/30 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 flex flex-col hover:-translate-y-1">
      {/* Image */}
      <div className="relative aspect-16/10 overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={img}
          alt={experience.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-full text-xs font-bold text-slate-800 dark:text-white shadow-sm border border-black/5 dark:border-slate-700">
            {getIcon(experience.experience_type)}
            <span>{experience.experience_type}</span>
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
          <span className="font-semibold truncate drop-shadow-md">
            {experience.property_name || 'Hosted at property'}
          </span>
          <div className="flex items-center space-x-1 bg-black/50 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-emerald-300 font-medium">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>{experience.duration}</span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h4 className="text-base font-bold font-serif text-slate-900 dark:text-white group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
            {experience.title}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {experience.description}
          </p>

          <div className="flex items-center space-x-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
              <span>
                Capacity: {experience.capacity} pax
                {experience.remaining_capacity !== undefined && (
                  <strong className="text-emerald-600 dark:text-emerald-400 ml-1">({experience.remaining_capacity} left)</strong>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing & Link */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-semibold">Experience Fee</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-base font-bold text-orange-600 dark:text-orange-400 font-serif">
                ₹{experience.price?.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                / {experience.pricing_model === 'per_person' ? 'person' : 'session'}
              </span>
            </div>
          </div>

          <Link
            to={`/properties/${experience.property_id}`}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 hover:text-white dark:bg-orange-500/20 dark:text-orange-300 dark:hover:bg-orange-500 dark:hover:text-white text-xs font-bold border border-orange-500/30 transition-all cursor-pointer"
          >
            <span>View Stay</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};
