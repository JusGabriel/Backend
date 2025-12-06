// ===============================
//  EMAILS PARA EMPRENDEDOR
// ===============================

import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// -------------------------------
// CONFIGURACIÓN DEL TRANSPORTER
// -------------------------------
// NOTA: Aquí sigues usando Gmail. Si luego migras a Brevo,
// solo cambiamos este bloque.
let transporter = nodemailer.createTransport({
    service: "gmail",
    secure: false,
    auth: {
        user: process.env.USER_MAILTRAP,  // correo emisor
        pass: process.env.PASS_MAILTRAP,  // contraseña o app password
    }
});

// -------------------------------
// PLANTILLA BASE PARA EMPRENDEDOR
// -------------------------------
const emailTemplate = (title, message, buttonText, buttonLink) => {
    return `
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e0e0e0;font-family:'Segoe UI';">
        <img src="https://raw.githubusercontent.com/JusGabriel/Frontend/main/frontend-vet/src/assets/logo.jpg"
             style="width:100%;max-height:200px;object-fit:cover;">

        <div style="padding:25px;">
            <h1 style="color:#004080;">${title}</h1>
            <p>${message}</p>

            <div style="text-align:center;margin:30px 0;">
                <a href="${buttonLink}"
                   style="background:#28a745;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;">
                    ${buttonText}
                </a>
            </div>
        </div>
    </div>
    `;
};

// -------------------------------
// 1) EMAIL: REGISTRO EMPRENDEDOR
// -------------------------------
const sendMailToRegisterEmprendedor = (userMail, token) => {
    const html = emailTemplate(
        "Bienvenido Emprendedor",
        `Completa tu registro en QuitoEmprende y activa tu cuenta.`,
        "Confirmar Cuenta",
        `${process.env.URL_FRONTEND}/confirm/emprendedor/${token}`
    );

    transporter.sendMail(
        {
            from: process.env.USER_MAILTRAP,
            to: userMail,
            subject: "Confirmación de Cuenta - Emprendedor",
            html
        },
        (err) => err && console.error("❌ ERROR al enviar correo (registro emprendedor):", err)
    );
};

// ------------------------------------------
// 2) EMAIL: RECUPERACIÓN DE CONTRASEÑA
// ------------------------------------------
const sendMailToRecoveryPasswordEmprendedor = (userMail, token) => {
    const html = emailTemplate(
        "Recupera tu contraseña",
        `Haz clic en el botón para continuar con la recuperación de tu contraseña.`,
        "Reestablecer Contraseña",
        `${process.env.URL_FRONTEND}/reset/emprendedor/${token}`
    );

    transporter.sendMail(
        {
            from: process.env.USER_MAILTRAP,
            to: userMail,
            subject: "Recuperación de Contraseña - Emprendedor",
            html
        },
        (err) => err && console.error("❌ ERROR al enviar correo (recuperación emprendedor):", err)
    );
};

// -------------------------------
// EXPORTS DEL MÓDULO EMPRENDEDOR
// -------------------------------
export {
    sendMailToRegisterEmprendedor,
    sendMailToRecoveryPasswordEmprendedor
};
