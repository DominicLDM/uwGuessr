import React, { useRef, useEffect } from 'react';

const AnimatedUnderline = ({
  width = 900,
  height = 300,
  mainAnimationDuration = 1.3,
  className = '',
  style = {},
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Robustly trigger animation on mount
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    // Get actual path lengths
    const paths = [
      svg.querySelector('.segment1') as SVGPathElement | null,
      svg.querySelector('.segment2') as SVGPathElement | null,
      svg.querySelector('.segment3') as SVGPathElement | null,
    ];
    const segmentDurations = [0.4, 0.55, 0.35]; // seconds for each segment
    // Reset all segments and measure lengths
    const lengths = paths.map(path => (path ? path.getTotalLength() : 0));
    paths.forEach((path, i) => {
      if (!path) return;
      path.style.animation = 'none';
      path.style.strokeDasharray = String(lengths[i]);
      path.style.strokeDashoffset = String(lengths[i]);
    });
    // Animate first segment
    if (paths[0]) {
      paths[0].style.animation = `draw ${segmentDurations[0]}s cubic-bezier(0.7,0,0.3,1) forwards`;
      paths[0].style.animationDelay = '0s';
    }
    // Animate second and third with slight overlap for smoothness
    setTimeout(() => {
      if (paths[1]) {
        paths[1].style.animation = `draw ${segmentDurations[1]}s cubic-bezier(0.7,0,0.3,1) forwards`;
        paths[1].style.animationDelay = '0s';
      }
      setTimeout(() => {
        if (paths[2]) {
          paths[2].style.animation = `draw ${segmentDurations[2]}s cubic-bezier(0.7,0,0.3,1) forwards`;
          paths[2].style.animationDelay = '0s';
        }
      }, (segmentDurations[1] - 0.08) * 1000); // start 0.08s before previous ends
    }, (segmentDurations[0] - 0.08) * 1000); // start 0.08s before previous ends
  }, [mainAnimationDuration, width, height]);

  return (
    <div className={`animated-underline-container ${className}`} style={{ textAlign: 'center', ...style }}>
      <style jsx>{`
        .pencil-stroke {
          fill: none;
          stroke: url(#pencilGradient);
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: url(#pencilTexture);
        }
        .main-curve {
          stroke-dasharray: 2600;
          stroke-dashoffset: 2600;
        }
        /* .segment1, .segment2, .segment3: animation handled by JS only */
        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        .replay-btn {
          margin-top: 20px;
          padding: 10px 20px;
          background: #4a90e2;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          transition: background 0.3s;
        }
        .replay-btn:hover {
          background: #357abd;
        }
      `}</style>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 400 70`}
        style={{ background: 'transparent', maxWidth: '100%', height: '100%' }}
      >
        <defs>
          {/* Pencil texture filter - grain confined to stroke */}
          <filter id="pencilTexture" x="-5%" y="-5%" width="110%" height="110%">
            {/* Create stroke mask */}
            <feFlood floodColor="white" result="white"/>
            <feComposite in="white" in2="SourceAlpha" operator="in" result="strokeMask"/>
            
            {/* Main graphite texture only on stroke */}
            <feTurbulence baseFrequency="1.2 0.9" numOctaves="3" seed="7" result="graphiteNoise" />
            <feComposite in="graphiteNoise" in2="strokeMask" operator="in" result="maskedNoise"/>
            <feDisplacementMap in="SourceGraphic" in2="maskedNoise" scale="1.8" result="roughened" />
            
            {/* Add pencil grain only on stroke */}
            <feTurbulence baseFrequency="2.5 1.8" numOctaves="2" seed="25" result="grain" />
            <feColorMatrix in="grain" values="0 0 0 0 0.2
                                             0 0 0 0 0.2
                                             0 0 0 0 0.2
                                             0 0 0 0.8 0" result="darkGrain"/>
            <feComposite in="darkGrain" in2="strokeMask" operator="in" result="maskedGrain"/>
            <feComposite in="roughened" in2="maskedGrain" operator="multiply" result="textured"/>
            
            {/* Subtle blur for pencil softness */}
            <feGaussianBlur in="textured" stdDeviation="0.4" result="softPencil"/>
            
            {/* Add slight shadow/depth */}
            <feOffset in="softPencil" dx="0.5" dy="0.5" result="offset"/>
            <feGaussianBlur in="offset" stdDeviation="1" result="shadow"/>
            <feFlood floodColor="#000" floodOpacity="0.15" result="shadowColor"/>
            <feComposite in="shadowColor" in2="shadow" operator="in" result="dropshadow"/>
            <feMerge>
              <feMergeNode in="dropshadow"/>
              <feMergeNode in="softPencil"/>
            </feMerge>
          </filter>

          {/* Gradient for pencil stroke variation */}
          <linearGradient id="pencilGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{stopColor:'#1a1a1a', stopOpacity:0.9}} />
            <stop offset="25%" style={{stopColor:'#2d2d2d', stopOpacity:1}} />
            <stop offset="50%" style={{stopColor:'#222', stopOpacity:1}} />
            <stop offset="75%" style={{stopColor:'#333', stopOpacity:0.95}} />
            <stop offset="100%" style={{stopColor:'#2a2a2a', stopOpacity:0.9}} />
          </linearGradient>
        </defs>
        
        {/* Fixed underline with smoother curves and better continuity */}
        <path
          className="pencil-stroke main-curve segment1"
          style={{ strokeWidth: 5 }}
          d="M 25 13
             C 75 10, 125 8.5, 175 9
             C 225 9.5, 275 11, 320 16
             C 340 18, 355 21, 370 25"
        />
        <path
          className="pencil-stroke main-curve segment2"
          style={{ strokeWidth: 5.75 }}
          d="M 370 25
             C 362 26, 347 26.5, 325 27
             C 295 26, 275 26.5, 240 24.5
             C 180 26.5, 111 31, 110 32.5
             Q 110 33.5, 120 34
             C 170 31, 220 30, 260 29
             Q 275 31.5, 285 32.5
             C 270 41.5, 240 42, 220 42.5
             Q 210 44, 200 45
             Q 210 46, 200 45"
        />
        <path
          className="pencil-stroke main-curve segment3"
          style={{ strokeWidth: 6.5 }}
          d="M 215 42
             Q 215 44, 205 42.5
             C 200 46, 150 48, 190 49
             C 230 50, 270 51, 280 56
             C 280 56, 250 58, 220 60
             C 210 62, 215 62.5, 225 64"
        />
      </svg>
    </div>
  );
};

export default AnimatedUnderline;