# tsdb-kit

[![Build Status](https://travis-ci.org/CorpGlory/tsdb-kit.svg?branch=master)](https://travis-ci.org/CorpGlory/tsdb-kit)

Node.js library for running Grafana datasources on backend plus utils.
You can send your datasource metric from Grafana to compile it on Node.js and query your datasource via Grafana API in background.

User gets unified interface to all datasources. Library gives single output format: fields order, time units, etc

## Supported datasources

* Influxdb
* Graphite
* Prometheus
* PostgreSQL / TimescaleDB
* ElasticSearch

Please write us a letter if you want your datasource to be supported: ping@corpglory.com 

## Projects based on library
* [grafana-data-exporter](https://github.com/CorpGlory/grafana-data-exporter)
* [Hastic](https://github.com/hastic/hastic-server)
