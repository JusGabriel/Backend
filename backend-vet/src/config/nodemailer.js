import dotenv from "dotenv";
dotenv.config();

/**
 * 📌 PLANTILLA HTML
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
                    email: "no-reply@quitoemprende.com"
                },
                to: [{ email: to }],
                subject,
                htmlContent: html
            })
        });

        const data = await response.json();
        console.log("📧 CORREO ENVIADO:", data);
        return data;

    } catch (error) {
        console.error("❌ ERROR EN BREVO API:", error);
        return null;
    }
}

/**
 * 📩 Enviar correo de Confirmación (Administrador)
 */
const sendMailToRegister = (userMail, token) => {
    const html = emailTemplate(
        "Confirma tu Cuenta",
        "Gracias por registrarte como Administrador.",
        "Confirmar Cuenta",
        `${process.env.URL_FRONTEND}/confirm/${token}`
    );

    return sendBrevoEmail(userMail, "Confirmación de Cuenta", html);
};

/**
 * 📩 Enviar correo de Recuperación de Contraseña (Administrador)
 */
const sendMailToRecoveryPassword = (userMail, token) => {
    const html = emailTemplate(
        "Restablecer contraseña",
        "Haz clic en el botón para cambiar tu contraseña.",
        "Restablecer",
        `${process.env.URL_FRONTEND}/reset/admin/${token}`
    );

    return sendBrevoEmail(userMail, "Recuperación de contraseña", html);
};

/**
 * ⭐ EXPORTAR FUNCIONES (como siempre lo usas)
 */
export {
    sendMailToRegister,
    sendMailToRecoveryPassword
};
