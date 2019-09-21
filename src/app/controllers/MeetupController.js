import { Op } from 'sequelize';
import * as Yup from 'yup';
import {
  startOfHour,
  isBefore,
  parseISO,
  subHours,
  startOfDay,
  endOfDay,
} from 'date-fns';
import Meetup from '../models/Meetup';
import User from '../models/User';

class MeetupController {
  async index(req, res) {
    const where = {};
    // where.user_id = req.userId;
    const { page = 1, date } = req.query;

    // [Op.between]: [6, 10]

    if (date) {
      const searchDate = parseISO(date);

      where.date = {
        [Op.between]: [startOfDay(searchDate), endOfDay(searchDate)],
      };
    } else {
      const searchDate = new Date();

      where.date = {
        [Op.between]: [startOfDay(searchDate), endOfDay(searchDate)],
      };
    }

    const meetups = await Meetup.findAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'name'],
        },
      ],
      order: ['date'],
      limit: 10,
      offset: (page - 1) * 10,
      attributes: ['id', 'date', 'title', 'user_id'],
    });

    return res.json(meetups);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      date: Yup.date().required(),
      location: Yup.string().required(),
      user_id: Yup.number().required(),
      banner_id: Yup.number().required(),
    });

    // schema validation
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { date } = req.body;
    const dateMeetup = startOfHour(parseISO(date));

    // verify if dateMeetup is older atual date
    if (isBefore(dateMeetup, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permited' });
    }

    // verify date availability
    const checkAvailability = await Meetup.findOne({
      where: { date: dateMeetup },
    });

    if (checkAvailability) {
      return res.status(400).json({ error: 'This date is not available' });
    }

    const { id, title, description } = await Meetup.create(req.body);

    return res.json({ id, title, description });
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string(),
      description: Yup.string(),
      date: Yup.date(),
      location: Yup.string(),
      banner_id: Yup.number(),
    });

    // schema validation
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const meetup = await Meetup.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!meetup) {
      return res.status(400).json({ error: 'This meetup is not your' });
    }

    const dateWithSub = subHours(meetup.date, 0);

    // Define range of hours passed to edit or delete
    if (isBefore(dateWithSub, new Date())) {
      return res.status(400).json({
        error: 'This meetup ends',
      });
    }

    await meetup.update(req.body);
    return res.json(meetup);
  }

  async delete(req, res) {
    const meetup = await Meetup.findOne({
      where: { id: req.params.id },
    });

    if (meetup.user_id !== req.userId) {
      return res.status(400).json({
        error: 'This meetup is not your',
      });
    }

    // Define range of hours to edit or delete
    const dateWithSub = subHours(meetup.date, 0);

    if (isBefore(dateWithSub, new Date())) {
      return res.status(400).json({
        error: "This meet up ends. You can't edit this meetup",
      });
    }

    await meetup.destroy();
    return res.json({ message: 'This meetup was erased' });
  }
}

export default new MeetupController();
