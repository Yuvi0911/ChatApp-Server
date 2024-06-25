import express from "express";
import { adminLogin, adminLogout, allChats, allMessages, allUsers, getAdminData, getDashboardStats } from "../controllers/admin.js";
import { adminLoginValidator, validateHandler } from "../lib/validators.js";
import { adminOnly } from "../middlewares/auth.js";

const app = express.Router();


app.post("/verify", adminLoginValidator(), validateHandler, adminLogin);

app.get("/logout", adminLogout);


app.use(adminOnly);
//Only admin can access these below routes
//adminOnly middleware har ek route me sbse phle lag jaiye ga jo bhi iske niche likhe gye h un me.

app.get("/", getAdminData);

app.get("/users", allUsers);

app.get("/chats", allChats);

app.get("/messages", allMessages);

app.get("/stats", getDashboardStats);

export default app;