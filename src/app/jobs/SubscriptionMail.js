import { format } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Mail from '../../lib/Mail';

class SubscriptionMail {
  get key() {
    return 'SubscriptionMail';
  }

  async handle({ data }) {
    const { registered } = data;

    await Mail.sendMail({
      to: `${registered.organizer} <${registered.organizer_mail}>`,
      subject: `Inscrição de ${registered.user} no meetup ${registered.meetup}`,
      template: 'register',
      context: {
        organizer: registered.organizer,
        user: registered.user,
        title: registered.meetup,
        date: registered.meetup_date,
      },
    });
  }
}

export default new SubscriptionMail();
