require("dotenv").config();
const express=require("express"),cors=require("cors"),mongoose=require("mongoose"),bcrypt=require("bcryptjs"),
  jwt=require("jsonwebtoken"),rateLimit=require("express-rate-limit"),User=require("./User");
const app=express();
app.use(cors({origin:process.env.CLIENT_ORIGIN})); app.use(express.json({limit:"50kb"}));
app.use("/api/auth",rateLimit({windowMs:60000,max:30}));
const WALLET=/^0x[0-9a-fA-F]{40}$/, EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sign=u=>jwt.sign({id:u._id,role:u.role},process.env.JWT_SECRET,{expiresIn:"8h"});
const pub=u=>({id:u._id,name:u.name,email:u.email,role:u.role,wallet:u.wallet,status:u.status,approvalTx:u.approvalTx});
const auth=(...roles)=>async(req,res,next)=>{
  try{const t=(req.headers.authorization||"").replace("Bearer ","");const p=jwt.verify(t,process.env.JWT_SECRET);
    req.user=await User.findById(p.id);
    if(!req.user||req.user.status!=="approved")return res.status(403).json({error:"Account not approved"});
    if(roles.length&&!roles.includes(req.user.role))return res.status(403).json({error:"Forbidden for your role"});
    next();}catch{res.status(401).json({error:"Please log in"});}};
const wrap=f=>(q,s)=>f(q,s).catch(e=>s.status(e.code===11000?409:500).json({error:e.code===11000?"Email or wallet already registered":"Server error"}));

app.post("/api/auth/register",wrap(async(req,res)=>{
  const {name,email,password,role,wallet}=req.body||{};
  if(!name||name.length>80)return res.status(400).json({error:"Name is required"});
  if(!EMAIL.test(email||""))return res.status(400).json({error:"Valid email required"});
  if(!password||password.length<8)return res.status(400).json({error:"Password needs 8+ characters"});
  if(!["manufacturer","distributor","retailer"].includes(role))return res.status(400).json({error:"Invalid role"});
  if(!WALLET.test(wallet||""))return res.status(400).json({error:"Valid wallet address required"});
  const u=await User.create({name,email,role,wallet,password:await bcrypt.hash(password,12)});
  res.status(201).json({message:"Registered. Wait for admin approval.",user:pub(u)});}));
app.post("/api/auth/login",wrap(async(req,res)=>{
  const u=await User.findOne({email:String(req.body?.email||"").toLowerCase()});
  if(!u||!(await bcrypt.compare(String(req.body?.password||""),u.password)))return res.status(401).json({error:"Invalid email or password"});
  if(u.status!=="approved")return res.status(403).json({error:`Account is ${u.status}. Admin approval required.`});
  res.json({token:sign(u),user:pub(u)});}));
app.get("/api/me",auth(),(req,res)=>res.json(pub(req.user)));
app.get("/api/directory/:role",auth(),wrap(async(req,res)=>{
  const us=await User.find({role:req.params.role,status:"approved"});res.json(us.map(u=>({name:u.name,wallet:u.wallet})));}));
app.get("/api/admin/users",auth("admin"),wrap(async(_q,res)=>res.json((await User.find().sort("-createdAt")).map(pub))));
app.get("/api/admin/stats",auth("admin"),wrap(async(_q,res)=>{
  const c=async(role,status)=>User.countDocuments({role,...(status&&{status})});
  res.json({manufacturers:await c("manufacturer","approved"),distributors:await c("distributor","approved"),
    retailers:await c("retailer","approved"),pending:await User.countDocuments({status:"pending"})});}));
app.patch("/api/admin/users/:id",auth("admin"),wrap(async(req,res)=>{
  const {status,txHash}=req.body||{};
  if(!["approved","rejected"].includes(status))return res.status(400).json({error:"Invalid status"});
  if(status==="approved"&&!/^0x[0-9a-fA-F]{64}$/.test(txHash||""))return res.status(400).json({error:"Approve on-chain first (grantRole tx hash required)"});
  const u=await User.findByIdAndUpdate(req.params.id,{status,approvalTx:txHash},{new:true});res.json(pub(u));}));

mongoose.connect(process.env.MONGO_URI).then(()=>app.listen(process.env.PORT||5000,()=>console.log("API on :"+(process.env.PORT||5000))))
  .catch(e=>{console.error("MongoDB connection failed:",e.message);process.exit(1);});
