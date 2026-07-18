"use client";

import { useEffect, useRef, type ReactNode } from "react";

const ROWS = 3;

type Props = {
  items: string[];
  renderItem: (item: string) => ReactNode;
};

// Splits the list into exactly 3 rows by simple count division — row 1
// gets the first ceil(n/3) items, row 2 the next chunk, row 3 whatever's
// left. Each row stays a single line; if a row runs wider than the
// container, the whole 3-row block scrolls horizontally together.
export default function PagedBubbleGrid({ items, renderItem }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Let a normal (vertical) mouse wheel scroll this horizontal strip, same
  // as trackpad/drag already does — without this, wheel users need shift.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const perRow = Math.max(1, Math.ceil(items.length / ROWS));
  const rows: string[][] = [];
  for (let i = 0; i < items.length; i += perRow) {
    rows.push(items.slice(i, i + perRow));
  }

  return (
    <div className="tagGridWrap">
      <div className="tagGrid" ref={containerRef}>
        <div className="tagPage">
          {rows.map((row, rowIndex) => (
            <div className="tagRow" key={rowIndex}>
              {row.map((item) => (
                <span key={item}>{renderItem(item)}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
