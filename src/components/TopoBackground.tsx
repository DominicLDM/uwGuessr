"use client"
// --- Add missing constants ---
// Editable values
const res = 18 // divide canvas width/height by this, lower number means more cells
const baseZOffset = 0.00005; // how quickly the noise should move
const thresholdIncrement = 5; // cells range from 0-100, draw line for every step of this increment
const thickLineThresholdMultiple = 3; // every x steps draw a thicker line
const lineColors = ['rgba(255, 215, 0, 0.8)', 'rgba(253, 224, 71, 0.8)', 'rgba(250, 204, 21, 0.8)']; // 3 shades of yellow/gold
const mouseDown = true; // enable mouse interaction

const binaryToType = (nw: number, ne: number, se: number, sw: number) => {
  const a = [nw, ne, se, sw];
  return a.reduce((res, x) => (res << 1) | x);
};
import React, { useRef, useEffect } from 'react';
// @ts-expect-error Perlin noise library has no types
import * as ChriscoursesPerlinNoise from '@chriscourses/perlin-noise';

interface TopoBackgroundProps {
  onLoad?: () => void;
}

const TopoBackground: React.FC<TopoBackgroundProps> = ({ onLoad }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isVisibleRef = useRef(true); // Track if component is visible

  // Mutable state using useRef
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const inputValuesRef = useRef<number[][]>([]);
  const zBoostValuesRef = useRef<number[][]>([]);
  const currentThresholdRef = useRef(0);
  const colsRef = useRef(0);
  const rowsRef = useRef(0);
  const zOffsetRef = useRef(0);
  const noiseMinRef = useRef(100);
  const noiseMaxRef = useRef(0);
  const mousePosRef = useRef({ x: 0, y: 0 });


  useEffect(() => {
    setupCanvas();
    let frameId: number;
    
    // Intersection Observer to pause animation when not visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    
    if (canvasRef.current) {
      observer.observe(canvasRef.current);
    }
    
    const animateWrapper = () => {
      if (isVisibleRef.current) {
        animate();
      }
      frameId = requestAnimationFrame(animateWrapper);
    };
    frameId = requestAnimationFrame(animateWrapper);
    // Cleanup
    const canvas = canvasRef.current;
    return () => {
      window.removeEventListener('resize', canvasSize);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        observer.unobserve(canvas);
      }
      cancelAnimationFrame(frameId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const setupCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    ctxRef.current = canvas.getContext('2d');
    canvasSize();
    window.addEventListener('resize', canvasSize);
    canvas.addEventListener('mousemove', handleMouseMove);
    
    // Call onLoad callback when setup is complete
    if (onLoad) {
      onLoad();
    }
  };


  const canvasSize = () => {
    if (!canvasRef.current || !ctxRef.current) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const rect = canvas.parentElement?.getBoundingClientRect() || canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform before scaling
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    colsRef.current = Math.floor(canvas.width / res) + 1;
    rowsRef.current = Math.floor(canvas.height / res) + 1;
    initializeZBoostValues();
  };


  const initializeZBoostValues = () => {
    const rows = rowsRef.current;
    const cols = colsRef.current;
    zBoostValuesRef.current = [];
    for (let y = 0; y < rows; y++) {
      zBoostValuesRef.current[y] = [];
      for (let x = 0; x <= cols; x++) {
        zBoostValuesRef.current[y][x] = 0;
      }
    }
  };


  const animate = () => {
    if (!canvasRef.current || !ctxRef.current) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (mouseDown) {
      mouseOffset();
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    zOffsetRef.current += baseZOffset;
    generateNoise();
    const noiseMin = noiseMinRef.current;
    const noiseMax = noiseMaxRef.current;
    const roundedNoiseMin = Math.floor(noiseMin / thresholdIncrement) * thresholdIncrement;
    const roundedNoiseMax = Math.ceil(noiseMax / thresholdIncrement) * thresholdIncrement;
    for (let threshold = roundedNoiseMin; threshold < roundedNoiseMax; threshold += thresholdIncrement) {
      currentThresholdRef.current = threshold;
      renderAtThreshold();
    }
    noiseMinRef.current = 100;
    noiseMaxRef.current = 0;
  };


  const mouseOffset = () => {
    const mousePosLocal = mousePosRef.current;
    const resLocal = res;
    const x = Math.floor(mousePosLocal.x / resLocal);
    const y = Math.floor(mousePosLocal.y / resLocal);
    const inputValues = inputValuesRef.current;
    const zBoostValues = zBoostValuesRef.current;
    if (inputValues[y] === undefined || inputValues[y][x] === undefined) return;
    const incrementValue = 0.0005;
    const radius = 5;
    for (let i = -radius; i <= radius; i++) {
      for (let j = -radius; j <= radius; j++) {
        const distanceSquared = i * i + j * j;
        const radiusSquared = radius * radius;
        if (distanceSquared <= radiusSquared && zBoostValues[y + i]?.[x + j] !== undefined) {
          zBoostValues[y + i][x + j] += incrementValue * (1 - distanceSquared / radiusSquared);
        }
      }
    }
  };


  const generateNoise = () => {
    const rows = rowsRef.current;
    const cols = colsRef.current;
    const zOffset = zOffsetRef.current;
    const inputValues = inputValuesRef.current;
    const zBoostValues = zBoostValuesRef.current;
    noiseMinRef.current = 100;
    noiseMaxRef.current = 0;
    for (let y = 0; y < rows; y++) {
      inputValues[y] = [];
      for (let x = 0; x <= cols; x++) {
        inputValues[y][x] = ChriscoursesPerlinNoise.noise(x * 0.02, y * 0.02, zOffset + zBoostValues[y]?.[x]) * 100;
        if (inputValues[y][x] < noiseMinRef.current) noiseMinRef.current = inputValues[y][x];
        if (inputValues[y][x] > noiseMaxRef.current) noiseMaxRef.current = inputValues[y][x];
        if (zBoostValues[y]?.[x] > 0) {
          zBoostValues[y][x] *= 0.99;
        }
      }
    }
  };


  const renderAtThreshold = () => {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    const inputValues = inputValuesRef.current;
    ctx.beginPath();
    // Cycle through colors for each contour line
    const colorIndex = Math.floor((currentThresholdRef.current / thresholdIncrement) % lineColors.length);
    ctx.strokeStyle = lineColors[colorIndex];
    ctx.lineWidth = currentThresholdRef.current % (thresholdIncrement * thickLineThresholdMultiple) === 0 ? 2 : 1;

    for (let y = 0; y < inputValues.length - 1; y++) {
      for (let x = 0; x < inputValues[y].length - 1; x++) {
        if (inputValues[y][x] > currentThresholdRef.current && inputValues[y][x + 1] > currentThresholdRef.current && inputValues[y + 1][x + 1] > currentThresholdRef.current && inputValues[y + 1][x] > currentThresholdRef.current) continue;
        if (inputValues[y][x] < currentThresholdRef.current && inputValues[y][x + 1] < currentThresholdRef.current && inputValues[y + 1][x + 1] < currentThresholdRef.current && inputValues[y + 1][x] < currentThresholdRef.current) continue;
        const gridValue = binaryToType(
          inputValues[y][x] > currentThresholdRef.current ? 1 : 0,
          inputValues[y][x + 1] > currentThresholdRef.current ? 1 : 0,
          inputValues[y + 1][x + 1] > currentThresholdRef.current ? 1 : 0,
          inputValues[y + 1][x] > currentThresholdRef.current ? 1 : 0
        );
        placeLines(gridValue, x, y);
      }
    }
    ctx.stroke();
  };


  const linInterpolate = (x0: number, x1: number, y0 = 0, y1 = 1) => {
    if (x0 === x1) return 0;
    return y0 + ((y1 - y0) * (currentThresholdRef.current - x0)) / (x1 - x0);
  };

  const line = (from: number[], to: number[]) => {
    if (!ctxRef.current) return;
    ctxRef.current.moveTo(from[0], from[1]);
    ctxRef.current.lineTo(to[0], to[1]);
  };

  const placeLines = (gridValue: number, x: number, y: number) => {
    const inputValues = inputValuesRef.current;
    const nw = inputValues[y][x];
    const ne = inputValues[y][x + 1];
    const se = inputValues[y + 1][x + 1];
    const sw = inputValues[y + 1][x];
    let a, b, c, d;

    switch (gridValue) {
      case 1:
      case 14:
        c = [x * res + res * linInterpolate(sw, se), y * res + res];
        d = [x * res, y * res + res * linInterpolate(nw, sw)];
        line(d, c);
        break;
      case 2:
      case 13:
        b = [x * res + res, y * res + res * linInterpolate(ne, se)];
        c = [x * res + res * linInterpolate(sw, se), y * res + res];
        line(b, c);
        break;
      case 3:
      case 12:
        b = [x * res + res, y * res + res * linInterpolate(ne, se)];
        d = [x * res, y * res + res * linInterpolate(nw, sw)];
        line(d, b);
        break;
      case 11:
      case 4:
        a = [x * res + res * linInterpolate(nw, ne), y * res];
        b = [x * res + res, y * res + res * linInterpolate(ne, se)];
        line(a, b);
        break;
      case 5:
        a = [x * res + res * linInterpolate(nw, ne), y * res];
        b = [x * res + res, y * res + res * linInterpolate(ne, se)];
        c = [x * res + res * linInterpolate(sw, se), y * res + res];
        d = [x * res, y * res + res * linInterpolate(nw, sw)];
        line(d, a);
        line(c, b);
        break;
      case 6:
      case 9:
        a = [x * res + res * linInterpolate(nw, ne), y * res];
        c = [x * res + res * linInterpolate(sw, se), y * res + res];
        line(c, a);
        break;
      case 7:
      case 8:
        a = [x * res + res * linInterpolate(nw, ne), y * res];
        d = [x * res, y * res + res * linInterpolate(nw, sw)];
        line(d, a);
        break;
      case 10:
        a = [x * res + res * linInterpolate(nw, ne), y * res];
        b = [x * res + res, y * res + res * linInterpolate(ne, se)];
        c = [x * res + res * linInterpolate(sw, se), y * res + res];
        d = [x * res, y * res + res * linInterpolate(nw, sw)];
        line(a, b);
        line(c, d);
        break;
      default:
        break;
    }
  };


  const handleMouseMove = (e: MouseEvent) => {
    mousePosRef.current = { x: e.offsetX, y: e.offsetY };
  };


  return (
    <canvas
      ref={canvasRef}
      id="res-canvas"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100lvh',
        objectFit: 'cover',
        zIndex: 0,
        display: 'block'
      }}
    />
  );
};

export default TopoBackground;
