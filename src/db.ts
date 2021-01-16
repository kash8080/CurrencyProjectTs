import { Pool, PoolClient } from 'pg'

var pgConfig :Record<string,any>= {
  connectionString: String(process.env.DATABASE_URL),
} 

if (process.env.NODE_ENV === "production") {
  pgConfig.ssl= {
    rejectUnauthorized: false
  }
}
const pool = new Pool(pgConfig)

export default {
  query: (text:string, params:any[]) => pool.query(text, params),


  getClient: (callback: (err: Error, client: PoolClient, done: (release?: any) => void) => void) => {
    pool.connect((err, client, done) => {
      callback(err, client, done)
    })
  }
}
