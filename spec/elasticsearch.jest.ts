import { ElasticsearchMetric } from '../src/metrics/elasticsearch_metric';
import { MetricQuery, Datasource } from '../src/metrics/metric';

import 'jest';
import * as _ from 'lodash';

describe('simple query', function(){

  let datasourse: Datasource = {
    url: "api/datasources/proxy/1/_msearch",
    data: [{
      "search_type": "query_then_fetch",
      "ignore_unavailable": true,
      "index": "metricbeat-*"
    },
    {
      "size": 0,
      "query": {
        "bool": {
          "filter": [
            {
              "range": {
                "@timestamp": {
                  "gte": "1545933121101",
                  "lte": "1545954721101",
                  "format": "epoch_millis"
                }
              }
            },
            {
              "query_string": {
                "analyze_wildcard": true,
                "query": "beat.hostname:example.com AND !system.network.name:\"IBM USB Remote NDIS Network Device\""
              }
            }
          ]
        }
      },
      "aggs": {
        "2": {
          "date_histogram": {
            "interval": "30s",
            "field": "@timestamp",
            "min_doc_count": 0,
            "extended_bounds": {
              "min": "1545933121101",
              "max": "1545954721101"
            },
            "format": "epoch_millis"
          },
          "aggs": {
            "1": {
              "avg": {
                "field": "system.network.in.bytes"
              }
            },
            "3": {
              "derivative": {
                "buckets_path": "1"
              }
            }
          }
        }
      }
    }],
    type: "elasticsearch"
  };
  datasourse.data = datasourse.data.map(d => JSON.stringify(d)).join('\n');

  let targets = [
    {
      "bucketAggs": [
        {
          "field": "@timestamp",
          "id": "2",
          "settings": {
            "interval": "auto",
            "min_doc_count": 0,
            "trimEdges": 0
          },
          "type": "date_histogram"
        }
      ],
      "metrics": [
        {
          "field": "system.network.in.bytes",
          "hide": true,
          "id": "1",
          "meta": {},
          "pipelineAgg": "select metric",
          "settings": {},
          "type": "avg"
        },
        {
          "field": "1",
          "id": "3",
          "meta": {},
          "pipelineAgg": "1",
          "settings": {},
          "type": "derivative"
        }
      ],
      "query": "beat.hostname:example.com AND !system.network.name:\"IBM USB Remote NDIS Network Device\"",
      "refId": "A",
      "target": "carbon.agents.0b0226864dc8-a.cpuUsage",
      "timeField": "@timestamp"
    }
  ];

  let queryTemplate = [{
    "search_type": "query_then_fetch",
    "ignore_unavailable": true,
    "index": "metricbeat-*"
  },
  {
    "size": 0,
    "query": {
      "bool": {
        "filter": [
          {
            "range": {
              "@timestamp": {
                "gte": "0",
                "lte": "1",
                "format": "epoch_millis"
              }
            }
          },
          {
            "query_string": {
              "analyze_wildcard": true,
              "query": "beat.hostname:example.com AND !system.network.name:\"IBM USB Remote NDIS Network Device\""
            }
          }
        ]
      }
    },
    "aggs": {
      "2": {
        "date_histogram": {
          "interval": "30s",
          "field": "@timestamp",
          "min_doc_count": 0,
          "extended_bounds": {
            "min": "1545933121101",
            "max": "1545954721101"
          },
          "format": "epoch_millis"
        },
        "aggs": {
          "1": {
            "avg": {
              "field": "system.network.in.bytes"
            }
          },
          "3": {
            "derivative": {
              "buckets_path": "1"
            }
          }
        }
      }
    }
  }];

  let elasticMetric = new ElasticsearchMetric(datasourse, targets);

  it('check correct time processing', function() {
    let expectedQuery = {
      headers: {
        'Content-Type': 'application/json'
      },
      url: datasourse.url,
      method: 'POST',
      schema: {
        data: queryTemplate.map(e => JSON.stringify(e)).join('\n')
      }
    };

    let from = 0;
    let to = 1;
    let limit = 222;
    let offset = 333;

    let result = elasticMetric.getQuery(from, to, limit, offset);

    expect(result).toEqual(expectedQuery);
  });


  let result = {
    "data": {
      "responses": [
        {
          "took": 39,
          "timed_out": false,
          "_shards": {
            "total": 37,
            "successful": 37,
            "failed": 0
          },
          "hits": {
            "total": 63127,
            "max_score": 0.0,
            "hits": []
          },
          "aggregations": {
            "2": {
              "buckets": [
                {
                  "key_as_string": "1545934140000",
                  "key": 1545934140000,
                  "doc_count": 118,
                  "1": {
                    "value": 8.640455022375E9
                  }
                },
                {
                  "key_as_string": "1545934200000",
                  "key": 1545934200000,
                  "doc_count": 178,
                  "1": {
                    "value": 8.641446309833334E9
                  },
                  "3": {
                    "value": 991287.4583339691
                  }
                },
                {
                  "key_as_string": "1545934260000",
                  "key": 1545934260000,
                  "doc_count": 177,
                  "1": {
                    "value": 8.642345302333334E9
                  },
                  "3": {
                    "value": 898992.5
                  }
                }
              ]
            }
          }
        }
      ]
    }
  };

  it('check results parsing', function() {
    let expectedResult = {
      columns: ['timestamp', 'target'],
      values: [[1545934140000, null],
               [1545934200000, 991287.4583339691],
               [1545934260000, 898992.5]
              ]
    }

    expect(elasticMetric.getResults(result)).toEqual(expectedResult);
  });
});
