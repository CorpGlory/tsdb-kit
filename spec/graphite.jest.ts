import { Datasource, Metric } from '../src/index';

import 'jest';

describe('correct Graphite query', function() {
  let datasource: Datasource = {
    url: 'http://example.com:1234',
    type: 'graphite',
    params: {
      db: '',
      q: '',
      epoch: ''
    },
    data: 'target=target=template(hosts.$hostname.cpu, hostname=\"worker1\")&from=00:00_00000000&until=00:00_00000000&maxDataPoints=000'
  };

  let target = `target=template(hosts.$hostname.cpu, hostname="worker1")`;
  let query = new Metric(datasource, [target]);

  it("test simple query with time clause", function () {
    expect(query.metricQuery.getQuery(1534809600000, 1537488000000, 500, 0).url).toBe(
      `${datasource.url}?target=${target}&from=1534809600&until=1537488000&maxDataPoints=500`
    )
  });
})
