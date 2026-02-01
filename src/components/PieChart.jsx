import { useState } from 'react';

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#A855F7', // violet
];

const PieChart = ({ data, title, size = 200 }) => {
  const [hoveredSlice, setHoveredSlice] = useState(null);
  
  // Filter out zero values and calculate total
  const filteredData = data.filter(item => item.value > 0);
  const total = filteredData.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <div 
          className="rounded-full bg-gray-100 flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <span className="text-gray-400 text-sm">No data</span>
        </div>
        {title && <p className="text-sm font-medium text-gray-700 mt-3">{title}</p>}
      </div>
    );
  }
  
  // Calculate slice angles
  let currentAngle = -90; // Start from top
  const slices = filteredData.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    return {
      ...item,
      percentage,
      startAngle,
      endAngle: currentAngle,
      color: item.color || COLORS[index % COLORS.length],
    };
  });
  
  // Create SVG path for each slice
  const createSlicePath = (startAngle, endAngle, radius, innerRadius = 0) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = radius + radius * Math.cos(startRad);
    const y1 = radius + radius * Math.sin(startRad);
    const x2 = radius + radius * Math.cos(endRad);
    const y2 = radius + radius * Math.sin(endRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    if (innerRadius > 0) {
      const innerX1 = radius + innerRadius * Math.cos(startRad);
      const innerY1 = radius + innerRadius * Math.sin(startRad);
      const innerX2 = radius + innerRadius * Math.cos(endRad);
      const innerY2 = radius + innerRadius * Math.sin(endRad);
      
      return `
        M ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        L ${innerX2} ${innerY2}
        A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerX1} ${innerY1}
        Z
      `;
    }
    
    return `
      M ${radius} ${radius}
      L ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      Z
    `;
  };
  
  const radius = size / 2;
  const innerRadius = radius * 0.55; // Donut chart
  
  return (
    <div className="flex flex-col items-center">
      {title && (
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      )}
      
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-0">
          {slices.map((slice, index) => {
            const isHovered = hoveredSlice === index;
            const scale = isHovered ? 1.05 : 1;
            
            return (
              <g key={index}>
                <path
                  d={createSlicePath(slice.startAngle, slice.endAngle, radius - 2, innerRadius)}
                  fill={slice.color}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                    opacity: hoveredSlice !== null && !isHovered ? 0.6 : 1,
                  }}
                  onMouseEnter={() => setHoveredSlice(index)}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              </g>
            );
          })}
        </svg>
        
        {/* Center text */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ pointerEvents: 'none' }}
        >
          {hoveredSlice !== null ? (
            <>
              <span className="text-lg font-bold text-gray-900">
                {slices[hoveredSlice].value}
              </span>
              <span className="text-xs text-gray-500">
                {slices[hoveredSlice].percentage.toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl font-bold text-gray-900">{total}</span>
              <span className="text-xs text-gray-500">Total</span>
            </>
          )}
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs max-w-full">
        {slices.map((slice, index) => (
          <div 
            key={index} 
            className={`flex items-center gap-2 cursor-pointer transition-opacity ${
              hoveredSlice !== null && hoveredSlice !== index ? 'opacity-50' : ''
            }`}
            onMouseEnter={() => setHoveredSlice(index)}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-gray-700 truncate" title={slice.label}>
              {slice.label}
            </span>
            <span className="text-gray-500 ml-auto font-medium">
              {slice.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChart;
