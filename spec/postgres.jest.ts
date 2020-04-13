import { PostgresMetric } from '../src/metrics/postgres_metric';
import { MetricQuery } from '../src/metrics/metric';

import 'jest';
import * as _ from 'lodash';


describe('Test query creation', function() {

  let limit = 1000;
  let offset = 0;
  let from = 1542983750857;
  let to = 1542984313292;
  let postgres = getDefaultMetric();
  let mQuery: MetricQuery = postgres.getQuery(from, to, limit, offset);

  it('test that payload placed to data field', function() {
    expect('data' in mQuery.schema).toBeTruthy();
    expect('queries' in mQuery.schema.data).toBeTruthy();
    expect(mQuery.schema.data.queries).toBeInstanceOf(Array);
  });

  it('test from/to casting to string', function() {
    expect(typeof mQuery.schema.data.from).toBe('string');
    expect(typeof mQuery.schema.data.to).toBe('string');
  });

  it('method should be POST', function() {
    expect(mQuery.method.toLocaleLowerCase()).toBe('post');
  });
});

describe('Test result parsing', function() {
  let postgres = getDefaultMetric();
  let timestamps = [1542983800000, 1542983800060, 1542983800120]
  let response = {
    data: {
      results: {
        A: {
          refId: 'A',
          meta: {
            rowCount:0,
            sql: 'SELECT "time" AS "time", val FROM local ORDER BY 1'
          },
          series: [
            {
              name:"val",
              points: [
                [622, timestamps[0]],
                [844, timestamps[1]],
                [648, timestamps[2]]
              ]
            }
          ],
          tables: 'null'
        }
      }
    }
  }

  let result = postgres.getResults(response);

  it('check results columns order', function() {
    let timestampColumnNumber = result.columns.indexOf('timestamp');
    expect(result.values.map(v => v[timestampColumnNumber])).toEqual(timestamps);
  });
});

