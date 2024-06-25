import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { User } from "../models/user.js";
import { Message } from "../models/message.js";
import { deleteFilesFromCloudinary, emitEvent, uploadFilesToCloudinary } from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";
import {ALERT, NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS} from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";


//ye function group create krne k liye h
const newGroupChat = TryCatch(async(req, res, next) => {
    //body me se group ka naam aur members ki array lega jisme member ki id store h jo ki user ki collection me se li gyi h kyoki group me vo hi users ho skta h jo ki database me store h.
    const {name, members} = req.body;

    //iska humne express-validator bna diya isliye hum ye condition hta skte h
    //yadi member ki array me 2 se kam users ki id h toh vo 1 group nhi ho skta
    // if(members.length < 2){
    //     return next(new ErrorHandler("Group must have at least 3 members", 400))
    // }


    //hum members ki array ko spread krege aur usme humari(jisne group create kiya h) id bhi add krdege kyoki hum bhi toh ushi group ka hissa hoge.
     //isAuthentication middleware hume login user ki id bhejega req.user me jisse hum members ki array me add krdege
    const allMembers = [...members, req.user];

    await Chat.create({
        name,
        groupChat: true,
        //chat k model me humne creator ko User ki collection ka reference diya h isliye hum creator me user ki objectId store krva skte h aur iski help se hum us user jiski ye id h uski dusri field ko populate kr k data ko access kr skte h
        creator: req.user,
        members: allMembers,
    })

    emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);

    emitEvent(req, REFETCH_CHATS, members, )

    return res.status(201).json({
        success: true,
        message: "Group Created"
    })
})

//is function ki help se hum left side me jo grid h frontend me jisme user ki sbhi dusre users k saath chat show hoti h uska data lege.
const getMyChats = async (req, res, next) => {

    //isAuthenticated middleware hume humare _id de dega. 
    //Jab bhi hum chat krege kisi k saath toh humara 1 group create hoga jisme members naam ki field hogi jo ki 1 array hoge jisme humari aur dusre users jiske saath hum chat kr rhe h uski _id store hogi.
    //jin bhi member ki array me humari _id store hogi database me hum vo chats le lege niche vali line ki help se kyoki humari chats keval vo hi hogi jinme humari _id add hogi members ki field me.
    const chats = await Chat.find({members: req.user}).populate(
        "members",
        "name avatar"
    )
    //humne member array ko User ka reference diya hua h toh hum populate function ki help se User collection ki fields ko access kr skte h directly populate method ki help se.
    //yadi hum .populate() function nhi likhte toh hume member ki id me keval users ki id milti lekin populated() method ki help se hum us id k basis pr us specific user ka name aur image/avatar le skte h User Collection me se.


    const transformedChats = chats.map(({_id, name, members, groupChat})=>{

        //ye function personal chat me dusre user ki id de dega
        const otherMember = getOtherMember(members, req.user)
        
        return {
            _id,
            groupChat,

            //yadi group chat hogi toh hum phle 3 group members ki image dekha dege aur yadi personal chat hogi toh hum dusre uder ki avatar dekha dege
            avatar: groupChat?members.slice(0,3).map(({avatar})=>avatar.url) : [otherMember.avatar.url],
            //yadi group chat h toh group ka naam dikhaye ge aur personal chat h toh dusre user ka naam dikhaye ge.
            name: groupChat ? name : otherMember.name,

            //members ka pura data lene ki jagah hum keval members ki id lege reduce method ki help se
            members: members.reduce((prev, curr)=>{
                if(curr._id.toString() !== req.user.toString()){
                    prev.push(curr._id);
                }
                return prev;
            },[]),
        }
    })

    return res.status(200).json({
        success: true,
        chats: transformedChats
    })
}

//jo group maine bnaye h unko dekhne k liye ye function use hoga.
const getMyGroups = TryCatch(async(req,res,next)=>{

    // hum un chat ko find krege jinka member m hu aur vo groupChat h na ki personal chat h aur unka creator bhi m hu.
    const chats = await Chat.find({
        members: req.user,
        groupChat: true,
        creator: req.user
    }).populate("members", "name avatar");

    const groups = chats.map(({members, _id, groupChat, name}) => ({
        _id,
        groupChat,
        name,
        avatar: members.slice(0, 3).map(({avatar}) => avatar.url)
    }));
    
    return res.status(200).json({
        success: true,
        groups
    })

})


