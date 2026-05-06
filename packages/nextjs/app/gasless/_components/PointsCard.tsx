"use client";

interface PointsCardProps {
  points: bigint;
  loading: boolean;
  onRefresh: () => void;
}

export function PointsCard({ points, loading, onRefresh }: PointsCardProps) {
  return (
    <div className="bg-secondary p-5 rounded-lg w-full lg:w-80 border border-border">
      <h3 className="m-0 font-semibold">Your Points</h3>
      <hr className="my-3 border-1 border-white-400 rounded-full" />
      <div className="text-4xl font-bold text-center py-4">{points.toString()}</div>
      <button
        className="bg-brand-pink rounded-md py-1.5 px-3 text-black text-sm font-medium w-full disabled:opacity-50 mt-2"
        onClick={onRefresh}
        disabled={loading}
      >
        Refresh
      </button>
    </div>
  );
}
