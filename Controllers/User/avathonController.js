import { Avathons } from "../../Models/Avatar/Avathons.js";
import { avathonBook } from "../../Models/Avatar/bookingAvathons.js";
import { User } from "../../Models/User/userModel.js";

export const allAvathons = async(req,res)=>{
    try{
        let avathons = await Avathons.find({avatarApproved:true,status:0,deleteAvathons:0});
        if(avathons.length>0){
            return res.status(200).json({message:"Successfully fetched",isSuccess:true,data:avathons})
        }else{
            return res.status(200).json({message:"No Avathons found",isSuccess:false,data:{}})
        }

    }catch(err){

        return res.status(404).json({message:err.message,isSuccess:false})
    }
}


//book avathons

export const bookavathons = async(req,res)=>{
    const {id} = req.params;
    const{_id} = req.user;
    try{
        let bookingavathons = await Avathons.findOne({_id:id});
         
     





         let username = await User.findOne({_id:_id});
         const user = username.userName;

         if(bookingavathons){
        
           let newbooking = new avathonBook({
            userId:_id,
            avathonId:bookingavathons._id,
            userName:user,
            avatrId:bookingavathons.avatarId,
            avatarName:bookingavathons.avatarName,
            avathonTime:bookingavathons.avathonTime,
            avathonDate:bookingavathons.avathonDate,
            avathonPrice:bookingavathons.avathonPrice,
            EarlybirdPrice:bookingavathons.EarlybirdPrice,
            avathonStatus:'Booked'
           


           })

         
           let updatemembers = bookingavathons?.joinedMembers;
   
           let totalmembers = bookingavathons?.Availablespots;
           if(updatemembers>=totalmembers){
            return res.status(404).json({message:"Booking slots are not available"})
           } 
           else{
            await newbooking.save();
            bookingavathons.joinedMembers = (bookingavathons.joinedMembers || 0) + 1;
            await bookingavathons.save();
            return res.status(200).json({message:"Avathons booked successfully",isSuccess:true})
           }
          
           
           
          


         }
        
      
    }catch(err){
        console.log(err);
        return res.status(404).json({message:err.message,isSuccess:false})
    }
}

export const getavathonsdetails = async(req,res)=>{
    const{id} = req.params;
    console.log(id);

    try{

        let fetchdetails = await Avathons.findOne({_id:id});
        if(fetchdetails){

            return res.status(200).json({message:"Successfully fetched",isSuccess:true,data:fetchdetails});
        }else{
            return res.status(200).json({message:"No data found",isSuccess:false,data:{}})
        }

    }catch(err){
        return res.status(404).json({message:err.message,isSuccess:false})
    }
}



//get the bookavathons details
export const getbookavathons = async(req,res)=>{
    const {_id} = req.user;
    try{
       //find the bookedavathons
       let findavathons = await avathonBook.find({userId:_id});
       let avathonsid = findavathons.map((item)=>item.avathonId);
       let avathonsdetails = await Avathons.find({_id:{$in:avathonsid}})
 
       const result = findavathons.map((booking)=>{
        const avathonDetails = avathonsdetails.find((avathon)=>avathon._id.toString()===booking.avathonId.toString());
        return{
            userName:booking.userName,
            avatarName:booking.avatarName,
            avathonTime:booking.avathonTime,
            avathonDate:booking.avathonDate,
            avathonPrice:booking.avathonPrice,
            avathonTitle:avathonDetails.avathonTitle,
            avathonDescription:avathonDetails.avathonDescription,
            avathonHours:avathonDetails.avathonHours,
            totalspots:avathonDetails.Availablespots,
            EndEvent:avathonDetails.endEvent,
            Thumbnail:avathonDetails.avathonsThumbnail,
            Images:avathonDetails.avathonsImage,
            joinMembers:avathonDetails.joinedMembers,
            Discount:avathonDetails.EarlybirdPrice,
            status:booking.avathonStatus,
            Eighteenplus:avathonDetails.Eighteenplus,
            aboutStream:avathonDetails.aboutStream

            
        }
       })
       return res.status(200).json({message:"successfully fetched",data:result,isSuccess:true})
    
    }catch(err){
        return res.status(404).json({message:err.message,isSuccess:false})
    }
}

export const startstream = async(req,res)=>{
 try{

 }catch(err){
    return res.status(404).json({message:"error not found"})
 }
}




