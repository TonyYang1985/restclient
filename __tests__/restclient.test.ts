import { RestClient } from '../src/libs/RestClient';
import { FSBackend } from '../src/libs/FSBackend';
import { HttpBackend, StateProvider, RequestHeader } from '../src/libs/HttpBackend';

it('test api config', async () => {
  const rc = new RestClient(new FSBackend(['RestClient', 'RestClientB']), {
    baseURL: 'http://127.0.0.1:8080',
  });
  await rc.preload();
  console.log(rc.apiConfig);
});

it('test header set and get', async () => {
  const rc = new RestClient(new FSBackend(['RestClient', 'RestClientB']));
  const ns = FSBackend.createNamespace();
  const headers = await ns.runPromise(async () => {
    FSBackend.setForwardHeader(ns, 'Authorization', 'Bearer xxxxxxxx');
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(rc.backend.headers());
      }, 10);
    });
  });

  console.log(headers);
});

it('test send req', async () => {
  const rc = new RestClient(new FSBackend(['RestClient', 'RestClientB']), {
    baseURL: 'http://127.0.0.1:8080',
  });
  const ns = FSBackend.createNamespace();

  await rc.preload();
  const res = await ns.runAndReturn(async () => rc.call('example.ipify1', { file: '.prettierrc.json' }));
  console.log(res);
  const res1 = await ns.runAndReturn(async () => rc.call('example.ipify2', { file: '.prettierrc.json' }));
  console.log(res1);
});

it('test send req via proxy', async () => {
  const rc = new RestClient(new FSBackend(['RestClient', 'RestClientB'], 'http://abc:123'), {
    baseURL: 'http://127.0.0.1:8080',
  });
  const ns = FSBackend.createNamespace();

  await rc.preload();
  try {
    const res = await ns.runAndReturn(async () => rc.call('example.ipify1', { file: '.prettierrc.json' }));
  } catch (error: any) {
    console.log(error.message);
  }
  delete process.env['http_proxy'];
});

it('http backend', async () => {
  const rc = new RestClient(
    new HttpBackend(
      {
        baseUrl: 'http://127.0.0.1:8080/cfg/',
        commonParamUrl: 'http://127.0.0.1:8080/cfg/CommonParam.yaml',
        cfgNames: ['RestClient', 'RestClientB'],
      },
      new StateProvider<RequestHeader>({ headers: {} }),
    ),
    {
      staticParam: 'http://127.0.0.1:8080',
    },
  );
  console.log(await rc.call('example.ipify1', { file: '.prettierrc.json' }));
  console.log(await rc.call('example.ipify1', { file: '.prettierrc.json' }));
  console.log(await rc.call('example.ipify1', { file: '.prettierrc.json' }));
});
