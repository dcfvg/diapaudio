import { memo, useEffect, useRef, useState, useCallback } from "react";

const DEFAULT_FADE_MS = 750;

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
}) {
  const removalTimersRef = useRef(new Map());
  const sequenceRef = useRef(0);
  const fadeDuration = Math.max(0, Number.isFinite(hideDelayMs) ? hideDelayMs : DEFAULT_FADE_MS);

  const [layers, setLayers] = useState(() => []);

  // Add initial layer on mount if image is present
  useEffect(() => {
    if (image) {
      const id = `layer-${slotIndex}-0`;
      setLayers([{ id, key: imageKey ?? null, image, phase: "visible" }]);
      sequenceRef.current = 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setLayers((prev) => prev.filter((layer) => layer.id !== id));
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

  useEffect(() => {
    const nextKey = image ? imageKey ?? null : null;

    setLayers((prevLayers) => {
      const markForExit = (layer) => {
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
          });
        }
      }

      const exitingLayers = prevLayers.map((layer) => markForExit(layer));

      if (!image) {
        return exitingLayers;
      }

      const id = `layer-${slotIndex}-${sequenceRef.current++}`;
      const newLayer = { id, key: nextKey, image, phase: "enter" };
      return [...exitingLayers, newLayer];
    });
  }, [image, imageKey, fadeDuration, slotIndex, scheduleRemoval, cancelRemovalTimer]);

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
      prevProps.slotIndex === nextProps.slotIndex
    ) {
      return true;
    }
  }
  return false;
});

export default TransitionImage;
