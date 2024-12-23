import mongoose from "mongoose";
export const connect =async()=>{
try{
    await  mongoose.connect(`mongodb://localhost:27017/sanjutest`)
    // await  mongoose.connect("mongodb+srv://avatar:avatar@mycluster.vq0yt.mongodb.net/AvatarWalk");
    console.log("successfully connected");

}
catch(error){
    console.log(error);
    
   
}
}
connect();