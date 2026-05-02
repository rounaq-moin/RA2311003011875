export class ExternalApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ExternalApiError";
    this.status = status;
  }
}

export async function readJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new ExternalApiError("external API returned invalid JSON", response.status);
  }
}