//is function ki help se hum jo chat group h un me member add kr skte h.
const addMembers = TryCatch(async(req, res, next)=>{
    const {chatId, members} = req.body;

    //humne is k liye express-validator bna diya isliye iski jrurt nhi h.
    //yadi user ne koi member diya nhi add krne k liye toh ye error aa jaiye ga
    // if(!members || members.length < 1)
    //     return next(new ErrorHandler("Please provide members", 400));

    //chatId ki help se hum us chat ko find krege jisme hume naye user ko add krna h.
    const chat = await Chat.findById(chatId);

    //yadi chat nhi milti us id ki toh hum error de dege
    if(!chat) return next(new ErrorHandler("Chat not found", 404));

    //yadi chat toh mil jati h lekin vo group chat ki jagah personal chat h toh hum error dege kyoki hum personal chat jha groupChat ki value false h usme member add nhi kr skte h.
    if(!chat.groupChat){
        return next(new ErrorHandler("This is not a group chat", 404));
    }

    //keval group ka creator hi group me member add kr skta h.
    if(chat.creator.toString() !== req.user.toString())
        return next(new ErrorHandler("You are not allowed to add members", 403));

    //jin member ki id di h add krne k liye unhe User collection me find krege
    const allNewMembersPromise = members.map((i)=> User.findById(i, "name"));
    const allNewMembers = await Promise.all(allNewMembersPromise);

    //keval unique member ko hi select krega
    const uniqueMembers = allNewMembers.filter((i)=> !chat.members.includes(i._id.toString()));

    //unique member ki id ko members ki array me push kr dega
    chat.members.push(...uniqueMembers.map((i)=>i._id));

    //yadi 100 se jayda member ho jaate h toh error bhej dega
    if(chat.members.length > 100)
        return next(new ErrorHandler(
    'Group members limit reached', 400));

    //chat me jo change hue h unhe save krdega.
    await chat.save();

    const allUsersName = allNewMembers.map((i)=>i.name).join(",");

    emitEvent(
        req,
        ALERT,
        chat.members,
        `${allUsersName} has been added in the group`
        )

    emitEvent(req, REFETCH_CHATS, chat.members);

    return res.status(200).json({
                success: true,
                message: "Members added successfully"
    })
})

//is function ki help se hum Group me se user ko remove kr skte h. 
const removeMember = TryCatch(async(req, res, next)=>{
    const {userId, chatId} = req.body;

    const [chat, userThatWillBeRemoved] = await Promise.all([
        Chat.findById(chatId),
        User.findById(userId, "name"),
    ]);

    if(!chat) return next(new ErrorHandler("Chat not found", 404));

    //yadi chat toh mil jati h lekin vo group chat ki jagah personal chat h toh hum error dege kyoki hum personal chat jha groupChat ki value false h usme member add nhi kr skte h.
    if(!chat.groupChat){
        return next(new ErrorHandler("This is not a group chat", 404));
    }

    //keval group ka creator hi group me member add kr skta h.
    if(chat.creator.toString() !== req.user.toString())
        return next(new ErrorHandler("You are not allowed to add members", 403));

    if(chat.members.length <= 3){
        return next(new ErrorHandler("Group must have at least 3 members", 400));
    }
    const allChatMembers = chat.members.map((i) => i.toString());

    chat.members = chat.members.filter((member)=> member.toString() !== userId.toString());

    await chat.save();

    emitEvent(
        req,
        ALERT,
        chat.members,
        {message: `${userThatWillBeRemoved.name} has been removed from group`, chatId}
    );

    emitEvent(req, REFETCH_CHATS, allChatMembers);

    return res.status(200).json({
        success:true,
        message: "Member removed successfully"
    })
})

//is function ki help se user group ko left kr skta h
const leaveGroup = TryCatch(async(req, res, next)=>{
    //parameter me se group ki id lege jisse leave kr rhe h.
    const chatId = req.params.id;

    //us chat id ki help se us user ki chat find krege
    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not found",404));

    //yadi vo chat group chat nhi h toh error return krdege
    if(!chat.groupChat) return next(new ErrorHandler("This is not a group chat", 400));

    //chat me jo members ki array h us me se us user ki id hta dege jo left krna chahta h. user ki id isAuthenticated middleware se lenge kyoki jo user login h vo hi left kr skta h.
    const remainingMembers = chat.members.filter((member)=>member.toString() !== req.user.toString());

    if(remainingMembers.length < 3)
        return next(new ErrorHandler("Group must have at least 3 members",400));

    //yadi group ka creator hi group left krna chahta h toh hum randomly kisi aur user ko group ka creator bna dege
    if(chat.creator.toString() === req.user.toString()){
        const randomElement = Math.floor(Math.random() * remainingMembers.length);
        const newCreator = remainingMembers[randomElement];
        chat.creator = newCreator;
    }

    //members array me remaining members ko assign kr dege
    chat.members = remainingMembers;

    //data ko database me save krdege.
    //Promise.all ki vjah se dono cheje concurrently execute hogi.
    const [user] = await Promise.all([User.findById(req.user, "name"), chat.save() ]);

    // await chat.save();

    emitEvent(
        req,
        ALERT,
        chat.members,
        {chatId, message: `${user.name} has left the group`}
    );


    return res.status(200).json({
        success:true,
        message: "Group Leaved successfully"
    })


})

