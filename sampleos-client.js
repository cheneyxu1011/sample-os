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
    if (!token) throw new Error("Missing Supabase access token");
    return { authorization: `Bearer ${token}` };
  }

  async function getRuntimeConfig() {
    if (!runtimeConfigPromise) runtimeConfigPromise = requestJson("/api/runtime-config");
    return runtimeConfigPromise;
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
        styleId: context.styleId,
        sampleId: context.sampleId,
        reviewId: context.reviewId || null,
        issueId: context.issueId || null,
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
    createUpload,
    uploadFile,
  };
}());
