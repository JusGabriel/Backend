import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

let transporter = nodemailer.createTransport({
    service: "gmail",
    secure: false,
    auth: {
        user: process.env.USER_MAILTRAP,
        pass: process.env.PASS_MAILTRAP,
    }
});

// Plantilla
const emailTemplate = (title, message, buttonText, buttonLink) => {
    return `
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e0e0e0;font-family:'Segoe UI';">
        <img src="https://raw.githubusercontent.com/JusGabriel/Frontend/main/frontend-vet/src/assets/logo.jpg" style="width:100%;max-height:200px;object-fit:cover;">
        <div style="padding:25px;">
            <h1 style="color:#004080;">${title}</h1>
            <p>${message}</p>
            <div style="text-align:center;margin:30px 0;">
                <a href="${buttonLink}" style="background:#28a745;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;">${buttonText}</a>
            </div>
        </div>
    </div>`;
};

// Registro emprendedor
const sendMailToRegisterEmprendedor = (userMail, token) => {
    const html = emailTemplate(
        "Bienvenido Emprendedor",
        `Completa tu registro en QuitoEmprende.`,
        "Confirmar Cuenta",
        `${process.env.URL_FRONTEND}/confirm/${token}`
    );

    transporter.sendMail(
        { from: process.env.USER_MAILTRAP, to: userMail, subject: "Confirmación Emprendedor", html },
        err => err && console.error("❌ ERROR:", err)
    );
};

// Recuperación emprendedor
const sendMailToRecoveryPasswordEmprendedor = (userMail, token) => {
    const html = emailTemplate(
        "Recupera tu contraseña",
        `Haz clic en el botón para continuar.`,
        "Reestablecer",
        `${process.env.URL_FRONTEND}/reset/emprendedor/${token}`
    );

    transporter.sendMail(
        { from: process.env.USER_MAILTRAP, to: userMail, subject: "Recuperación Emprendedor", html },
        err => err && console.error("❌ ERROR:", err)
    );
};

export {
    sendMailToRegisterEmprendedor,
    sendMailToRecoveryPasswordEmprendedor
};
