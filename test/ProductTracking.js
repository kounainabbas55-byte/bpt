const {expect}=require("chai"),{ethers}=require("hardhat");
describe("ProductTracking",()=>{
  let c,a,m,d,r,x;
  beforeEach(async()=>{[a,m,d,r,x]=await ethers.getSigners();c=await (await ethers.getContractFactory("ProductTracking")).deploy();
    await c.grantRole(m.address,1);await c.grantRole(d.address,2);await c.grantRole(r.address,3);
    await c.connect(m).registerProduct("P1","Phone","Electronics","B1","India",1700000000);});
  it("registers and verifies",async()=>{const v=await c.verifyProduct("P1");expect(v.registered).to.equal(true);
    expect((await c.verifyProduct("NOPE")).registered).to.equal(false);});
  it("rejects unauthorized registration",async()=>{await expect(c.connect(x).registerProduct("P2","a","b","c","d",1)).to.be.revertedWith("Only manufacturer");});
  it("rejects duplicate IDs",async()=>{await expect(c.connect(m).registerProduct("P1","a","b","c","d",1)).to.be.revertedWith("Product ID already exists");});
  it("only admin grants roles",async()=>{await expect(c.connect(x).grantRole(x.address,1)).to.be.revertedWith("Only admin");});
  it("full journey appends history",async()=>{
    await c.connect(m).transferProduct("P1",d.address,"Factory","");
    await expect(c.connect(x).updateProductStatus("P1","Hacked","?","")).to.be.revertedWith("Not current owner");
    await c.connect(d).updateProductStatus("P1","Received by Distributor","Delhi","");
    await c.connect(d).transferProduct("P1",r.address,"Delhi","");
    await c.connect(r).updateProductStatus("P1","Delivered to Retailer","Mumbai","");
    expect((await c.getProductHistory("P1")).length).to.equal(5);
    expect((await c.getProductDetails("P1")).status).to.equal("Delivered to Retailer");});
  it("blocks invalid transfer path",async()=>{await expect(c.connect(m).transferProduct("P1",r.address,"x","")).to.be.revertedWith("Invalid transfer path");});
});
