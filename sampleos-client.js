(function () {
  const TOKEN_KEY = "sampleos.supabaseAccessToken";
  let runtimeConfigPromise = null;

  async function requestJson(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Request failed with ${response.status}`);
    }
    return payload;
  }

  function getAccessToken() {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  function setAccessToken(token) {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  }

  function authHeaders() {
    const token = getAccessToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  }

  async function getRuntimeConfig() {
    if (!runtimeConfigPromise) runtimeConfigPromise = requestJson("/api/runtime-config");
    return runtimeConfigPromise;
  }

  async function bootstrapProfile(profile = {}) {
    return requestJson("/api/bootstrap/profile", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(profile),
    });
  }

  async function seedDemoData() {
    return requestJson("/api/bootstrap/demo-data", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  async function createUpload(file, context) {
    if (!file) throw new Error("Missing file");
    const mediaKind = file.type.startsWith("image/")
      ? "photo"
      : file.type.startsWith("video/")
        ? "video"
        : "document";

    return requestJson("/api/media/presign-upload", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        styleId: isUuid(context.styleId) ? context.styleId : null,
        sampleId: isUuid(context.sampleId) ? context.sampleId : null,
        reviewId: isUuid(context.reviewId) ? context.reviewId : null,
        issueId: isUuid(context.issueId) ? context.issueId : null,
        styleExternalRef: context.styleExternalRef || (!isUuid(context.styleId) ? context.styleId : null),
        sampleExternalRef: context.sampleExternalRef || (!isUuid(context.sampleId) ? context.sampleId : null),
        reviewExternalRef: context.reviewExternalRef || (!isUuid(context.reviewId) ? context.reviewId : null),
        issueExternalRef: context.issueExternalRef || (!isUuid(context.issueId) ? context.issueId : null),
        mediaKind,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        byteSize: file.size,
      }),
    });
  }

  async function uploadFile(file, context, onProgress) {
    const presigned = await createUpload(file, context);

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(presigned.method || "PUT", presigned.uploadUrl, true);
      Object.entries(presigned.headers || {}).forEach(([name, value]) => xhr.setRequestHeader(name, value));
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && typeof onProgress === "function") {
          onProgress({ loaded: event.loaded, total: event.total, ratio: event.loaded / event.total });
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`S3 upload failed with ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("S3 upload failed"));
      xhr.send(file);
    });

    const media = presigned.media;
    return requestJson("/api/media/complete-upload", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        styleId: media.styleId,
        sampleId: media.sampleId,
        reviewId: media.reviewId || null,
        issueId: media.issueId || null,
        styleExternalRef: media.styleExternalRef || null,
        sampleExternalRef: media.sampleExternalRef || null,
        reviewExternalRef: media.reviewExternalRef || null,
        issueExternalRef: media.issueExternalRef || null,
        mediaKind: media.mediaKind,
        label: media.label || file.name,
        s3Bucket: media.s3Bucket,
        s3Region: media.s3Region,
        s3ObjectKey: media.s3ObjectKey,
        mimeType: media.mimeType,
        byteSize: media.byteSize,
        checksumSha256: null,
      }),
    });
  }

  window.SampleOSBackend = {
    getRuntimeConfig,
    getAccessToken,
    setAccessToken,
    bootstrapProfile,
    seedDemoData,
    createUpload,
    uploadFile,
  };
}());
