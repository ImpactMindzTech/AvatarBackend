import mongoose from "mongoose";
export const connect =async()=>{
try{
    await  mongoose.connect(`${process.env.MongoUrl}`)
    // await  mongoose.connect("mongodb://localhost:27017/sanjutest");
    console.log("successfully connected");

}
catch(error){
    console.log(error);
    
   
}
}
connect();