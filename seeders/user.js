//seeder file me hum fake data generate krne vali files ko rhkte h. 
//Monogodb me Fake data generate krne k liye hum faker package ko use krege.
//is file me hum fake users ko generate krege.

import { faker } from "@faker-js/faker";
import { User } from "../models/user.js";

const createUser = async (numUsers) =>{
    try{
        const usersPromise = [];

        for(let i = 0; i< numUsers; i++){
           const tempUser = User.create({
            name: faker.person.fullName(),
            username: faker.internet.userName(),
            bio: faker.lorem.sentence(10),
            password: "password",
            avatar:{
                url: faker.image.avatar(),
                public_id: faker.system.fileName(),
            }
           });
           usersPromise.push(tempUser);
        }
        await Promise.all(usersPromise);
        console.log("Users Created ", numUsers);
        process.exit(1);
    }
    catch(error){
        console.log(error);
        process.exit(1);
    }
}


export { createUser };
