import React from 'react';

export const CardSkeleton = () => (
  <div className="bg-tactical-panel border border-tactical-border rounded-xl p-5 space-y-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-3 w-24 bg-tactical-border rounded"></div>
      <div className="h-8 w-8 bg-tactical-border rounded-lg"></div>
    </div>
    <div className="h-6 w-16 bg-tactical-border rounded"></div>
    <div className="h-3 w-32 bg-tactical-border rounded"></div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="bg-tactical-panel border border-tactical-border rounded-xl overflow-hidden animate-pulse">
    <div className="h-10 bg-slate-950/40 border-b border-tactical-border px-6 flex items-center space-x-4">
      <div className="h-4 w-12 bg-tactical-border rounded"></div>
      <div className="h-4 w-28 bg-tactical-border rounded"></div>
      <div className="h-4 w-20 bg-tactical-border rounded"></div>
      <div className="h-4 w-16 bg-tactical-border rounded"></div>
    </div>
    <div className="p-6 space-y-4">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="flex items-center space-x-4 justify-between">
          <div className="h-4 w-16 bg-tactical-border rounded"></div>
          <div className="h-4 w-48 bg-tactical-border rounded"></div>
          <div className="h-4 w-24 bg-tactical-border rounded"></div>
          <div className="h-4 w-20 bg-tactical-border rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

export const ListSkeleton = ({ items = 4 }) => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: items }).map((_, idx) => (
      <div key={idx} className="bg-tactical-panel border border-tactical-border rounded-xl p-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3.5 w-40 bg-tactical-border rounded"></div>
          <div className="h-3 w-64 bg-tactical-border rounded"></div>
        </div>
        <div className="h-4 w-12 bg-tactical-border rounded"></div>
      </div>
    ))}
  </div>
);

export const ChartSkeleton = () => (
  <div className="bg-tactical-panel border border-tactical-border rounded-xl p-6 h-80 flex flex-col justify-between animate-pulse">
    <div className="h-4 w-40 bg-tactical-border rounded"></div>
    <div className="h-48 w-full bg-tactical-border/20 rounded flex items-end justify-between px-6 pb-2">
      <div className="w-12 h-20 bg-tactical-border rounded-t"></div>
      <div className="w-12 h-36 bg-tactical-border rounded-t"></div>
      <div className="w-12 h-28 bg-tactical-border rounded-t"></div>
      <div className="w-12 h-44 bg-tactical-border rounded-t"></div>
    </div>
    <div className="flex justify-between px-6">
      <div className="h-3.5 w-12 bg-tactical-border rounded"></div>
      <div className="h-3.5 w-12 bg-tactical-border rounded"></div>
      <div className="h-3.5 w-12 bg-tactical-border rounded"></div>
      <div className="h-3.5 w-12 bg-tactical-border rounded"></div>
    </div>
  </div>
);
