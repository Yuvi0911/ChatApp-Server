//yadi hume different type/format ka data lene hota h user se jaise ki text, image ya kisi bhi type ki file toh hum ushe directly json format me nhi le skte, hume ushe form format me lena hoga aur us form format k data ko access krne k liye hume multer middleware ki jrurt pdti h. Iski help se hum us file ko local storage/RAM (jo ki by default hoti h) ya fir disk storage me store krva skte h.

import multer from "multer";
// import {v4 as uuid} from 'uuid'

// const storage = multer.diskStorage({
//     destination(req, file, callback){
//         callback(null, "uploads");
//     },

//     filename(req, file, callback){
//         const id = uuid();

//         const extName = file.originalname.split(".").pop();

//         const fileName = `${id}.${extName}`;

//         callback(null, fileName);

//     }
    
// })


//hum ram me store krege image ko (jo ki by default ram me store hoti h) aur fir cloudinary me upload kr dege us image ko aur us image ko ram se delete kr dege isliye hume diskstorage setup krne ki jrurt nhi h, hum chahe toh disk me bhi store kr skte h

const multerUpload = multer({
    limits:{
        // file ka size 10mb ho skta h
        fileSize: 1024 * 1024 * 10,
}});
export {multerUpload};

//is middlerware ko hum us route me use krege jha hume file form me se leni h. 