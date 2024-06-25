import { envMode } from "../app.js";
import { ErrorHandler } from "../utils/utility.js";

//is function ki help se hum response me error ka message aur status code send krege jo ki hume controller k functions se milega
const errorMiddleware = (err, req, res, next) => {
    err.message ||= "Internal Server Error" ;
    err.statusCode ||= 500;

    //yadi hum id ki length galat de dete h thunderclient me request krte wakt toh ushe castError khte h aur ushe hum handle krege
    if(err.name === "CastError"){
        // const message = `Resource not found. Invalid: ${err.path}`;
        // err= new ErrorHandler(message,400)

        const errorPath = err.path;
        err.message = `Invalid Format of ${errorPath}`;
        err.statusCode = 400;
    }

    //Mongoose duplicate key error => user yadi same email se dobara nayi id bnaye toh
    if(err.code === 11000){
        // const message = `Duplicate ${Object.keys(err.keyValue)} Entered`;
        // err = new ErrorHandler(message, 400);

        const error = Object.keys(err.keyPattern).join(",");
        err.message = `Duplicate field - ${error}`;
        err.statusCode = 400;
    }

    //yadi koi JsonWebToken galat daal deta h toh
    if(err.name === "JsonWebTokenError"){
        const message = `Json web token is invalid, try again`;
        err = new ErrorHandler(message, 400);
    }

    //JWT expire error
    if(err.name === "TokenExpiredError"){
        const message = "Json web token is Expired, try again";
        err = new ErrorHandler(message, 400);
    }

    const response = {
        success: false,
        message: err.message,
    }

    if(envMode === "DEVELOPMENT"){
        response.error = err;
    }

    return res.status(err.statusCode).json(response);
};

//ye ek wrapper function h jo ki parameter me 1 function lega aur ushe try catch me wrap kr dega.
const TryCatch = (passedFunc) => async(req, res, next) => {
    try {
        await passedFunc(req, res, next);
    }
    catch(error){
        next(error);
    }
}

export {errorMiddleware, TryCatch}