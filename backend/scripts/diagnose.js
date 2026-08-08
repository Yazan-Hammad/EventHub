require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    console.log('CONNECTED OK');
    await client.db().command({ ping: 1 });
    console.log('PING OK');
  } catch (err) {
    console.log('TOP LEVEL ERROR:', err.message);
    const servers = err?.cause?.servers || err?.reason?.servers;
    if (servers) {
      for (const [host, desc] of servers) {
        console.log('---', host, '---');
        console.log('type:', desc.type);
        console.log('error:', desc.error ? desc.error.message : null);
        if (desc.error && desc.error.cause) console.log('error.cause:', desc.error.cause.message);
      }
    }
  } finally {
    await client.close();
  }
}

main();
