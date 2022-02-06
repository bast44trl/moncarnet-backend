import { Request, Response, NextFunction, Router } from "express";
import prisma from "../helpers/prisma";
import bodyValidator from "../middleware/bodyValidator";
import { postUser, putUser } from "../JOI/validate";
import UserAuth from "../helpers/users";
import IUserInfos from "../interfaces/IuserInfos";
import checktoken from "../middleware/checkToken";

/*//////////////////////////////////////////////////////////////
                        ROUTE IS USED
/////////////////////////////////////////////////////////////*/
const usersRouter = Router();

// authorization : admin
usersRouter.get(
  "/",
  checktoken,
  async (req: Request, res: Response, next: NextFunction) => {
    const { lastname, city, postal_code } = req.query;
    if (req.query.appointments) {
      try {
        const usersWithoutAppointments = await prisma.users.findMany({
          where: {
            appointments: {
              none: {},
            },
          },
        });
        res.status(200).json(usersWithoutAppointments);
      } catch (err) {
        next(err);
      }
    } else if (req.query.lastname) {
      try {
        const usersFilterByLastname = await prisma.users.findMany({
          where: {
            lastname: {
              contains: String(lastname),
            },
          },
        });
        res.status(200).json(usersFilterByLastname);
      } catch (err) {
        next(err);
      }
    } else if (req.query.postal_code) {
      try {
        const userFilterByPostal_code = await prisma.users.findMany({
          where: {
            postal_code: { in: Number(postal_code) },
          },
        });
        res.status(200).json(userFilterByPostal_code);
      } catch (err) {
        next(err);
      }
    } else if (req.query.city) {
      try {
        const userFilterByCity = await prisma.users.findMany({
          where: {
            city: {
              contains: String(city),
            },
          },
        });
        res.status(200).json(userFilterByCity);
      } catch (err) {
        next(err);
      }
    } else {
      try {
        const allUsers = await prisma.users.findMany();
        res.status(200).json(allUsers);
      } catch (err) {
        next(err);
      }
    }
  }
);

