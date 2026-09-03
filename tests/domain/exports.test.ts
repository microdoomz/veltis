import { describe, it, expect, vi } from 'vitest';
import { generateCsvExport, generateXlsxExport, generatePdfExport, generateFullBackup } from '@/lib/services/exports';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  },
}));

describe('Exports Service', () => {
  it('generateCsvExport is defined', async () => {
    expect(generateCsvExport).toBeDefined();
  });
  
  it('generateXlsxExport is defined', async () => {
    expect(generateXlsxExport).toBeDefined();
  });

  it('generatePdfExport is defined', async () => {
    expect(generatePdfExport).toBeDefined();
  });

  it('generateFullBackup is defined', async () => {
    expect(generateFullBackup).toBeDefined();
  });
});
