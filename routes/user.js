import express from "express";
import { acceptFriendRequest, getMyFriends, getMyNotifications, getMyProfile, login, logout, newUser, searchUser, sendFriendRequest } from "../controllers/user.js";
import { multerUpload } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { acceptRequestValidator, loginValidator, registerValidator, sendReuestValidator, validateHandler } from "../lib/validators.js";

const app = express.Router();

//registerValidator()=>ye array return krega jis array lo hum validateHandler me pass krege isliye hum ishe function ki trh likh rhe h. ye function validate krega ki user ne jo input di h vo shi h ya nhi
//validateHandler => ye error ko handle krega. Yadi user shi data nhi deta input me toh jo error aaye ga ushe ye handle krega. Ishe hum har jagah use krege jha bhi hum validator function use krege kyoki ye hi error ko handle krega
app.post("/new", multerUpload.single("avatar"), registerValidator(), validateHandler, newUser);
app.post("/login", loginValidator(), validateHandler, login);

//in below routes, user must be logged-in to access these routes => jin routes ko access krne se phle hum chahte h user login ho toh hum is middleware ko use krdege un routes se phle

//ye route niche likhe gye sbhi route me sab se phle access/execute hoga pr vo route execute hoga jiski request ki h
app.use(isAuthenticated);
//is upar vale route ko hum aise bhi likh skte h sbhi individual routes me jinme hume ishe use krna h.
// app.get("/me", isAuthenticated, getMyProfile);

app.get("/me", getMyProfile);

app.get("/logout", logout);

app.get("/search",searchUser);

app.put("/sendrequest", sendReuestValidator(), validateHandler, sendFriendRequest);

app.put("/acceptrequest", acceptRequestValidator(), validateHandler, acceptFriendRequest);

app.get("/notifications", getMyNotifications);

app.get("/friends", getMyFriends);

export default app;