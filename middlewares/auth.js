import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { adminSecretKey } from "../app.js";
import { TryCatch } from "./error.js";
import { User } from "../models/user.js";
// import { User } from "../models/user.js";

const isAuthenticated = TryCatch((req,res,next)=>{
    //hum yha pr jo cookie me se token ko access kr pa rhe h vo cookie-parser package ki help se access kr pa rhe h.
    //yadi mujhe cookie me se token ko access krna h thundeclient me toh mujhe register aur login krte time cookie options me secure: true diya h ushe htana pdega aur yadi frontend se us token ko set aur access krna h cookie me toh mujhe secure: true ko lgana pdega.
    const token = req.cookies["ChatApp-token"];

    if(!token) return next(new ErrorHandler("Please login to access this route",401));

    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    // console.log(decodedData);

    // req.user = await User.findById(decodedData._id);
    req.user = decodedData._id;

    next();
});

const adminOnly = (req,res,next)=>{
    const token = req.cookies["ChatApp-admin-token"];

    if(!token) return next(new ErrorHandler("Only Admin can access this route",401));

    const secretKey = jwt.verify(token, process.env.JWT_SECRET);

    // export const adminSecretKey = process.env.ADMIN_SECRET_KEY || "asdfghjklqwertyuiopzxcvbnm";

    const isMatched = (secretKey === adminSecretKey);

    if(!isMatched) return next(new ErrorHandler("Only Admin can access this route",401));

    next();
} ;

const socketAuthenticator = async (err, socket, next) => {

    try {
        if(err)  return next(err);

        const authToken = socket.request.cookies["ChatApp-token"];

        if(!authToken) return next(new ErrorHandler("Please login to access this route", 401));

        const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);

        const user = await User.findById(decodedData._id);

        if(!user) return next(new ErrorHandler("Please login to access this route", 401));
        
        socket.user = user;

        return next();

    } catch (error) {
        console.log(error);
        return next(new ErrorHandler("Please login to access this route", 401));
    }
}

export {isAuthenticated, adminOnly, socketAuthenticator}