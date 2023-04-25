import pgPromise from 'pg-promise'

export const db = await pgPromise()('postgres://postgres:postgres@localhost/postgres')
