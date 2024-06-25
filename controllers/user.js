import { compare } from "bcrypt";
import { User } from "../models/user.js";
import { Chat } from "../models/chat.js";
import { cookieOptions, emitEvent, sendToken, uploadFilesToCloudinary } from "../utils/features.js";
import { TryCatch } from "../middlewares/error.js";
import {ErrorHandler} from "../utils/utility.js";
import { Request } from "../models/request.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";

//create a new user and save it to the database and save token in cookie
const newUser = TryCatch(async (req, res, next) =>{
    const {name,username, password, bio} = req.body;

    const file = req.file;
    console.log(file);

    if(!file) return next(new ErrorHandler("Please Upload Avatar"));

    //cloudinary pr hum images aur video upload kr k store kr skte h.
    const result = await uploadFilesToCloudinary([file]);
    
     const avatar = {
        public_id: result[0].public_id,
        url: result[0].url,
     }
      const user = await User.create({
        name,
        bio,
        username,
        password,
        avatar,
    })
 sendToken(res, user, 201, "User Created")
})

const login = async(req, res, next) => {

 try{
    const {username, password} = req.body;

    const user = await User.findOne({username}).select("+password");

    
    if(!user){
          //by-default hum Error class use krte h ErrorHandler class ki jagh pr jisme hum keval message bhej skte h lekin humne apni khud ki class bna di ErrorHandler jisme hum message aur status code dono initialize kr skte h aur fir ye message aur status code errorMiddleware function me pass ho jaye ge.
       return next(new ErrorHandler("Invalid Username or Password",404));
    }

    const isPasswordMatch = await compare(password, user.password);


    if(!isPasswordMatch){
         return next(new ErrorHandler("Invalid Username or Password",404));
    }

    sendToken(res, user, 200, `Welcome, ${user.name}`);
 }
catch(error){
    //errorMiddleware call ho jaiye ga jisme ye error chla jaiye
    next(error);
}
}

const getMyProfile = TryCatch(async(req, res, next) => {

    const user = await User.findById(req.user);

    if(!user) return next(new ErrorHandler("User not found",404));

    return res.status(200).json({
        success: true,
        user,
    })
})

const logout = TryCatch(async(req,res,next)=>{
    // res.cookie("ChatApp-token", null,{
    //     expires: new Date(Date.now()),
    //     httpOnly: true,
    // })

    // ...cookieOptions => ... operator ki help se hum cookieOptions ko sppread kr skte h aur uske ander jo variables bnaye h unhe access kr k change kr skte h.

    return res.status(200).cookie("ChatApp-token", "" ,{...cookieOptions, maxAge: 0}).json({
        success: true,
        message: "Logout Successfully"
    })
})

//iski help se hum un user ko search kr skte h jo ki humare friend nhi h. Jin user k saath hamne chat nhi kr ekhi h vo humare friend nhi h.
const searchUser = TryCatch(async(req,res,next)=>{

    //query =>query ki help se hum database se specific data access kr skte h. Url me jo question mark k piche likha hota h vo query hoti h aur & ka use kr k hum multiple query de skte h.
    //hum query me us user ka naam bheje ge jo humara friend nhi h.
    const {name=""} = req.query;

    //hum un chat ko find krege jo ki group chat nhi h, personal chat h aue jinke member hum h.
    const myChats = await Chat.find({
        groupChat:false,
        members: req.user
    });

    //upar se jo humari chat aai h unme se hum keval members ki id le lege aur flatMap method ki help se hum sbhi id ko 1 array me store krva dege.
    const allUsersFromMyChats = myChats.flatMap((chat)=>chat.members)
    // .flat(); // same result milega flatmap ko map ki jagah use krne se 

    //upar vali id k alva jitni bachi hui id h vo le lege aur unme se us id ko select kr lege jiska name query vale name se match hota hoga.
    //$regex ki help se hume kisi user ko find krne k liye uska pura naam likhne ki jrurt nhi h yadi hum 1,2 letter bhi likh dege toh vo user aa jaiye ga jiske name me vo letter hoge
    const allUsersExceptMeAndMyFriends = await User.find({
        _id: {$nin: allUsersFromMyChats},
        name: {$regex: name, $options: "i"},
    })

    //jo user find kiya h uski keval 3 cheje lenge response me show krne k liye
    const users = allUsersExceptMeAndMyFriends.map(({_id, name, avatar})=>({_id, name, avatar: avatar.url}))

    res.status(200).json({
        success: true,
        users,
    })
})
//kski help se user dusre user ko friend request bhej skta h.
const sendFriendRequest = TryCatch(async(req, res, next) => {
    //dusre user ki id lenge jise request bhejni h.
    const {userId} = req.body;

    //Request collection me check krege ki mene dusre user ko request bhej rkhi h ya dusre user ne mujhe request bhej rkhi h.
    const request = await Request.findOne({
        $or: [
            { sender: req.user, receiver: userId},
            { sender: userId, receiver: req.user},
        ]
    })

    //yadi hum dono me se kisi ne bhi request bhej rkhi hogi toh hum error bhej dege
    if(request) return next(new ErrorHandler("Request already sent", 400));

    //yadi kisi ne bhi request nhi bheji h toh hum Request collection me 1 nayi request bna dege.
    await Request.create({
        sender: req.user,
        receiver: userId,
    })

    //socket io k event ko emit kr dege jisse hume real time data mil jaye ga
    emitEvent(req, NEW_REQUEST, [userId]);

    return res.status(200).json({
        success: true,
        message: "Friend Request Sent",
    })
})

