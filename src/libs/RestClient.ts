/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import dot from 'dot-object';
import Mustache from 'mustache';

Mustache.escape = (v) => v;
const fillTemplate = (templateString: string, templateVariables: any) => Mustache.render(templateString, templateVariables);

export class RestClientError extends Error {
  readonly response?: AxiosResponse<any>;
  constructor(message: string, response?: AxiosResponse<any>) {
    super(message);
    this.response = response;
  }
}

export type EndPoint = {
  method?: Method;
  endPoint: string;
};

export type EndPointConfig = {
  [name: string]: EndPoint | string;
};

export type APIConfig = {
  [name: string]: APIConfig | EndPointConfig;
};

export interface RestClientBackend {
  load(rc: RestClient): Promise<APIConfig>;
  headers(): Promise<any>;
}

export type URIParam = Record<string, string | number | boolean>;
export type HeaderParam = Record<string, string>;
export class CallChain {
  private _pathParam?: any;
  private _urlParam?: any;
  private _data?: any;
  private _headers?: any;

  constructor(private api: string, private client: RestClient) {}

  pathParam(pathParam?: URIParam): CallChain {
    this._pathParam = pathParam;
    return this;
  }
  urlParam(urlParam?: URIParam): CallChain {
    this._urlParam = urlParam;
    return this;
  }
  data(data: unknown): CallChain {
    this._data = data;
    return this;
  }
  headers(headers: HeaderParam | { headers: HeaderParam }): CallChain {
    this._headers = headers;
    return this;
  }

  async call<T = any>(data?: unknown): Promise<T | null> {
    this.data(data);
    return this.client.call<T>(this.api, this._pathParam, this._urlParam, this._data, this._headers);
  }
}

export class RestClient {
  private config?: APIConfig;

  static onStart?: (req: AxiosRequestConfig) => AxiosRequestConfig | void;
  static onStop?: (response: AxiosResponse) => AxiosResponse | void;
  static onResponseError?: (error: RestClientError) => boolean;

  hook: (reqCfg: AxiosRequestConfig) => AxiosRequestConfig;

  client: AxiosInstance;

  get apiConfig(): APIConfig | undefined {
    return this.config;
  }

  constructor(public backend: RestClientBackend, public commonParam: any = {}) {
    this.client = axios.create();
    this.client.interceptors.request.use((req) => {
      if (RestClient.onStart) {
        const newReq = RestClient.onStart(req);
        if (newReq) {
          return newReq;
        }
      }
      return req;
    });
    this.client.interceptors.response.use((response) => {
      if (RestClient.onStop) {
        const newRes = RestClient.onStop(response);
        if (newRes) {
          return newRes;
        }
      }
      return response;
    });
  }

  async preload(): Promise<void> {
    this.config = await this.backend.load(this);
  }

  api(api: string): CallChain {
    return new CallChain(api, this);
  }

  async call<T = any>(api: string, pathParam?: URIParam, urlParam?: URIParam, data?: unknown, headers?: HeaderParam): Promise<T | null> {
    if (!this.config) {
      this.config = await this.backend.load(this);
    }
    const def = dot.pick(api, this.config);
    if (!def) {
      throw `No API define found! ${api} \n ${JSON.stringify(this.config, null, 2)}`;
    }
    let method = undefined;
    let endPoint = undefined;
    if (typeof def === 'string') {
      method = 'GET';
      endPoint = fillTemplate(def, Object.assign({}, this.commonParam, pathParam ?? {}));
    } else if (typeof def === 'object') {
      const tDef = def as EndPoint;
      method = tDef.method ?? 'GET';
      endPoint = fillTemplate(tDef.endPoint, Object.assign({}, this.commonParam, pathParam ?? {}));
    }
    const newHeaders = Object.assign({}, (await this.backend.headers()) ?? {}, headers ?? {});
    // if (process.env.NODE_ENV === 'development') {
    //     console.log('RestClient', `Headers: ${JSON.stringify(newHeaders)}`);
    // }

    try {
      const requestCfg: AxiosRequestConfig = {
        method: method as Method,
        url: endPoint,
        responseType: 'json',
        params: urlParam,
        data,
      };
      if (newHeaders.headers) {
        requestCfg.headers = newHeaders.headers;
      } else {
        requestCfg.headers = newHeaders;
      }
      if (this.hook) {
        Object.assign(requestCfg, this.hook(requestCfg));
      }
      const resp = await this.client.request(requestCfg);

      return resp.data as T;
    } catch (error: any) {
      if (RestClient.onStop) {
        RestClient.onStop(error.response);
      }
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const restClientError = new RestClientError(error.response.statusText, error.response);
        let throwable = true;
        if (RestClient.onResponseError) {
          throwable = RestClient.onResponseError(restClientError);
        }
        if (!throwable) {
          return null;
        }
        throw restClientError;
      } else {
        // Something happened in setting up the request that triggered an Error
        throw error;
      }
    }
  }

  async getApiEndpoint(api: string, pathParam?: URIParam, urlParam?: URLSearchParams) {
    if (!this.config) {
      this.config = await this.backend.load(this);
    }
    const def = dot.pick(api, this.config);
    if (!def) {
      throw `No API define found! ${api} \n ${JSON.stringify(this.config, null, 2)}`;
    }
    let method = undefined;
    let endPoint = undefined;
    if (typeof def === 'string') {
      method = 'GET';
      endPoint = fillTemplate(def, Object.assign({}, this.commonParam, pathParam ?? {}));
    } else if (typeof def === 'object') {
      const tDef = def as EndPoint;
      method = tDef.method ?? 'GET';
      endPoint = fillTemplate(tDef.endPoint, Object.assign({}, this.commonParam, pathParam ?? {}));
    }
    if (endPoint) {
      return { endPoint: `${endPoint}?${new URLSearchParams(urlParam ?? {}).toString()}`, method };
    } else {
      return null;
    }
  }
}
