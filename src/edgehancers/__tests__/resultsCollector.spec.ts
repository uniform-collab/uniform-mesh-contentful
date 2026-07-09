import { expect, test, describe } from 'vitest';
import { createDefaultResultsCollector, createSingleEntryResultsCollector } from '../lib';

describe('createSingleEntryResultsCollector', () => {
  test('adds global result to all results', () => {
    const results: any[] = [{}, {}, {}];
    const mapping = [
      { id: 'id1', originalIndex: 0 },
      { id: 'id2', originalIndex: 1 },
      { id: 'id3', originalIndex: 2 },
    ];

    const collector = createSingleEntryResultsCollector(results, mapping);

    collector.addGlobalResult(['id1', 'id2', 'id3'], (r) => {
      r.errors = [{ message: 'test error' }];
    });

    expect(results).toEqual([
      { errors: [{ message: 'test error' }] },
      { errors: [{ message: 'test error' }] },
      { errors: [{ message: 'test error' }] },
    ]);
  });

  test('adds item result to specific result', () => {
    const results: any[] = [{}, {}, {}];
    const mapping = [
      { id: 'id1', originalIndex: 0 },
      { id: 'id2', originalIndex: 1 },
      { id: 'id3', originalIndex: 2 },
    ];

    const collector = createSingleEntryResultsCollector(results, mapping);

    collector.addItemResult('id2', (r) => {
      r.warnings = [{ message: 'test warning' }];
    });

    expect(results).toEqual([{}, { warnings: [{ message: 'test warning' }] }, {}]);
  });

  test('ignores item result for unknown id', () => {
    const results: any[] = [{}, {}];
    const mapping = [
      { id: 'id1', originalIndex: 0 },
      { id: 'id2', originalIndex: 1 },
    ];

    const collector = createSingleEntryResultsCollector(results, mapping);

    collector.addItemResult('unknown', (r) => {
      r.warnings = [{ message: 'test warning' }];
    });

    expect(results).toEqual([{}, {}]);
  });

  test('multiple updates modify the same result objects', () => {
    const results: any[] = [{}, {}];
    const mapping = [
      { id: 'id1', originalIndex: 0 },
      { id: 'id2', originalIndex: 1 },
    ];

    const collector = createSingleEntryResultsCollector(results, mapping);

    collector.addGlobalResult(['id1', 'id2'], (r) => {
      r.errors = [{ message: 'error 1' }];
    });

    collector.addItemResult('id1', (r) => {
      r.warnings = [{ message: 'warning 1' }];
    });

    collector.addGlobalResult(['id1', 'id2'], (r) => {
      r.errors?.push({ message: 'error 2' });
    });

    expect(results).toEqual([
      {
        errors: [{ message: 'error 1' }, { message: 'error 2' }],
        warnings: [{ message: 'warning 1' }],
      },
      {
        errors: [{ message: 'error 1' }, { message: 'error 2' }],
      },
    ]);
  });

  test('does not register global result if item ids are empty', () => {
    const results: any[] = [{}, {}];
    const mapping = [
      { id: 'id1', originalIndex: 0 },
      { id: 'id2', originalIndex: 1 },
    ];

    const collector = createSingleEntryResultsCollector(results, mapping);

    collector.addGlobalResult([], (r) => {
      r.errors = [{ message: 'error 1' }];
    });

    expect(results).toEqual([{}, {}]);
  });
});

describe('createDefaultResultsCollector', () => {
  test('registers global result for all matching items', () => {
    const results: any[] = [{}, {}];
    const mapping = [
      { id: 'id1', originalIndex: 0 },
      { id: 'id2', originalIndex: 0 },
      { id: 'id3', originalIndex: 1 },
    ];

    const collector = createDefaultResultsCollector(results, mapping);

    collector.addGlobalResult(['id1', 'id2'], (r) => {
      r.errors = [{ message: 'error' }];
    });

    expect(results).toEqual([{ errors: [{ message: 'error' }] }, {}]);
  });

  test('registers item result for all matching items', () => {
    const results: any[] = [{}, {}, {}];
    const mapping = [
      { id: 'id1', originalIndex: 0 },
      { id: 'id1', originalIndex: 1 },
      { id: 'id2', originalIndex: 2 },
    ];

    const collector = createDefaultResultsCollector(results, mapping);

    collector.addItemResult('id1', (r) => {
      r.warnings = [{ message: 'warning' }];
    });

    expect(results).toEqual([
      { warnings: [{ message: 'warning' }] },
      { warnings: [{ message: 'warning' }] },
      {},
    ]);
  });

  test('multiple global updates does not modify the same result', () => {
    const results: any[] = [{}, {}];
    const mapping = [
      { id: 'id1', originalIndex: 0 },
      { id: 'id1', originalIndex: 1 },
    ];

    const collector = createDefaultResultsCollector(results, mapping);

    collector.addGlobalResult(['id1'], (r) => {
      r.errors = [{ message: 'error 1' }];
    });

    collector.addItemResult('id1', (r) => {
      r.warnings = [{ message: 'warning 1' }];
    });

    collector.addGlobalResult(['id1'], (r) => {
      r.errors?.push({ message: 'error 2' });
    });

    expect(results).toEqual([
      {
        errors: [{ message: 'error 1' }],
      },
      {
        errors: [{ message: 'error 1' }],
      },
    ]);
  });

  test('does not duplicate item results with same id', () => {
    const results: any[] = [{}, {}];
    const mapping = [
      { id: 'id1', originalIndex: 0 },
      { id: 'id1', originalIndex: 1 },
    ];

    const collector = createDefaultResultsCollector(results, mapping);

    collector.addItemResult('id1', (r) => {
      r.warnings = [{ message: 'warning 1' }];
    });
    collector.addItemResult('id1', (r) => {
      r.warnings?.push({ message: 'warning 1' });
    });

    expect(results).toEqual([
      {
        warnings: [{ message: 'warning 1' }],
      },
      {
        warnings: [{ message: 'warning 1' }],
      },
    ]);
  });

  test('does not register global result if item ids are empty', () => {
    const results: any[] = [{}, {}];
    const mapping = [
      { id: 'id1', originalIndex: 0 },
      { id: 'id2', originalIndex: 1 },
    ];

    const collector = createDefaultResultsCollector(results, mapping);

    collector.addGlobalResult([], (r) => {
      r.errors = [{ message: 'error' }];
    });

    expect(results).toEqual([{}, {}]);
  });
});
