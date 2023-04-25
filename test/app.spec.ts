import { describe, beforeEach, it, beforeAll, afterAll, expect, jest } from '@jest/globals'
import superagent from 'superagent'
import { start, stop } from '../src/app.js'
import { db } from '../src/db.js'
import { mockWithdrawal } from '../src/service.js'

const PORT = 3001
const URL = 'http://localhost:' + PORT

const findUser = async () => {
  const select = await db.query('select * from users where id = $1', [1])
  return select[0]
}

describe('app', () => {
  beforeAll(async () => {
    await start(PORT)
  })

  beforeEach(async () => {
    await db.query('delete from users where true')
    await db.query('insert into users (id, amount) values (1, 1000)')
  })

  afterAll(async () => {
    await stop()
    await db.$pool.end()
  }, 1000)

  it('does not allow passing non-numeric ID', async () => {
    const response = await superagent.agent()
      .post(URL + '/withdraw')
      .send({
        id: 'ahoj',
        amount: 1000
      })
      .ok(() => true)

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error', expect.stringMatching(/id/i))
  })

  it('returns error on non-existing ID', async () => {
    const response = await superagent.agent()
      .post(URL + '/withdraw')
      .send({
        id: 2,
        amount: 1000
      })
      .ok(() => true)

    expect(response.status).toBe(404)
    expect(response.body).toHaveProperty('error', expect.stringMatching(/user/i))
  })

  it('does not allow passing non-numeric amount', async () => {
    const response = await superagent.agent()
      .post(URL + '/withdraw')
      .send({
        id: 1,
        amount: 'ahoj'
      })
      .ok(() => true)

    const user = await findUser()

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error', expect.stringMatching(/amount/i))
    expect(user.amount).toBe(1000)
  })

  it('does not allow passing negative amount', async () => {
    const response = await superagent.agent()
      .post(URL + '/withdraw')
      .send({
        id: 1,
        amount: -1
      })
      .ok(() => true)

    const user = await findUser()

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error', expect.stringMatching(/amount/i))
    expect(user.amount).toBe(1000)
  })

  it('returns error on insufficient amount', async () => {
    const response = await superagent.agent()
      .post(URL + '/withdraw')
      .send({
        id: 1,
        amount: 2000
      })
      .ok(() => true)

    const user = await findUser()

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error', expect.stringMatching(/amount/i))
    expect(user.amount).toBe(1000)
  })

  it('correctly withdraws amount', async () => {
    const response = await superagent.agent()
      .post(URL + '/withdraw')
      .send({
        id: 1,
        amount: 1000
      })
      .ok(() => true)

    const user = await findUser()

    expect(response.status).toBe(202)
    expect(response.body).toHaveProperty('message', expect.stringMatching(/success/i))
    expect(user.amount).toBe(0)
  })

  it('does not subtract amount when withdrawal fails', async () => {
    mockWithdrawal(() => { throw new Error() })
    try {
      const response = await superagent.agent()
        .post(URL + '/withdraw')
        .send({
          id: 1,
          amount: 1000
        })
        .ok(() => true)

      const user = await findUser()

      expect(response.status).toBe(500)
      expect(user.amount).toBe(1000)
    } finally {
      mockWithdrawal(false)
    }
  })
})