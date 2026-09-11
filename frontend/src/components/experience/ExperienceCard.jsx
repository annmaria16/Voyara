import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, Flame, Compass, Utensils, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export const ExperienceCard = ({ experience }) => {
  const getIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'campfire':
        return <Flame className="w-4 h-4 text-orange-500" />;
      case 'guided trek':
      case 'adventure':
        return <Compass className="w-4 h-4 text-[#087F8C]" />;
      case 'local food experience':
        return <Utensils className="w-4 h-4 text-[#EA580C]" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#0F9D9A]" />;
    }
  };

  const img =
    experience.image_url ||
    'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="group bg-white dark:bg-[#0F273D] rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-[#087F8C]/10 transition-all duration-300 flex flex-col hover:-translate-y-1.5">
      {/* Image Container */}
      <div className="relative aspect-16/10 overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={img}
          alt={experience.title}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

        <div className="absolute top-3.5 left-3.5">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/95 dark:bg-[#091B29]/90 backdrop-blur-md rounded-full text-xs font-bold text-slate-800 dark:text-white shadow-md border border-black/5 dark:border-slate-700">
            {getIcon(experience.experience_type)}
            <span>{experience.experience_type}</span>
          </span>
        </div>

        <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between text-white text-xs">
          <span className="font-semibold truncate drop-shadow-md text-slate-100">
            {experience.property_name || 'Hosted at property'}
          </span>
          <div className="flex items-center space-x-1 bg-[#091B29]/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[#27B7A8] font-bold border border-teal-500/20">
            <Clock className="w-3 h-3 text-[#27B7A8]" />
            <span>{experience.duration}</span>
          </div>
        </div>
      </div>

      {/* Content Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h4 className="text-base font-bold font-serif text-slate-900 dark:text-white group-hover:text-[#087F8C] dark:group-hover:text-[#27B7A8] transition-colors line-clamp-1">
            {experience.title}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed font-light">
            {experience.description}
          </p>

          <div className="flex items-center space-x-3 mt-3.5 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <Users className="w-3.5 h-3.5 text-orange-500" />
              <span>
                Capacity: <strong>{experience.capacity} pax</strong>
                {experience.remaining_capacity !== undefined && (
                  <span className="text-[#35A66F] font-bold ml-1.5">({experience.remaining_capacity} left)</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing & Link */}
        <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Experience Fee</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-lg font-black text-orange-600 dark:text-orange-400 font-serif">
                ₹{experience.price?.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                / {experience.pricing_model === 'per_person' ? 'person' : 'session'}
              </span>
            </div>
          </div>

          <Link
            to={`/properties/${experience.property_id}`}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#0F9D9A] hover:to-[#27B7A8] text-white text-xs font-bold shadow-md shadow-teal-700/20 hover:shadow-lg transition-all cursor-pointer group-hover:scale-102"
          >
            <span>View Stay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
