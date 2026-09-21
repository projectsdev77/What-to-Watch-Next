import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getShowMock = vi.fn();
const configCtorSpy = vi.fn();

vi.mock("streaming-availability", () => {
  class Configuration {
    apiKey: unknown;
    constructor(params: { apiKey: string }) {
      configCtorSpy(params);
      this.apiKey = params.apiKey;
    }
  }
  class Client {
    showsApi = { getShow: getShowMock };
  }
  return { Client, Configuration };
});

function streamingOption(serviceId: string, type: string, link: string) {
  return { service: { id: serviceId }, type, link };
}

beforeEach(() => {
  vi.resetModules();
  getShowMock.mockReset();
  configCtorSpy.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getDeepLinksByPlatform", () => {
  it("returns null and never calls the API when STREAMING_AVAILABILITY_API_KEY is unset", async () => {
    vi.stubEnv("STREAMING_AVAILABILITY_API_KEY", "");
    const { getDeepLinksByPlatform } = await import("./streaming-availability");

    const result = await getDeepLinksByPlatform("movie", 593);

    expect(result).toBeNull();
    expect(getShowMock).not.toHaveBeenCalled();
  });

  it("maps known service ids to our platform labels, keeping only subscription options", async () => {
    vi.stubEnv("STREAMING_AVAILABILITY_API_KEY", "test-key");
    getShowMock.mockResolvedValue({
      streamingOptions: {
        us: [
          streamingOption("hulu", "subscription", "https://www.hulu.com/watch/hulu-id"),
          streamingOption("hulu", "buy", "https://www.hulu.com/buy/hulu-id"),
          streamingOption("disney", "subscription", "https://www.disneyplus.com/movies/disney-id"),
          streamingOption("some-unmapped-service", "subscription", "https://example.com/watch"),
        ],
      },
    });
    const { getDeepLinksByPlatform } = await import("./streaming-availability");

    const result = await getDeepLinksByPlatform("movie", 593);

    expect(result).toEqual({
      Hulu: "https://www.hulu.com/watch/hulu-id",
      "Disney+": "https://www.disneyplus.com/movies/disney-id",
    });
    expect(getShowMock).toHaveBeenCalledWith({ id: "movie/593", country: "us" });
  });

  it("keeps only the first subscription match per platform", async () => {
    vi.stubEnv("STREAMING_AVAILABILITY_API_KEY", "test-key");
    getShowMock.mockResolvedValue({
      streamingOptions: {
        us: [
          streamingOption("netflix", "subscription", "https://www.netflix.com/first"),
          streamingOption("netflix", "subscription", "https://www.netflix.com/second"),
        ],
      },
    });
    const { getDeepLinksByPlatform } = await import("./streaming-availability");

    const result = await getDeepLinksByPlatform("tv", 1396);

    expect(result).toEqual({ Netflix: "https://www.netflix.com/first" });
  });

  it("returns an empty object (not null) when the title has no matching streaming options", async () => {
    vi.stubEnv("STREAMING_AVAILABILITY_API_KEY", "test-key");
    getShowMock.mockResolvedValue({ streamingOptions: {} });
    const { getDeepLinksByPlatform } = await import("./streaming-availability");

    const result = await getDeepLinksByPlatform("movie", 1);

    expect(result).toEqual({});
  });

  it("returns null instead of throwing when the API call fails", async () => {
    vi.stubEnv("STREAMING_AVAILABILITY_API_KEY", "test-key");
    getShowMock.mockRejectedValue(new Error("rate limited"));
    const { getDeepLinksByPlatform } = await import("./streaming-availability");

    const result = await getDeepLinksByPlatform("movie", 593);

    expect(result).toBeNull();
  });
});