describe('Test sql processing', function() {
  let limit = 1000;
  let offset = 77;
  let from = 1542983750857;
  let to = 1542984313292;

  let check = function(original: string, expected: string) {
    checkExpectation(original, expected, from, to, limit, offset);
  }

  it('simple sql with one select', function() {
    let original = `SELECT
    \"time\" AS \"time\",
      val
    FROM local
    ORDER BY 1`;
    let expected = `SELECT
    \"time\" AS \"time\",
      val
    FROM local
    ORDER BY 1 LIMIT ${limit} OFFSET ${offset}`;
    check(original, expected);
  });

  it('sql with order by rows', function() {
    let original = `SELECT
    $__time(time),
    AVG(power) OVER(ORDER BY speed ROWS BETWEEN 150 PRECEDING AND CURRENT ROW)
  FROM
    wind_pwr_spd
  WHERE
    $__timeFilter(time)`;
    let expected = `SELECT
    $__time(time),
    AVG(power) OVER(ORDER BY speed ROWS BETWEEN 150 PRECEDING AND CURRENT ROW)
  FROM
    wind_pwr_spd
  WHERE
    $__timeFilter(time) LIMIT ${limit} OFFSET ${offset}`;
    check(original,expected);
  });

  it('sql with offset limit', function() {
    let original = `WITH RECURSIVE t(n) AS (
      VALUES (1)
      UNION ALL
      SELECT n+1 FROM t WHERE n < 100
     )
     SELECT sum(n) FROM t OFFSET 0 LIMIT 0;`;


    let expected = `WITH RECURSIVE t(n) AS (
      VALUES (1)
      UNION ALL
      SELECT n+1 FROM t WHERE n < 100
     )
     SELECT sum(n) FROM t OFFSET ${offset} LIMIT ${limit};`;
    check(original, expected);
  });

  it('sql with macroses', function() {
    let original = `SELECT
      time
    FROM metric_values
    WHERE time > $__timeFrom()
      OR time < $__timeFrom()
      OR 1 < $__unixEpochFrom()
      OR $__unixEpochTo() > 1 ORDER BY 1`;
    let expected = `SELECT
      time
    FROM metric_values
    WHERE time > $__timeFrom()
      OR time < $__timeFrom()
      OR 1 < $__unixEpochFrom()
      OR $__unixEpochTo() > 1 ORDER BY 1 LIMIT ${limit} OFFSET ${offset}`;
    check(original, expected);
  });

  it('complex sql with one select', function() {
    let original = `SELECT
    statistics.created_at as time,
   CAST(statistics.value AS decimal) as value,
    sensor.title as metric
   FROM statistics
   INNER JOIN sensor
   ON sensor.id = statistics.sensor_id
   WHERE
    statistics.device_id = '000-aaaa-bbbb'
    AND sensor.type = 5
    AND sensor.section_id IN($section_id)
    AND statistics.value != 'ERR'
    AND statistics.value !='???'
    AND $__timeFilter(statistics.created_at)`;
    let expected = `SELECT
    statistics.created_at as time,
   CAST(statistics.value AS decimal) as value,
    sensor.title as metric
   FROM statistics
   INNER JOIN sensor
   ON sensor.id = statistics.sensor_id
   WHERE
    statistics.device_id = '000-aaaa-bbbb'
    AND sensor.type = 5
    AND sensor.section_id IN($section_id)
    AND statistics.value != 'ERR'
    AND statistics.value !='???'
    AND $__timeFilter(statistics.created_at) LIMIT ${limit} OFFSET ${offset}`;
    check(original, expected);
  })

  it('sql with number of nested select', function() {
    let original = `WITH regional_sales AS (
      SELECT region, SUM(amount) AS total_sales
      FROM orders
      GROUP BY region LIMIT 5 OFFSET 1
     ), top_regions AS (
      SELECT region
      FROM regional_sales
      WHERE total_sales > (SELECT SUM(total_sales)/10 FROM regional_sales)
      LIMIT 3
     )
     SELECT region,
      product,
      SUM(quantity) AS product_units,
      SUM(amount) AS product_sales
     FROM orders
     WHERE region IN (SELECT region FROM top_regions)
     GROUP BY region, product OFFSET 500;`;
    let expected = `WITH regional_sales AS (
      SELECT region, SUM(amount) AS total_sales
      FROM orders
      GROUP BY region LIMIT 5 OFFSET 1
     ), top_regions AS (
      SELECT region
      FROM regional_sales
      WHERE total_sales > (SELECT SUM(total_sales)/10 FROM regional_sales)
      LIMIT 3
     )
     SELECT region,
      product,
      SUM(quantity) AS product_units,
      SUM(amount) AS product_sales
     FROM orders
     WHERE region IN (SELECT region FROM top_regions)
     GROUP BY region, product OFFSET ${offset} LIMIT ${limit};`;
     check(original, expected);
  });
});

function checkExpectation(original: string, expected: string, from: number, to: number, limit: number, offset: number) {
  let metric = getMetricWithSql(original);
  expect(metric.getQuery(from, to, limit, offset).schema.data.queries[0].rawSql).toBe(expected);
}

function getMetricWithSql(sql: string): PostgresMetric {
  let metric = getDefaultMetric();
  metric.datasource.data.queries[0].rawSql = sql;
  return metric;
}

function getDefaultMetric(): PostgresMetric {
  let queryPayload = {
    from: 1542983750857,
    to: 1542984313292,
    queries:[{
      refId: 'A',
      intervalMs:2000,
      maxDataPoints:191,
      datasourceId:1,
      rawSql: 'SELECT\n  \"time\" AS \"time\",\n  val\nFROM local\nORDER BY 1',
      format: 'time_series'
    }]
  };

  let datasource = {
      url: 'api/tsdb/query',
      type: 'postgres',
      data: queryPayload
  };

  let targets = [{
    refId: 'A',
  }];

  return new PostgresMetric(datasource, targets);
}
