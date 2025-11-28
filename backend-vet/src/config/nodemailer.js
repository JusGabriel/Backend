import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

let transporter = nodemailer.createTransport({
    service: "gmail",
    secure: false, // IMPORTANTE PARA RAILWAY
    auth: {
        user: process.env.USER_MAILTRAP,
        pass: process.env.PASS_MAILTRAP,
    }
});

/**
 * Plantilla HTML
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

// Registro administrador
const sendMailToRegister = (userMail, token) => {
    const html = emailTemplate(
        "Confirma tu Cuenta",
        `Gracias por registrarte como Administrador.`,
        "Confirmar Cuenta",
        `${process.env.URL_FRONTEND}/confirm/${token}`
    );

    transporter.sendMail(
        { from: process.env.USER_MAILTRAP, to: userMail, subject: "Confirmación de Cuenta", html },
        err => err && console.error("❌ ERROR:", err)
    );
};

// Recuperación admin
const sendMailToRecoveryPassword = (userMail, token) => {
    const html = emailTemplate(
        "Reestablecer contraseña",
        `Haz clic para cambiar tu contraseña.`,
        "Reestablecer",
        `${process.env.URL_FRONTEND}/reset/admin/${token}`
    );

    transporter.sendMail(
        { from: process.env.USER_MAILTRAP, to: userMail, subject: "Recuperación de Contraseña", html },
        err => err && console.error("❌ ERROR:", err)
    );
};

export { sendMailToRegister, sendMailToRecoveryPassword };
