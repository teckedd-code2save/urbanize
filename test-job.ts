import { dataFetchQueue } from './src/lib/queue';

async function main() {
    console.log('Adding test job to queue...');
    const job = await dataFetchQueue.add('test-job', {
        message: 'Hello from test script!'
    });
    console.log(`Job added with ID: ${job.id}`);
    process.exit(0);
}

main().catch(console.error);