//iski help se hum notifications me jo request aayi h unhe accept ya reject kr skte h.
const acceptFriendRequest = TryCatch(async(req, res, next)=>{
    //jo friend request aayi h uski id lenge aur accept krna h ya reject krna h uski value boolean me lege.
    const {requestId, accept} = req.body;

    //us requestd k basis pr hum us request ko find krege Request collection me aur populate method ki help se sender ka naam aur receiver ka naam select kr lenge.
    const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

    //yadi request nhi payi Request collection me tph error de dege
    if(!request) return next(new ErrorHandler("Request not found", 404));

    //request mil jaati h lekin jo request ka receiver h matlab jiske paas request gyi h vo aur m jisne login kr rhka h dono same nhi h toh error de dege.
    if(request.receiver._id.toString() !== req.user.toString())
        return next(new ErrorHandler("You are not authorized to accept this request", 401));

    //yadi accept ki value false h toh receiver ne request ko reject kr diya
    if(!accept) {
        //request ko collection me se delete krdege
            await request.deleteOne()

        return res.status(200).json({
        success: true,
        message: "Friend Request Rejected"
    })
    }

    //yadi receiver ne request ko accept kr liya toh sender aur receiver ki id lege aur dono k bich me chat establish krdege.
    const members = [request.sender._id, request.receiver._id];


    //sender aur receiver k bech me chat setup krdege aur request ko database se delete kr dege.
    await Promise.all([
        Chat.create({
            members,
            name: `${request.sender.name}-${request.receiver.name}`
        }),
        request.deleteOne(),
    ]);

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({
        success: true,
        message: "Friend Request Accepted",
        senderId: request.sender._id,
    })

})

//iski help se hum notifications ko dekh skte h. Jin-jin users ne hume request bheji h unki request ko accept ya reject krne ki notification show krvaye ga ye.
const getMyNotifications = TryCatch(async(req, res)=>{
    //jin-jin requestsceiver m hu un requests ko select krege aur populate method ki help se sender ka name aur avatar field select kr lege
    const requests = await Request.find({receiver: req.user}).populate(
        "sender",
        "name avatar"
    );

    //sender ki _id, name, aur avatar le lege response me bhejne k liye
    const allRequests = requests.map(({_id, sender})=>({
        _id,
        sender:{
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar.url,
        }
    }))

    return res.status(200).json({
        success: true,
        allRequests,
    })
})

const getMyFriends = TryCatch(async(req, res, next)=>{

   const chatId = req.query.chatId;

   //hum un chat ko find krege jo group chat nhi h aur un chat k member hum nhi h.
   const chats = await Chat.find({
       members: req.user,
       groupChat:false,
    }).populate("members", "name avatar");

    //friends me unka data aa jaiye ga jinke saath hamari personal chat h.
    const friends = chats.map(({members})=>{
        //humare alava dusre members ki chat id select kr lege jinke saath hamari personal chat h.
        const otherUser = getOtherMember(members, req.user)

        //un dusre users jinki humare saath personal chat h unki id, name, avatar return krdega.
        return {
            _id: otherUser._id,
            name: otherUser.name,
            avatar: otherUser.avatar.url,
        }
    })

    //yadi query me chat id de gyi h toh if statement execute hogi aur yadi chat id nhi di gyi toh else execute hoga
    if(chatId){
        //hum chat id vali chat find krege
        const chat = await Chat.findById(chatId);

        //iski help se dekhe ge jis user ko hum group me add kr rhe h vo already group ka member h ya nhi.
        //humare pass jo hamare sbhi friends aaye h array ki format me, hum unhe filter kr k un me se un users ko le lege jo group k member nhi h aur group me add hone k liye available h.
        const availableFriends = friends.filter(
            (friend) => !chat.members.includes(friend._id)
        );

        return res.status(200).json({
            success: true,
            friends: availableFriends,
        })
    }
    else{
        //chat id nhi h query me toh hamare sbhi friends ko return krdege.
        return res.status(200).json({
            success: true,
            friends,
        })
    }
})

export { login, newUser, getMyProfile, logout, searchUser, sendFriendRequest, acceptFriendRequest, getMyNotifications, getMyFriends };
