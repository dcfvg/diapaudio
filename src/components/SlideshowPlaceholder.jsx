import "./SlideshowPlaceholder.css";

function resolveImageSource(image) {
  if (!image) return null;
  return image.previewUrl || image.thumbnailUrl || image.url || null;
}

export function resolvePlaceholderSources({ previousImage, nextImage } = {}) {
  return {
    previousSrc: resolveImageSource(previousImage),
    nextSrc: resolveImageSource(nextImage),
  };
}

export function buildPlaceholderSignature(previousSrc, nextSrc, absoluteMs) {
  return [
    previousSrc || "none",
    nextSrc || "none",
    Number.isFinite(absoluteMs) ? absoluteMs : "nan",
  ].join("|");
}

export default function SlideshowPlaceholder({
  previousImage = null,
  nextImage = null,
  className = "",
}) {
  const { previousSrc, nextSrc } = resolvePlaceholderSources({ previousImage, nextImage });
  const classes = ["slideshow__placeholder", "slideshow__placeholder--hybrid", className]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <div className={classes}>
      {previousSrc ? (
        <img
          className="slideshow__placeholder-image slideshow__placeholder-image--previous"
          src={previousSrc}
          alt=""
          loading="lazy"
        />
      ) : null}
      {nextSrc ? (
        <img
          className="slideshow__placeholder-image slideshow__placeholder-image--next"
          src={nextSrc}
          alt=""
          loading="lazy"
        />
      ) : null}
    </div>
  );
}
