import { AbstractMetric, Datasource, MetricId, MetricQuery, MetricResults } from './metric';
import { processSQLLimitOffset } from './utils';

import * as _ from 'lodash';


export class PostgresMetric extends AbstractMetric {

  private _targetName: string; //save first target name, while multi metric not implemented

  constructor(datasource: Datasource, targets: any[], id?: MetricId) {
    super(datasource, targets, id);

    if(targets.length === 0) {
      throw Error('got empty targets list');
    }
    this._targetName = targets[0].refId;
  }

  getQuery(from: number, to: number, limit: number, offset: number): MetricQuery {
    let queries = this.datasource.data.queries;
    _.forEach(queries, q => {
      q.rawSql = processSQLLimitOffset(q.rawSql, limit, offset);
    });
    return {
      url: this.datasource.url,
      method: 'POST',
      schema: {
        data: {
          from: String(from),
          to: String(to),
          queries: queries
        }
      }
    };
  }

  getResults(res): MetricResults {
    let emptyResult = {
      columns: ['timestamp', 'target'],
      values: []
    };

    if(res.data === undefined || res.data.results.length < 1) {
      console.log('datasource return empty response, no data');
      return emptyResult;
    }

    // TODO: support more than 1 metric (each res.data.results item is a metric)
    let results = res.data.results[this._targetName];
    if (results.series === undefined) {
      return emptyResult;
    }

    let points = results.series[0].points;
    points.forEach(p => p.reverse());

    return {
      columns: ['timestamp', results.series[0].name],
      values: points
    };
  }
}
