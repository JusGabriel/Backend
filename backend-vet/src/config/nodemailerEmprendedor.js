import dotenv from "dotenv";
dotenv.config();

/**
 * 📌 PLANTILLA HTML (MISMA QUE CLIENTE)
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
 * ⭐ FUNCIÓN CENTRAL PARA ENVIAR CORREOS CON BREVO API
 * (LA MISMA DE CLIENTE)
 */
async function sendBrevoEmail(to, subject, html) {
    try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api-key": process.env.BREVO_API_KEY,
                "content-type": "application/json"
            },
            body: JSON.stringify({
                sender: {
                    name: "QuitoEmprende",
                    email: "izasebas96@gmail.com" // ✔ mismo sender verificado
                },
                to: [{ email: to }],
                subject,
                htmlContent: html
            })
        });

        const data = await response.json();
        console.log("📧 CORREO ENVIADO (EMPRENDEDOR):", data);
        return data;

    } catch (error) {
        console.error("❌ ERROR EN BREVO API:", error);
        return null;
    }
}

/**
 * 📩 Enviar correo de Confirmación (Emprendedor)
 */
const sendMailToRegisterEmprendedor = (userMail, token) => {
    const html = emailTemplate(
        "Bienvenido Emprendedor",
        "Completa tu registro y comienza a promocionar tus productos en QuitoEmprende.",
        "Confirmar Cuenta",
        `${process.env.URL_FRONTEND}/confirm/emprendedor/${token}`
    );

    // 👇 SOLO cambia el título del correo
    return sendBrevoEmail(userMail, "Confirmación de Cuenta (Emprendedor)", html);
};

/**
 * 📩 Enviar correo de Recuperación de Contraseña (Emprendedor)
 */
const sendMailToRecoveryPasswordEmprendedor = (userMail, token) => {
    const html = emailTemplate(
        "Recuperación de contraseña",
        "Haz clic en el botón para recuperar tu acceso como emprendedor.",
        "Restablecer",
        `${process.env.URL_FRONTEND}/reset/emprendedor/${token}`
    );

    // 👇 SOLO cambia el título del correo
    return sendBrevoEmail(userMail, "Recuperación de Contraseña (Emprendedor)", html);
};

export {
    sendMailToRegisterEmprendedor,
    sendMailToRecoveryPasswordEmprendedor
};
