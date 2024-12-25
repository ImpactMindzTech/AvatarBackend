
import Stripe from "stripe";
import paypal from "paypal-rest-sdk";
import { Account } from "../../Models/User/Account.js";
import { Admin } from "../../Models/Admin/AdminModel.js";
import { Avathons } from "../../Models/Avatar/Avathons.js";
import { avathonBook } from "../../Models/Avatar/bookingAvathons.js";
import { User } from "../../Models/User/userModel.js";
import pay from "@paypal/checkout-server-sdk"
import { avathonPayment } from "../../Models/User/AvathonPayment.js";
import { Available } from "../../Models/Avatar/Availaibilitymodel.js";

paypal.configure({
  "mode": "sandbox", //sandbox or live
  "client_id":process.env.PAYPAL_CLIENT_ID,
  "client_secret":process.env.PAYPAL_SECRET_ID,


});


const environment = new pay.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_SECRET_ID
);
const paypalClient = new pay.core.PayPalHttpClient(environment);


const stripeClient = new Stripe(process.env.STRIPE_Client); // Initialize Stripe with your secret key


export const avathoncheckout = async (req, res) => {

  try {
    const { avathonId, avatarId, price, Adminfee,product, paymentType } = req.body;
  
    const { _id } = req.user;
    // const findbooking = await Avathons.findOne({ _id: bookingId });
    const prices = price-Adminfee;


    const parsedPrice = parseFloat(price);

    // Construct the line item for Stripe checkout session
    const lineItem = {
      price_data: {
        currency: "usd",
        product_data: {
          name: product,
        },
        unit_amount: Math.round(parsedPrice * 100), // Stripe requires amounts in cents
      },
      quantity: 1,
    };

    // Create Stripe checkout session
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [lineItem],
      mode: "payment",
      success_url: `${process.env.WEBSITE_URL}/user/paymentsuccess`,
      cancel_url: `${process.env.WEBSITE_URL}/user/paymentfailed`,
    });


    // Create a new payment record in the database
    let date = new Date();
    const payment = new avathonPayment({
      userId: _id,
      avatarId,
      avathonId,
      price: prices,
      adminFee: Adminfee,
      totalprice:parsedPrice,
      SessionId: session.id,
      currency: "usd",
      status: "Pending",
      paymentType: paymentType,
    });

    // findbooking.PaymentintendId = session.id;

    // await findbooking.save();

    let doc = await payment.save();

    let  existingType = await Account.findOne({to:avatarId,Method:"stripe"});
    if(existingType){

    }
    else{
      
        const newAddmethod = new Account({
          from: _id,
          to:avatarId,
          Method:"stripe"
        })
        await newAddmethod.save();
      
    }
    // Send response back with session ID
    return res.status(200).json({ id: session.id, isSuccess: true });
  } catch (err) {
    console.error("Error during checkout:", err);
    return res.status(500).json({ message: err.message, isSuccess: false });
  }
};




export const avathonPaypalcheckout = async (req, res) => {

  try {
    const { avathonId, avatarId, price, Adminfee,product, paymentType } = req.body;
    const { _id } = req.user;

    const prices = price-Adminfee;


    const parsedPrice = parseFloat(price);


    const letdetails = await User.findOne({ _id });
    if (!letdetails) {
      return res.status(404).json({ message: "User not found", isSuccess: false });
    }

    const Name = letdetails.userName;
    const email = letdetails.email;
    const [firstName, lastName] = Name.split(" ");

    const create_payment_json = {
      "intent": "sale",
      "payer": {
        "payment_method": "paypal",
        "payer_info": {
          "first_name": firstName || "",
          "last_name": lastName || "",
          "email": `${email}`,
        },
      },
      "redirect_urls": {
        // "return_url": `${process.env.BACKEND_URL}/success`,
        "return_url": `${process.env.BACKEND_URL}/avathonSuccess`,
        "cancel_url": `${process.env.WEBSITE_URL}/user/paymentfailed`,
      },
      "transactions": [
        {
          "item_list": {
            "items": [
              {
                "name": `${product}`,
                "sku": "item",
                "price": parsedPrice, // Price in USD (no conversion needed here)
                "currency": "USD",
                "quantity": 1,
              },
            ],
          },
          "amount": {
            "currency": "USD",
            "total": parsedPrice, // Must match the sum of the items
          },
          description: "This is the payment description.",
        },
      ],
    };

    await paypal.payment.create(create_payment_json, async (error, payment) => {

      if (error) {
        console.error("PayPal API error:", error);
        return res.status(400).json({ message: error.message, isSuccess: false });
      } else {
        const paymentRecord = new avathonPayment({
          userId: _id,
          avathonId,
          avatarId,
          price:prices,
          totalprice: parsedPrice,

          adminFee: Adminfee,
          paymentIntentId: payment.id,
          currency: "USD",
          status: "Pending",
          paymentType: paymentType,
        });

        await paymentRecord.save();
      

        let  existingType = await Account.findOne({to:avatarId,Method:"paypal"});
        if(existingType){
    
        }
        else{
          
            const newAddmethod = new Account({
              from: _id,
              to:avatarId,
              Method:"paypal"
            })
            await newAddmethod.save();
          
        }
        const approvalUrl = payment.links.find((link) => link.rel === "approval_url");
        if (approvalUrl) {
          return res.status(200).json({ url: approvalUrl.href, isSuccess: true });
        } else {
          return res.status(500).json({ message: "Approval URL not found", isSuccess: false });
        }
      }
    });
  } catch (err) {
    console.error("Error during PayPal checkout:", err);
    return res.status(500).json({ message: err.message, isSuccess: false });
  }
};


