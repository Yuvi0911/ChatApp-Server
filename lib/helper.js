import { userSocketIds } from "../app.js";

export const getOtherMember = (members, userId) => 
    //{
    //is function ki help se hum members ki array me humare alava dusre users ko find krege.
    //ye function un members ko return krdega jinki id humari id k equal nhi hongi.
    //return
     members.find((member)=> member._id.toString() !== userId.toString());
//}

export const getSockets = (users=[]) => {
    const sockets = users.map((user) => userSocketIds.get(user.toString()));

    return sockets;
}

export const getBase64 = (file) => `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;