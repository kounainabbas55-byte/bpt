// Creates SAMPLE products on the local chain. Accounts: #1 manufacturer, #2 distributor, #3 retailer.
const {ethers}=require("hardhat"),fs=require("fs");
async function main(){
  const {address}=JSON.parse(fs.readFileSync("frontend/src/contract.json"));
  const [admin,m,d,r]=await ethers.getSigners(), c=await ethers.getContractAt("ProductTracking",address,admin);
  for(const [s,role] of [[m,1],[d,2],[r,3]]) await (await c.grantRole(s.address,role)).wait();
  const T="[SAMPLE DATA] ", now=Math.floor(Date.now()/1000);
  const P=[["PROD001","Samsung Smartphone","Electronics","B-ELEC-01","ABC Electronics, Noida"],
           ["PROD002","Organic Honey","Food","B-FOOD-07","Green Valley Foods, Dehradun"],
           ["PROD003","Branded Shoes","Footwear","B-FOOT-12","XYZ Footwear, Agra"]];
  for(const p of P) await (await c.connect(m).registerProduct(...p,now-86400*10)).wait();
  const go=async(id,upto)=>{
    await (await c.connect(m).transferProduct(id,d.address,"Factory Gate",T+"Dispatched")).wait();
    await (await c.connect(d).updateProductStatus(id,"Received by Distributor","Delhi Warehouse",T+"Received")).wait();
    if(upto==="transit"){await (await c.connect(d).updateProductStatus(id,"In Transit","NH-44",T+"On the road")).wait();return;}
    await (await c.connect(d).transferProduct(id,r.address,"Delhi Warehouse",T+"Sent to retailer")).wait();
    await (await c.connect(r).updateProductStatus(id,upto==="delivered"?"Delivered":"Delivered to Retailer","Mumbai Store",T+"Received at store")).wait();
  };
  await go("PROD001","retailer"); await go("PROD002","transit"); await go("PROD003","delivered");
  console.log("Sample data created. Sample accounts: #1 manufacturer, #2 distributor, #3 retailer.");
}
main().catch(e=>{console.error(e);process.exit(1)});
