require("dotenv").config();const m=require("mongoose"),b=require("bcryptjs"),User=require("./User");
(async()=>{await m.connect(process.env.MONGO_URI);
 await User.deleteOne({email:process.env.ADMIN_EMAIL});
 await User.create({name:"Administrator",email:process.env.ADMIN_EMAIL,password:await b.hash(process.env.ADMIN_PASSWORD,12),
  role:"admin",wallet:process.env.ADMIN_WALLET,status:"approved"});
 console.log("Admin ready:",process.env.ADMIN_EMAIL);process.exit(0);})();
