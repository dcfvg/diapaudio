export const SAMPLE_ENDPOINT = "/__diapaudio_sample__";

function getFetch(fetchImpl) {
  if (fetchImpl) {
    return fetchImpl;
  }
  if (typeof fetch === "function") {
    return fetch;
  }
  throw new Error("Fetch is not available in this browser.");
}

export function shouldAutoloadSample(locationLike = window.location) {
  if (!locationLike) {
    return false;
  }
  const href = typeof locationLike === "string" ? locationLike : locationLike.href;
  const url = new URL(href, "http://127.0.0.1");
  return url.searchParams.get("sample") === "local";
}

export async function fetchSampleManifest({ fetchImpl } = {}) {
  const response = await getFetch(fetchImpl)(`${SAMPLE_ENDPOINT}/manifest.json`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Local sample manifest failed with HTTP ${response.status}.`);
  }

  const manifest = await response.json();
  return manifest?.available ? manifest : null;
}

export async function fetchSampleFile(manifest, { fetchImpl } = {}) {
  if (!manifest?.sampleUrl) {
    throw new Error("Local sample manifest is missing the sample URL.");
  }

  const response = await getFetch(fetchImpl)(manifest.sampleUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Local sample ZIP failed with HTTP ${response.status}.`);
  }

  const blob = await response.blob();
  const fileName = manifest.fileName || "diapaudio-sample.zip";
  const options = {
    type: manifest.contentType || blob.type || "application/zip",
  };

  if (Number.isFinite(manifest.lastModifiedMs)) {
    options.lastModified = manifest.lastModifiedMs;
  }

  return new File([blob], fileName, options);
}
