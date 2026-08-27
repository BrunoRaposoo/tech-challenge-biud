import { describe, it, expect } from 'vitest';
import { AntiFraudService } from './anti-fraud.service.js';
describe('AntiFraudService', () => {
  it('1000 → APPROVED', () => expect(new AntiFraudService().evaluate(1000)).toBe('APPROVED'));
  it('1000.01 → REJECTED', () => expect(new AntiFraudService().evaluate(1000.01)).toBe('REJECTED'));
  it('120 → APPROVED', () => expect(new AntiFraudService().evaluate(120)).toBe('APPROVED'));
  it('0 → APPROVED', () => expect(new AntiFraudService().evaluate(0)).toBe('APPROVED'));
});
