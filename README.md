# tsdb-kit

[![Build Status](https://travis-ci.org/CorpGlory/tsdb-kit.svg?branch=master)](https://travis-ci.org/CorpGlory/tsdb-kit)

Node.js library and utilities for running Grafana datasources on backend.
You can send your datasource metrics from Grafana to compile it on Node.js and query your datasource via Grafana API in background.

User gets a unified interface to all datasources. Library gives single output format: fields order, time units, etc

## Supported datasources

* Influxdb
* Graphite
* Prometheus
* PostgreSQL / TimescaleDB / MySQL
* ElasticSearch

Please write us at ping@corpglory.com if you want your datasource to be supported: 

## Projects based on library
* [grafana-data-exporter](https://github.com/CorpGlory/grafana-data-exporter)
* [Hastic](https://github.com/hastic/hastic-server)
