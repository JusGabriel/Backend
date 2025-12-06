import dotenv from "dotenv";
dotenv.config();

/**
 * 📌 PLANTILLA HTML (ACTUALIZADA CON LA NUEVA PRESENTACIÓN)
 */
const emailTemplate = (title, message, buttonText, buttonLink) => {
    return `
    <!-- Preheader oculto para vista previa en bandeja -->
    <span style="display:none !important; visibility:hidden; mso-hide:all; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0;">
        ${title} — ${message}
    </span>

    <div style="width:100%;background:#f2f4f7;padding:30px 0;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
      <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0"
             style="width:100%;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e6e9ee;border-radius:12px;overflow:hidden;">
        
        <!-- Banner -->
        <tr>
          <td style="padding:0;background:#f9fbff;">
            <img src="https://raw.githubusercontent.com/JusGabriel/Frontend/main/frontend-vet/src/assets/logo.jpg"
                 alt="QuitoEmprende"
                 style="display:block;width:100%;height:auto;max-height:200px;object-fit:cover;border-bottom:1px solid #eef2f6;">
          </td>
        </tr>

        <!-- Contenido -->
        <tr>
          <td style="padding:28px 28px 18px 28px;color:#333;">
            
            <!-- Título -->
            <h1 style="margin:0 0 12px 0;color:#004080;font-size:22px;line-height:1.2;font-weight:700;">
              ${title}
            </h1>

            <!-- Texto -->
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#556069;">
              ${message}
            </p>

            <!-- Botón -->
            <div style="text-align:center;margin:26px 0;">
              <a href="${buttonLink}"
                 target="_blank"
                 rel="noopener noreferrer"
                 style="display:inline-block;padding:12px 26px;border-radius:8px;background:#28a745;color:#ffffff;font-weight:700;text-decoration:none;font-size:15px;">
                ${buttonText}
              </a>
            </div>

            <!-- Enlace alternativo -->
            <p style="margin:0;font-size:13px;color:#9aa4ae;line-height:1.4;">
              Si el botón no funciona, copia y pega este enlace en tu navegador:
              <br>
              <a href="${buttonLink}" style="color:#0077cc;word-break:break-all;text-decoration:none;">
                ${buttonLink}
              </a>
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:18px 28px 26px 28px;background:#f8fafc;border-top:1px solid #eef2f6;">
            <p style="margin:0;font-size:13px;color:#9aa4ae;">
              QuitoEmprende — Derechos reservados<br>
              <span style="color:#b6c0c8;">Si no solicitaste este correo puedes ignorarlo.</span>
            </p>
          </td>
        </tr>

      </table>
    </div>
    `;
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
                    email: "izasebas96@gmail.com"   // ✔ SENDER VERIFICADO Y FUNCIONAL
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