const sendAttachments = TryCatch(async(req, res, next)=>{
    const {chatId} = req.body;

    const files = req.files || [];

    if(files.length < 1) return next(new ErrorHandler("Please Upload Attachment", 400));

    if(files.length > 5) return next(new ErrorHandler("Files can't be more than 5", 400));

    const [chat, me] = await Promise.all([
        Chat.findById(chatId),
        User.findById(req.user, "name")
    ]);


    if(!chat) return next(new ErrorHandler("Chat not found",404))


        if(files.length < 1) 
            return next(new ErrorHandler("Please provide attachments", 400));

        //upload files here from cloudinary
        const attachments = await uploadFilesToCloudinary(files);

        const messageForDB = {
            content:"",
            attachments,
            sender: me._id,
            chat: chatId
        };

        // messageForRealTime almost same h messageForDB keval hume sender ko change krna h isliye hum messageForDB ko spread krege aur sender ko change krdege.
        const messageForRealTime = {
            // content:"",
            // attachments,
            // sender: {
            //     _id: me._id,
            //     name: me.name,
            // },
            // chat: chatId

            ...messageForDB,
             sender: {
                _id: me._id,
                name: me.name,
            },
        };

    

        const message = await Message.create(messageForDB);

        emitEvent(req, NEW_MESSAGE, chat.members, {
            message: messageForRealTime,
            chatId,
        });

        emitEvent(req, NEW_MESSAGE_ALERT, chat.members, {chatId});

    
        return res.status(200).json({
            success: true,
            message,
        })
})

//jonsi bhi chat open kruga uski details mil jiye gi.
const getChatDetails = TryCatch(async(req, res, next)=>{

    //yadi hum query me populate=true bhejte h toh if vali condition execute hogi nhi toh else vali condition execute hogi.

    if(req.query.populate === "true"){
        //url me se parameter me se chat ki id lenge aur us id k basics pr us chat ko find krege aur chat find krne k baad us chat me members ki array me se id le kr un id k baics pr User collection me se un user ko find krege jinki vo id h aur un user k data ko access kr k hum us me se name aur avatar le lege un users ka.
        const chat = await Chat.findById(req.params.id).populate("members", "name avatar").lean();
        //.lean() krne se chat object mongodb ka object nhi rha ab ye classic javascript ka object ban gya h. ab yadi m is chat object me change kr skta hu bina save() ka use kiye aur database me koi effect bhi nhi hoga. Aisa humne is liye kiya h kyoki hum database m koi change nhi krna chahte the lekin hume chat me change kr ke use reponse me send krna tha.

        if(!chat) 
            return next(new ErrorHandler("Chat not found", 404));

        //lean() method ki help se humne chat ko javascript ka object bna diya h ab hum chat ki members ki array me users k id, name, avatar ko save krdege aur resonse me in chejo ko details k roop me bhej dege.
        chat.members = chat.members.map(({_id, name, avatar})=> ({
            _id,
            name,
            avatar: avatar.url
        }))

        return res.status(200).json({
            success: true,
            chat,
        })
    }
    else{
        //yadi populate==false h toh hume keval group k users ki id dikhani h response m na unki puri details.
        const chat = await Chat.findById(req.params.id);

        if(!chat) 
            return next(new ErrorHandler("Chat not found", 404));

        return res.status(200).json({
            success: true,
            chat,
        })

    }
})

const renameGroup = TryCatch(async(req, res, next) => {
    //hum url me se us group ki id le ge jiska naam change krna h.
    const chatId = req.params.id;
    //body m se hum naya naam lege.
    const {name} = req.body;

    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not Found",404))

    if(!chat.groupChat) return next(new ErrorHandler("This is not a Group Chat"));

    //yadi us group ka creator m nhi hu toh m uska naam change nhi kr skta.
    if(chat.creator.toString() !== req.user.toString()){
        return next(new ErrorHandler("You are not allowed to rename the group", 403));
    }

    //chat ka naam change kr dege
    chat.name = name;

    // database me naya data save krdege
    await chat.save();

    emitEvent(req, REFETCH_CHATS, chat.members);

    return res.status(200).json({
        success: true,
        message: "Group Renamed Successfully"
    })
})

