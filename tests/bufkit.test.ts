import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  bufkitSoundingToProfile,
  fetchLatestBufkit,
  parseBufkitFile,
} from '../src/utils/bufkit';

describe('Bufkit Parser', () => {
  let sampleBufkitData: string;

  beforeAll(() => {
    const filePath = join(__dirname, 'fixtures', 'rap_tbl.buf');
    sampleBufkitData = readFileSync(filePath, 'utf-8');
  });

  it('should parse bufkit file with multiple soundings', () => {
    const soundings = parseBufkitFile(sampleBufkitData);

    expect(soundings).toHaveLength(22);
  });

  it('should parse RAP model TBL station header correctly', () => {
    const soundings = parseBufkitFile(sampleBufkitData);
    const sounding = soundings[0];

    expect(sounding.stationId).toBe('TBL');
    expect(sounding.stationNumber).toBe(73);
    expect(sounding.time).toBe('251205/2200');
    expect(sounding.latitude).toBe(40.13);
    expect(sounding.longitude).toBe(-105.24);
    expect(sounding.elevation).toBe(1646);
  });

  it('should parse sounding data arrays correctly', () => {
    const soundings = parseBufkitFile(sampleBufkitData);
    const sounding = soundings[0];

    expect(sounding.sounding.pressure.length).toBeGreaterThan(0);
    expect(sounding.sounding.tempC).toHaveLength(
      sounding.sounding.pressure.length,
    );
    expect(sounding.sounding.dewC).toHaveLength(
      sounding.sounding.pressure.length,
    );
    expect(sounding.sounding.height).toHaveLength(
      sounding.sounding.pressure.length,
    );

    expect(sounding.sounding.pressure[0]).toBe(829.2);
    expect(sounding.sounding.tempC[0]).toBe(0.04);
    expect(sounding.sounding.dewC[0]).toBe(-5.96);
    expect(sounding.sounding.thetaE[0]).toBe(297.03);
    expect(sounding.sounding.windDir[0]).toBeCloseTo(26.57, 1);
    expect(sounding.sounding.windSpeedKt[0]).toBeCloseTo(5.22, 1);
    expect(sounding.sounding.omega[0]).toBe(0.0);
    expect(sounding.sounding.height[0]).toBeCloseTo(1655.66, 1);

    expect(sounding.sounding.pressure[1]).toBe(826.7);
    expect(sounding.sounding.tempC[1]).toBe(-0.26);
    expect(sounding.sounding.dewC[1]).toBe(-6.35);
  });

  it('should convert bufkit sounding to profile', () => {
    const soundings = parseBufkitFile(sampleBufkitData);
    const profile = bufkitSoundingToProfile(soundings[0], 'rap');

    expect(profile.station).toBe('TBL');
    expect(profile.model).toBe('rap');
    expect(profile.latitude).toBe(40.13);
    expect(profile.longitude).toBe(-105.24);
    expect(profile.tempC.length).toBeGreaterThan(0);
    expect(profile.dewC).toHaveLength(profile.tempC.length);
    expect(profile.pressureHPa).toHaveLength(profile.tempC.length);

    expect(profile.time).toContain('2025-12-05');
    expect(profile.time).toContain('22:00');

    expect(profile.uKt[0]).toBeCloseTo(-2.33, 1);
    expect(profile.vKt[0]).toBeCloseTo(-4.67, 1);

    expect(profile.omega[0]).toBeCloseTo(0.0, 1);
  });

  it('should handle second sounding with different time', () => {
    const soundings = parseBufkitFile(sampleBufkitData);
    const sounding = soundings[1]; // Second sounding is 251205/2300

    expect(sounding.stationId).toBe('TBL');
    expect(sounding.time).toBe('251205/2300');
    expect(sounding.sounding.pressure.length).toBeGreaterThan(0);
    expect(sounding.time).not.toBe(soundings[0].time);
  });

  describe('fetchBufkitFile', () => {
    it('should fetch bufkit file from PSU server', async () => {
      const mockResponse = {
        ok: true,
        text: async () => sampleBufkitData,
      };
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await fetchLatestBufkit('rap', 'tbl');

      expect(result).toBe(sampleBufkitData);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('rap_tbl.buf'),
      );
    });

    it('should construct correct URL for RAP/TBL', async () => {
      const mockResponse = {
        ok: true,
        text: async () => sampleBufkitData,
      };
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

      await fetchLatestBufkit('rap', 'tbl');

      const calledUrl = (globalThis.fetch as any).mock.calls[0][0];
      expect(calledUrl).toContain('%2FRAP%2Flatest%2Frap_tbl.buf');
    });

    it('should throw error when fetch fails', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(fetchLatestBufkit('rap', 'tbl')).rejects.toThrow(
        'Failed to fetch Bufkit data: 404 Not Found',
      );
    });

    it('should handle case-insensitive model and station names', async () => {
      const mockResponse = {
        ok: true,
        text: async () => sampleBufkitData,
      };
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

      await fetchLatestBufkit('Rap' as any, 'TBL');

      const calledUrl = (globalThis.fetch as any).mock.calls[0][0];
      expect(calledUrl).toContain('%2FRAP%2Flatest%2Frap_tbl.buf');
    });

    it('should parse fetched data correctly', async () => {
      const mockResponse = {
        ok: true,
        text: async () => sampleBufkitData,
      };
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

      const fileContent = await fetchLatestBufkit('rap', 'tbl');
      const soundings = parseBufkitFile(fileContent);

      expect(soundings).toHaveLength(22);
      expect(soundings[0].stationId).toBe('TBL');
      expect(soundings[0].latitude).toBe(40.13);
    });
  });
});
