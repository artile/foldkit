import { Effect, Schema as S } from 'effect'
import { HttpClient } from 'effect/unstable/http'
import { Command } from 'foldkit'
import * as Http from 'foldkit/http'

const FetchWeather = Command.define(
  'FetchWeather',
  { city: S.String },
  SucceededFetchWeather,
  FailedFetchWeather,
)(({ city }) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get(`https://api.weather.com/${city}`)
    const data = yield* S.decodeUnknownEffect(WeatherResponse)(
      yield* response.json,
    )
    return SucceededFetchWeather({ data })
  }).pipe(
    Effect.catch(() =>
      Effect.succeed(FailedFetchWeather({ error: 'Request failed' })),
    ),
    Effect.provide(Http.layer),
  ),
)
