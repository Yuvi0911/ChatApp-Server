//is file me hum validator bnaye ge jiske basis pr user se input aayi h ushe check krege ki vo shi h ya. Jaise ki user ne sbhi field bhari h ya nhi, data shi diya h ya nhi etc.

import { body, param, validationResult } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";


const registerValidator = () => [
    body("name", "Please Enter Name").notEmpty(),
    body("username", "Please Enter Username").notEmpty(),
    body("password", "Please Enter Password").notEmpty(),
    body("bio", "Please Enter Bio").notEmpty(),
];

const loginValidator = () => [
    body("username", "Please Enter Username").notEmpty(),
    body("password", "Please Enter Password").notEmpty(),
];

const newGroupValidator = () => [
    body("name", "Please Enter Name").notEmpty(),
    body("members")
    .notEmpty().withMessage("Please enter Members")
    .isArray({min: 2, max: 100}).withMessage("Member must be between 2-100"),
];

const addMemberValidator = () => [
    body("chatId", "Please Enter Chat ID").notEmpty(),
    body("members")
    .notEmpty().withMessage("Please enter Members")
    .isArray({min: 1, max: 97}).withMessage("Member must be between 1-97"),
];

const removeMemberValidator = () => [
    body("chatId", "Please Enter Chat ID").notEmpty(),
    body("userId", "Please Enter User ID").notEmpty(),
];

// const leaveGroupValidator = () => [
//     param("id", "Please Enter Chat ID").notEmpty()
// ];

const sendAttachmentsValidator = () => [
    body("chatId", "Please Enter Chat ID").notEmpty(),
];

const chatIdValidator = () => [
    param("id", "Please Enter Chat ID").notEmpty()
];

const renameValidator = () => [
    param("id", "Please Enter Chat ID").notEmpty(),
    body("name", "Please Enter New Name").notEmpty(),
];

const sendReuestValidator = () => [
    body("userId", "Please enter User ID").notEmpty(),
]

const acceptRequestValidator = () => [
    body("requestId", "Please enter Request ID").notEmpty(),
    body("accept").
    notEmpty().withMessage("Please Add Accept")
    .isBoolean().withMessage("Accept must be boolean"),

]

const adminLoginValidator = () => [
    body("secretKey", "Please Enter Secret Key").notEmpty(),
]

//ye route errors ko handle krega, jo bhi error validator me se aaye ge
const validateHandler = (req, res, next) => {
    const errors = validationResult(req);

    const errorMessage = errors.array().map((error)=>error.msg).join(", ");

    console.log(errorMessage);

    // yadi koi error nhi aate toh agla route execute hoga
    if(errors.isEmpty()) return next();
    //yadi error aa jate h toh ErrorHandler middleware call ho jaiye ga aur jo agla route likha hua h us api me vo execute nhi hoga.
    else next(new ErrorHandler(errorMessage, 400))
};


export { acceptRequestValidator, addMemberValidator, adminLoginValidator, chatIdValidator, loginValidator, newGroupValidator, registerValidator, removeMemberValidator, renameValidator, sendAttachmentsValidator, sendReuestValidator, validateHandler };
