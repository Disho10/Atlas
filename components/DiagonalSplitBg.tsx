/**
 * Renders a diagonal white → theme-color split as two absolutely-positioned
 * layers. Unlike a CSS linear-gradient hard-stop (which bends at a different
 * visual angle depending on the box's aspect ratio, and was cutting through
 * text), this uses clip-path percentages, which scale independently on each
 * axis — so the safe zones below are guaranteed regardless of how wide or
 * tall the card is.
 *
 * - Above `splitTop`%, the whole width is solid white — safe for a logo/label.
 * - Below `splitBottom`%, the whole width is solid theme color — safe for text.
 * - Between the two is the diagonal transition strip (the "cut corner" look).
 *
 * Parent element must be `relative` (or `relative overflow-hidden`).
 */
export default function DiagonalSplitBg({
  color,
  splitTop = 38,
  splitBottom = 62,
}: {
  color: string;
  splitTop?: number;
  splitBottom?: number;
}) {
  return (
    <>
      <div className="absolute inset-0 bg-white" />
      <div
        className="absolute inset-0"
        style={{
          background: color,
          clipPath: `polygon(0% ${splitBottom}%, 100% ${splitTop}%, 100% 100%, 0% 100%)`,
        }}
      />
    </>
  );
}
