"use client";

import { useLayoutEffect, useRef, useState } from "react";

const ROWS_PER_PAGE = 3;
const GAP = 8; // must match the gap used in the CSS below

type Props = {
  tags: string[];
  selectedTags: string[];
  onToggle: (tag: string) => void;
};

// Lays tags out the way you'd read a page: fills the top row left-to-right,
// then the second row, then the third. Once three rows are full, instead of
// wrapping to a fourth row it starts a fresh column of up to three rows to
// the right, and the whole strip scrolls horizontally from there.
export default function TagGrid({ tags, selectedTags, onToggle }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[][][] | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    function recompute() {
      if (!container || !measure) return;
      const width = container.clientWidth;
      if (!width) return;

      const nodes = Array.from(measure.children) as HTMLElement[];
      const widths = nodes.map((node) => node.getBoundingClientRect().width);

      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentWidth = 0;

      tags.forEach((tag, i) => {
        const w = widths[i] ?? 0;
        const addedWidth = currentRow.length === 0 ? w : w + GAP;

        if (currentRow.length > 0 && currentWidth + addedWidth > width) {
          rows.push(currentRow);
          currentRow = [tag];
          currentWidth = w;
        } else {
          currentRow.push(tag);
          currentWidth += addedWidth;
        }
      });
      if (currentRow.length > 0) rows.push(currentRow);

      const nextPages: string[][][] = [];
      for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
        nextPages.push(rows.slice(i, i + ROWS_PER_PAGE));
      }
      setPages(nextPages.length > 0 ? nextPages : [[]]);
    }

    recompute();

    const observer = new ResizeObserver(() => recompute());
    observer.observe(container);
    return () => observer.disconnect();
  }, [tags]);

  return (
    <div className="tagGridWrap">
      {/* Hidden measuring pass: renders every tag once, unwrapped, so we can
          read each button's real rendered width before laying out pages. */}
      <div className="tagGridMeasure" ref={measureRef} aria-hidden="true">
        {tags.map((tag) => (
          <button key={tag} type="button" className="bubble">
            {tag}
          </button>
        ))}
      </div>

      <div className="tagGrid" ref={containerRef}>
        {(pages ?? [[tags]]).map((page, pageIndex) => (
          <div className="tagPage" key={pageIndex}>
            {page.map((row, rowIndex) => (
              <div className="tagRow" key={rowIndex}>
                {row.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`bubble ${selectedTags.includes(tag) ? "on" : ""}`}
                    onClick={() => onToggle(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
