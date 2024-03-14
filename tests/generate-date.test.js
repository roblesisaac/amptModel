import generateDate, { validDate, pacificTimezoneOffset } from '../utils/generate-date';
import { describe, test, expect } from 'vitest';

describe('generateDate', () => {
  test('should generate a date string with random time when inputDate is missing time', () => {
    const inputDate = '2022-01-01';
    const result = generateDate(inputDate);
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z/);
  });

  test('should generate a date string with the same time when inputDate includes time', () => {
    const inputDate = '2022-01-01T12-34-56';
    const result = generateDate(inputDate);
    expect(result).toBe('2022-01-01T12-34-56Z');
});
});

describe('validDate', () => {
  test('should return a date object with the same time when inputDate includes time', () => {
    const inputDate = '2022-01-01T12-34-56';
    const result = validDate(inputDate);
    expect(result.getUTCFullYear()).toBe(2022);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(1);
    expect(result.getUTCHours()).toBe(12);
    expect(result.getUTCMinutes()).toBe(34);
    expect(result.getUTCSeconds()).toBe(56);
  });

  test('should return a date object with the same time when inputDate includes time and :', () => {
    const inputDate = '2022-01-01T12:34:56';
    const result = validDate(inputDate);
    expect(result.getUTCFullYear()).toBe(2022);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(1);
    expect(result.getUTCHours()).toBe(12);
    expect(result.getUTCMinutes()).toBe(34);
    expect(result.getUTCSeconds()).toBe(56);
  });

  test('should return a date object with Pacific Timezone offset when inputDate is not provided', () => {
    const result = validDate();
    const expectedOffset = pacificTimezoneOffset() / (60 * 60 * 1000);
    expect(result instanceof Date).toBe(true);
    expect(result.getTimezoneOffset() / 60).toBe(-expectedOffset);
  });
});