import Bee from 'bee-queue';
import SubscriptionMail from '../app/jobs/SubscriptionMail';
import redisConfig from '../config/redis';

const jobs = [SubscriptionMail];

class Queue {
  constructor() {
    this.queues = {};

    this.init();
  }

  // O método init() percorre nossos jobs e cria uma fila para cada item contendo
  // a chave do job e o seu método handle e iniciar o registro da fila no redis.

  init() {
    jobs.forEach(({ key, handle }) => {
      this.queues[key] = {
        bee: new Bee(key, {
          redis: redisConfig,
        }),
        handle,
      };
    });
  }

  // O método add() é responsável por criar o item dentro da fila no redis
  add(queue, job) {
    return this.queues[queue].bee.createJob(job).save();
  }

  // O método processQueue() percorre  todos os jobs
  // restagando a fila e o que tem de fazer em sua execução (método handle())
  processQueue() {
    jobs.forEach(job => {
      const { bee, handle } = this.queues[job.key];
      bee.on('failed', this.handleFailure).process(handle);
    });
  }

  handleFailure(job, err) {
    console.log(`Queue ${job.queue.nme}: Failed `, err);
  }
}

export default new Queue();
