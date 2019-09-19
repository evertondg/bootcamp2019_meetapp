import { isBefore, format } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Subscription from '../models/SubscriptionMeetup';
import User from '../models/User';
import Meetup from '../models/Meetup';
import Notification from '../schemas/Notification';
// import Mail from '../../lib/Mail';

import SubscriptionMail from '../jobs/SubscriptionMail';
import Queue from '../../lib/Queue';

class SubscriptionController {
  async store(req, res) {
    const user = await User.findByPk(req.userId);
    const meetup = await Meetup.findByPk(req.params.meetupId, {
      include: [
        {
          model: User,
          attributes: ['name', 'email', 'id'],
        },
      ],
    });

    if (meetup.user_id === req.userId) {
      return res
        .status(400)
        .json({ error: 'You have sign meetups from other user ' });
    }

    if (isBefore(meetup.date, new Date())) {
      return res.status(400).json({ error: "You don't have sign old meetups" });
    }

    const data_available = await Subscription.findOne({
      where: {
        user_id: user.id,
      },
      include: [
        {
          model: Meetup,
          required: true,
          where: {
            date: meetup.date,
          },
        },
      ],
    });

    if (data_available) {
      return res.status(400).json({ error: 'You already sign this meetup' });
    }

    const subscription = await Subscription.create({
      user_id: user.id,
      meetup_id: meetup.id,
    });

    const formattedDate = format(
      meetup.date,
      "'dia' dd 'de' MMMM', às' H:mm'h'  ",
      {
        locale: pt,
      }
    );

    await Notification.create({
      content: `Novo Agendamento de ${user.name} em seu meetup ${formattedDate}`,
      user: meetup.user_id,
    });

    // await Mail.sendMail({
    //   to: `${meetup.User.name} <${meetup.User.email}>`,
    //   subject: `Inscrição de ${user.name} no meetup ${meetup.title}`,
    //   template: 'register',
    //   context: {
    //     organizer: meetup.User.name,
    //     user: user.name,
    //     title: meetup.title,
    //     date: formattedDate,
    //   },
    // });

    Queue.add(SubscriptionMail.key, {
      registered: {
        organizer: meetup.User.name,
        organizer_mail: meetup.User.email,
        meetup: meetup.title,
        meetup_date: formattedDate,
        user: user.name,
      },
    });

    return res.json({ subscription, meetup });
  }
}

export default new SubscriptionController();
