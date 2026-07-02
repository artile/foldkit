---
'foldkit': minor
---

Add `foldkit/http`, a Fetch-backed `HttpClient` Layer with trace header
propagation disabled by default.

Foldkit's runtime runs every Command inside a tracing span, and Effect's
`HttpClient` adds `traceparent` headers to outgoing requests whenever a span
is active. Those headers make requests non-simple under CORS, triggering
preflights against plain APIs and dev proxies that never expect them.
Providing `FetchHttpClient.layer` directly meant every HTTP Command hit this
footgun by default. `Http.layer` turns propagation off so requests stay
CORS-simple:

```ts
import * as Http from 'foldkit/http'

const FetchCount = Command.define(
  'FetchCount',
  SucceededFetchCount,
  FailedFetchCount,
)(
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get('/api/count')
    const { count } = yield* S.decodeUnknownEffect(CountResponse)(
      yield* response.json,
    )
    return SucceededFetchCount({ count })
  }).pipe(
    Effect.catch(() =>
      Effect.succeed(FailedFetchCount({ error: 'Request failed' })),
    ),
    Effect.provide(Http.layer),
  ),
)
```

Local tracing is unaffected: the client still records its `http.client` span
with method, URL, and status attributes. Apps doing distributed tracing can
re-enable propagation per Command with
`Effect.provideService(HttpClient.TracerPropagationEnabled, true)`, or keep
using `FetchHttpClient.layer` from Effect directly.
