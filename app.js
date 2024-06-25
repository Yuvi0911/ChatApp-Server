//yadi hum npm start krege toh humari server PRODUCTION MODE me start hoga aur yadi hum npm run dev krege toh DEVELOPMENT MODE me start hoga.
//ye value hum json file me hi set krdege
//ye basically variables h jinke basis pr hum ye decide kr rhe h ki hume kya cheje dikhani h konse variable me jaise ki jab vaiable ki value PRODUCTION h toh hum keval error ka message dikha aur jab value DEVELOPMENT h toh hum pura error ka stack show kr rhe h.
//aisa hum isliye kr rhe h kyoki hume production k time pr sbhi cheje nhi dikhani hoti h, hum keval useful cheje hi dikhate h, basically is se hum abstraction kr skte h.

import { v2 as cloudinary } from "cloudinary";
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from "dotenv";
import express from "express";
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuid } from 'uuid';
import { corsOptions } from './constants/config.js';
import { CHAT_JOINED, CHAT_LEAVED, NEW_MESSAGE, NEW_MESSAGE_ALERT, ONLINE_USERS, START_TYPING, STOP_TYPING } from './constants/events.js';
import { getSockets } from './lib/helper.js';
import { socketAuthenticator } from './middlewares/auth.js';
import { errorMiddleware } from "./middlewares/error.js";
import { Message } from './models/message.js';
import { connectDb } from "./utils/features.js";

import adminRoute from './routes/admin.js';
import chatRoute from './routes/chat.js';
import userRoute from './routes/user.js';

// import { createMessagesInAChat } from './seeders/chat.js';
// import { createGroupChats, createSingleChats } from './seeders/chat.js';
// import { createUser } from './seeders/user.js';


dotenv.config({
    path: "./.env",
})

const port = process.env.PORT || 3000;

export const envMode = process.env.NODE_ENV.trim() || "PRODUCTION"

export const adminSecretKey = process.env.ADMIN_SECRET_KEY || "asdfghjklqwertyuiopzxcvbnm";

const userSocketIds = new Map();
const onlineUsers = new Set();

const mongoURI = process.env.MONGO_URI;
connectDb(mongoURI);

//Cloudinary ek cloud-based service hai jo images aur videos ko store, manage, optimize aur deliver karne me madad karti hai.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

// //ye function 10 fake users ko generate krdega mongodb me
// createUser(10);
// createSingleChats(10);
// createGroupChats(10);
// createMessagesInAChat("66714de7cdeb5cbd3946bc6c",50);



const app = express();
const server = createServer(app)
const io = new Server(server, {
    cors: corsOptions,
});
//hume io ka use dusri file me bhi krna h isliye hum io ka instance set krdege jis se hum ishe dusri file me bhi access kr skte h.
app.set("io",io);

//body me jo data bheja h user ne ushe destructure krne k liye hum is middleware ko use krte h.
app.use(express.json());

//iski help se hum authentication token ko access kr skte h jo hi humne cookies me store kiya h.
app.use(cookieParser());

//cors ki help se hum alag alag domain pr data send aur recieve kr skte h for ex humare backend ki domain localhost:3000 h aur frontend ki domain localhost:5173 h toh 5173 pr data bhejne k liye hume cors ki help se ushe origin me set krna hoga aur credentials ko true krna hoga.
app.use(cors(corsOptions));


app.use("/api/v1/user", userRoute);

app.use("/api/v1/chat", chatRoute);

app.use("/api/v1/admin", adminRoute)

app.get("/", (req, res)=>{
    res.send("hello world")
})


io.use((socket, next)=>{
    cookieParser()(socket.request, 
    socket.request.res,
    async (err)=>{
       await socketAuthenticator(err, socket, next);
    })
})

io.on("connection", (socket)=>{

    const user = socket.user;
    // console.log(user);
    userSocketIds.set(user._id.toString(), socket.id);

    // console.log("a user connected", socket.id);
    // console.log(userSocketIds);

    //is socket ki help se hum real time message le ge
    socket.on(NEW_MESSAGE, async({chatId, members, message}) => {

        //ye hum socket ki help se baaki client ko emit krdege
        const messageForRealTime = {
            content: message,
            _id: uuid(),
            sender: {
                _id: user._id,
                name: user.name,
            },
            chat: chatId,
            createdAt: new Date().toISOString(),
        };

        //ye database me store hoga
        const messageForDB = {
            content: message,
            sender: user._id,
            chat: chatId,
        };

        // console.log("Emitting",messageForRealTime)

        //is se hume vo sbhi sockets mil jaye ge jinhe message bhejna h
        const membersSocket = getSockets(members);
        // console.log("members = ",membersSocket);

        //sbhi un sbhi sockets pr message bhej dege.
        io.to(membersSocket).emit(NEW_MESSAGE, {
            chatId,
            message: messageForRealTime
        });
        
        //jinke paas message gya h unko alert krdege ki 1 new message aaya h.
        io.to(membersSocket).emit(NEW_MESSAGE_ALERT, {chatId});

        // console.log("New Message", messageForRealTime)

        try{
        await Message.create(messageForDB);
        }
        catch(error){
            throw new Error(error);
        }
    })

    //humne frontend se emit kiya h event usko listen krega. Is listener ki help se hume pta chle ga ki konsa user typing kr rha h.
    socket.on(START_TYPING, ({members, chatId})=>{
        // console.log("start - typing", chatId);

        //jitne members us chat me h un sbhi ki socket id le ge.
        const membersSocket = getSockets(members);

        //hum yha se emit krege same event ko aur frontend pr listener lgaye ge.
        socket.to(membersSocket).emit(START_TYPING, {chatId});

    })

     //humne frontend se emit kiya h event usko listen krega. Is listener ki help se hume pta chle ga ki konsa user typing kr rha h.
    socket.on(STOP_TYPING, ({members, chatId})=>{
        // console.log("stop - typing",chatId);

        //jitne members us chat me h un sbhi ki socket id le ge.
        const membersSocket = getSockets(members);

        //hum yha se emit krege same event ko aur frontend pr listener lgaye ge.
        socket.to(membersSocket).emit(STOP_TYPING, {chatId});

    })

    socket.on(CHAT_JOINED, ({userId, members}) => {
        onlineUsers.add(userId.toString());

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
    });

    socket.on(CHAT_LEAVED, ({userId, members}) => {
        onlineUsers.delete(userId.toString());

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
    })


    //socket ko disconnect krne k liye use hota h.
    socket.on("disconnect", ()=>{
        // console.log("user disconnected");
        userSocketIds.delete(user._id.toString());
        onlineUsers.delete(user._id.toString());
        socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
    })
})

//jab bhi kisi controller me se 1st parameter me error bheja jaiye ga iski help se "return next(new Error(""))" toh ye middleware call ho jaiye ga.
app.use(errorMiddleware);


server.listen(port,()=>{
    console.log(`Server is working on port : ${port} in ${envMode} Mode`);
})

export { userSocketIds };