// authorizations: user, admin, pros
usersRouter.get(
  "/:idUser",
  checktoken,
  async (req: Request, res: Response, next: NextFunction) => {
    const idUser = parseInt(req.params.idUser);
    try {
      const user = await prisma.users.findUnique({
        where: {
          id_user: idUser,
        },
      });
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  }
);

/*//////////////////////////////////////////////////////////////
                        ROUTE IS USED
/////////////////////////////////////////////////////////////*/
// authorization: admin, user
usersRouter.get(
  "/:idUser/pros",
  checktoken,
  async (req: Request, res: Response, next: NextFunction) => {
    const idUser = parseInt(req.params.idUser);
    try {
      const findProsByUser = await prisma.pros.findMany({
        where: {
          users: {
            some: {
              id_user: idUser,
            },
          },
        },
      });
      res.status(200).json(findProsByUser);
    } catch (err) {
      next(err);
    }
  }
);

usersRouter.put(
  "/:idUser/pros/:idPros",
  checktoken,
  async (req: Request, res: Response, next: NextFunction) => {
    const { idUser, idPros } = req.params;
    try {
      const existingFavorite = await prisma.users.findUnique({
        where: {
          id_user: Number(idUser),
        },
        select: {
          pros: {
            where: {
              id_pros: Number(idPros),
            },
          },
        },
      });
      if (existingFavorite && existingFavorite.pros.length === 0) {
        const createProsAndUsers = await prisma.users.update({
          where: {
            id_user: Number(idUser),
          },
          data: {
            pros: {
              connect: { id_pros: Number(idPros) },
            },
          },
        });
        res
          .status(204)
          .json(
            `${createProsAndUsers.firstname} the garage has been added on your favorite`
          );
      } else {
        res.status(409).send("This garage is already in your favorite!");
      }
    } catch (err) {
      next(err);
    }
  }
);

/*//////////////////////////////////////////////////////////////
                        ROUTE IS USED
/////////////////////////////////////////////////////////////*/
usersRouter.get(
  "/:idUser/appointments",
  async (req: Request, res: Response, next: NextFunction) => {
    const { idUser } = req.params;
    try {
      const getOneAppointment = await prisma.appointments.findMany({
        where: {
          userId: Number(idUser),
        },
      });
      res.status(200).json(getOneAppointment);
    } catch (err) {
      next(err);
    }
  }
);

/*//////////////////////////////////////////////////////////////
                        ROUTE IS USED
/////////////////////////////////////////////////////////////*/
usersRouter.delete(
  "/:idUser/prosDeleted/:idPros",
  checktoken,
  async (req: Request, res: Response, next: NextFunction) => {
    const { idUser, idPros } = req.params;
    try {
      const deletePros = await prisma.users.update({
        where: {
          id_user: Number(idUser),
        },
        data: {
          pros: {
            disconnect: {
              id_pros: Number(idPros),
            },
          },
        },
      });
      res
        .status(200)
        .send(
          `${deletePros.firstname} the garage has been deleted of your favorite`
        );
    } catch (err) {
      next(err);
    }
  }
);

/*//////////////////////////////////////////////////////////////
                        ROUTE IS USED
/////////////////////////////////////////////////////////////*/
// authorization: admin, user
usersRouter.post(
  "/",
  bodyValidator(postUser),
  async (req: Request, res: Response, next: NextFunction) => {
    const user: IUserInfos = req.body;
    try {
      const emailExisting = await prisma.users.findUnique({
        where: {
          email: user.email,
        },
      });

      if (emailExisting === null) {
        const hashedPassword = await UserAuth.hashPassword(user.password);
        const createUser = await prisma.users.create({
          data: {
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            hashedPassword: hashedPassword,
            address: user.address,
            phone: user.phone,
            postal_code: user.postal_code,
            city: user.city,
            active: user.active,
          },
        });
        res.status(200).json(createUser);
      } else {
        res.status(409).send("Email already used");
      }
    } catch (err) {
      next(err);
    }
  }
);

/*//////////////////////////////////////////////////////////////
                        ROUTE IS USED
/////////////////////////////////////////////////////////////*/

// authorization: admin, user
usersRouter.put(
  "/:idUser",
  bodyValidator(putUser),
  checktoken,
  async (req: Request, res: Response, next: NextFunction) => {
    const idUser = parseInt(req.params.idUser);
    const user: IUserInfos = req.body;
    try {
      const emailExisting = await prisma.users.findMany({
        where: {
          email: user.email,
          NOT: {
            id_user: idUser,
          },
        },
      });

      if (emailExisting.length === 0) {
        const userUpdate = await prisma.users.update({
          where: {
            id_user: idUser,
          },
          data: {
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            address: user.address,
            phone: user.phone,
            postal_code: user.postal_code,
            city: user.city,
            active: user.active,
          },
        });
        res.status(200).json(userUpdate);
      } else {
        res.status(409).send("Email already used!");
      }
    } catch (err) {
      next(err);
    }
  }
);

// authorization: admin, user
usersRouter.delete(
  "/:idUser",
  checktoken,
  async (req: Request, res: Response, next: NextFunction) => {
    const idUser: number = parseInt(req.params.idUser);
    try {
      const userDelete = await prisma.users.delete({
        where: {
          id_user: idUser,
        },
      });
      res.status(200).send(userDelete.firstname + " deleted");
    } catch (err) {
      next(err);
    }
  }
);

/*//////////////////////////////////////////////////////////////
                        ROUTE IS USED
/////////////////////////////////////////////////////////////*/
// get user's vehicule (authorization: pros, admin)
usersRouter.get(
  "/:idUser/vehicules",
  async (req: Request, res: Response, next: NextFunction) => {
    const idUser: number = parseInt(req.params.idUser);
    try {
      const vehicules = await prisma.vehicules.findMany({
        where: {
          users: {
            id_user: idUser,
          },
        },
      });
      res.status(200).json(vehicules);
    } catch (err) {
      next(err);
    }
  }
);

export default usersRouter;
