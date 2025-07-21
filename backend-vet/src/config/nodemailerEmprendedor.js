import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

let transporter = nodemailer.createTransport({
    service: 'gmail',
    host: process.env.HOST_MAILTRAP,
    port: process.env.PORT_MAILTRAP,
    auth: {
        user: process.env.USER_MAILTRAP,
        pass: process.env.PASS_MAILTRAP,
    }
});

/**
 * 📩 Plantilla HTML Profesional para Correos (reutilizable)
 * @param {string} title - Título principal
 * @param {string} message - Mensaje del cuerpo (puede tener HTML)
 * @param {string} buttonText - Texto del botón
 * @param {string} buttonLink - URL para el botón
 * @returns {string} - HTML completo para el correo
 */
const emailTemplate = (title, message, buttonText, buttonLink) => {
    return `
    <div style="max-width:600px; margin:0 auto; background:#fff; border:1px solid #e0e0e0; border-radius:12px; overflow:hidden; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#333;">
        
        <!-- Imagen cabecera -->
        <div style="background-color:#f9f9f9;">
            <img src="https://raw.githubusercontent.com/JusGabriel/Frontend/main/frontend-vet/src/assets/logo.jpg" alt="Logo QuitoEmprende" style="width:100%; max-height:200px; object-fit:cover;">
        </div>

        <!-- Contenido -->
        <div style="padding:25px;">
            <h1 style="color:#004080; font-size:24px; margin-top:0;">${title}</h1>
            <p style="font-size:16px; line-height:1.6; color:#555;">${message}</p>

            <div style="text-align:center; margin:30px 0;">
                <a href="${buttonLink}" 
                   style="background-color:#28a745; color:#fff; text-decoration:none; padding:14px 28px; border-radius:6px; font-size:16px; font-weight:600; display:inline-block;">
                   ${buttonText}
                </a>
            </div>

            <p style="font-size:14px; color:#999; text-align:center;">
                Si no solicitaste esta acción, puedes ignorar este mensaje.<br>
                Tu información está protegida.
            </p>
        </div>

        <!-- Footer -->
        <div style="background-color:#f2f2f2; padding:18px; text-align:center; font-size:13px; color:#777;">
            <p style="margin:0;">© 2024 QuitoEmprende · Todos los derechos reservados</p>
            <p style="margin:4px 0 0;">Impulsando ideas, conectando emprendedores</p>
        </div>
    </div>`;
};

// 📧 Confirmación de cuenta para EMPRENDEDOR
const sendMailToRegisterEmprendedor = (userMail, token) => {
    const confirmationUrl = `${process.env.URL_FRONTEND}confirm/${token}`;

    const htmlContent = emailTemplate(
        "Bienvenido a QuitoEmprende",
        `Gracias por registrarte en nuestra plataforma como <strong>EMPRENDEDOR</strong>. Para completar tu registro, haz clic en el siguiente botón:`,
        "Confirmar Cuenta",
        confirmationUrl
    );

    let mailOptions = {
        from: '"QuitoEmprende" <no-reply@quitoemprende.com>',
        to: userMail,
        subject: "QuitoEmprende - Confirmación de Cuenta para Emprendedor",
        html: htmlContent
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("❌ Error al enviar correo de registro emprendedor:", error);
        } else {
            console.log("✅ Correo de confirmación emprendedor enviado:", info.messageId);
        }
    });
};

// 🔑 Recuperación de contraseña para EMPRENDEDOR
const sendMailToRecoveryPasswordEmprendedor = (userMail, token) => {
    const recoveryUrl = `${process.env.URL_FRONTEND}reset/emprendedor/${token}`;

    const htmlContent = emailTemplate(
        "Recuperación de Contraseña",
        `Recibimos una solicitud para restablecer tu contraseña en <strong>QuitoEmprende</strong>. Si tú la solicitaste, haz clic en el botón para continuar.`,
        "Reestablecer Contraseña",
        recoveryUrl
    );

    let mailOptions = {
        from: '"QuitoEmprende" <no-reply@quitoemprende.com>',
        to: userMail,
        subject: "QuitoEmprende - Reestablece tu Contraseña de Emprendedor",
        html: htmlContent
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("❌ Error al enviar correo de recuperación emprendedor:", error);
        } else {
            console.log("✅ Correo de recuperación emprendedor enviado:", info.messageId);
        }
    });
};

export {
    sendMailToRegisterEmprendedor,
    sendMailToRecoveryPasswordEmprendedor
};
