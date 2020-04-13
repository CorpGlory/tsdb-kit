import { AbstractMetric, Datasource, MetricId, MetricQuery, MetricResults } from "./metric";
import { processSQLLimitOffset } from './utils';


const INFLUX_QUERY_TIME_REGEX = /time ?[><=]+ ?[^A-Z]+(AND ?time ?[><=]+ ?[^A-Z]+)?/;


export class InfluxdbMetric extends AbstractMetric {

  private _queryParts: string[];

  constructor(datasource: Datasource, targets: any[], id?: MetricId) {
    super(datasource, targets, id);

    var queryStr = datasource.params.q;
    this._queryParts = queryStr.split(INFLUX_QUERY_TIME_REGEX);
    if(this._queryParts.length == 1) {
      throw new Error(
        `Query "${queryStr}" is not replaced with LIMIT/OFFSET oeprators. Missing time clause.`
      );
    }
    if(this._queryParts.length > 3) {
      throw new Error(`Query "${queryStr}" has multiple time clauses. Can't parse.`);
    }
  }

  getQuery(from: number, to: number, limit: number, offset: number): MetricQuery {
    let timeClause = `time >= ${from}ms AND time <= ${to}ms`;
    let q = `${this._queryParts[0]} ${timeClause} ${this._queryParts[2]}`;
    q = processSQLLimitOffset(q, limit, offset);
    return {
      url: this.datasource.url,
      method: 'GET',
      schema: {
        params: {
          q,
          db: this.datasource.params.db,
          epoch: this.datasource.params.epoch
        }
      }
    }
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
    let results = res.data.results[0];
    if (results.series === undefined) {
      return emptyResult;
    }

    return results.series[0];
  }
}
