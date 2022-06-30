/* eslint-disable @typescript-eslint/no-var-requires */
import yaml from 'js-yaml';
import { RestClientBackend, APIConfig, RestClient } from './RestClient';
import { promises as fsp } from 'fs';
import { HttpBackendOptions, StateProvider } from './HttpBackend';

const mergejson = require('mergejson');

export type RequestHeader = {
  headers: Record<string, string>;
};

export type HeaderProvider = StateProvider<RequestHeader>;

export type NextSSRBackendOptions = HttpBackendOptions & {
  ssrBaseDir: string;
};

const Cache: Record<string, string> = {};

export class NextSSRBackend implements RestClientBackend {
  constructor(private options: NextSSRBackendOptions, private headerProvider: StateProvider<RequestHeader>) {}

  async load(rc: RestClient): Promise<APIConfig> {
    let apis = {};
    try {
      const ld = Promise.all(
        this.options.cfgNames.map(async (name) => {
          if (!this.options.baseUrl.endsWith('/')) {
            this.options.baseUrl = `${this.options.baseUrl}/`;
          }
          if (this.options.ssrBaseDir.endsWith('/')) {
            this.options.ssrBaseDir = this.options.ssrBaseDir.substring(0, this.options.ssrBaseDir.length - 1);
          }
          const data = yaml.load(await this.loadFile(`${this.options.ssrBaseDir}${this.options.baseUrl}${name}.yml`));
          apis = mergejson(apis, data);
        }),
      );
      const ld1 = async () => {
        if (this.options.commonParamUrl) {
          const commonParam = yaml.load(await this.loadFile(`${this.options.ssrBaseDir}${this.options.commonParamUrl}`));
          rc.commonParam = Object.assign({}, rc.commonParam ?? {}, commonParam);
        }
      };
      await Promise.all([ld, ld1()]);
    } catch (error) {
      //
    }

    return apis;
  }

  async headers(): Promise<RequestHeader> {
    return this.headerProvider.value;
  }

  private async loadFile(path: string): Promise<string> {
    return this.fetchOrCache(path, async () => fsp.readFile(path).then((buffer) => buffer.toString()));
  }

  private async fetchOrCache(path: string, fetchFn: () => Promise<string>): Promise<string> {
    const key = path;
    let cacheStr = Cache[`RC#${key}`];
    if (cacheStr === undefined) {
      cacheStr = await fetchFn();
      Cache[`RC#${key}`] = cacheStr;
    }
    return cacheStr;
  }
}