export const avathonPaymentsuccess = async (req, res) => {
  try {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    // Find the payment using the payment ID
    const findpayment = await avathonPayment.findOne({ paymentIntentId: paymentId });
    if (!findpayment) {
      return res.status(404).send("Payment not found.");
    }

    // Extract the original amount from the payment record
    const totalAmount = findpayment.totalprice; // Use the dynamic total from the payment record

    // Express checkout object, including amount details
    const express_checkout_json = {
      "payer_id": payerId,
      "transactions": [
        {
          "amount": {
            "currency": "USD",
            "total": totalAmount, // Use the correct total amount
          },
          description: "This is the payment description",
        },
      ],
    };

    // Execute the payment with PayPal
    paypal.payment.execute(paymentId, express_checkout_json, async function (error, payment) {


 const captureId = payment.transactions[0].related_resources[0].sale.id;

      if (error) {
        console.log("PayPal payment execution error:", error.response);
        return res.redirect(`${process.env.WEBSITE_URL}/user/paymentfailed`);
        if (error.response && error.response.details) {
          console.log("Validation Error Details:", error.response.details);
        }
        return res.status(400).send("Payment execution failed.");
      } else {
        const response = JSON.stringify(payment);
        const parseresponse = JSON.parse(response);

        // Update the payment status in the database
        let updateaccount = await avathonPayment.findOne({ paymentIntentId: paymentId });
        if (updateaccount) {
          updateaccount.status ="Succeeded";
          updateaccount.payerId = payerId;
          updateaccount.captureId=captureId;
          await updateaccount.save();

           let updatethisone = await Avathons.findOne({_id:updateaccount.avathonId});
        if(updatethisone){
          updatethisone.joinedMembers = (updatethisone.joinedMembers || 0) + 1;
          await updatethisone.save();
        }
      


        }


        


        return res.redirect(`${process.env.WEBSITE_URL}/user/paymentsuccess`);
      }
    });
  } catch (err) {
    console.log("Error in paymentsuccess function:", err);
    res.status(500).send("Internal Server Error");
  }
};




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
            return res.status(200).json({message:"Booking slots are not available",isSuccess:false})
           } 
           else{
            await newbooking.save();
          
       
            return res.status(200).json({message:"Avathons booked successfully",isSuccess:true})
           }
          
           
           
          


         }
        
      
    }catch(err){
        console.log(err);
        return res.status(404).json({message:err.message,isSuccess:false})
    }
}

// export const getavathonsdetails = async(req,res)=>{
//     const{id} = req.params;
//     console.log(id);

//     try{

//         let fetchdetails = await Avathons.findOne({_id:id});
//         const adminCommission = await Admin.find();
//                 const commission = adminCommission[0]?.commission || 0; // Fallback to 0 if commission is unavailable
//                 console.log(commission, "commission");
//         if(fetchdetails){
           
//             return res.status(200).json({message:"Successfully fetched",isSuccess:true,data:{fetchdetails,commission}});
//         }else{
//             return res.status(200).json({message:"No data found",isSuccess:false,data:{}})
//         }

//     }catch(err){
//         return res.status(404).json({message:err.message,isSuccess:false})
//     }
// }

export const getavathonsdetails = async (req, res) => {
    const { id } = req.params;
    console.log(id);

    try {
        // Fetch avathon details
        let fetchdetails = await Avathons.findOne({ _id: id });
        if (!fetchdetails) {
            return res
                .status(200)
                .json({ message: "No data found", isSuccess: false, data: {} });
        }

        // Get admin commission
        const adminCommission = await Admin.find();
        const commission = adminCommission[0]?.commission || 0; // Fallback to 0 if commission is unavailable
        const timezone  = await Available.findOne({avatarId:fetchdetails.avatarId});
        let avtTimezone = timezone?.timeZone;
        // Combine avathon details with commission
        const data = {
            ...fetchdetails.toObject(), // Convert Mongoose document to plain object
            commission,
            avtTimezone // Add commission
        };

        return res.status(200).json({
            message: "Successfully fetched",
            isSuccess: true,
            data: data,
        });
    } catch (err) {
        return res.status(404).json({ message: err.message, isSuccess: false });
    }
};


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




