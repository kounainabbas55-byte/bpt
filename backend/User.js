const m=require("mongoose");
module.exports=m.model("User",new m.Schema({
  name:{type:String,required:true,trim:true,maxlength:80},
  email:{type:String,required:true,unique:true,lowercase:true},
  password:{type:String,required:true},
  role:{type:String,enum:["admin","manufacturer","distributor","retailer"],required:true},
  wallet:{type:String,required:true,unique:true,lowercase:true},
  status:{type:String,enum:["pending","approved","rejected"],default:"pending"},
  approvalTx:String // tx hash of on-chain grantRole (blockchain-confirmed)
},{timestamps:true}));
