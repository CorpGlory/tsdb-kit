import { processSQLLimitOffset } from '../src/metrics/utils';

import 'jest';


describe('test utils methods', function(){
  it('test SQL limit offset processing', function() {
    expect(processSQLLimitOffset('without', 10, 5)).toBe('without LIMIT 10 OFFSET 5');
    expect(processSQLLimitOffset('limit 3 OFFSET 1', 10, 5)).toBe('LIMIT 10 OFFSET 5');
    expect(processSQLLimitOffset('xxx \nlimit 11\nxxx', 10, 5)).toBe('xxx \nLIMIT 10\nxxx OFFSET 5');
    expect(processSQLLimitOffset('xxx offset 4 xxx', 10, 5)).toBe('xxx OFFSET 5 xxx LIMIT 10');
    expect(processSQLLimitOffset('xxx\nlimit 0\noffset 4\nxxx', 10, 5)).toBe('xxx\nLIMIT 10\nOFFSET 5\nxxx');
    expect(processSQLLimitOffset('()()(limit 3 OFFSET 1) (())', 10, 5)).toBe('()()(limit 3 OFFSET 1) (()) LIMIT 10 OFFSET 5');
    expect(processSQLLimitOffset('()(limit 3) OFFSET 1 ()', 10, 5)).toBe('()(limit 3) OFFSET 5 () LIMIT 10');
    expect(processSQLLimitOffset('(offset 9)(limit 3) OFFSET 1 ()()(()) LIMIT 8 ()', 10, 5))
      .toBe('(offset 9)(limit 3) OFFSET 5 ()()(()) LIMIT 10 ()');
  });
});
