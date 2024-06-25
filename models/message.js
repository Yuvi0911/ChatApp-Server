//hum 1 collection ka reference dusri collection ko de skte h jaise ki niche humne sender field me User collection ka reference diya h aur chat field me Chat collection ka reference diya h. Humne sender k type me mongodb ki ID li h jiske basis pr hum User collection me us ID k equal jis data ki ID h us select kr skte h aur populate method ki help se hum us data me se koi bhi field select kr skte h.


import mongoose,{ Schema, Types, model } from "mongoose";

const schema = new Schema({
    content: String,
    attachments:[
        {
        public_id:{
            type: String,
            required: true,
        },
        url:{
            type: String,
            required: true,
        }
    },
],
   sender: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
   },
   chat: {
    type: Types.ObjectId,
    ref: "Chat",
    required: true,
   },
},
{
    timestamps:true,
})

export const Message = mongoose.models.Message || model("Message", schema)