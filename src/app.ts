import express,{Application,Request,Response,NextFunction} from 'express'

const app:Application = express()

import fetch from 'node-fetch'

if (process.env.NODE_ENV !== "production") {
  console.log('setting custom env variables');
  require('dotenv').config();
  console.log('node env is '+process.env.NODE_ENV);

}
import db from './db';

const OER_APP_ID=process.env.OER_APP_ID
const CACHE_DURATION= Number(process.env.CACHE_DURATION)//seconds


app.get('/', (req:Request, res:Response) => {
  res.send('Hello World!')
})

/*
  base_cur: INR/USD/etc
*/
app.get('/latest', async (req:Request, res:Response,next:NextFunction) => {
  let base_cur:string = String(req.query.base_cur) || 'USD'
  
  try{

    if(!base_cur || base_cur.length!==3){
      throw Error("Invalid Currency");
    }

    var minCacheTimestamp=getCurTimeInSeconds()-CACHE_DURATION
    let query= 'SELECT timestamp::int,lastfetched::int, base_cur,rates FROM latest WHERE base_cur=$1 AND lastfetched>$2 ORDER BY timestamp DESC LIMIT 1'

    const { rows } = await db.query(query, [base_cur,minCacheTimestamp])

    if(rows.length==0){
      let rawRes= await fetch(`https://openexchangerates.org/api/latest.json?app_id=${OER_APP_ID}&base=${base_cur}`)
      let rawJson = await rawRes.json()
      if (!rawRes.ok) {
        console.log(rawJson);
        throw Error(rawJson.message);
      }

      let ratesStr=JSON.stringify(rawJson.rates)

      let deleteOldQuery = "DELETE FROM latest WHERE base_cur=$1"
      await db.query(deleteOldQuery, [base_cur ])

      let insertQuery="INSERT INTO latest(timestamp,lastfetched, base_cur,rates) VALUES($1, $2, $3, $4)"
      await db.query(insertQuery, [rawJson.timestamp, getCurTimeInSeconds() ,base_cur,ratesStr ])

      let userResponse :LatestResponse={
        cached:false,
        timestamp: rawJson.timestamp,
        lastfetched: getCurTimeInSeconds(),
        base_cur: base_cur,
        rates:rawJson.rates
      }
      res.send(userResponse)
    }else{
      let rates = JSON.parse(rows[0].rates)
      
      let userResponse :LatestResponse={
        cached:true,
        timestamp: rows[0].timestamp,
        lastfetched: rows[0].lastfetched,
        base_cur: base_cur,
        rates:rates
      }
      res.send(userResponse)
    }
  }catch(err){
    console.log(err);
    return next(err)
  }
})

/*
  date: //yyyy-mm-dd
  base_cur: INR/USD/etc
*/
app.get('/historical', async (req:Request, res:Response,next:NextFunction) => {
  let base_cur:string = String(req.query.base_cur) || 'USD'
  let date:string = String(req.query.date) 
  
  try{

    if(!base_cur || base_cur.length!==3){
      throw Error("Invalid Currency");
    }

    let query= 'SELECT id,rates FROM historical WHERE date=$1 AND base_cur=$2 LIMIT 1'

    const { rows } = await db.query(query, [date,base_cur])

    if(rows.length==0){
      let rawRes= await fetch(`https://openexchangerates.org/api/historical/${date}.json?app_id=${OER_APP_ID}&base=${base_cur}`)
      let rawJson = await rawRes.json()
      if (!rawRes.ok) {
        console.log(rawJson);
        throw Error(rawJson.message);
      }
      
      let ratesStr=JSON.stringify(rawJson.rates)

      let deleteOldQuery = "DELETE FROM historical WHERE date=$1 AND base_cur=$2"
      await db.query(deleteOldQuery, [date,base_cur])

      let insertQuery="INSERT INTO historical(date, base_cur,rates) VALUES($1, $2, $3)"
      await db.query(insertQuery, [date, base_cur,ratesStr ])

      let userResponse :HistoricalResponse={
        cached:false,
        date: date,
        base_cur: base_cur,
        rates:rawJson.rates
      }
      res.send(userResponse)
    }else{
      let rates = JSON.parse(rows[0].rates)
      let userResponse :HistoricalResponse={
        cached:true,
        date: date,
        base_cur: base_cur,
        rates:rates
      }
      res.send(userResponse)
    }
  }catch(err){
    console.log(err);
    return next(err)
  }
})


require('./error_handler')(app);


app.listen(process.env.PORT || 3000, () => {
  console.log(`Example app listening at port ${process.env.PORT || 3000}`)
})

interface HistoricalResponse{
  cached : boolean,
  date:string,
  base_cur:string,
  rates: {[k: string]: number}
}

interface LatestResponse{
  cached : boolean,
  timestamp : number,
  lastfetched : number,
  base_cur:string,
  rates: {[k: string]: number}
}


function getCurTimeInSeconds():number{
  return Math.round(Date.now()/1000)
}