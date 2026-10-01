"use client";

import { useRef, useState } from "react";

export default function MagneticHoverButton() {
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = ref.current!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    setOffset({ x: dx * 0.35, y: dy * 0.35 });
  };

  const reset = () => {
    setOffset({ x: 0, y: 0 });
    setActive(false);
  };

  return (
    // The padded wrapper widens the "magnetic field" around the button.
    <div className="p-12">
      <button
        ref={ref}
        onMouseEnter={() => setActive(true)}
        onMouseMove={onMove}
        onMouseLeave={reset}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${active ? 1.06 : 1})`,
          transition: active
            ? "transform 120ms ease-out, box-shadow 200ms"
            : "transform 500ms cubic-bezier(.34,1.56,.64,1), box-shadow 300ms",
        }}
        className={`rounded-full bg-indigo-500 px-8 py-3 font-medium text-white ${
          active ? "shadow-[0_10px_40px_-5px_rgba(99,102,241,0.8)]" : "shadow-lg shadow-indigo-900/40"
        }`}
      >
        Hover me
      </button>
    </div>
  );
}
