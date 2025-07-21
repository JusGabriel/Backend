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
 * 📩 Plantilla HTML Profesional para Correos
 * @param {string} title - Título principal
 * @param {string} message - Mensaje del cuerpo
 * @param {string} buttonText - Texto del botón
 * @param {string} buttonLink - Enlace del botón
 * @returns {string} - HTML para correo
 */
const emailTemplate = (title, message, buttonText, buttonLink) => {
    return `
    <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e0e0e0; border-radius:12px; overflow:hidden; font-family: 'Segoe UI', sans-serif; color:#333;">
        
        <!-- Imagen de cabecera -->
        <div style="background-color:#f9f9f9;">
            <img src="https://raw.githubusercontent.com/JusGabriel/Frontend/main/frontend-vet/src/assets/logo.jpg" alt="Logo QuitoEmprende" style="width:100%; max-height:200px; object-fit:cover;">
        </div>

        <!-- Título y mensaje -->
        <div style="padding:25px;">
            <h1 style="color:#004080; font-size:24px; margin-top:0;">${title}</h1>
            <p style="font-size:16px; line-height:1.6; color:#555;">${message}</p>

            <div style="text-align:center; margin:30px 0;">
                <a href="${buttonLink}" 
                   style="background-color:#007bff; color:#fff; text-decoration:none; padding:14px 28px; border-radius:6px; font-size:16px; font-weight:600;">
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

// 📧 Confirmación de Cuenta
const sendMailToRegister = (userMail, token) => {
    const confirmationUrl = `${process.env.URL_FRONTEND}confirm/${token}`;

    const htmlContent = emailTemplate(
        "Confirma tu Cuenta",
        `Gracias por registrarte en <strong>QuitoEmprende</strong> como <strong>Administrador</strong>. Para completar tu registro, haz clic en el siguiente botón:`,
        "Confirmar Cuenta",
        confirmationUrl
    );

    let mailOptions = {
        from: '"QuitoEmprende" <no-reply@quitoemprende.com>',
        to: userMail,
        subject: "QuitoEmprende - Confirma tu Cuenta de Administrador",
        html: htmlContent
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("❌ Error al enviar correo de registro:", error);
        } else {
            console.log("✅ Correo de confirmación enviado:", info.messageId);
        }
    });
};

// 🔑 Recuperación de Contraseña
const sendMailToRecoveryPassword = (userMail, token) => {
    const recoveryUrl = `${process.env.URL_FRONTEND}reset/admin/${token}`;

    const htmlContent = emailTemplate(
        "Reestablece tu Contraseña",
        `Recibimos una solicitud para restablecer tu contraseña en <strong>QuitoEmprende</strong>. Si tú la solicitaste, haz clic en el botón para continuar.`,
        "Reestablecer Contraseña",
        recoveryUrl
    );

    let mailOptions = {
        from: '"QuitoEmprende" <no-reply@quitoemprende.com>',
        to: userMail,
        subject: "QuitoEmprende - Reestablece tu Contraseña de Administrador",
        html: htmlContent
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("❌ Error al enviar correo de recuperación:", error);
        } else {
            console.log("✅ Correo de recuperación enviado:", info.messageId);
        }
    });
};

export {
    sendMailToRegister,
    sendMailToRecoveryPassword
};
