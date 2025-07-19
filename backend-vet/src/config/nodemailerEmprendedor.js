import nodemailer from "nodemailer"
import dotenv from 'dotenv'
dotenv.config()

let transporter = nodemailer.createTransport({
    service: 'gmail',
    host: process.env.HOST_MAILTRAP,
    port: process.env.PORT_MAILTRAP,
    auth: {
        user: process.env.USER_MAILTRAP,
        pass: process.env.PASS_MAILTRAP,
    }
})

// Confirmación de cuenta para EMPRENDEDOR
const sendMailToRegisterEmprendedor = (userMail, token) => {
    
    let mailOptions = {
        from: '"QuitoEmprende" <no-reply@quitoemprende.com>',
        to: userMail,
        subject: "QuitoEmprende - Confirmación de Cuenta para Emprendedor",
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>Bienvenido a QuitoEmprende</h2>
                <p>Gracias por registrarte en nuestra plataforma como <strong>EMPRENDEDOR</strong>. Haz clic en el siguiente enlace para confirmar tu cuenta:</p>
                <p><a href="${process.env.URL_FRONTEND}confirm/${token}" style="background-color: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Confirmar Cuenta</a></p>
                <p>Si no realizaste este registro, puedes ignorar este correo.</p>
                <footer style="font-size: 0.9em; color: #777;">
                    El equipo de <strong>QuitoEmprende</strong>.
                </footer>
            </div>
        `
    }

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Error al enviar correo: ", error)
        } else {
            console.log("Mensaje enviado: ", info.messageId)
        }
    })
}

// Recuperación de contraseña para EMPRENDEDOR
const sendMailToRecoveryPasswordEmprendedor = (userMail, token) => {
    const recoveryUrl = `${process.env.URL_FRONTEND}reset/emprendedor/${token}`

    let mailOptions = {
        from: '"QuitoEmprende" <no-reply@quitoemprende.com>',
        to: userMail,
        subject: "QuitoEmprende - Reestablece tu Contraseña de Emprendedor",
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>Recuperación de Contraseña</h2>
                <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
                <p>
                    <a href="${recoveryUrl}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">
                        Reestablecer Contraseña
                    </a>
                </p>
                <p>Si no solicitaste este cambio, ignora este mensaje.</p>
            </div>
        `
    }

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Error al enviar correo: ", error)
        } else {
            console.log("Mensaje enviado: ", info.messageId)
        }
    })
}

export {
    sendMailToRegisterEmprendedor,
    sendMailToRecoveryPasswordEmprendedor
}
