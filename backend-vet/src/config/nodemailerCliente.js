import dotenv from "dotenv";
dotenv.config();

/**
 * 📌 PLANTILLA HTML (MEJORADA — SOLO PRESENTACIÓN)
 */
const emailTemplate = (title, message, buttonText, buttonLink) => {
    return `
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;font-family:'Segoe UI',sans-serif;color:#333;">
        <div style="background-color:#f9f9f9;">
            <img src="https://raw.githubusercontent.com/JusGabriel/Frontend/main/frontend-vet/src/assets/logo.jpg"
                 style="width:100%;max-height:200px;object-fit:cover;">
        </div>

        <div style="padding:25px;">
            <h1 style="color:#004080;font-size:26px;margin-top:0;text-align:center;font-weight:700;">
                ${title}
            </h1>

            <p style="font-size:16px;line-height:1.7;color:#444;text-align:center;margin-bottom:25px;">
                ${message}
            </p>

            <div style="text-align:center;margin:30px 0;">
                <a href="${buttonLink}"
                   style="background-color:#0069d9;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:17px;font-weight:600;display:inline-block;">
                    ${buttonText}
                </a>
            </div>

            <p style="font-size:12px;color:#777;text-align:center;margin-top:20px;">
                Si el botón no funciona, copia y pega este enlace:<br>
                <span style="color:#0069d9;word-break:break-all;">${buttonLink}</span>
            </p>
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
                    email: "izasebas96@gmail.com" // ✔ SENDER VERIFICADO Y FUNCIONAL
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
 * 📩 Enviar correo de Confirmación (Cliente)
 */
const sendMailToRegisterCliente = (userMail, token) => {
    const html = emailTemplate(
        "Bienvenido Cliente",
        "Completa tu registro y comienza a usar QuitoEmprende.",
        "Confirmar Cuenta",
        `${process.env.URL_FRONTEND}/confirm/${token}`
    );

    return sendBrevoEmail(userMail, "Confirmación de Cuenta (Cliente)", html);
};

/**
 * 📩 Enviar correo de Recuperación de Contraseña (Cliente)
 */
const sendMailToRecoveryPasswordCliente = (userMail, token) => {
    const html = emailTemplate(
        "Recuperación de contraseña",
        "Haz clic en el botón para recuperar tu acceso.",
        "Restablecer",
        `${process.env.URL_FRONTEND}/reset/${token}`
    );

    return sendBrevoEmail(userMail, "Recuperación de Contraseña (Cliente)", html);
};

export {
    sendMailToRegisterCliente,
    sendMailToRecoveryPasswordCliente
};
