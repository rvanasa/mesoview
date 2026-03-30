import { describe, it, expect } from 'vitest';
import { mesoParamCategories, mesoParams } from '../src/utils/mesoanalysis';

describe('SPC Mesoanalysis parameters', () => {
  it('loads and is a non-empty array of categories', () => {
    expect(Array.isArray(mesoParamCategories)).toBe(true);
    expect(mesoParamCategories.length).toBeGreaterThan(0);
  });

  it('each category is [string, params[]] and params are [id, name]', () => {
    for (const cat of mesoParamCategories) {
      expect(Array.isArray(cat)).toBe(true);
      const [name, params] = cat as unknown as [string, [string, string][]];
      expect(typeof name).toBe('string');
      expect(Array.isArray(params)).toBe(true);
      for (const p of params) {
        expect(Array.isArray(p)).toBe(true);
        expect(typeof p[0]).toBe('string');
        expect(typeof p[1]).toBe('string');
      }
    }
  });

  it('contains known category and parameter (Surface -> pmsl)', () => {
    const surface = mesoParamCategories.find(([c]) => c === 'Surface');
    expect(surface).toBeDefined();
    const params = surface![1];
    expect(params.some(([id]) => id === 'pmsl')).toBe(true);
  });

  it('mesoParams flat list contains pmsl', () => {
    expect(mesoParams.some(([id]) => id === 'pmsl')).toBe(true);
  });
});
