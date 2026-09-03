import { describe, it, expect } from 'vitest';
import { config } from 'dotenv';
config({ path: '.env.local' });

describe('Project Setup', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });
});
