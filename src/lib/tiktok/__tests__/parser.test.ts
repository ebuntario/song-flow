import { describe, it, expect } from "vitest";
import { parseCommand } from "../parser";

describe("parseCommand", () => {
  describe("!play command", () => {
    it("should parse !play with song name", () => {
      const result = parseCommand("!play Shape of You");
      expect(result).toEqual({ type: "play", query: "Shape of You" });
    });

    it("should parse !play with artist - song format", () => {
      const result = parseCommand("!play Ed Sheeran - Shape of You");
      expect(result).toEqual({ type: "play", query: "Ed Sheeran - Shape of You" });
    });

    it("should be case insensitive", () => {
      const result = parseCommand("!PLAY Bohemian Rhapsody");
      expect(result).toEqual({ type: "play", query: "Bohemian Rhapsody" });
    });

    it("should trim whitespace from query", () => {
      const result = parseCommand("!play   Hello   ");
      expect(result).toEqual({ type: "play", query: "Hello" });
    });

    it("should handle multiple spaces between command and query", () => {
      const result = parseCommand("!play    Some Song");
      expect(result).toEqual({ type: "play", query: "Some Song" });
    });

    it("should return null for !play without query", () => {
      const result = parseCommand("!play");
      expect(result).toBeNull();
    });

    it("should return null for !play with only whitespace", () => {
      const result = parseCommand("!play   ");
      expect(result).toBeNull();
    });
  });

  describe("!revoke command", () => {
    it("should parse !revoke", () => {
      const result = parseCommand("!revoke");
      expect(result).toEqual({ type: "revoke" });
    });

    it("should be case insensitive", () => {
      const result = parseCommand("!REVOKE");
      expect(result).toEqual({ type: "revoke" });
    });

    it("should handle whitespace", () => {
      const result = parseCommand("  !revoke  ");
      expect(result).toEqual({ type: "revoke" });
    });

    it("should not match !revoke with extra content", () => {
      const result = parseCommand("!revoke 123");
      expect(result).toBeNull();
    });
  });

  describe("!skip command", () => {
    it("should parse !skip", () => {
      const result = parseCommand("!skip");
      expect(result).toEqual({ type: "skip" });
    });

    it("should be case insensitive", () => {
      const result = parseCommand("!SKIP");
      expect(result).toEqual({ type: "skip" });
    });

    it("should handle whitespace", () => {
      const result = parseCommand("  !skip  ");
      expect(result).toEqual({ type: "skip" });
    });

    it("should not match !skip with extra content", () => {
      const result = parseCommand("!skip now");
      expect(result).toBeNull();
    });
  });

  describe("invalid commands", () => {
    it("should return null for empty message", () => {
      expect(parseCommand("")).toBeNull();
    });

    it("should return null for whitespace only", () => {
      expect(parseCommand("   ")).toBeNull();
    });

    it("should return null for regular chat message", () => {
      expect(parseCommand("Hello everyone!")).toBeNull();
    });

    it("should return null for unknown commands", () => {
      expect(parseCommand("!unknown")).toBeNull();
    });

    it("should return null for commands without prefix", () => {
      expect(parseCommand("play Song")).toBeNull();
    });

    it("should return null for partial commands", () => {
      expect(parseCommand("!pla")).toBeNull();
    });
  });
});
