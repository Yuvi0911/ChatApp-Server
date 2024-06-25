import mongoose,{ Schema, model } from "mongoose";
import {hash} from 'bcrypt'

const schema = new Schema({
    name:{
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    bio: {
        type: String,
        required: true,
    },
    avatar:{
        public_id:{
            type: String,
            required: true,
        },
        url:{
            type: String,
            required: true,
        }
    }
},
{
    timestamps:true,
})



//hum arrow function me this keyword use nhi kr skte h isliye hum normal function lege.
//new user jab bhi register krega toh uska password database me save hone se phle hum ushe bcrypt package ki help se hash krdege. 
//niche likhe gye code ka matlab h ki data ko database me save krne se phle is function() ko execute krdo.
schema.pre("save", async function(next){

    //yadi kisi user ne password ko update nhi kiya toh hum return krdege next callback function pr.
    if(!this.isModified("password")) return  next();

    //yadi password field update hoti h toh hi hume password ko dobara hash krna h.
    this.password = await hash(this.password, 10);
})

export const User = mongoose.models.User || model("User", schema)