import { describe, it, expect } from 'vitest';
import React from 'react';

describe('smoke', () => {
  it('passes', () => {
    expect(true).toBe(true);
  });

  it('React is importable', () => {
    expect(React.version).toBeDefined();
  });
});
