import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

/**
 * 🔵 CONFIG SMTP BREVO (OFICIAL 2025)
 */
let transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST,      // smtp-relay.brevo.com
    port: process.env.BREVO_SMTP_PORT,      // 587
    secure: false,                          // Brevo usa STARTTLS en 587
    auth: {
        user: process.env.BREVO_SMTP_USER,  // 9d7c04001@smtp-brevo.com
        pass: process.env.BREVO_SMTP_PASS   // Clave SMTP generada
    }
});

/**
 * 🌐 PLANTILLA HTML
 */
const emailTemplate = (title, message, buttonText, buttonLink) => {
    return `
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;font-family:'Segoe UI',sans-serif;color:#333;">
        <div style="background-color:#f9f9f9;">
            <img src="https://raw.githubusercontent.com/JusGabriel/Frontend/main/frontend-vet/src/assets/logo.jpg" style="width:100%;max-height:200px;object-fit:cover;">
        </div>
        <div style="padding:25px;">
            <h1 style="color:#004080;font-size:24px;margin-top:0;">${title}</h1>
            <p style="font-size:16px;line-height:1.6;color:#555;">${message}</p>
            <div style="text-align:center;margin:30px 0;">
                <a href="${buttonLink}" style="background-color:#007bff;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;">${buttonText}</a>
            </div>
        </div>
    </div>`;
};

/**
 * 📩 Enviar correo de Confirmación
 */
const sendMailToRegister = (userMail, token) => {
    const html = emailTemplate(
        "Confirma tu Cuenta",
        "Gracias por registrarte como Administrador.",
        "Confirmar Cuenta",
        `${process.env.URL_FRONTEND}/confirm/${token}`
    );

    transporter.sendMail(
        {
            from: `"QuitoEmprende" <${process.env.BREVO_SMTP_USER}>`, // 👈 Brevo exige que sea tu remitente verificado
            to: userMail,
            subject: "Confirmación de Cuenta",
            html
        },
        err => err && console.error("❌ ERROR EN ENVÍO:", err)
    );
};

/**
 * 📩 Enviar correo de recuperación
 */
const sendMailToRecoveryPassword = (userMail, token) => {
    const html = emailTemplate(
        "Restablecer Contraseña",
        "Haz clic en el siguiente botón para cambiar tu contraseña.",
        "Restablecer",
        `${process.env.URL_FRONTEND}/reset/admin/${token}`
    );

    transporter.sendMail(
        {
            from: `"QuitoEmprende" <${process.env.BREVO_SMTP_USER}>`,
            to: userMail,
            subject: "Recuperación de Contraseña",
            html
        },
        err => err && console.error("❌ ERROR EN ENVÍO:", err)
    );
};

export { sendMailToRegister, sendMailToRecoveryPassword };
