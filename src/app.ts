import express from 'express'
import { Server } from 'http'
import bodyParser from 'body-parser'
import { db } from './db.js'
import { performWithdrawal } from './service.js'

const app = express()
let server: Server

app.post('/withdraw', bodyParser.json(), async (req, res) => {
  const id = req.body.id
  if (typeof id !== 'number') {
    return res
      .status(400)
      .json({ error: 'ID must be a number'})
  }

  const amount = req.body.amount
  if (typeof amount !== 'number' || amount <= 0) {
    return res
      .status(400)
      .json({ error: 'Amount must be a positive number'})
  }

  const select = await db.query('select * from users where id = $1', [id])
  if (select.length < 1) {
    return res
      .status(404)
      .json({ error: 'User not found' })
  }

  const user = select[0]
  if (user.amount < amount) {
    return res
      .status(400)
      .json({ error: 'User does not have sufficient amount'})
  }

  await db.query('update users set amount = $1 where id = $2', [user.amount - amount, id])

  await performWithdrawal(id, amount)

  return res
    .status(202)
    .json({ message: 'Withdrawal request processed successfully'})
})

export const start = async (port: number) => new Promise<void>(resolve => server = app.listen(port, resolve))

export const stop = async () => new Promise<Error | undefined>(resolve => server.close(resolve))
