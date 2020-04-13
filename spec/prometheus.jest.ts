import { PrometheusMetric } from '../src/metrics/prometheus_metric';

import 'jest';


describe('Test Prometheus time range processing', function() {
  let datasource = {
    type: 'prometheus',
    url: 'api/datasources/proxy/4/api/v1/query_range?query=node_disk_io_time_ms&start=1543411320&end=1543432950&step=30'
  }
  let targets = [];
  let prometheus = new PrometheusMetric(datasource, targets);

  it('check that from/to present in url', function() {
    let from = 1234567891234; //milliseconds
    let to   = 1234567899999;
    let query = prometheus.getQuery(from, to, 1000, 0);
    expect(query.url.indexOf(`start=${Math.floor(from / 1000)}`) !== -1).toBeTruthy();
    expect(query.url.indexOf(`end=${Math.floor(to / 1000)}`) !== -1).toBeTruthy();
  });
});
