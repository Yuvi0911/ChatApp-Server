import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { addMembers, deleteChat, getChatDetails, getMessages, getMyChats, getMyGroups, leaveGroup, newGroupChat, removeMember, renameGroup, sendAttachments } from "../controllers/chat.js";
import { multerUpload } from "../middlewares/multer.js";
import { addMemberValidator, chatIdValidator, newGroupValidator, removeMemberValidator, renameValidator, sendAttachmentsValidator, validateHandler } from "../lib/validators.js";

const app = express.Router();

app.use(isAuthenticated);

app.post("/new", newGroupValidator(), validateHandler, newGroupChat);

app.get("/my", getMyChats);

app.get("/my/groups", getMyGroups);

app.put("/addmembers", addMemberValidator(), validateHandler, addMembers);

app.put("/removemember", removeMemberValidator(), validateHandler, removeMember);

app.delete("/leave/:id", chatIdValidator(), validateHandler, leaveGroup);

//send attachment => jab hume thunderclient/postman me files(image, attachment etc) ki form me data dena hota h toh hum simple json data dene ki jagah form data dete h. 
//Hum maximum 5 files ki array ko bhej skte h ek time pr.
app.post("/message", multerUpload.array("files", 5), sendAttachmentsValidator(), validateHandler, sendAttachments);

app.get("/message/:id", chatIdValidator(), validateHandler, getMessages);

//Get chat detailes, rename, delete
//route ki help se hum chaining kr skte h yadi route ya url ek hi aur api k method aur request alag alag h. Jaise ki humare paas route ek hi h "/chat/:id" lekin reuest alag alag h get, put, delete aur method bhi alag alag h.
//dynamic vale url ko hum sabse niche rhakte h kyoki yadi hum ishe uppar rhk dege toh /new, /my ,etc type k routes kbhi execute hi nhi honge kyoki /:id vala route new, my , etc word ko dynamic id maan lege. lekin jab hum ishe niche rkhte h toh phle uppar vale route me compiler check krega ki new, my, etc h ya nhi yadi ushe uppar vale routes me ye word mil jaye ge toh compiler un me likhe gye method ko execute krdega aur yadi nhi milta wo word upar toh us word ko id maan lega aur ye niche vala route me likhe gye method ko execute krdega api ki request k basics pr. 
app.route("/:id")
.get( chatIdValidator(), validateHandler, getChatDetails)
.put(renameValidator(), validateHandler, renameGroup)
.delete(chatIdValidator(), validateHandler, deleteChat);

export default app;

