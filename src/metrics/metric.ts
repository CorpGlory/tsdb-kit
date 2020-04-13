export declare type Datasource = {
  url: string;
  type: string;
  params?: {
    db: string;
    q: string;
    epoch: string;
  };
  data?: any;
};

export type MetricQuery = {
  url: string;
  method: string;
  schema: any;
  headers?: any;
}

export type MetricResults = {
  values: any;
  columns: any;
}

export type MetricId = string;

export abstract class AbstractMetric {
  constructor(
    public datasource: Datasource,
    public targets: any[],
    public id?: MetricId
  ) {};
  abstract getQuery(from: number, to: number, limit: number, offset: number): MetricQuery;
  /*
    from / to - timestamp in ms
    limit - max number of items in result
    offset - number of items to skip from timerange start
  */
  abstract getResults(res): MetricResults;
}
