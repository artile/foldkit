import { Context } from 'effect'

export class Session extends Context.Service<Session, string>()('Session') {}
