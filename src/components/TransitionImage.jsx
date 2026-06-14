import { memo, useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { IMAGE_TRANSITION_FADE_MS } from "../constants/ui.js";

const DEFAULT_FADE_MS = IMAGE_TRANSITION_FADE_MS;

const TransitionImage = memo(function TransitionImage({
  image = null,
  imageKey = null,
  slotIndex = 0,
  imageClassName = "",
  visibleClassName = "slideshow__image--visible",
  placeholderClassName = "",
  fillPlaceholder = true,
  loading = "lazy",
  hideDelayMs = DEFAULT_FADE_MS,
  fadingClassName = "slideshow__image--fading",
  layoutKey = null,
}) {
  const removalTimersRef = useRef(new Map());
  const sequenceRef = useRef(0);
  const layoutKeyRef = useRef(layoutKey);
  const fadeDuration = Math.max(0, Number.isFinite(hideDelayMs) ? hideDelayMs : DEFAULT_FADE_MS);

  const [layers, setLayers] = useState(() => []);

  const cancelRemovalTimer = useCallback((id) => {
    const timer = removalTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      removalTimersRef.current.delete(id);
    }
  }, []);

  const scheduleRemoval = useCallback((id, delay) => {
    cancelRemovalTimer(id);
    if (delay <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setLayers((prev) => prev.filter((layer) => layer.id !== id));
      removalTimersRef.current.delete(id);
    }, delay);
    removalTimersRef.current.set(id, timer);
  }, [cancelRemovalTimer]);

  useEffect(() => () => {
    removalTimersRef.current.forEach((timer) => clearTimeout(timer));
    removalTimersRef.current.clear();
  }, []);

  useLayoutEffect(() => {
    const nextKey = image ? imageKey ?? null : null;
    const layoutChanged = layoutKeyRef.current !== layoutKey;
    layoutKeyRef.current = layoutKey;

    setLayers((prevLayers) => {
      if (layoutChanged) {
        prevLayers.forEach((layer) => cancelRemovalTimer(layer.id));
        if (!image) {
          return [];
        }
        const id = `layer-${slotIndex}-${sequenceRef.current++}`;
        return [{ id, key: nextKey, image, phase: "enter" }];
      }

      const markForExit = (layer) => {
        if (fadeDuration <= 0) {
          cancelRemovalTimer(layer.id);
          return null;
        }
        if (layer.phase === "exit") {
          return layer;
        }
        scheduleRemoval(layer.id, fadeDuration);
        return { ...layer, phase: "exit" };
      };

      if (!image && !prevLayers.length) {
        return prevLayers;
      }

      if (image) {
        const matchIndex = prevLayers.findIndex((layer) => layer.key === nextKey);
        if (matchIndex !== -1) {
          const matchLayer = prevLayers[matchIndex];
          const revivedPhase = matchLayer.phase === "exit" ? "enter" : "visible";
          cancelRemovalTimer(matchLayer.id);
          const updatedMatch = { ...matchLayer, image, phase: revivedPhase };

          return prevLayers.map((layer, index) => {
            if (index === matchIndex) {
              return updatedMatch;
            }
            return markForExit(layer);
          }).filter(Boolean);
        }
      }

      const exitingLayers = prevLayers.map((layer) => markForExit(layer)).filter(Boolean);

      if (!image) {
        return exitingLayers;
      }

      const id = `layer-${slotIndex}-${sequenceRef.current++}`;
      const newLayer = { id, key: nextKey, image, phase: "enter" };
      return [...exitingLayers, newLayer];
    });
  }, [image, imageKey, fadeDuration, slotIndex, layoutKey, scheduleRemoval, cancelRemovalTimer]);

  useEffect(() => {
    if (!layers.some((layer) => layer.phase === "enter")) {
      return;
    }
    const raf = requestAnimationFrame(() => {
      setLayers((prevLayers) =>
        prevLayers.map((layer) => (layer.phase === "enter" ? { ...layer, phase: "visible" } : layer))
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [layers]);

  if (!layers.length) {
    if (!fillPlaceholder) {
      return null;
    }
    return (
      <div
        className={[placeholderClassName, imageClassName].filter(Boolean).join(" ")}
        data-slot-index={slotIndex}
      />
    );
  }

  return (
    <div className="transition-image__stack" data-slot-index={slotIndex}>
      {layers.map((layer) => {
        const classes = [imageClassName];
        if (layer.phase === "visible") {
          if (visibleClassName) {
            classes.push(visibleClassName);
          }
        } else if (layer.phase === "exit") {
          if (fadingClassName) {
            classes.push(fadingClassName);
          }
        }

        const altText = layer.image?.name || `Slide ${slotIndex + 1}`;

        return (
          <img
            key={layer.id}
            src={layer.image?.url}
            alt={altText}
            className={classes.join(" ")}
            loading={loading}
            data-layer-state={layer.phase}
          />
        );
      })}
    </div>
  );
},
(prevProps, nextProps) => {
  if (prevProps.image === nextProps.image && prevProps.imageKey === nextProps.imageKey) {
    if (
      prevProps.imageClassName === nextProps.imageClassName &&
      prevProps.visibleClassName === nextProps.visibleClassName &&
      prevProps.placeholderClassName === nextProps.placeholderClassName &&
      prevProps.fillPlaceholder === nextProps.fillPlaceholder &&
      prevProps.loading === nextProps.loading &&
      prevProps.hideDelayMs === nextProps.hideDelayMs &&
      prevProps.fadingClassName === nextProps.fadingClassName &&
      prevProps.layoutKey === nextProps.layoutKey &&
      prevProps.slotIndex === nextProps.slotIndex
    ) {
      return true;
    }
  }
  return false;
});

export default TransitionImage;
