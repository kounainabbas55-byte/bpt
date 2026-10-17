const fs=require("fs"),hre=require("hardhat");
async function main(){
  const c=await (await hre.ethers.getContractFactory("ProductTracking")).deploy(); await c.waitForDeployment();
  const address=await c.getAddress(), art=await hre.artifacts.readArtifact("ProductTracking");
  fs.writeFileSync("frontend/src/contract.json",JSON.stringify({address,abi:art.abi},null,2));
  console.log("Deployed to",address,"- ABI written to frontend/src/contract.json");
}
main().catch(e=>{console.error(e);process.exit(1)});
