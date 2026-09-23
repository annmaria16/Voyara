import React, { useEffect, useState, useMemo } from 'react';
import { providerApi } from '../../api/provider';
import {
  Star,
  Sparkles,
  ShieldCheck,
  Building2,
  Calendar,
  MessageSquare,
  TrendingUp,
  Filter,
  CheckCircle2,
  User,
  Award,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  MapPin,
  ExternalLink,
  Search,
  RefreshCw,
} from 'lucide-react';

export const ProviderReviews = () => {
  const [reviewsData, setReviewsData] = useState(null);
  const [propertiesList, setPropertiesList] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [selectedPropertyDetails, setSelectedPropertyDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [starFilter, setStarFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch all property summaries & global review stats with dual-source fallback
  const fetchAllReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const [revsResult, propsResult] = await Promise.allSettled([
        providerApi.getReviews(),
        providerApi.getProperties(),
      ]);

      const revs = revsResult.status === 'fulfilled' ? revsResult.value : null;
      const props = propsResult.status === 'fulfilled' && Array.isArray(propsResult.value) ? propsResult.value : [];

      setReviewsData(revs);

      // Merge reviewsData.properties with propsResult to ensure 100% of owned properties are listed
      const reviewPropsMap = new Map();
      if (revs?.properties && Array.isArray(revs.properties)) {
        revs.properties.forEach((p) => {
          reviewPropsMap.set(p.property_id, p);
        });
      }

      // Add any property from getProperties that might not be in reviewPropsMap
      const mergedList = [];
      const seenIds = new Set();

      // First include all from revs.properties
      if (revs?.properties && Array.isArray(revs.properties)) {
        revs.properties.forEach((p) => {
          mergedList.push(p);
          seenIds.add(p.property_id);
        });
      }

      // Then supplement from props if missing
      props.forEach((p) => {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          const primaryImg = p.images && p.images.length > 0 ? (typeof p.images[0] === 'string' ? p.images[0] : p.images[0].image_url) : null;
          mergedList.push({
            property_id: p.id,
            property_name: p.name,
            property_type: p.property_type,
            city: p.city,
            state: p.state,
            country: p.country,
            image_url: primaryImg,
            average_rating: p.rating || 0.0,
            review_count: p.review_count || 0,
            rating_distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
            rating_breakdown: { cleanliness: 0, staff: 0, location: 0, value: 0 },
            reviews: [],
          });
        }
      });

      setPropertiesList(mergedList);
    } catch (err) {
      setError(err.message || 'Failed to load guest reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReviews();
  }, []);

  // Fetch individual property reviews when selected
  const handleSelectProperty = async (propSummary) => {
    const propId = propSummary.property_id || propSummary.id;
    setSelectedPropertyId(propId);
    setSelectedPropertyDetails(propSummary); // initialize with summary data immediately
    setStarFilter('ALL');
    setSearchTerm('');
    setDetailLoading(true);

    try {
      const details = await providerApi.getPropertyReviews(propId);
      setSelectedPropertyDetails(details);
    } catch (err) {
      console.warn('Failed to fetch detailed property reviews from dedicated endpoint, using summary data:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBackToOverview = () => {
    setSelectedPropertyId(null);
    setSelectedPropertyDetails(null);
    setStarFilter('ALL');
    setSearchTerm('');
  };

  const getRatingLabel = (score) => {
    if (score >= 4.8) return 'Exceptional • 5/5';
    if (score >= 4.0) return 'Very Good • 4/5';
    if (score >= 3.0) return 'Good • 3/5';
    if (score >= 2.0) return 'Fair • 2/5';
    return 'Needs Attention';
  };

  const globalSummary = useMemo(() => {
    if (reviewsData?.summary) return reviewsData.summary;
    const totalProps = propertiesList.length;
    const totalRevs = propertiesList.reduce((acc, p) => acc + (p.review_count || 0), 0);
    const avgRat = totalRevs > 0
      ? propertiesList.reduce((acc, p) => acc + (p.average_rating || 0) * (p.review_count || 0), 0) / totalRevs
      : 0.0;
    return {
      total_properties: totalProps,
      total_reviews: totalRevs,
      average_rating: avgRat,
      rating_breakdown: { cleanliness: avgRat, staff: avgRat, location: avgRat, value: avgRat },
    };
  }, [reviewsData, propertiesList]);

  // Filter reviews in the drill-down view
  const currentReviews = useMemo(() => {
    if (!selectedPropertyDetails?.reviews) return [];
    let list = selectedPropertyDetails.reviews;

    if (starFilter !== 'ALL') {
      const star = parseInt(starFilter, 10);
      list = list.filter((r) => Math.round(r.rating) === star);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.user_name?.toLowerCase().includes(term) ||
          r.comment?.toLowerCase().includes(term) ||
          r.booking_number?.toLowerCase().includes(term)
      );
    }

    return list;
  }, [selectedPropertyDetails, starFilter, searchTerm]);

  // Distribution calculations for selected property
  const ratingDistribution = selectedPropertyDetails?.rating_distribution || {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  const totalReviewsCount = selectedPropertyDetails?.review_count || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Breadcrumb */}
      <div>
        {selectedPropertyId ? (
          <div className="flex items-center space-x-3 mb-2">
            <button
              onClick={handleBackToOverview}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#0F273D] text-[#087F8C] dark:text-[#27B7A8] text-xs font-bold border border-slate-200 dark:border-teal-900/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Properties</span>
            </button>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-semibold text-[#17324D] dark:text-white truncate max-w-xs sm:max-w-md">
              {selectedPropertyDetails?.property_name}
            </span>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black font-serif text-[#17324D] dark:text-white tracking-tight">
              {selectedPropertyId ? selectedPropertyDetails?.property_name : 'Guest Reviews & Ratings'}
            </h1>
            <p className="text-xs sm:text-sm text-[#607080] dark:text-slate-300 mt-1 font-light max-w-2xl">
              {selectedPropertyId
                ? `Detailed traveler ratings and genuine feedback submitted for ${selectedPropertyDetails?.property_name}.`
                : 'View feedback from Travelers who stayed at your properties.'}
            </p>
          </div>

          {/* Quick Refresh Button */}
          <button
            onClick={() => {
              if (selectedPropertyId && selectedPropertyDetails) {
                handleSelectProperty(selectedPropertyDetails);
              } else {
                fetchAllReviews();
              }
            }}
            className="self-start sm:self-auto inline-flex items-center space-x-2 px-4 py-2 bg-white dark:bg-[#0F273D] text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#087F8C] dark:hover:text-[#27B7A8] border border-slate-200 dark:border-teal-900/40 rounded-xl transition-all shadow-2xs hover:shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Reviews</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-bold">
          {error}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 1: ALL PROPERTIES OVERVIEW GRID                                     */}
      {/* ========================================================================= */}
      {!selectedPropertyId && (
        <div className="space-y-8 animate-fadeIn">
          {/* Top Scorecard Pedestals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Partner Average Rating */}
            <div className="p-6 bg-gradient-to-br from-[#FFF8F0] to-white dark:from-[#091B29] dark:to-[#0F273D] rounded-3xl border border-orange-200/70 dark:border-teal-900/40 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Portfolio Average Rating
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {globalSummary.total_reviews > 0
                    ? getRatingLabel(globalSummary.average_rating)
                    : 'No Ratings Yet'}
                </span>
              </div>

              <div className="flex items-baseline space-x-3">
                <span className="text-4xl sm:text-5xl font-black font-serif text-[#17324D] dark:text-white">
                  {globalSummary.total_reviews > 0
                    ? Number(globalSummary.average_rating).toFixed(1)
                    : '—'}
                </span>
                <span className="text-sm font-sans text-slate-400">/ 5.0</span>
              </div>

              <div className="flex items-center space-x-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(globalSummary.average_rating)
                        ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                        : 'text-slate-200 dark:text-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Total Properties Managed */}
            <div className="p-6 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-100 dark:border-teal-900/40 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Listed Properties
                </span>
                <Building2 className="w-5 h-5 text-[#087F8C] dark:text-[#27B7A8]" />
              </div>

              <div>
                <span className="text-4xl sm:text-5xl font-black font-serif text-[#17324D] dark:text-white">
                  {propertiesList.length}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1 font-light">
                  Active Stay Partner listings
                </span>
              </div>

              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {propertiesList.filter((p) => p.review_count > 0).length} of {propertiesList.length} properties have guest reviews
              </div>
            </div>

            {/* Total Verified Reviews Count */}
            <div className="p-6 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-100 dark:border-teal-900/40 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Verified Reviews
                </span>
                <ShieldCheck className="w-5 h-5 text-[#35A66F]" />
              </div>

              <div>
                <span className="text-4xl sm:text-5xl font-black font-serif text-[#087F8C] dark:text-[#27B7A8]">
                  {globalSummary.total_reviews}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1 font-light">
                  100% verified post-checkout reviews
                </span>
              </div>

              <div className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PostgreSQL Authenticated</span>
              </div>
            </div>
          </div>

          {/* Properties Review Summaries Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-xl font-bold font-serif text-[#17324D] dark:text-white">
                  Property Review Summaries
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click any property below to open its full review details and traveler ratings.
                </p>
              </div>
              <span className="text-xs font-bold text-[#087F8C] dark:text-[#27B7A8] bg-[#087F8C]/10 px-3 py-1 rounded-full border border-[#087F8C]/20">
                {propertiesList.length} {propertiesList.length === 1 ? 'Property' : 'Properties'}
              </span>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-semibold text-slate-500">Loading your property reviews...</p>
              </div>
            ) : propertiesList.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0F273D] border border-slate-100 dark:border-teal-900/40 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold font-serif text-[#17324D] dark:text-white">
                  No Properties Listed
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Add your properties in the Properties section to begin receiving guest reviews.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {propertiesList.map((prop) => {
                  const hasReviews = (prop.review_count || 0) > 0;
                  const locationStr = [prop.city, prop.state].filter(Boolean).join(', ');

                  return (
                    <div
                      key={prop.property_id || prop.id}
                      onClick={() => handleSelectProperty(prop)}
                      className="group bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-teal-900/40 overflow-hidden shadow-xs hover:shadow-xl hover:border-[#087F8C]/60 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                    >
                      {/* Property Image & Badge */}
                      <div className="relative h-48 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        {prop.image_url ? (
                          <img
                            src={prop.image_url}
                            alt={prop.property_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-[#087F8C]/20 to-[#0F273D]/40 text-slate-400">
                            <Building2 className="w-10 h-10 mb-1 opacity-50 text-[#087F8C]" />
                            <span className="text-[11px] font-medium">Voyara Stay</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>

                        {/* Top Pills */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                            {prop.property_type || 'Stay'}
                          </span>
                          {hasReviews ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-400 text-slate-900 text-xs font-black shadow-md">
                              <Star className="w-3.5 h-3.5 fill-slate-900 text-slate-900" />
                              <span>{Number(prop.average_rating).toFixed(1)}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-900/70 backdrop-blur-md text-slate-300 text-[10px] font-semibold">
                              New Listing
                            </span>
                          )}
                        </div>

                        {/* Bottom Location Overlay */}
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <h3 className="text-base font-bold font-serif leading-tight drop-shadow-sm truncate">
                            {prop.property_name}
                          </h3>
                          {locationStr && (
                            <div className="flex items-center space-x-1 text-[11px] text-slate-200 mt-1 opacity-90 drop-shadow-xs">
                              <MapPin className="w-3 h-3 text-[#27B7A8] shrink-0" />
                              <span className="truncate">{locationStr}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Content Body */}
                      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                        {/* Rating Display */}
                        <div className="p-3.5 rounded-2xl bg-[#FFFDF7] dark:bg-slate-900/60 border border-amber-100/80 dark:border-slate-800/80 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1 text-amber-500">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                              <span className="text-sm font-black text-[#17324D] dark:text-white font-serif">
                                {hasReviews ? `${Number(prop.average_rating).toFixed(1)} / 5` : '⭐ — / 5'}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              {hasReviews
                                ? `Based on ${prop.review_count} ${
                                    prop.review_count === 1 ? 'review' : 'reviews'
                                  }`
                                : '0 reviews'}
                            </span>
                          </div>

                          {/* Quick Category Mini Indicators if reviews exist */}
                          {hasReviews && prop.rating_breakdown ? (
                            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] text-slate-600 dark:text-slate-300">
                              <div className="flex justify-between px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                <span>Clean:</span>
                                <strong className="text-[#087F8C] dark:text-[#27B7A8]">
                                  {prop.rating_breakdown.cleanliness ? prop.rating_breakdown.cleanliness.toFixed(1) : '—'}
                                </strong>
                              </div>
                              <div className="flex justify-between px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                <span>Staff:</span>
                                <strong className="text-[#087F8C] dark:text-[#27B7A8]">
                                  {prop.rating_breakdown.staff ? prop.rating_breakdown.staff.toFixed(1) : '—'}
                                </strong>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic pt-0.5">
                              No guest reviews submitted yet.
                            </p>
                          )}
                        </div>

                        {/* Action Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProperty(prop);
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#076b77] hover:to-[#0d8583] text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-xs hover:shadow-md cursor-pointer group-hover:translate-y-[-1px]"
                        >
                          <span>View Reviews</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 2: DETAILED PROPERTY REVIEWS & DRILL-DOWN VIEW                      */}
      {/* ========================================================================= */}
      {selectedPropertyId && selectedPropertyDetails && (
        <div className="space-y-8 animate-fadeIn">
          {/* Property Detailed Header & Scorecards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Property Overview & Star Score Hero */}
            <div className="p-6 bg-gradient-to-br from-[#FFF8F0] to-white dark:from-[#091B29] dark:to-[#0F273D] rounded-3xl border border-orange-200/70 dark:border-teal-900/40 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>{selectedPropertyDetails.property_type || 'Property'}</span>
                  <span>•</span>
                  <span>
                    {[selectedPropertyDetails.city, selectedPropertyDetails.state, selectedPropertyDetails.country]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-serif text-[#17324D] dark:text-white">
                  {selectedPropertyDetails.property_name}
                </h2>
              </div>

              <div className="flex items-baseline space-x-3 pt-2">
                <span className="text-4xl sm:text-5xl font-black font-serif text-[#17324D] dark:text-white">
                  {totalReviewsCount > 0 ? Number(selectedPropertyDetails.average_rating).toFixed(1) : '—'}
                </span>
                <span className="text-sm font-sans text-slate-400">/ 5.0</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 ml-2">
                  {totalReviewsCount > 0
                    ? getRatingLabel(selectedPropertyDetails.average_rating)
                    : 'No Ratings Yet'}
                </span>
              </div>

              <div className="flex items-center space-x-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(selectedPropertyDetails.average_rating || 0)
                        ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                        : 'text-slate-200 dark:text-slate-700'
                    }`}
                  />
                ))}
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Based on <strong className="text-[#17324D] dark:text-white">{totalReviewsCount}</strong> verified traveler{' '}
                {totalReviewsCount === 1 ? 'review' : 'reviews'}
              </div>
            </div>

            {/* Middle: Rating Distribution Bar Chart */}
            <div className="p-6 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-100 dark:border-teal-900/40 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Rating Distribution
                </span>
                <span className="text-[11px] font-bold text-[#087F8C] dark:text-[#27B7A8]">
                  {totalReviewsCount} Total
                </span>
              </div>

              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingDistribution[star] || 0;
                  const pct = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;
                  return (
                    <div
                      key={star}
                      onClick={() => setStarFilter(starFilter === String(star) ? 'ALL' : String(star))}
                      className={`flex items-center space-x-3 text-xs cursor-pointer p-1 rounded-lg transition-colors ${
                        starFilter === String(star)
                          ? 'bg-amber-500/10 font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="w-10 text-slate-600 dark:text-slate-300 flex items-center space-x-1 shrink-0">
                        <span>{star}</span>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      </span>
                      <div className="h-2 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-slate-400 text-[11px]">{count}</span>
                    </div>
                  );
                })}
              </div>

              {starFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setStarFilter('ALL')}
                  className="text-[11px] font-bold text-[#087F8C] hover:underline self-end cursor-pointer"
                >
                  Clear filter ({starFilter}★)
                </button>
              )}
            </div>

            {/* Right: Subcategory Ratings Breakdown */}
            <div className="p-6 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-100 dark:border-teal-900/40 shadow-xs flex flex-col justify-between space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Category Breakdown
              </span>

              <div className="space-y-3">
                {[
                  {
                    label: 'Cleanliness & Hygiene',
                    score: selectedPropertyDetails.rating_breakdown?.cleanliness || 0,
                  },
                  {
                    label: 'Staff & Hospitality',
                    score: selectedPropertyDetails.rating_breakdown?.staff || 0,
                  },
                  {
                    label: 'Location & Atmosphere',
                    score: selectedPropertyDetails.rating_breakdown?.location || 0,
                  },
                  {
                    label: 'Value for Money',
                    score: selectedPropertyDetails.rating_breakdown?.value || 0,
                  },
                ].map((cat, idx) => {
                  const score = Number(cat.score || 0);
                  const pct = totalReviewsCount > 0 ? Math.min(100, (score / 5) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        <span className="truncate pr-1">{cat.label}</span>
                        <span className="font-bold text-[#087F8C] dark:text-[#27B7A8] shrink-0 font-mono">
                          {totalReviewsCount > 0 ? `${score.toFixed(1)}/5` : '—'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#087F8C] to-[#27B7A8] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Traveler Reviews Feed Section */}
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold font-serif text-[#17324D] dark:text-white">
                  Traveler Reviews ({currentReviews.length})
                </h3>
                {starFilter !== 'ALL' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                    Showing {starFilter}★ only
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search comments or guests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs text-[#17324D] dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-[#087F8C] w-48 sm:w-60"
                  />
                </div>

                {/* Star Filter Dropdown */}
                <select
                  value={starFilter}
                  onChange={(e) => setStarFilter(e.target.value)}
                  className="bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-teal-900/40 text-xs font-bold text-[#17324D] dark:text-white rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-[#087F8C] cursor-pointer"
                >
                  <option value="ALL">All Star Ratings</option>
                  <option value="5">5 Stars ({ratingDistribution[5] || 0})</option>
                  <option value="4">4 Stars ({ratingDistribution[4] || 0})</option>
                  <option value="3">3 Stars ({ratingDistribution[3] || 0})</option>
                  <option value="2">2 Stars ({ratingDistribution[2] || 0})</option>
                  <option value="1">1 Star ({ratingDistribution[1] || 0})</option>
                </select>
              </div>
            </div>

            {/* List of Reviews */}
            {detailLoading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-semibold text-slate-500">Loading reviews...</p>
              </div>
            ) : currentReviews.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0F273D] border border-slate-100 dark:border-teal-900/40 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold font-serif text-[#17324D] dark:text-white">
                  {totalReviewsCount === 0
                    ? 'No Guest Reviews Yet for this Property'
                    : 'No Reviews Match Your Filter'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {totalReviewsCount === 0
                    ? 'Reviews will appear here automatically when travelers complete their stays and submit verified feedback for this property.'
                    : 'Try clearing your search term or star rating filter to see other reviews.'}
                </p>
                {totalReviewsCount > 0 && (starFilter !== 'ALL' || searchTerm) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStarFilter('ALL');
                      setSearchTerm('');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#087F8C] text-white text-xs font-bold hover:bg-[#076b77] transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {currentReviews.map((rev) => {
                  const formattedDate = rev.created_at
                    ? new Date(rev.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Recent Stay';

                  return (
                    <div
                      key={rev.id}
                      className="p-6 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-100 dark:border-teal-900/40 shadow-2xs hover:shadow-md transition-shadow space-y-4"
                    >
                      {/* Review Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#087F8C] to-[#0F9D9A] text-white font-bold text-sm flex items-center justify-center shadow-xs">
                            {rev.user_name ? rev.user_name.charAt(0).toUpperCase() : 'G'}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <strong className="text-sm text-[#17324D] dark:text-white font-sans">
                                {rev.user_name || 'Verified Traveler'}
                              </strong>
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Verified Stay</span>
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                              <span>Booking #{rev.booking_number}</span>
                              <span>•</span>
                              <span>Reviewed on {formattedDate}</span>
                            </div>
                          </div>
                        </div>

                        {/* Star Rating Badge */}
                        <div className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 self-start sm:self-auto">
                          <Star className="w-4 h-4 fill-[#F6C945] text-[#F6C945]" />
                          <span className="text-xs font-black">{Number(rev.rating).toFixed(1)} / 5</span>
                        </div>
                      </div>

                      {/* Review Comment */}
                      <p className="text-xs text-[#17324D] dark:text-slate-200 leading-relaxed italic bg-[#FFFDF7] dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 font-sans">
                        "{rev.comment}"
                      </p>

                      {/* Subcategory Ratings Breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 flex items-center justify-between">
                          <span>Cleanliness:</span>
                          <strong className="text-[#087F8C] dark:text-[#27B7A8]">
                            {(rev.cleanliness_rating || rev.rating).toFixed(1)}/5
                          </strong>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 flex items-center justify-between">
                          <span>Staff & Service:</span>
                          <strong className="text-[#087F8C] dark:text-[#27B7A8]">
                            {(rev.staff_rating || rev.rating).toFixed(1)}/5
                          </strong>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 flex items-center justify-between">
                          <span>Location:</span>
                          <strong className="text-[#087F8C] dark:text-[#27B7A8]">
                            {(rev.location_rating || rev.rating).toFixed(1)}/5
                          </strong>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 flex items-center justify-between">
                          <span>Value:</span>
                          <strong className="text-[#087F8C] dark:text-[#27B7A8]">
                            {(rev.value_rating || rev.rating).toFixed(1)}/5
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderReviews;
