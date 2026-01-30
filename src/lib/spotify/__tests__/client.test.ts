import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSpotifyToken, searchTracks, addToQueue, skipTrack, getCurrentlyPlaying } from "../client";

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Spotify Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchTracks", () => {
    it("should search tracks successfully", async () => {
      const mockResponse = {
        tracks: {
          items: [
            {
              id: "track123",
              name: "Shape of You",
              artists: [{ name: "Ed Sheeran" }],
              uri: "spotify:track:track123",
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchTracks("test-token", "Shape of You");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/search?q=Shape%20of%20You"),
        expect.objectContaining({
          headers: { Authorization: "Bearer test-token" },
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should throw error on failed search", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(searchTracks("invalid-token", "test")).rejects.toThrow(
        "Spotify search failed: 401"
      );
    });

    it("should encode special characters in query", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tracks: { items: [] } }),
      });

      await searchTracks("token", "Artist & Song");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("Artist%20%26%20Song"),
        expect.any(Object)
      );
    });
  });

  describe("addToQueue", () => {
    it("should add track to queue successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await expect(
        addToQueue("test-token", "spotify:track:abc123")
      ).resolves.not.toThrow();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/me/player/queue?uri=spotify%3Atrack%3Aabc123"),
        expect.objectContaining({
          method: "POST",
          headers: { Authorization: "Bearer test-token" },
        })
      );
    });

    it("should throw error when queue fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      await expect(
        addToQueue("test-token", "spotify:track:abc123")
      ).rejects.toThrow("Queue failed: 403");
    });
  });

  describe("skipTrack", () => {
    it("should skip track successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await expect(skipTrack("test-token")).resolves.not.toThrow();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/me/player/next"),
        expect.objectContaining({
          method: "POST",
          headers: { Authorization: "Bearer test-token" },
        })
      );
    });

    it("should throw error when skip fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      await expect(skipTrack("test-token")).rejects.toThrow("Skip failed: 403");
    });
  });

  describe("getCurrentlyPlaying", () => {
    it("should return currently playing track", async () => {
      const mockResponse = {
        is_playing: true,
        item: {
          id: "track123",
          name: "Test Song",
          artists: [{ name: "Test Artist" }],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getCurrentlyPlaying("test-token");

      expect(result).toEqual(mockResponse);
    });

    it("should return null when nothing is playing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await getCurrentlyPlaying("test-token");

      expect(result).toBeNull();
    });

    it("should throw error on failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(getCurrentlyPlaying("test-token")).rejects.toThrow(
        "Current playing failed: 401"
      );
    });
  });
});
