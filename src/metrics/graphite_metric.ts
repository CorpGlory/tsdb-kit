import { AbstractMetric, Datasource, MetricId, MetricQuery, MetricResults  } from './metric';

import * as _ from 'lodash';


export class GraphiteMetric extends AbstractMetric {
  constructor(datasource: Datasource, targets: any[], id?: MetricId) {
    super(datasource, targets, id);
  }

  getQuery(from: number, to: number, limit: number, offset: number): MetricQuery {
    let fromDate = Math.floor(from / 1000);
    let toDate = Math.floor(to / 1000);

    let fromRegex = /from=[^\&]+/i;
    let untilRegex = /until=[^\&]+/i;
    let limitRegex = /maxDataPoints=[^\&]+/i;

    let query: string = this.datasource.data;
    let replacements: [RegExp, string][] = [
      [fromRegex, `from=${fromDate}`],
      [untilRegex, `until=${toDate}`],
      [limitRegex, `maxDataPoints=${limit}`]
    ];

    _.each(replacements, r => {
      let k = r[0];
      let v = r[1];
      if(query.search(k)) {
        query = query.replace(k, v);
      } else {
        query += v;
      }
    });

    return {
      url: `${this.datasource.url}?${query}`,
      method: 'GET',
      schema: {
        params: this.datasource.params
      }
    }
  }

  getResults(res): MetricResults {

    if(res.data === undefined || res.data.length < 1) {
      console.log('datasource return empty response, no data');
      return {
        columns: ['timestamp', 'target'],
        values: []
      };
    }

    return {
      columns: ['timestamp', res.data[0]['target']],
      values: res.data[0].datapoints.map(point => {
        let val = point[0];
        let timestamp = point[1] * 1000; //convert seconds -> ms
        return [timestamp, val];
      })
    };
  }
}

