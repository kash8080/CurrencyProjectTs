'use strict';

import express,{Application,Request,Response,NextFunction} from 'express'

module.exports = function (app:Application) {



    // catch 404 and forwarding to error handler , if none of the above routes match the request
    // if any of the above routes called next(err) then this will not be called as
    // this route does not use function with err as first param like in the following error handlers
    app.use(function (req:Request, res:Response,next:NextFunction) {
        console.log('catch 404 and forward middleware');
        var myError:MyError={
          status : 404,
          name: '404 Not Found',
          message: 'Not Found'
        }
        next(myError);
    });


    /// error handlers
    // development error handler
    // will print stacktrace
    if (app.get('env') === 'development') {
        app.use(function (err:any, req:Request, res:Response,next:NextFunction) {
            console.log('development error middleware' + err.message);
            res.status(err.status || 500);
            res.send({
                message: err.message,
                error_detail_debug: err
            });
        });
    }

    // production error handler
    // no stacktraces leaked to user
    app.use(function (err:any, req:Request, res:Response,next:NextFunction) {
        console.log('production error middleware ' + err.message);
        res.status(err.status || 500);
        res.send({
            message: err.message
        });
    });

};

interface MyError {
  err?: any,
  status: number,
  name:string,
  message: string,
  stack?:string
}