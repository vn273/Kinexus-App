import { useRef, useCallback, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { calculateGraphLayout, getRelationshipColor, CLOSENESS_LEVELS, STRATEGIC_VALUE_LEVELS } from '../services/graphLayoutService';

const NetworkGraph = ({
  contacts,
  connections,
  viewType,
  filters,
  showIntroductions,
  showMutualConnections,
  selectedNode,
  onNodeClick,
  onNodeHover,
  onLinkClick,
  graphRef
}) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [hoveredNode, setHoveredNode] = useState(null);
  
  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  // Calculate layout when data changes
  useEffect(() => {
    const layout = calculateGraphLayout(
      contacts,
      viewType,
      connections,
      filters,
      {
        showIntroductions,
        showMutualConnections,
        circleSpacing: 120
      }
    );
    
    // Convert to force-graph format
    const nodes = layout.nodes.map(node => ({
      id: node.id,
      label: node.label,
      size: node.size,
      color: node.color,
      type: node.type,
      data: node.data,
      // Use fixed positions for concentric layout
      fx: node.x,
      fy: node.y,
      x: node.x,
      y: node.y
    }));
    
    const links = layout.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      color: edge.color,
      width: edge.width || 1,
      type: edge.type,
      label: edge.label,
      dashed: edge.dashed,
      connectionData: edge.connectionData
    }));
    
    setGraphData({ nodes, links });
  }, [contacts, connections, viewType, filters, showIntroductions, showMutualConnections]);
  
  // Node rendering
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const isHovered = hoveredNode === node.id;
    const isSelected = selectedNode === node.id;
    const isCenter = node.type === 'user';
    
    // Node size
    const baseSize = node.size || 8;
    const size = isHovered || isSelected ? baseSize * 1.3 : baseSize;
    
    // Draw outer glow for selected/hovered
    if (isHovered || isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(0, 0, 0, 0.1)';
      ctx.fill();
    }
    
    // Draw node
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    
    if (isCenter) {
      // User node - special styling
      ctx.fillStyle = '#1f2937';
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.fillStyle = node.color || '#6b7280';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Draw label
    const fontSize = isCenter ? 14 : (isHovered || isSelected ? 12 : 10);
    ctx.font = `${fontSize / globalScale}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Label background for readability
    const label = node.label || '';
    const textMetrics = ctx.measureText(label);
    const textHeight = fontSize / globalScale;
    const padding = 2 / globalScale;
    
    if (isHovered || isSelected || isCenter || globalScale > 0.8) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(
        node.x - textMetrics.width / 2 - padding,
        node.y + size + 2 / globalScale,
        textMetrics.width + padding * 2,
        textHeight + padding * 2
      );
      
      ctx.fillStyle = isCenter ? '#1f2937' : '#374151';
      ctx.fillText(label, node.x, node.y + size + 4 / globalScale);
    }
  }, [hoveredNode, selectedNode]);
  
  // Link rendering
  const linkCanvasObject = useCallback((link, ctx, globalScale) => {
    const sourceNode = graphData.nodes.find(n => n.id === link.source.id || n.id === link.source);
    const targetNode = graphData.nodes.find(n => n.id === link.target.id || n.id === link.target);
    
    if (!sourceNode || !targetNode) return;
    
    const start = { x: link.source.x || sourceNode.x, y: link.source.y || sourceNode.y };
    const end = { x: link.target.x || targetNode.x, y: link.target.y || targetNode.y };
    
    ctx.beginPath();
    
    // Draw different styles based on link type
    if (link.dashed) {
      ctx.setLineDash([5 / globalScale, 3 / globalScale]);
    } else {
      ctx.setLineDash([]);
    }
    
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = link.color || '#d1d5db';
    ctx.lineWidth = (link.width || 1) / globalScale;
    ctx.stroke();
    
    // Reset line dash
    ctx.setLineDash([]);
    
    // Draw arrow for introduction links
    if (link.type === 'introduced') {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const arrowLength = 8 / globalScale;
      const arrowWidth = 5 / globalScale;
      
      // Position arrow at 70% of the way
      const midX = start.x + (end.x - start.x) * 0.7;
      const midY = start.y + (end.y - start.y) * 0.7;
      
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(
        midX - arrowLength * Math.cos(angle - Math.PI / 6),
        midY - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        midX - arrowLength * Math.cos(angle + Math.PI / 6),
        midY - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = link.color || '#f59e0b';
      ctx.fill();
    }
  }, [graphData.nodes]);
  
  // Handle node click
  const handleNodeClick = useCallback((node) => {
    if (node.type === 'user') return;
    onNodeClick?.(node);
  }, [onNodeClick]);
  
  // Handle node hover
  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node?.id || null);
    onNodeHover?.(node);
    
    // Change cursor
    if (containerRef.current) {
      containerRef.current.style.cursor = node && node.type !== 'user' ? 'pointer' : 'default';
    }
  }, [onNodeHover]);
  
  // Handle link click
  const handleLinkClick = useCallback((link) => {
    if (link.connectionData) {
      onLinkClick?.(link);
    }
  }, [onLinkClick]);
  
  // Draw background circles
  const drawBackground = useCallback((ctx, globalScale) => {
    const levels = viewType === 'closeness' ? CLOSENESS_LEVELS : STRATEGIC_VALUE_LEVELS;
    const circleSpacing = 120;
    
    levels.forEach((level, idx) => {
      const radius = (idx + 1) * circleSpacing;
      
      // Draw circle
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(209, 213, 219, 0.5)';
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
      
      // Draw label
      if (globalScale > 0.4) {
        ctx.font = `${10 / globalScale}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText(level.label, 0, -radius - 10 / globalScale);
      }
    });
  }, [viewType]);

  // Increase hover area for easier interaction
  const nodePointerAreaPaint = useCallback((node, color, ctx) => {
    const baseSize = node.size || 8;
    // Make the hover area 3x larger than the visible node
    const hoverRadius = Math.max(baseSize * 3, 20);
    ctx.beginPath();
    ctx.arc(node.x, node.y, hoverRadius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100">
      {graphData.nodes.length > 0 && (
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          
          // Node configuration
          nodeRelSize={1}
          nodeCanvasObject={nodeCanvasObject}
          nodeCanvasObjectMode={() => 'replace'}
          nodePointerAreaPaint={nodePointerAreaPaint}
          
          // Link configuration
          linkCanvasObject={linkCanvasObject}
          linkCanvasObjectMode={() => 'replace'}
          
          // Interaction
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onLinkClick={handleLinkClick}
          
          // Physics - disable since we use fixed positions
          cooldownTicks={0}
          d3AlphaDecay={1}
          d3VelocityDecay={1}
          
          // Zoom
          minZoom={0.3}
          maxZoom={3}
          
          // Background
          onRenderFramePre={drawBackground}
          
          // Center the graph
          centerAt={[0, 0]}
          zoom={1}
        />
      )}
      
      {/* Tooltip for hovered node */}
      {hoveredNode && hoveredNode !== 'user' && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          {(() => {
            const node = graphData.nodes.find(n => n.id === hoveredNode);
            if (!node || !node.data) return null;
            const contact = node.data;
            
            return (
              <>
                <h4 className="font-semibold text-gray-900">{contact.firstName} {contact.lastName}</h4>
                {contact.jobTitle && <p className="text-sm text-gray-600">{contact.jobTitle}</p>}
                {contact.company && <p className="text-sm text-gray-600">{contact.company}</p>}
                <div className="mt-2 flex gap-2">
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    Closeness: {contact.relationshipCloseness || 5}
                  </span>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                    Value: {contact.strategicValue || 3}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default NetworkGraph;