const deleteChat = TryCatch(async(req, res, next)=>{
    //hum url me se us chat ki id lege jisse hume delete krna h.
    const chatId = req.params.id;

    //chatId k basics pr hum database me us group ko find krege.
    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not found", 404));

    //group me jo members h unhe lege
    const members = chat.members;

    //yadi chat group chat h aur hum uske creator nhi h toh hum us chat aur group ko delete nhi kr skte.
    if(chat.groupChat && chat.creator.toString() !== req.user.toString()){
        return next(new ErrorHandler("You are not allowed to delete the group", 403));
    }

    //yadi chat group chat nhi h, personal chat h aur hum us chat k member nhi h toh hum us chat ko delete nhi kr skte
    if(!chat.groupChat && !chat.members.includes(req.user.toString())){
        return next(new ErrorHandler("You are not allowed to delete the chat", 403))
    }

    //here we have to delete all messages as well as attachments or files from cloudinary

    // jis chat ko hum delete krege uski jitni bhi attachments humne Message collection me save ki h hum un sabhi attachments ko find krege.
    const messageWithAttachments = await Message.find({
        chat: chatId,
        attachments: {
            $exists: true,
            $ne: [],
        } 
    })

    const public_ids = [];

    //hum 1 attachment me 5 files bhej skte h, isliye hum 1 chat me jitni bhi attachments h unhe traverse krege aur un attachments me jitni bhi files h unhe traverse krege aur un sab ki id ko public_ids naam ki array me store kr dege.
    messageWithAttachments.forEach(({attachments}) => attachments.forEach(({public_id})=>public_ids.push(public_id)));

    //public_ids array me jitni bhi id store hui h un sbhi id k data ko cloudinary se delete krdege aur Chat collection me se us chat ko delete krdege aur us chatId se related jitne bhi message Message collection me h unhe bhi delete krdege.
    await Promise.all([
        //Delete files from cloudinary
        deleteFilesFromCloudinary(public_ids),
        chat.deleteOne(),
        Message.deleteMany({chat: chatId}),
    ]);

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({
        success: true,
        message: "Chat Deleted successfully"
    })
})

const getMessages = TryCatch(async(req, res, next) => {
    //url me chat ki id lenge jiske message show krne h
    const chatId = req.params.id;

    //query me hum page no bheje ge ki kis page k messages dekhane h. By-default hum page no 1 pr honge.
    const { page = 1} = req.query;

    //1 page pr 20 message show honge.
    const resultPerPage = 20;
    //iski help se hum messages ko skip krege jab page ko change krege. Yadi hum 2nd page pr h toh (2-1)*20=20. phle 20 messages skip ho jaiye ge.
    const skip = (page-1)*resultPerPage;

    const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.members.includes(req.user.toString()))
    return next(
      new ErrorHandler("You are not allowed to access this chat", 403)
    );
    
    //hum message ko lean() ki help se database k object se  javascript ka object bna dege jis se hum message pr jo bhi operation kre us se database me koi asar nhi hoga.
    //chatId k basics pr Message collection me se sbhi messages ko find krege jinki ye id h. Un sbhi messages ko descending order me sort krege unki creation date k basics pr jisse jo message last me aaya h vo phle show hoga. Messages ko skip krege page k basics pr. Limit ko set krege. Jisne message bheja h uska name lege User collection me se.
    //totalMessagesCount me total no of messages lenge Message collection se
    const [messages, totalMessagesCount] = await Promise.all([
        Message.find({chat: chatId})
        .sort({createdAt: -1})
        .skip(skip)
        .limit(resultPerPage)
        .populate("sender", "name")
        .lean(),
        Message.countDocuments({chat: chatId}),
    ])

    //totalMessageCount K basis pr calculate krege ki total kitne page honge message ko show krne k liye. for ex=> totalMessageCount(21)/limit(20)=pages(2)
    const totalPages = Math.ceil(totalMessagesCount / resultPerPage) || 0;

    return res.status(200).json({
        success: true,
        messages: messages.reverse(),
        totalPages,
    })
})

export {newGroupChat, getMyChats, getMyGroups, addMembers, removeMember, leaveGroup, sendAttachments , getChatDetails, renameGroup, deleteChat, getMessages}