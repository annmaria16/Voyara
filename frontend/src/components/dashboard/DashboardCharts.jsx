import React, { useState } from 'react';

/**
 * AreaLineChart Component (SVG-based, responsive, interactive, Light/Dark adaptive)
 */
export const AreaLineChart = ({
  data = [
    { label: '01 May', value: 35 },
    { label: '08 May', value: 65 },
    { label: '15 May', value: 48 },
    { label: '22 May', value: 92 },
    { label: '29 May', value: 80 },
  ],
  height = 180,
  color = 'cyan', // 'cyan' | 'purple' | 'orange' | 'teal'
  valuePrefix = '₹',
  valueSuffix = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const colors = {
    emerald: {
      stroke: '#10B981',
      darkStroke: '#34D399',
      glow: 'rgba(16, 185, 129, 0.4)',
      gradientStart: 'rgba(16, 185, 129, 0.28)',
      gradientEnd: 'rgba(16, 185, 129, 0.0)',
      dotFill: '#10B981',
    },
    cyan: {
      stroke: '#059669',
      darkStroke: '#10B981',
      glow: 'rgba(16, 185, 129, 0.4)',
      gradientStart: 'rgba(16, 185, 129, 0.25)',
      gradientEnd: 'rgba(16, 185, 129, 0.0)',
      dotFill: '#059669',
    },
    teal: {
      stroke: '#10B981',
      darkStroke: '#34D399',
      glow: 'rgba(16, 185, 129, 0.4)',
      gradientStart: 'rgba(16, 185, 129, 0.25)',
      gradientEnd: 'rgba(16, 185, 129, 0.0)',
      dotFill: '#10B981',
    },
    gold: {
      stroke: '#F59E0B',
      darkStroke: '#FBBF24',
      glow: 'rgba(245, 158, 11, 0.4)',
      gradientStart: 'rgba(245, 158, 11, 0.3)',
      gradientEnd: 'rgba(245, 158, 11, 0.0)',
      dotFill: '#F59E0B',
    },
    amber: {
      stroke: '#D97706',
      darkStroke: '#F59E0B',
      glow: 'rgba(245, 158, 11, 0.4)',
      gradientStart: 'rgba(245, 158, 11, 0.3)',
      gradientEnd: 'rgba(245, 158, 11, 0.0)',
      dotFill: '#D97706',
    },
    purple: {
      stroke: '#8B5CF6',
      darkStroke: '#A78BFA',
      glow: 'rgba(139, 92, 246, 0.3)',
      gradientStart: 'rgba(139, 92, 246, 0.25)',
      gradientEnd: 'rgba(139, 92, 246, 0.0)',
      dotFill: '#8B5CF6',
    },
    orange: {
      stroke: '#F97316',
      darkStroke: '#EA580C',
      glow: 'rgba(249, 115, 22, 0.4)',
      gradientStart: 'rgba(249, 115, 22, 0.3)',
      gradientEnd: 'rgba(249, 115, 22, 0.0)',
      dotFill: '#F97316',
    },
  };

  const scheme = colors[color] || colors.emerald;
  const gradientId = `area-gradient-${color}-${Math.random().toString(36).substr(2, 6)}`;

  const paddingX = 24;
  const paddingTop = 20;
  const paddingBottom = 30;
  const svgWidth = 400;
  const svgHeight = height;

  const maxVal = Math.max(...data.map((d) => d.value), 10) * 1.15;
  const minVal = 0;

  const getX = (index) => paddingX + (index / (data.length - 1 || 1)) * (svgWidth - paddingX * 2);
  const getY = (value) =>
    paddingTop + (1 - (value - minVal) / (maxVal - minVal)) * (svgHeight - paddingTop - paddingBottom);

  const points = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.value),
    ...d,
  }));

  // Create smooth Bézier curve path
  const createSmoothPath = () => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = createSmoothPath();
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${svgHeight - paddingBottom} L ${points[0].x} ${svgHeight - paddingBottom} Z`
      : '';

  return (
    <div className="w-full relative select-none">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto overflow-visible"
        style={{ minHeight: `${height}px` }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={scheme.gradientStart} />
            <stop offset="100%" stopColor={scheme.gradientEnd} />
          </linearGradient>
        </defs>

        {/* Horizontal Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = paddingTop + ratio * (svgHeight - paddingTop - paddingBottom);
          return (
            <line
              key={i}
              x1={paddingX}
              y1={y}
              x2={svgWidth - paddingX}
              y2={y}
              className="stroke-slate-200/80 dark:stroke-slate-800"
              strokeDasharray="3,3"
            />
          );
        })}

        {/* Area gradient fill */}
        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

        {/* Smooth line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={scheme.stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dark:stroke-[#4FD1C5] transition-colors"
          />
        )}

        {/* Interactive Data points */}
        {points.map((p, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <g
              key={i}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <circle cx={p.x} cy={p.y} r="14" fill="transparent" />

              {isHovered && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="7"
                  fill="none"
                  stroke={scheme.stroke}
                  strokeWidth="2"
                  className="animate-ping"
                />
              )}

              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 5 : 3.5}
                fill={isHovered ? '#F97316' : scheme.dotFill}
                stroke="#FFFFFF"
                strokeWidth="2"
                className="shadow-md"
              />

              {/* X-axis label */}
              <text
                x={p.x}
                y={svgHeight - 10}
                textAnchor="middle"
                className="text-[10px] font-sans fill-slate-500 dark:fill-slate-400 select-none font-semibold"
                style={{ fontSize: '10px' }}
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredIndex !== null && points[hoveredIndex] && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full px-2.5 py-1 bg-[#102A43] dark:bg-slate-900 border border-slate-700 text-white rounded-xl shadow-xl text-xs whitespace-nowrap z-20"
          style={{
            left: `${(points[hoveredIndex].x / svgWidth) * 100}%`,
            top: `${(points[hoveredIndex].y / svgHeight) * 100 - 8}%`,
          }}
        >
          <span className="font-bold text-white">
            {valuePrefix}
            {typeof points[hoveredIndex].value === 'number'
              ? points[hoveredIndex].value.toLocaleString('en-IN')
              : points[hoveredIndex].value}
            {valueSuffix}
          </span>
          <span className="text-[10px] text-slate-300 ml-1.5">
            ({points[hoveredIndex].label})
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * BarChart Component (Glowing Sunset Vertical Bars)
 */
export const BarChart = ({
  data = [
    { label: '01 May', value: 40 },
    { label: '08 May', value: 75 },
    { label: '15 May', value: 95 },
    { label: '22 May', value: 120 },
    { label: '29 May', value: 110 },
  ],
  height = 180,
  barColor = 'sunset', // 'sunset' | 'emerald' | 'teal' | 'purple'
  valuePrefix = '₹',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const barGradients = {
    sunset: {
      start: '#F97316',
      end: '#EA580C',
    },
    emerald: {
      start: '#10B981',
      end: '#6EE7B7',
    },
    teal: {
      start: '#0D9488',
      end: '#5EEAD4',
    },
    purple: {
      start: '#8B5CF6',
      end: '#C4B5FD',
    },
  };

  const scheme = barGradients[barColor] || barGradients.sunset;
  const gradientId = `bar-gradient-${barColor}-${Math.random().toString(36).substr(2, 6)}`;

  const paddingX = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  const svgWidth = 400;
  const svgHeight = height;

  const maxVal = Math.max(...data.map((d) => d.value), 10) * 1.15;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const barWidth = Math.min(26, (svgWidth - paddingX * 2) / (data.length * 1.8));

  return (
    <div className="w-full relative select-none">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto overflow-visible"
        style={{ minHeight: `${height}px` }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={scheme.start} />
            <stop offset="100%" stopColor={scheme.end} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = paddingTop + ratio * chartHeight;
          return (
            <line
              key={i}
              x1={paddingX}
              y1={y}
              x2={svgWidth - paddingX}
              y2={y}
              className="stroke-slate-200/80 dark:stroke-slate-800"
              strokeDasharray="3,3"
            />
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x = paddingX + (i + 0.5) * ((svgWidth - paddingX * 2) / data.length) - barWidth / 2;
          const barHeight = (d.value / maxVal) * chartHeight;
          const y = paddingTop + chartHeight - barHeight;
          const isHovered = hoveredIndex === i;

          return (
            <g
              key={i}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Background Track */}
              <rect
                x={x}
                y={paddingTop}
                width={barWidth}
                height={chartHeight}
                rx="4"
                className="fill-slate-100 dark:fill-slate-800/50"
              />

              {/* Data Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 4)}
                rx="4"
                fill={`url(#${gradientId})`}
                opacity={isHovered ? 1 : 0.9}
                className="transition-all duration-150"
              />

              {/* X Axis Label */}
              <text
                x={x + barWidth / 2}
                y={svgHeight - 10}
                textAnchor="middle"
                className="text-[10px] font-sans fill-slate-500 dark:fill-slate-400 select-none font-semibold"
                style={{ fontSize: '10px' }}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full px-2.5 py-1 bg-slate-900 border border-slate-700 text-white rounded-xl shadow-xl text-xs whitespace-nowrap z-20"
          style={{
            left: `${
              ((paddingX +
                (hoveredIndex + 0.5) * ((svgWidth - paddingX * 2) / data.length)) /
                svgWidth) *
              100
            }%`,
            top: `${
              ((paddingTop +
                chartHeight -
                (data[hoveredIndex].value / maxVal) * chartHeight) /
                svgHeight) *
                100 -
              6
            }%`,
          }}
        >
          <span className="font-bold text-white">
            {valuePrefix}
            {typeof data[hoveredIndex].value === 'number'
              ? data[hoveredIndex].value.toLocaleString('en-IN')
              : data[hoveredIndex].value}
          </span>
          <span className="text-[10px] text-slate-300 ml-1.5">
            ({data[hoveredIndex].label})
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * DonutChart Component (SVG Multi-Segment Ring with Legend)
 */
export const DonutChart = ({
  segments = [
    { label: 'Goa', percentage: 35, color: '#F97316' },
    { label: 'Kerala', percentage: 25, color: '#087F8C' },
    { label: 'Manali', percentage: 20, color: '#0F9D9A' },
    { label: 'Udaipur', percentage: 12, color: '#35A66F' },
    { label: 'Others', percentage: 8, color: '#94A3B8' },
  ],
  size = 140,
  centerLabel = 'Total Stays',
  centerValue = '100%',
}) => {
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
      {/* SVG Donut */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90 w-full h-full">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-slate-100 dark:stroke-slate-800"
            strokeWidth={strokeWidth}
          />

          {segments.map((seg, i) => {
            const strokeDasharray = `${(seg.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativeOffset;
            cumulativeOffset += (seg.percentage / 100) * circumference;

            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 hover:opacity-90"
              />
            );
          })}
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-base font-black text-[#102A43] dark:text-white leading-tight font-serif">
            {centerValue}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            {centerLabel}
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="space-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center space-x-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-slate-600 dark:text-slate-300 font-semibold">{seg.label}</span>
            <span className="text-[#102A43] dark:text-slate-200 font-bold ml-auto pl-3">
              {seg.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
