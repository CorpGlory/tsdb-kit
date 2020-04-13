import { AbstractMetric, Datasource, MetricId, MetricQuery, MetricResults } from './metric';
import { DataKitError } from '../grafana_service';

import * as _ from 'lodash';

export type RangeFilter = { range: { [key: string]: { gte: String, lte: String } } };
export type QueryStringFilter = { query_string: { analyze_wildcard: Boolean, query: String } };

export type QueryConfig = {
  size: number,
  query: {
    bool: {
      filter: (RangeFilter | QueryStringFilter)[]
    }
  },
  aggs: { [key: string]: Aggregation }
};

export type Aggregation = {
  date_histogram: {
    interval: String,
    field: String,
    min_doc_count: Number,
    extended_bounds: { min: String, max: String },
    format: String
  }
};

const DATE_HISTOGRAM_FIELD = 'date_histogram';

export class ElasticsearchMetric extends AbstractMetric {
  constructor(datasource: Datasource, targets: any[], id?: MetricId) {
    super(datasource, targets, id);
  }

  getQuery(from: number, to: number, limit: number, offset: number): MetricQuery {
    let data = this.datasource.data.split('\n').map(d => d === '' ? d: JSON.parse(d));
    if(data.length === 0) {
      throw new DataKitError('Datasource data is empty');
    }

    const queryConfig: QueryConfig = data[1];

    queryConfig.size = 0;
    let timeField = null;

    let aggs = _.filter(queryConfig.aggs, f => _.has(f, DATE_HISTOGRAM_FIELD));
    _.each(aggs, (agg: Aggregation) => {
      agg[DATE_HISTOGRAM_FIELD].extended_bounds = {
        min: from.toString(),
        max: to.toString()
      };

      if(timeField !== null) {
        console.warn(
          `got more than one datasource time field, change ${timeField} to ${agg[DATE_HISTOGRAM_FIELD].field}`
        );
      }
      timeField = agg[DATE_HISTOGRAM_FIELD].field;
    });

    if(timeField === null) {
      throw new Error('datasource time field not found');
    }

    let filters = queryConfig.query.bool.filter.filter(f => _.has(f, 'range')) as RangeFilter[];
    if(filters.length === 0) {
      throw new DataKitError('Empty filters');
    }
    let range = filters[0].range;
    range[timeField].gte = from.toString();
    range[timeField].lte = to.toString();


    data = data
      .filter(d => d !== '')
      .map(d => JSON.stringify(d))
      .join('\n');
    data += '\n';

    return {
      url: this.datasource.url,
      method: 'POST',
      schema: { data },
      headers: {'Content-Type': 'application/json'}
    }
  }

  getResults(res): MetricResults {
    let columns = ['timestamp', 'target'];
    let values = [];

    if(res.data === undefined || res.data.responses.length < 1) {
      console.log('datasource return empty response, no data');
      return {
        columns,
        values
      };
    }

    let aggregations = res.data.responses[0].aggregations;
    let aggrgAgg: any = this.targets[0].bucketAggs.filter(a => {
      return !a.fake && _.has(aggregations, a.id)
    });
    if(_.isEmpty(aggrgAgg)) {
      const bucketAggs = JSON.stringify(this.targets[0].bucketAggs);
      const aggregationKeys = JSON.stringify(_.keys(aggregations));
      console.error(`can't find related aggregation id. bucketAggs:${bucketAggs} aggregationKeys:${aggregationKeys}`);
      throw new DataKitError(`can't find related aggregation id`);
    } else {
      aggrgAgg = aggrgAgg[0].id;
    }
    let responseValues = aggregations[aggrgAgg].buckets;
    let agg = this.targets[0].metrics.filter(m => !m.hide).map(m => m.id);

    if(agg.length > 1) {
      throw new DataKitError(`multiple series for metric are not supported currently: ${JSON.stringify(agg)}`);
    }

    agg = agg[0];

    if(responseValues.length > 0) {
      values = responseValues.map(r => [r.key, _.has(r, agg) ? r[agg].value: null]);
    }

    return {
      columns,
      values
    }
  }
}

