import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { customerApi } from '../../api/customer';
import { ExperienceCard } from '../../components/experience/ExperienceCard';
import { Compass, Flame, Clock, Users, MapPin, ArrowRight, Calendar, Sparkles, ShieldCheck } from 'lucide-react';

export const ExperienceDetails = () => {
  const [experiences, setExperiences] = useState([]);
  const [selectedType, setSelectedType] = useState('All');
  const [loading, setLoading] = useState(true);

  const categories = [
    'All',
    'Guided Trek',
    'Campfire',
    'Outdoor Activity',
    'Local Food Experience',
    'Adventure',
    'Cultural Experience',
  ];

  useEffect(() => {
    const fetchExperiences = async () => {
      setLoading(true);
      try {
        const data = await customerApi.getExperiences({
          experience_type: selectedType === 'All' ? undefined : selectedType,
        });
        setExperiences(data || []);
      } catch (err) {
        console.error('Error loading experiences:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExperiences();
  }, [selectedType]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Hero Banner */}
      <div className="bg-gradient-to-br from-[#091B29] via-[#0F273D] to-[#087F8C] rounded-3xl p-8 sm:p-12 text-white shadow-2xl mb-10 relative overflow-hidden border border-teal-500/20">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#0F9D9A]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -top-20 w-60 h-60 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#087F8C]/30 text-xs font-bold text-[#27B7A8] border border-teal-400/30 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#F6C945]" />
            <span>Stay Partner-Led Adventures & Authentic Moments</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-serif text-white tracking-tight leading-tight">
            Voyara Experiences & Events
          </h1>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-light max-w-2xl">
            Discover guided treks, starlit acoustic campfires, local culinary trails, and sea kayaking directly curated and hosted by our verified property partners across India.
          </p>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center space-x-2.5 overflow-x-auto pb-4 mb-8 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedType(cat)}
            className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedType === cat
                ? 'bg-gradient-to-r from-orange-500 to-[#EA580C] text-white shadow-lg shadow-orange-500/25 scale-102'
                : 'bg-white dark:bg-[#0F273D] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-xs'
            }`}
          >
            {cat === 'All' ? '✨ All Activities' : cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Curating host experiences...</p>
        </div>
      ) : experiences.length === 0 ? (
        <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-16 text-center border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
            <Flame className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white">No experiences found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">
            No events found under "{selectedType}". Try choosing another activity category or check back soon as hosts add seasonal experiences.
          </p>
          <button
            onClick={() => setSelectedType('All')}
            className="px-5 py-2 rounded-xl bg-[#087F8C] text-white text-xs font-bold hover:bg-[#0F9D9A] transition-all cursor-pointer"
          >
            Show All Activities
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {experiences.map((exp) => (
            <ExperienceCard key={exp.id} experience={exp} />
          ))}
        </div>
      )}
    </div>
  );
};
