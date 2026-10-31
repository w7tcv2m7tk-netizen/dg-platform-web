/** Internal disposable-test worker; never accepts a URL or remote destination. */
import {PrismaClient} from '@prisma/client';
import {createPostgresIdentityControl} from '../src/lib/runtime-identity-control.ts';
import {createIdentityInvocation} from '../src/lib/runtime-identity-invocation.ts';
import {inspectRuntimeIdentity} from '../src/lib/runtime-identity.ts';
import {validateRuntimeSession} from '../src/lib/runtime-identity-probe.ts';
const port=process.env.DG_CONTROL_TEST_PORT;
if(!/^\d+$/.test(port??'')||Number(port)===5432)throw Error('owned port required');
process.env.DATABASE_URL=`postgresql://dg_app_runtime@127.0.0.1:${port}/dg_synthetic_target?connection_limit=2&pool_timeout=1&connect_timeout=2`;
process.env.DG_COMMAND_CENTRE_ORG_IDS='operator';
const controlClient=new PrismaClient({datasourceUrl:`postgresql://dg_identity_executor@127.0.0.1:${port}/dg_identity_control_test?connection_limit=1&pool_timeout=1&connect_timeout=2`,log:[]});
const store=createPostgresIdentityControl(controlClient);
let prisma;
const binding={project:'prj_RzOMts2AdqpKtbAgZ72GLKs55AJ2',deployment:'dpl_'+'d'.repeat(24),revision:'a'.repeat(40),environment:'production'};
const actor=process.env.DG_TEST_ACTOR??'user_synthetic';
try{
 if(process.env.DG_CLAIM_ONLY==='1'){
  const {createHash,randomUUID}=await import('node:crypto');const g=await store.claim(createHash('sha256').update(process.env.DG_TEST_TOKEN).digest('hex'),actor,binding,randomUUID());console.log(JSON.stringify({claimed:!!g}));
 }else{
  let probed=false;
  const response=await createIdentityInvocation()(new Request('https://app.digitalgate.com.au/api/admin/runtime-database-identity',{method:'POST',headers:{Origin:'https://app.digitalgate.com.au','X-DG-Identity-Token':process.env.DG_TEST_TOKEN}}),{
   authenticate:async()=>actor,binding:()=>binding,store:()=>store,
   probe:async g=>{probed=true;({prisma}=await import('../packages/database/src/index.ts'));return inspectRuntimeIdentity({userId:async()=>actor,database:()=>prisma,revision:g.revision,validateSession:(tx,row)=>validateRuntimeSession(tx,row,g)});},
  });
  console.log(JSON.stringify({status:response.status,probed}));
 }
}catch{console.log(JSON.stringify({status:403,failed:true}));process.exitCode=1;}
finally{await controlClient.$disconnect();if(prisma)await prisma.$disconnect();}
