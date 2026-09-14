import {mkdirSync,readFileSync,writeFileSync,existsSync,chmodSync,renameSync} from "node:fs";
import {randomBytes} from "node:crypto";
import path from "node:path";

// Only this allowlist enters the WASI filesystem. Never copy the process environment wholesale.
const depot=process.env.TRAILDEPOT_PATH || "/app/traildepot";
const root=path.join(depot,"runtime");
const secretsDir=path.join(depot,"secrets");
mkdirSync(root,{recursive:true,mode:0o700});mkdirSync(secretsDir,{recursive:true,mode:0o700});
const keysFile=path.join(secretsDir,"miniapp-keys.json");
const enabled=process.env.AIT_ENABLED==="true";
const keys=existsSync(keysFile)?JSON.parse(readFileSync(keysFile,"utf8")):{};
if(enabled){
  for(const key of ["AIT_IDENTITY_HMAC_SECRET","AIT_IDENTITY_ENCRYPTION_KEY","TRAILBASE_AUTH_PASSWORD_SECRET"]){
    keys[key]=process.env[key]||keys[key]||randomBytes(32).toString("base64");
  }
  atomicWrite(keysFile,keys);
}
const defaults={AIT_ENABLED:"false",AIT_LOCAL_PREVIEW:"false",AIT_ALLOW_DEV_IDENTITY:"false",AIT_TEST_ADS:"false",AIT_BOTS_ENABLED:"true",AIT_BOT_INTERVAL_MS:"30000",AIT_BOT_MAX_ACTIVE_USERS:"10",AIT_NOTIFICATIONS_ENABLED:"false",AIT_PROMOTIONS_ENABLED:"false",TRAILBASE_AUTH_BASE_URL:"http://127.0.0.1:4000"};
const names=[...Object.keys(defaults),"AIT_IDENTITY_HMAC_SECRET","AIT_IDENTITY_ENCRYPTION_KEY","TRAILBASE_AUTH_PASSWORD_SECRET","TRAILBASE_AUTH_PASSWORD_SECRET_PREVIOUS","MTLS_PROXY_URL","MTLS_PROXY_TOKEN","AIT_RESULT_TEMPLATE_CODE","AIT_BANNER_GROUP_ID","AIT_BANNER_CARD_GROUP_ID","AIT_BANNER_INLINE_GROUP_ID","AIT_FEED_INLINE_GROUP_IDS"];
const settings=Object.fromEntries(names.map(key=>[key,process.env[key]||keys[key]||defaults[key]||""]));
const file=path.join(root,"settings.json");
atomicWrite(file,settings);
function atomicWrite(file,value){
  const temp=`${file}.${randomBytes(8).toString("hex")}.tmp`;
  writeFileSync(temp,JSON.stringify(value),{mode:0o600,flag:"wx",flush:true});
  renameSync(temp,file);chmodSync(file,0o600);
}
