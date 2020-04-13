import { Metric } from './metrics/metrics_factory';
import { MetricQuery, Datasource } from './metrics/metric';

import { URL } from 'url';
import axios from 'axios';
import * as _ from 'lodash';

export class DataKitError extends Error {
  constructor(
    message: string,
    public datasourceType?: string,
    public datasourceUrl?: string
  ) {
    super(message);
  }
};

export class BadRange extends DataKitError {};
export class GrafanaUnavailable extends DataKitError {};
export class DatasourceUnavailable extends DataKitError {};

const CHUNK_SIZE = 50000;


/**
 * @param metric to query to Grafana
 * @returns { values: [time, value][], columns: string[] }
 */
export async function queryByMetric(
  metric: Metric, url: string, from: number, to: number, apiKey: string
): Promise<{ values: [number, number][], columns: string[] }> {

  if(from > to) {
    throw new BadRange(
      `Data-kit got wrong range: from ${from} > to ${to}`,
      metric.datasource.type,
      url
    );
  }

  if(from === to) {
    console.warn(`Data-kit got from === to`);
  }

  const grafanaUrl = getGrafanaUrl(url);

  let data = {
    values: [],
    columns: []
  };

  while(true) {
    let query = metric.metricQuery.getQuery(from, to, CHUNK_SIZE, data.values.length);
    query.url = `${grafanaUrl}/${query.url}`;
    let res = await queryGrafana(query, apiKey, metric.datasource);
    let chunk = metric.metricQuery.getResults(res);
    let values = chunk.values;
    data.values = data.values.concat(values);
    data.columns = chunk.columns;

    if(values.length < CHUNK_SIZE) {
      // because if we get less that we could, then there is nothing more
      break;
    }
  }
  return data;
}

async function queryGrafana(query: MetricQuery, apiKey: string, datasource: Datasource) {
  let headers = { Authorization: `Bearer ${apiKey}` };

  if(query.headers !== undefined) {
    _.merge(headers, query.headers);
  }


  let axiosQuery = {
    headers,
    url: query.url,
    method: query.method,
  };

  _.defaults(axiosQuery, query.schema);

  try {
    var res = await axios(axiosQuery);
  } catch (e) {
    const msg = `Data kit: fail while request data: ${e.message}`;
    const parsedUrl = new URL(query.url);
    const queryUrl = `query url: ${JSON.stringify(parsedUrl.pathname)}`;
    console.error(`${msg} ${queryUrl}`);
    if(e.errno === 'ECONNREFUSED') {
      throw new GrafanaUnavailable(e.message);
    }
    if(e.response !== undefined) {
      console.error(`Response: \
        status: ${e.response.status}, \
        response data: ${JSON.stringify(e.response.data)}, \
        headers: ${JSON.stringify(e.response.headers)}
      `);
      if(e.response.status === 401) {
        throw new Error(`Unauthorized. Check the API_KEY. ${e.message}`);
      }
      if(e.response.status === 502) {
        let datasourceError = new DatasourceUnavailable(
          `datasource ${parsedUrl.pathname} unavailable, message: ${e.message}`,
          datasource.type,
          query.url
        );
        throw datasourceError;
      }
    }
    throw new Error(msg);
  }

  return res;
}

function getGrafanaUrl(url: string) {
  const parsedUrl = new URL(url);
  const path = parsedUrl.pathname;
  const panelUrl = path.match(/^\/*([^\/]*)\/d\//);
  if(panelUrl === null) {
    return url;
  }

  const origin = parsedUrl.origin;
  const grafanaSubPath = panelUrl[1];
  if(grafanaSubPath.length > 0) {
    return `${origin}/${grafanaSubPath}`;
  }

  return origin;
}
