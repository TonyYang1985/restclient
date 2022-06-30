/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Namespace, createNamespace, destroyNamespace } from 'cls-hooked';
import _ from 'lodash';
import { RestClientBackend, APIConfig, RestClient } from './RestClient';
import { loadConfig } from './YamlUtil';

const mergejson = require('mergejson');
const API_SESSION = 'API_SESSION';
const REQUEST_HEADER = 'REQUEST_HEADER';

type RequestHeader = Record<string, string>;

export class FSBackend implements RestClientBackend {
  private cfgNames: string[] = [];

  constructor(cfgNames: string[] = [], proxy?: string) {
    this.cfgNames.push(...cfgNames);
    if (!_.isNil(proxy) && !_.isEmpty(_.trim(proxy))) {
      process.env['http_proxy'] = proxy;
    }
  }

  async load(rc: RestClient): Promise<APIConfig> {
    return this.cfgNames.map((name) => loadConfig(name)).reduce((p, c) => mergejson(p, c));
  }

  async headers() {
    // const ns = getNamespace(API_SESSION);
    // if (ns) {
    //     const headers = ns.get(REQUEST_HEADER);
    //     return {
    //         headers,
    //     };
    // } else {
    return {
      headers: {},
    };
    // }
  }

  static setForwardHeader(ns: Namespace, key: string, val: string) {
    let header: RequestHeader = ns.get(REQUEST_HEADER);
    if (!header) {
      header = {};
      ns.set(REQUEST_HEADER, header);
    }
    header[key] = val;
    return FSBackend;
  }

  static createNamespace() {
    return createNamespace(API_SESSION);
  }

  static destoryNamespace() {
    return destroyNamespace(API_SESSION);
  }
}
