import { Meeting } from "../../Models/User/MeetingModel.js";
import { TourInfo } from "../../Models/User/TourInfo.js";
import { User } from "../../Models/User/userModel.js";
import { meetingStartNotificationEmail } from "../../services/CreateEmail.js";
import { sendEmail } from "../../services/EmailServices.js";
import {Avathons} from "../../Models/Avatar/Avathons.js";
const rooms = new Map();
const onlineUsers = new Map();


const AvathonsLive =(io)=>{
    

let item = {};
let reqdata = {};
let addtime = {};
io.on('connection', (socket) => {
  

    socket.on('userOnline', (userId) => {
  
    
              onlineUsers.set(userId, socket.id);
           
             
            });
       
       socket.on('uid',(data)=>{
        reqdata = data.userID;
        item=data.details;
        
       })
            

    socket.on('createa', async(roomId) => {
     

      if (rooms.has(roomId)) {
        socket.emit('error', 'Room already exists');
        return;
      }
  
   
      rooms.set(roomId, { broadcaster: socket.id, viewers: [] });
      socket.join(roomId);
      socket.emit('createda', roomId);
      socket.on("details",async(data)=>{
        console.log(data)
        try{
          let get = await Avathons.findOne({_id:data});
         if(get){
           get.roomId = roomId;
           await get.save();
         }else{
          console.log("not found")
         }

        }catch(err){
          
        }

      })

   
try{

  const receiverSocketId = onlineUsers.get(reqdata);

   if(receiverSocketId){
  
       io.to(receiverSocketId).emit('roomIdss',{roomId,item});

    
   }
   else{
    console.log("not working")
   }
  }catch(err){

   
  }

    
     
    });
// socket.on("offerIda",(data)=>{

// const{item,generatedRoomId}=data;
// const receiverSocketId = onlineUsers.get(item?.userId);
// if(receiverSocketId){
//     io.to(receiverSocketId).emit('roomIds',{generatedRoomId});
  
// }
// else{
   
// }
  
// })
  
    // Join room
    socket.on('joina', (roomId) => {
     

      if (!rooms.has(roomId)) {
        socket.emit('error', 'Room does not exist');
        return;
      }
      const room = rooms.get(roomId);
      if (!room.broadcaster) {
        socket.emit('error', 'No broadcaster in the room');
        return;
      }
      socket.join(roomId);
      room.viewers.push(socket.id);
      const total = room.viewers.length;

      socket.to(room.broadcaster).emit('viewera', socket.id);
      socket.to(room.broadcaster).emit('totala',total);
      socket.emit('joineda', roomId);
    
    });

    socket.on('lefta', (roomId) => {
      if (!rooms.has(roomId)) {
        socket.emit('error', 'Room does not exist');
        return;
      }
      const room = rooms.get(roomId);
      if (!room.broadcaster) {
        socket.emit('error', 'No broadcaster in the room');
        return;
      }
      socket.leave(roomId);
      room.viewers = room.viewers.filter(viewerId => viewerId !== socket.id);
      const total = room.viewers.length;
      socket.emit("totala",total);
      socket.to(room.broadcaster).emit('totala',total);
  });
  
    // Handle offer
    socket.on('offera', (offer, roomId, viewerId) => {
      socket.to(viewerId).emit('offera', offer, socket.id);
    });
  
    // Handle answer
    socket.on('answera', (answer, roomId, broadcasterId) => {
      socket.to(broadcasterId).emit('answera', answer, socket.id);
    });
  
    // Handle ICE candidate
    socket.on('ice-candidatea', (candidate, roomId, recipientId) => {
      socket.to(recipientId).emit('ice-candidatea', candidate, socket.id);
    });
  
    // Stop stream
    socket.on('stopa', (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.broadcaster === socket.id) {
        io.to(roomId).emit('stopa');
        rooms.delete(roomId);
      } else {
        socket.emit('error', 'Only the broadcaster can stop the stream');
      }
    });
  
    // Exit room
    socket.on('exita', (roomId) => {
      if (!rooms.has(roomId)) {
        socket.emit('error', 'Room does not exist');
        return;
      }
      const room = rooms.get(roomId);
      if (room.broadcaster === socket.id) {
        io.to(roomId).emit('broadcaster-lefta');
        rooms.delete(roomId);
      } else {
        const index = room.viewers.indexOf(socket.id);
        if (index > -1) {
          room.viewers.splice(index, 1);
        }
        socket.leave(roomId);
        socket.to(roomId).emit('viewer-lefta', socket.id);
      }
    });
    socket.on('send-messagea', ({ roomId, viewerId, message,user }) => {
        const room = rooms.get(roomId);
        if (room) {
            io.to(roomId).emit('new-messagea', { viewerId, message,user });
        } else {
            socket.emit('error', { message: 'Room not found' });
        }
    });

  
    // Handle disconnection
    socket.on('disconnect', () => {
      rooms.forEach((room, roomId) => {
        if (room.broadcaster === socket.id) {
          io.to(roomId).emit('broadcaster-lefta');
          rooms.delete(roomId);
        } else {
          const index = room.viewers.indexOf(socket.id);
          if (index > -1) {
            room.viewers.splice(index, 1);
          }
          if (room.viewers.length === 0 && room.broadcaster === null) {
            rooms.delete(roomId); // Remove room if empty
          } else {
            socket.to(roomId).emit('viewer-lefta', socket.id);
          }
        }
      });
   
    });
  });

}

export default AvathonsLive;
