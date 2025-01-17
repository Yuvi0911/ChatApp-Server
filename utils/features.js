import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import {v4 as uuid} from 'uuid';
import {v2 as cloudinary} from "cloudinary";
import { getBase64, getSockets } from "../lib/helper.js";

export const connectDb = (uri) => {
    mongoose.connect(uri,{
        dbName: "ChatApp",
    })
    .then((c)=>console.log(`Db Connected to ${c.connection.host}`))
    .catch((e)=>{
        throw e;
    });
}


export const cookieOptions = {
    maxAge: 15*24*60*60*1000,
    sameSite:"none",
    httpOnly: true,
    //yadi hume thunderclient me cookie ko access krna h toh hum secure: true ko hta dege.
    secure: true,
}

export const sendToken = (res, user, code, message) => {
    const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET)

    return res.status(code).cookie("ChatApp-token", token, cookieOptions).json({
        success: true,
        user,
        message,
    })
}

export const emitEvent = (req, event,users, data) => {
    //io ka instance bnaya h app.js me toh us se io le rhe h.
    let io = req.app.get("io");
    //iski help se hum group k sbhi members ki socket id lege
    const usersSocket = getSockets(users);
    //toh iski help se hum un sbhi users k pass data bhej skte h jo ki usersSocket me h
    io.to(usersSocket).emit(event, data);
};

export const uploadFilesToCloudinary = async (files=[]) => {
    const uploadPromises = files.map((file)=>{
        return new Promise((resolve, reject) => {
           cloudinary.uploader.upload(
                getBase64(file),
                {
                    resource_type: "auto",
                    public_id: uuid(),
                },
                (error, result) => {
                    if(error) return reject(error);
                    resolve(result);
                }
            )
        })
    });

    try {
        const results = await Promise.all(uploadPromises);

        const formattedResults = results.map((result) => ({
            public_id: result.public_id,
            url: result.secure_url,
        }))

        return formattedResults;

    } catch (error) {
        throw new Error("Error uploading files to cloudinary", error);
    }
}

export const deleteFilesFromCloudinary = async(publicIds)=>{
    try{
        const deletePromises = publicIds.map((publicId)=>cloudinary.uploader.destroy(publicId));
        await Promise.all(deletePromises);
        console.log("Files deleted successfully");
    }
    catch(error){
        console.log("Error deleting files from cloudinary:", error);
        throw new Error("Error deleting files to cloudinary", error);
    }
}
