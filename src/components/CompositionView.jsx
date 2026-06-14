import { forwardRef, memo, useMemo } from "react";
import { MAX_VISIBLE_IMAGES } from "../media/constants.js";
import { IMAGE_TRANSITION_FADE_MS } from "../constants/ui.js";
import TransitionImage from "./TransitionImage.jsx";

/**
 * Generic renderer for a set of composition slots. Shared between the main slideshow
 * and the timeline preview so both contexts stay visually consistent.
 */
const CompositionView = forwardRef(function CompositionView(
  {
    className = "",
    slots = [],
    layoutSize = 1,
    emptyFallback = null,
    emptyFallbackKey = null,
    fillPlaceholders = true,
    imageClassName = "slideshow__image",
    visibleClassName = "slideshow__image--visible",
    placeholderClassName = "slideshow__placeholder",
    imageTransitionDelayMs = IMAGE_TRANSITION_FADE_MS,
    imageFadingClassName = "slideshow__image--fading",
    getImageKey = (image, index) => image?.url || image?.name || index,
    ...rest
  },
  ref
) {
  const effectiveLayout = Math.max(1, layoutSize || 1);
  const splitClass = `split-${Math.min(effectiveLayout, MAX_VISIBLE_IMAGES)}`;
  const containerClasses = [className, splitClass].filter(Boolean).join(" ").trim();

  const slotEntries = useMemo(() => {
    const length = fillPlaceholders ? effectiveLayout : Math.max(slots.length || 0, 0);
    if (!length) {
      return [];
    }

    return Array.from({ length }, (_, index) => {
      const slot = slots[index] || null;
      const image = slot?.image || null;
      return {
        image,
        slotIndex: index,
      };
    });
  }, [slots, effectiveLayout, fillPlaceholders]);

  const hasImages = useMemo(() => slotEntries.some((entry) => entry.image), [slotEntries]);

  if (!hasImages && emptyFallback) {
    return (
      <div className={containerClasses} ref={ref} data-empty-key={emptyFallbackKey} {...rest}>
        {emptyFallback}
      </div>
    );
  }

  return (
    <div className={containerClasses} ref={ref} {...rest}>
      {slotEntries.map((entry, index) => {
        const image = entry.image || null;
        const resolvedSlotIndex = entry.slotIndex ?? index;
        const imageKey = image ? getImageKey(image, resolvedSlotIndex) : null;
        if (!image && !fillPlaceholders) {
          return null;
        }
        return (
          <div
            key={`slot-${index}`}
            className="slideshow__slot"
            data-slot-index={index}
          >
            <TransitionImage
              image={image}
              imageKey={imageKey}
              slotIndex={resolvedSlotIndex}
              layoutKey={effectiveLayout}
              imageClassName={imageClassName}
              visibleClassName={visibleClassName}
              placeholderClassName={placeholderClassName}
              fillPlaceholder={fillPlaceholders}
              loading="lazy"
              hideDelayMs={imageTransitionDelayMs}
              fadingClassName={imageFadingClassName}
            />
          </div>
        );
      })}
    </div>
  );
});

// Custom comparison to prevent re-renders when slots array reference changes but content is the same
const areEqual = (prevProps, nextProps) => {
  // Fast path: check if we can skip all comparisons
  if (prevProps === nextProps) return true;
  
  if (prevProps.layoutSize !== nextProps.layoutSize) return false;
  if (prevProps.className !== nextProps.className) return false;
  if (prevProps.fillPlaceholders !== nextProps.fillPlaceholders) return false;
  if (prevProps.emptyFallbackKey !== nextProps.emptyFallbackKey) return false;
  if (prevProps.imageTransitionDelayMs !== nextProps.imageTransitionDelayMs) return false;
  if (prevProps.imageFadingClassName !== nextProps.imageFadingClassName) return false;

  // Fast path: if slots array references are the same, content is identical
  if (prevProps.slots === nextProps.slots) return true;
  
  // Deep compare slots array when references differ
  if (prevProps.slots?.length !== nextProps.slots?.length) return false;
  if (!prevProps.slots && !nextProps.slots) return true;
  if (!prevProps.slots || !nextProps.slots) return false;

  for (let i = 0; i < prevProps.slots.length; i++) {
    const prevSlot = prevProps.slots[i];
    const nextSlot = nextProps.slots[i];
    if (prevSlot?.image?.url !== nextSlot?.image?.url) return false;
    if (prevSlot?.visible !== nextSlot?.visible) return false;
  }

  return true;
};

export default memo(CompositionView, areEqual);
