import { adminSecretKey } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { cookieOptions } from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";

const adminLogin = TryCatch(async(req, res, next) => {
    const {secretKey} = req.body;

    // const adminSecretKey = process.env.ADMIN_SECRET_KEY || "asdfghjklqwertyuiopzxcvbnm";

    const isMatched = (secretKey === adminSecretKey);

    if(!isMatched) return next(new ErrorHandler("Invalid admin key", 401));

    const token = jwt.sign(secretKey, process.env.JWT_SECRET);

    return res.status(200).cookie("ChatApp-admin-token", token, {...cookieOptions, maxAge: 1000*60*60,}).json({
        success: true,
        message:"Authenticated Successfully, Welcome Admin",
    })
})

const adminLogout = TryCatch(async(req, res, next)=>{

    return res.status(200).cookie("ChatApp-admin-token", "", {...cookieOptions, maxAge: 0,}).json({
        success: true,
        message:"Admin Logout Successfully",
    })
})

const getAdminData = TryCatch(async(req,res,next) =>{
    //ye function admin ko verify krta h, keval admin hi is route ko access kr skta h.
    return res.status(200).json({
        admin: true,
    })
})

//is route ki help se user sbhi users ka data dekh skta h.
const allUsers = TryCatch(async(req, res, next) => {
    //User collection me se sbhi users ko le lege
    const users = await User.find({});

    //humne sbhi users ko toh le liya lekin unke data ko frontend k format me dikhane k liye transform krna pdega.
    const transformUsers = await Promise.all(
        users.map(async ({name, username, avatar, _id})=>{

            //hume each user ki kitne group chat h aur kitni personal chat h vo bhi dikhane k liye h
            const [groups, friends] = await Promise.all([
                Chat.countDocuments({ groupChat: true, members: _id}),
                Chat.countDocuments({ groupChat: false, members: _id}),
            ])
    
            //is format me users ka data return hoga jab promise resolve ho jaiye ga.
            return {
                name,
                username,
                avatar: avatar.url,
                _id,
                groups,
                friends
            }
        })
    )

    return res.status(200).json({
        success: true,
        users: transformUsers,
    })
})

const allChats = TryCatch(async(req, res, next) => {
    //hum sbhi chats ko find krege. 
    //Humne Chat collection me members aur creator ka type mogodb ki ID kr rhka h jiski vjah se ye mongodb ki ID dege.
    //Humne in dono ko User collection ka refernce diya hua h jisse hum populate method ki help se un IDs ko User collection me find kr k specific field select kr skte h.
    const chats =  await Chat.find({})
    //Chat collection me members ki jo array h jisme IDs store h un IDs ko User collection me find krege aur un IDs k data me se name aur avatar ko select kr lege and same exactise creator k liye krege.
    .populate("members", "name avatar")
    .populate("creator", "name avatar")

    //hume jo data mila h ushe frontend k format me show krne k liye transform krege.
    const transformChat = await Promise.all(chats.map(async({members, _id, groupChat, name, creator})=>{

        const totalMessages = await Message.countDocuments({ chat: _id});

        return {
            _id,
            groupChat,
            name,
            avatar: members.slice(0,3).map((member)=> member.avatar.url),
            members: members.map(({_id, name, avatar})=>({
                //jab hume directly return krna hota h bina return keyword k toh hum {} brackets ki jagah () me data likh dete h jo ki return ho jata h.
                    _id,
                    name,
                    avatar: avatar.url,
            })),
            creator: {
                //group chat hogi tbhi crator hoga nhi toh creator nhi hoga.
                //yadi creator h toh uska name dikha dege nhi toh none dikha dege
                name: creator ?. name || "None",
                avatar: creator ?. avatar.url || "",
            },
            totalMembers: members.length,
            totalMessages,
        }
    }))

    return res.status(200).json({
        success: true,
        chats: transformChat,
    })
})

const allMessages = TryCatch( async(req, res, next) => {
    const messages = await Message.find({})
    .populate("sender", "name avatar")
    .populate("chat", "groupChat");

    const transformedMessages = messages.map(
        ({content, attachments, _id, sender, createdAt, chat}) => ({
            _id,
            attachments,
            content,
            createdAt,
            chat: chat._id,
            groupChat: chat.groupChat,
            sender:{
                _id: sender._id,
                name: sender.name,
                avatar: sender.avatar.url
            }
        })
    )

    return res.status(200).json({
        success: true,
        messages: transformedMessages,
    })
})

const getDashboardStats = TryCatch(async(req, res, next)=>{
    const [groupsCount, usersCount, messagesCount, totalChatsCount] = await Promise.all([
        Chat.countDocuments({groupChat: true}),
        User.countDocuments(),
        Message.countDocuments(),
        Chat.countDocuments(),
    ]);

    //hum last 7 din k messages gikhaye ge
    const today = new Date();

    const last7Days = new Date();
    //last7Days.getDate() => ye aaj ki date dege, isme se 7 sub krdege toh 7 din phle ki date mil jaye gi aur usko last7Days me set krdege
    last7Days.setDate(last7Days.getDate() - 7);

    //last 7 din me jo message create hue h vo find krega
    const last7DaysMessages = await Message.find({
        createdAt: {
            $gte: last7Days,
            $lte: today,
        }
    }).select("createdAt");

    //last 7 din k messages k count ko store krne k liye size=7 ki array bnayi h jisme initial value 0 fill krdi.
    const messages = new Array(7).fill(0);

    const dayInMiliseconds = 1000 * 60 * 60 * 24;

    //last 7 din k sbhi message ko traverse krege aur jo message jis din create hua h us index ko 1 se increase krte jaaye ge
    last7DaysMessages.forEach((message)=>{
        //hum message jis din create hua h uski value nikale ge
        const indexApprox = (today.getTime() - message.createdAt.getTime()) / dayInMiliseconds;
        const index = Math.floor(indexApprox);

        //value hume reverse me store krni hogi chart me isliye hum 6 me se sub krege kyoki array ki indexing 0 se start hoti h.
        messages[6 - index]++;
    })

    const stats = {
        groupsCount,
        usersCount,
        messagesCount,
        totalChatsCount,
        messagesChart: messages
    }

    return res.status(200).json({
        success: true,
        stats,
    })
})

export {allUsers, allChats, allMessages, getDashboardStats, adminLogin, adminLogout, getAdminData}