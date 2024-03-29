import { ApolloError } from "apollo-server";
import { ObjectId } from "mongodb";
import { v4 as uuid } from "uuid";

export const Mutation = {
    logIn: async (parent: any, args: any, context: any) => {
        const db = context.db;
        const { correo, contrasena } = args;
        const user = await db.collection("Usuarios").findOne({ correo, contrasena });
        if (user) {
            const token = uuid();
            await db.collection("Usuarios").findOneAndUpdate({ _id: user._id }, { '$set': { token: token } });
            return {
                _id: user._id,
                nombre: user.nombre,
                apellido1: user.apellido1,
                apellido2: user.apellido2,
                telefono: user.apellido2,
                contrasena: "********",
                token,
                correo,
                horasSemanales: user.horasSemanales,
                diasHabiles: user.diasHabiles,
            }
        } else {
            throw new ApolloError("Usuario no existente");
        }
    },
    logOut: async (parent: any, args: any, context: any) => {
        const { db, user } = context;
        await db.collection("Usuarios").findOneAndUpdate({ _id: user._id }, { '$set': { token: null } });
        return {
            _id: user._id,
            nombre: user.nombre,
            apellido1: user.apellido1,
            apellido2: user.apellido2,
            telefono: user.apellido2,
            contrasena: "********",
            token: null,
            corre: user.correo,
            horasSemanales: user.horasSemanales,
            diasHabiles: user.diasHabiles,
        };
    },
    createUser: async (parent: any, args: any, context: any) => {
        const db = context.db;
        const { nombre, apellido1, apellido2, telefono, contrasena, correo, horasSemanales, diasHabiles } = args;
        
        const insertedId = await db.collection("Usuarios").insertOne({ nombre, apellido1, apellido2, telefono, contrasena, token: null, correo, horasSemanales, diasHabiles });

        return {
            _id: insertedId.insertedId,
            nombre,
            apellido1,
            apellido2,
            telefono,
            contrasena,
            token: null,
            correo,
            horasSemanales,
            diasHabiles,
        }
    },

    setVacaciones: async (parent: any, args: any, context: any) => {
        const { db, user } = context;
        const { Fdesde, Fhasta } = args;

        let diasVacas: string[] = [];

        const fechaInicio = new Date(Fdesde)
        const fechaFin = new Date(Fhasta)
        
        if(fechaInicio > fechaFin){
            throw new ApolloError("La fecha de inicio es mayor a la fecha fin");
        }else{
            fechaFin.setDate(fechaFin.getDate() + 1);
            while (fechaInicio < fechaFin){
                diasVacas.push(new Date(fechaInicio).toISOString());
                fechaInicio.setDate(fechaInicio.getDate() + 1);
            }
        }

        if (user.diasHabiles == 0 || user.diasHabiles < diasVacas.length) {
            throw new ApolloError("No tienes dias habiles");
        } else {
            await db.collection("Usuarios").findOneAndUpdate({ _id: user._id }, { $set: { diasHabiles: user.diasHabiles - diasVacas.length } });
            const usuario = await db.collection("Usuarios").findOne({ _id: user._id });
            const insertedId = await db.collection("Vacaciones").insertOne({ persona: usuario._id, diasVacas, estado: "Solicitada" });
            return {
                _id: insertedId.insertedId,
                persona: user._id,
                diasVacas,
                estado: "Solicitada"
            }
        }
    },
    deleteVacaciones: async (parent: any, args: any, context: any) => {
        const { db, user } = context;
        const { _id } = args;

        const Vacaciones = await db.collection("Vacaciones").findOne({ _id: new ObjectId(_id) });

        await db.collection("Usuarios").findOneAndUpdate({ _id: user._id }, { '$set': { diasHabiles: user.diasHabiles + Vacaciones.diasVacas.length} });

        if (Vacaciones) await db.collection("Vacaciones").deleteOne({ _id: new ObjectId(_id) })
        else throw new ApolloError("Registro no encontrado");
        return Vacaciones;
    },

    setFichaje: async (parent: any, args: any, context: any) => {
        const { db, user } = context;
        const { hora, comentario } = args;

        const f = new Date();
        const fecha = f.getFullYear() + "-" + f.getMonth() + "-" + f.getDate();

        const insertedId = await db.collection("Fichaje").insertOne({ persona: user._id, fecha, entradasSalidas: hora, comentario: comentario });
        return {
            _id: insertedId.insertedId,
            persona: user._id,
            fecha,
            entradasSalidas: hora,
            comentario: comentario,
        }
    },
    editFichaje: async (parent: any, args: any, context: any) => {
        const { db, user } = context;
        const { id, hora, comentario } = args;

        const fichaje = await db.collection("Fichaje").findOne({ _id: new ObjectId(id) });

        if (fichaje) await db.collection("Fichaje").findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { entradasSalidas: hora, comentario } });
        else throw new ApolloError("Registro no encontrado");
        return {
            _id: new ObjectId(id),
            fecha: fichaje.fecha,
            persona: user._id,
            entradasSalidas: hora,
            comentario
        }
    },
    deleteFichaje: async (parent: any, args: any, context: any) => {
        const { db } = context;
        const { id } = args;

        const fichaje = await db.collection("Fichaje").findOne({ _id: new ObjectId(id) });

        if (fichaje) await db.collection("Fichaje").deleteOne({ _id: new ObjectId(id) })
        else throw new ApolloError("Registro no encontrado");
        return fichaje;
    },
    setTrabajoReg: async (parent: any, args: any, context: any) => {
        const { db, user } = context;
        const { tiempo, trabajoRealizado, Fdesde, comentario } = args;

        const f = new Date();
        const fecha = f.getFullYear() + "-" + (f.getMonth() + 1) + "-" + f.getDate();

        const insertedId = await db.collection("TrabajoReg").insertOne({ persona: user._id, tiempo, fecha, trabajoRealizado, Fdesde, comentario });
        return {
            _id: insertedId.insertedId,
            persona: user._id,
            fecha,
            tiempo,
            trabajoRealizado,
            Fdesde,
            comentario
        }
    },
    editTrabajoReg: async (parent: any, args: any, context: any) => {
        const { db, user } = context;
        const { id, tiempo, trabajoRealizado, Fdesde, comentario } = args;

        const trabRegHoy = await db.collection("TrabajoReg").findOne({ _id: new ObjectId(id) });

        if (trabRegHoy) await db.collection("TrabajoReg").findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { tiempo, trabajoRealizado, Fdesde, comentario } });
        else throw new ApolloError("Registro no encontrado");
        return {
            _id: new ObjectId(id),
            persona: user._id,
            fecha: trabRegHoy.fecha,
            tiempo,
            trabajoRealizado,
            Fdesde,
            comentario
        }
    },
    deleteTrabajoReg: async (parent: any, args: any, context: any) => {
        const { db } = context;
        const { id } = args;

        const trabRegHoy = await db.collection("TrabajoReg").findOne({ _id: new ObjectId(id) });

        if (trabRegHoy) await db.collection("TrabajoReg").deleteOne({ _id: new ObjectId(id) })
        else throw new ApolloError("Registro no encontrado");
        return trabRegHoy;
    },
    masMeses: async (parent: any, args: any, context: any) => {
        const { db } = context; // "Diciembre, 2023" 31 - 28 - 31 - 30 - 31 - 30 - 31 - 31 - 30 - 31 - 30 - 31
        const mes = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const diasMes = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

        for (let a = 0; a < mes.length; a++) {
            const meses = mes[a] + "," + "2024";
            let c: string[] = [];
            for (let i = 1; i <= diasMes[a]; i++) {
                let b = "2024" + "-" + (a + 1) + "-" + i;
                c.push(b);
            }
            await db.collection("DiasMeses").insertOne({ meses, dias: c });
        }

        return 0;
    },
}


