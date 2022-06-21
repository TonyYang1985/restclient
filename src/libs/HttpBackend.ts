import Axios from 'axios';
import yaml from 'js-yaml';
import { RestClientBackend, APIConfig, RestClient } from './RestClient';
import EventEmitter from 'eventemitter3';

const events = new EventEmitter();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mergejson = require('mergejson');
const hash = (str: string) => {
  let hash = 0;
  if (str.length == 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return hash;
};
export type RequestHeader = {
  headers: Record<string, string>;
};

export class StateProvider<T> {
  constructor(private state: T, private innerProvider?: () => T, private updateCallback?: (state: T) => void) {}

  update(state: T): void {
    this.state = state;
    if (this.updateCallback) {
      this.updateCallback(state);
    }
  }
  get value(): T {
    if (this.innerProvider) {
      this.state = this.innerProvider();
    }
    return this.state;
  }
}

export type HeaderProvider = StateProvider<RequestHeader>;

export type HttpBackendOptions = {
  baseUrl: string;
  commonParamUrl?: string;
  cfgNames: string[];
};

type FetcherCache = {
  available: boolean;
  requesting: boolean;
  data: string;
  expiration: number;
};

export class HttpBackend implements RestClientBackend {
  constructor(private options: HttpBackendOptions, private headerProvider: StateProvider<RequestHeader>) {}

  async load(rc: RestClient): Promise<APIConfig> {
    let apis = {};
    try {
      const ld = Promise.all(
        this.options.cfgNames.map(async (name) => {
          if (!this.options.baseUrl.endsWith('/')) {
            this.options.baseUrl = `${this.options.baseUrl}/`;
          }
          const data = yaml.load(await this.loadUrl(`${this.options.baseUrl}${name}.yml`));
          apis = mergejson(apis, data);
        }),
      );
      const ld1 = async () => {
        if (this.options.commonParamUrl) {
          const commonParam = yaml.load(await this.loadUrl(this.options.commonParamUrl));
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

  private async loadUrl(url: string): Promise<string> {
    // return (await Axios.get(url)).data;
    return this.fetchOrCache(url, async () => (await Axios.get(url)).data as string);
  }

  private fetchOrCache(url: string, fetchFn: () => Promise<string>): Promise<string> {
    const key = hash(url);
    const cacheStr = sessionStorage.getItem(`RC#${key}`);
    let cache = cacheStr ? (JSON.parse(cacheStr) as FetcherCache) : null;
    if (!cache) {
      cache = {
        available: false,
        requesting: false,
        data: '',
        expiration: 0,
      };
    }
    const getData = () =>
      fetchFn().then((data) => {
        if (cache) {
          cache.requesting = false;
          cache.available = true;
          cache.expiration = Date.now() + 10000;
          cache.data = data;
          sessionStorage.setItem(`RC#${key}`, JSON.stringify(cache));
          events.emit(`CacheUpdated#${key}`, data);
        }
        return data;
      });

    if (cache.available && Date.now() < cache.expiration) {
      return Promise.resolve(cache.data);
    } else if (!cache.requesting) {
      cache.requesting = true;
      cache.available = false;
      cache.expiration = 0;
      cache.data = '';
      sessionStorage.setItem(`RC#${key}`, JSON.stringify(cache));
      return getData();
    } else {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve(getData());
        }, 2000);
        events.once(`CacheUpdated#${key}`, (data) => {
          clearTimeout(timer);
          resolve(data);
        });
      });
    }
  }
}
