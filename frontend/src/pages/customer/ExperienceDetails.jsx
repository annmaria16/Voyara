import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { customerApi } from '../../api/customer';
import { ExperienceCard } from '../../components/experience/ExperienceCard';
import { Compass, Flame, Clock, Users, MapPin, ArrowRight, Calendar, Sparkles } from 'lucide-react';

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
        setExperiences(data);
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
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl mb-10 relative overflow-hidden border border-emerald-500/20">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300 border border-emerald-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Host-Led Adventures</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-serif text-white">
            Voyara Experiences & Events
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed font-light">
            Discover guided treks, starlit acoustic campfires, local culinary trails, and sea kayaking directly hosted by our verified property partners.
          </p>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedType(cat)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedType === cat
                ? 'bg-gradient-to-r from-[#F97360] to-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-orange-500/10 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {cat === 'All' ? '✨ All Activities' : cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : experiences.length === 0 ? (
        <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-16 text-center border border-[#FDBA9A]/30 dark:border-slate-800 space-y-3 shadow-sm">
          <Flame className="w-10 h-10 text-orange-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No experiences found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Try choosing a different activity category.</p>
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
