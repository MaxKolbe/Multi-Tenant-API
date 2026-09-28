// For development and admin monitoring, Bull Board gives a web UI that shows all queues, their jobs, status, progress, and failures. 
import { createBullBoard } from '@bull-board/api'; 
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'; 
import { ExpressAdapter } from '@bull-board/express'; 
import { featureQueue } from '../queues/feature.queue.js'; 

const serverAdapter = new ExpressAdapter(); 
serverAdapter.setBasePath('/api/v1/admin/queues'); 
 
createBullBoard({ 
  queues: [ 
    new BullMQAdapter(featureQueue),
  ], 
  serverAdapter, 
}); 
 
export { serverAdapter as bullBoardAdapter };