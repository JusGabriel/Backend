
import React, { useEffect, useState, useRef } from "react";
import storeAuth from "../../context/storeAuth";

/* ===========================
   CONFIGURACIÓN API
=========================== */
const BASE_URLS = {
  cliente: "https://backend-production-bd1d.up.railway.app/api/clientes",
  emprendedor: "https://backend-production-bd1d.up.railway.app/api/emprendedores",
};
const API_PRODUCTOS = "https://backend-production-bd1d.up.railway.app/api/productos";
const API_EMPRENDIMIENTOS = "https://backend-production-bd1d.up.railway.app/api/emprendimientos";

/* ===========================
   HELPERS
=========================== */
const emptyForm = { nombre: "", apellido: "", email: "", password: "", telefono: "" };
const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : "");
const fmtUSD = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });

/* Paleta de estados (para badges) */
const ESTADO_COLORS = {
  Correcto: "#16a34a",
  Activo: "#16a34a",
  Advertencia1: "#f59e0b",
  Advertencia2: "#ea580c",
  Advertencia3: "#dc2626",
  Suspendido: "#dc2626",
};

/* Estados permitidos (backend) */
const ESTADOS_EMPRENDEDOR = ["Activo", "Advertencia1", "Advertencia2", "Advertencia3", "Suspendido"];
const ESTADOS_CLIENTE = ["Correcto", "Advertencia1", "Advertencia2", "Advertencia3", "Suspendido"];

/* Alias → valor backend */
const aliasEstadoClienteOut = (estadoUI) => {
  // "Baneado" (alias humano) → "Suspendido" (valor real esperado por backend)
  if (!estadoUI) return estadoUI;
  const s = String(estadoUI).toLowerCase();
  if (s === "baneado" || s === "ban" || s === "bloqueado") return "Suspendido";
  return estadoUI;
};

/* Derivar estado cliente visible */
const deriveEstadoCliente = (item) => {
  if (!item) return "Correcto";
  if (item.status === false) return "Suspendido";
  const e = item.estado_Emprendedor;
  if (e === "Activo") return "Correcto";
  if (["Advertencia1", "Advertencia2", "Advertencia3", "Suspendido"].includes(e)) return e;
  return "Correcto";
};

/* Siguiente advertencia desde un estado visible */
const siguienteAdvertencia = (estadoActual) => {
  switch (estadoActual) {
    case "Correcto": return "Advertencia1";
    case "Advertencia1": return "Advertencia2";
    case "Advertencia2": return "Advertencia3";
    case "Advertencia3": return "Suspendido";
    default: return "Suspendido";
  }
};

const isJsonResponse = (res) => {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json");
};

/* ==== Fechas robustas (EJSON, ISO string, number, Date) ==== */
const parseFecha = (f) => {
  if (!f) return null;
  if (f instanceof Date) return isNaN(f) ? null : f;
  if (typeof f === "string" || typeof f === "number") {
    const d = new Date(f);
    return isNaN(d) ? null : d;
  }
  if (typeof f === "object" && f.$date) {
    const raw = f.$date;
    if (typeof raw === "string" || typeof raw === "number") {
      const d = new Date(raw);
      return isNaN(d) ? null : d;
    }
    if (typeof raw === "object" && raw.$numberLong) {
      const d = new Date(Number(raw.$numberLong));
      return isNaN(d) ? null : d;
    }
  }
  return null;
};

const fmtFechaLocal = (f, locale = "es-EC", opts) => {
  const d = parseFecha(f);
  const formatOpts = opts ?? {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  };
  return d ? d.toLocaleString(locale, formatOpts) : "—";
};

const fmtHoraLocal = (f, locale = "es-EC") => {
  const d = parseFecha(f);
  return d ? d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "—";
};

/* Mostrar nombre del actor (snapshot o populate o sistema) */
const displayActorName = (a) => {
  if (!a) return "—";
  if (a.creadoPorNombre && a.creadoPorNombre.trim()) return a.creadoPorNombre.trim();
  if (a.creadoPor) {
    const n = `${a.creadoPor?.nombre || ""} ${a.creadoPor?.apellido || ""}`.trim();
    if (n) return n;
  }
  return a.origen === "sistema" ? "Sistema" : "—";
};

/* ===========================
   COMPONENTE
=========================== */
const Table = () => {
  /* --------- Auth --------- */
  const { id: emisorId, rol: emisorRol, token } = storeAuth() || {};

  /* --------- Estado principal --------- */
  const [tipo, setTipo] = useState("cliente"); // 'cliente' | 'emprendedor'
  const [lista, setLista] = useState([]);
  const [loadingLista, setLoadingLista] = useState(false);

  /* --------- Formularios --------- */
  const [formCrear, setFormCrear] = useState(emptyForm);
  const [formEditar, setFormEditar] = useState({ id: null, ...emptyForm });

  /* --------- Mensajes --------- */
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  useEffect(() => {
    if (!error && !mensaje) return;
    const t = setTimeout(() => { setError(""); setMensaje(""); }, 3000);
    return () => clearTimeout(t);
  }, [error, mensaje]);

  /* --------- UI --------- */
  const [expandido, setExpandido] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced

  /* --------- Confirm Delete --------- */
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null, nombre: "" });

  /* --------- Chat --------- */
  const [modalChatVisible, setModalChatVisible] = useState(false);
  const [chatUser, setChatUser] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [mensajeChat, setMensajeChat] = useState("");
  const mensajesRef = useRef(null);

  /* --------- Sub-filtros Emprendedor --------- */
  const [rangoFechas, setRangoFechas] = useState({ from: "", to: "" });
  const [mapEmpEmprendimientos, setMapEmpEmprendimientos] = useState({});
  const [mapEmpProductos, setMapEmpProductos] = useState({});
  const [loadingNested, setLoadingNested] = useState(false);

  /* --------- Catálogos fallback --------- */
  const [catalogoProductos, setCatalogoProductos] = useState([]);
  const [catalogoEmprendimientos, setCatalogoEmprendimientos] = useState([]);

  /* --------- Auditoría (Cliente) --------- */
  // Estructura: { [clienteId]: { items, total, page, limit, loading, lastError? } }
  const [mapAuditoria, setMapAuditoria] = useState({});

  /* Debounce de búsqueda (300 ms) */
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ---- Carga de listas ---- */
  const fetchLista = async () => {
    setError(""); setMensaje(""); setLoadingLista(true);
    try {
      const res = await fetch(`${BASE_URLS[tipo]}/todos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();

      let normalizados = Array.isArray(data) ? data : [];
      if (tipo === "cliente") {
        normalizados = normalizados.map((c) => {
          const estadoUI = deriveEstadoCliente(c);
          return { ...c, estado: estadoUI, estado_Cliente: estadoUI };
        });
      } else {
        normalizados = normalizados.map((e) => ({ ...e, estado: e.estado_Emprendedor || "Activo" }));
      }
      setLista(normalizados);
    } catch (e) {
      console.error(e);
      setError("No se pudo cargar el listado.");
      setLista([]);
    } finally {
      setLoadingLista(false);
    }
  };

  const fetchCatalogosGenerales = async () => {
    try {
      const [resProd, resEmpr] = await Promise.all([
        fetch(`${API_PRODUCTOS}/todos`),
        fetch(`${API_EMPRENDIMIENTOS}/publicos`),
      ]);
      const dataProd = await resProd.json();
      const dataEmpr = await resEmpr.json();

      const productosArray = Array.isArray(dataProd)
        ? dataProd
        : Array.isArray(dataProd?.productos)
          ? dataProd.productos
          : [];
      const emprArray = Array.isArray(dataEmpr) ? dataEmpr : [];

      setCatalogoProductos(productosArray);
      setCatalogoEmprendimientos(emprArray);
    } catch (e) {
      console.warn("No se pudieron cargar catálogos de fallback:", e?.message);
    }
  };

  useEffect(() => {
    fetchLista();
    fetchCatalogosGenerales();
    setFormCrear(emptyForm);
    setFormEditar({ id: null, ...emptyForm });
    setExpandido(null);
    setError(""); setMensaje("");
  }, [tipo]);

  /* ===========================
     CRUD base
  ============================ */
  const handleCrear = async (e) => {
    e.preventDefault();
    setError(""); setMensaje("");

    if (!formCrear.nombre.trim() || !formCrear.apellido.trim()) {
      setError("Nombre y Apellido son obligatorios.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formCrear.email)) {
      setError("Ingresa un email válido.");
      return;
    }

    try {
      const res = await fetch(`${BASE_URLS[tipo]}/registro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formCrear),
      });
      const data = await res.json();
      if (!res.ok) setError(data.msg || "No se pudo crear.");
      else {
        setMensaje(`${capitalize(tipo)} creado correctamente.`);
        setFormCrear(emptyForm);
        fetchLista();
      }
    } catch {
      setError("Error de red al crear.");
    }
  };

  const prepararEditar = (item) => {
    setFormEditar({
      id: item._id,
      nombre: item.nombre || "",
      apellido: item.apellido || "",
      email: item.email || "",
      password: "",
      telefono: item.telefono || "",
    });
    setMensaje(""); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleActualizar = async (e) => {
    e.preventDefault();
    setError(""); setMensaje("");
    const { id, nombre, apellido, email, password, telefono } = formEditar;

    if (!nombre.trim() || !apellido.trim()) {
      setError("Nombre y Apellido son obligatorios.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Ingresa un email válido.");
      return;
    }

    try {
      const res = await fetch(`${BASE_URLS[tipo]}/actualizar/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ nombre, apellido, email, password, telefono }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.msg || "No se pudo actualizar.");
      else {
        setMensaje(`${capitalize(tipo)} actualizado correctamente.`);
        setFormEditar({ id: null, ...emptyForm });
        fetchLista();
      }
    } catch {
      setError("Error de red al actualizar.");
    }
  };

  const solicitarEliminar = (item) => setConfirmDelete({ visible: true, id: item._id, nombre: `${item.nombre} ${item.apellido}` });
  const cancelarEliminar = () => setConfirmDelete({ visible: false, id: null, nombre: "" });

  const confirmarEliminar = async () => {
    const id = confirmDelete.id;
    cancelarEliminar();
    setError(""); setMensaje("");
    try {
      const res = await fetch(`${BASE_URLS[tipo]}/eliminar/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (!res.ok) setError(data.msg || "No se pudo eliminar.");
      else {
        setMensaje(`${capitalize(tipo)} eliminado.`);
        fetchLista();
      }
    } catch {
      setError("Error de red al eliminar.");
    }
  };

  /* ===========================
     ESTADOS y MODALES
  ============================ */

  const getEstado = (item) =>
    tipo === "emprendedor"
      ? item.estado || item.estado_Emprendedor || "Activo"
      : item.estado_Cliente ?? item.estado ?? deriveEstadoCliente(item);

  const getEstadosPermitidos = () =>
    tipo === "emprendedor" ? ESTADOS_EMPRENDEDOR : ESTADOS_CLIENTE;

  // Modal de cambio de estado (Cliente)
  const [estadoModal, setEstadoModal] = useState({
    visible: false,
    item: null,
    nuevoEstado: null,
    motivo: ""
  });

  const openEstadoModal = (item, nuevoEstadoUI) => {
    // Acepta alias "Baneado" pero guarda internamente el real que espera el backend
    const resolved = aliasEstadoClienteOut(nuevoEstadoUI);
    if (tipo === "cliente") {
      setEstadoModal({
        visible: true,
        item,
        nuevoEstado: resolved,
        motivo: ""
      });
    } else {
      updateEstadoEmprendedor(item, resolved);
    }
  };

  const closeEstadoModal = () => setEstadoModal({
    visible: false, item: null, nuevoEstado: null, motivo: ""
  });

  const updateEstadoClienteConfirmed = async () => {
    const { item, nuevoEstado, motivo } = estadoModal;
    try {
      setMensaje(""); setError("");

      if (!ESTADOS_CLIENTE.includes(nuevoEstado)) {
        setError("Estado inválido para cliente.");
        return;
      }
      if (!motivo.trim()) {
        setError("Debes ingresar un motivo para el cambio de estado.");
        return;
      }

      const urlEstado = `${BASE_URLS["cliente"]}/estado/${item._id}`;
      // Enviamos suspendidoHasta: null por detrás
      const payload = {
        estado: aliasEstadoClienteOut(nuevoEstado),
        motivo: motivo.trim(),
        suspendidoHasta: null
      };

      // ⚠️ Usamos SOLO el endpoint de estado (evita 500 de /actualizar)
      const res = await fetch(urlEstado, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      let data = null;
      if (isJsonResponse(res)) data = await res.json();
      if (!res.ok) throw new Error(data?.msg || "No se pudo actualizar el estado.");

      setMensaje(`Estado actualizado a: ${payload.estado}`);
      closeEstadoModal();

      await fetchLista();
      if (expandido === item._id && tipo === "cliente") {
        cargarAuditoriaCliente(item._id, mapAuditoria[item._id]?.page || 1, mapAuditoria[item._id]?.limit || 10);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || "Error al actualizar el estado.");
    }
  };

  const updateEstadoEmprendedor = async (item, nuevoEstadoUI) => {
    try {
      setMensaje(""); setError("");
      const nuevoEstado = aliasEstadoClienteOut(nuevoEstadoUI); // por si alguien usa "Baneado"

      if (!ESTADOS_EMPRENDEDOR.includes(nuevoEstado)) {
        setError("Estado inválido para emprendedor.");
        return;
      }

      const urlEstado = `${BASE_URLS["emprendedor"]}/estado/${item._id}`;
      let res = await fetch(urlEstado, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ estado_Emprendedor: nuevoEstado }),
      });

      let data = null;
      if (isJsonResponse(res)) data = await res.json();
      if (!res.ok) throw new Error(data?.msg || "No se pudo actualizar el estado.");
      setMensaje(`Estado actualizado a: ${nuevoEstado}`);
      fetchLista();
    } catch (e) {
      console.error(e);
      setError(e.message || "Error al actualizar el estado.");
    }
  };

  const EstadoBadge = ({ estado }) => {
    const bg = ESTADO_COLORS[estado] || "#6b7280";
    return (
      <span aria-label={`Estado: ${estado}`} className="pill" style={{ backgroundColor: bg }}>
        {estado}
      </span>
    );
  };

  /* ===========================
     ANIDADOS: Emprendedor
  ============================ */
  const cargarNestedParaEmprendedor = async (emprendedor) => {
    if (!emprendedor?._id) return;
    setLoadingNested(true); setError("");

    const from = rangoFechas.from || "";
    const to   = rangoFechas.to   || "";

    const tryFetch = async (url) => {
      try {
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch {
        return null;
      }
    };

    const urlEmps = `${API_EMPRENDIMIENTOS}/by-emprendedor/${emprendedor._id}${from || to ? `?from=${from}&to=${to}` : ""}`;
    let emps = await tryFetch(urlEmps);
    if (!Array.isArray(emps)) {
      emps = catalogoEmprendimientos.filter((e) => {
        const owner = String(e?.emprendedor?._id || e?.emprendedorId || "") === String(emprendedor._id);
        const ts = e?.createdAt ? new Date(e.createdAt).getTime() : null;
        const inRange =
          !from && !to ? true : (!!ts && (!from || ts >= new Date(from).getTime()) && (!to || ts <= new Date(to).getTime()));
        return owner && inRange;
      });
    }

    const urlProds = `${API_PRODUCTOS}/by-emprendedor/${emprendedor._id}${from || to ? `?from=${from}&to=${to}` : ""}`;
    let prods = await tryFetch(urlProds);
    if (!Array.isArray(prods)) {
      prods = catalogoProductos.filter((p) => {
        const owner =
          String(p?.emprendimiento?.emprendedor?._id || p?.emprendimiento?.emprendedorId || "") ===
          String(emprendedor._id);
        const ts = p?.createdAt ? new Date(p.createdAt).getTime() : null;
        const inRange =
          !from && !to ? true : (!!ts && (!from || ts >= new Date(from).getTime()) && (!to || ts <= new Date(to).getTime()));
        return owner && inRange;
      });
    }

    setMapEmpEmprendimientos((prev) => ({ ...prev, [emprendedor._id]: emps }));
    setMapEmpProductos((prev) => ({ ...prev, [emprendedor._id]: prods }));
    setLoadingNested(false);
  };

  /* ===========================
     AUDITORÍA: Cliente
  ============================ */
  const cargarAuditoriaCliente = async (clienteId, page = 1, limit = 10) => {
    setMapAuditoria((prev) => ({
      ...prev,
      [clienteId]: { ...(prev[clienteId] || {}), loading: true, lastError: null }
    }));
    try {
      const url = `${BASE_URLS["cliente"]}/estado/${clienteId}/auditoria?page=${page}&limit=${limit}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok || !isJsonResponse(res)) {
        setMapAuditoria((prev) => ({
          ...prev,
          [clienteId]: { items: [], total: 0, page, limit, loading: false, lastError: res.ok ? null : `HTTP ${res.status}` }
        }));
        return;
      }

      const data = await res.json();
      setMapAuditoria((prev) => ({
        ...prev,
        [clienteId]: {
          items: Array.isArray(data.items) ? data.items : [],
          total: Number(data.total || 0),
          page: Number(data.page || page),
          limit: Number(data.limit || limit),
          loading: false,
          lastError: null
        }
      }));
    } catch (e) {
      console.error(e);
      setMapAuditoria((prev) => ({
        ...prev,
        [clienteId]: { items: [], total: 0, page, limit, loading: false, lastError: e.message || "error" }
      }));
    }
  };

  const onPaginarAud = (clienteId, dir = 0) => {
    const info = mapAuditoria[clienteId] || { page: 1, limit: 10, total: 0 };
    const totalPages = Math.max(1, Math.ceil((info.total || 0) / (info.limit || 10)));
    let nextPage = info.page + dir;
    if (nextPage < 1) nextPage = 1;
    if (nextPage > totalPages) nextPage = totalPages;
    if (nextPage !== info.page) cargarAuditoriaCliente(clienteId, nextPage, info.limit);
  };

  /* ===========================
     TOGGLE expandido
  ============================ */
  const toggleExpandido = async (id, item) => {
    const nuevo = expandido === id ? null : id;
    setExpandido(nuevo);

    if (nuevo && tipo === "emprendedor") {
      await cargarNestedParaEmprendedor(item);
    }
    if (nuevo && tipo === "cliente") {
      await cargarAuditoriaCliente(item._id, 1, 10);
    }
  };

  /* ===========================
     EXPORTS utilitarios
  ============================ */
  const exportCSV = (rows, filename) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      setError("No hay datos para exportar.");
      return;
    }
    const cols = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== "object");
    const header = cols.join(",");
    const body = rows
      .map((r) =>
        cols
          .map((c) => {
            const val = r[c] ?? "";
            const txt = String(val).replace(/"/g, '""');
            return `"${txt}"`;
          })
          .join(",")
      )
      .join("\n");
    const csv = [header, body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMensaje("Exportación CSV lista.");
  };

  const exportPDF = (htmlTitle, rows, mapper) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      setError("No hay datos para exportar.");
      return;
    }
    const win = window.open("", "_blank");
    const now = new Date().toLocaleString();
    const tableRows = rows
      .map(
        (r) =>
          `<tr>${mapper(r)
            .map((cell) => `<td style="padding:8px;border:1px solid #ddd">${cell}</td>`)
            .join("")}</tr>`
      )
      .join("");
    win.document.write(`
      <html><head><title>${htmlTitle}</title></head>
      <body style="font-family:Segoe UI,Arial,sans-serif">
        <h2 style="margin:0 0 4px">${htmlTitle}</h2>
        <p style="color:#666;font-size:12px;margin:0 0 12px">Generado: ${now}</p>
        <table style="border-collapse:collapse;width:100%;font-size:13px">
          <thead>
            <tr style="background:#e9f0ff">
              ${mapper({header:true})
                .map((h) => `<th style="padding:8px;border:1px solid #bbb;text-align:left">${h}</th>`)
                .join("")}
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    setMensaje("Exportación PDF lista.");
  };

  /* ===========================
     CHAT
  ============================ */
  const abrirChat = (item) => {
    setChatUser({ id: item._id, rol: capitalize(tipo), nombre: item.nombre });
    setModalChatVisible(true);
    cargarMensajes(item._id);
  };
  const cerrarChat = () => {
    setModalChatVisible(false);
    setChatUser(null);
    setMensajes([]);
    setMensajeChat("");
  };
  const cargarMensajes = async (receptorId) => {
    if (!receptorId) return;
    try {
      const resConv = await fetch(
        `https://backend-production-bd1d.up.railway.app/api/chat/conversaciones/${emisorId}`
      );
      const dataConv = await resConv.json();
      const conversacion = Array.isArray(dataConv)
        ? dataConv.find((conv) =>
            conv.participantes?.some((p) => p.id && p.id._id === receptorId)
          )
        : null;

      if (!conversacion) {
        setMensajes([]);
        return;
      }

      const resMsgs = await fetch(
        `https://backend-production-bd1d.up.railway.app/api/chat/mensajes/${conversacion._id}`
      );
      const dataMsgs = await resMsgs.json();
      setMensajes(Array.isArray(dataMsgs) ? dataMsgs : []);
    } catch (error) {
      setError("No se pudieron cargar los mensajes.");
    }
  };
  const enviarMensaje = async (e) => {
    e.preventDefault();
    if (!mensajeChat.trim() || !chatUser || !emisorId || !emisorRol) return;
    try {
      const res = await fetch("https://backend-production-bd1d.up.railway.app/api/chat/mensaje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emisorId,
          emisorRol,
          receptorId: chatUser.id,
          receptorRol: chatUser.rol,
          contenido: mensajeChat.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMensajeChat("");
        cargarMensajes(chatUser.id);
      } else {
        setError(data.mensaje || "No se pudo enviar el mensaje.");
      }
    } catch (error) {
      setError("Error de red al enviar mensaje.");
    }
  };
  useEffect(() => {
    if (mensajesRef.current) {
      mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
    }
  }, [mensajes]);
  useEffect(() => {
    if (!modalChatVisible || !chatUser) return;
    const intervalo = setInterval(() => cargarMensajes(chatUser.id), 3000);
    return () => clearInterval(intervalo);
  }, [modalChatVisible, chatUser]);

  /* ===========================
     FILTRO LOCAL
  ============================ */
  const listaFiltrada = lista.filter((x) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const campos = [x.nombre, x.apellido, x.email, x.telefono].map((v) => String(v || "").toLowerCase());
    return campos.some((c) => c.includes(q));
  });

  /* ===========================
     RENDER
  ============================ */
  return (
    <div className="wrap">
      {/* CSS global del componente */}
      <style>{css}</style>

      {/* ====== ENCABEZADO ====== */}
      <header className="hdr">
        <div>
          <h1 className="ttl">Panel de Administración</h1>
          <div className="subTtl">
            {capitalize(tipo)}s • {loadingLista ? "Cargando…" : `${listaFiltrada.length} resultados`}
          </div>
        </div>

        <div className="toolbar">
          <div role="tablist" aria-label="Tipo de listado" className="segmented">
            <button
              role="tab"
              aria-selected={tipo === "cliente"}
              className={tipo === "cliente" ? "segBtn active" : "segBtn"}
              onClick={() => setTipo("cliente")}
            >
              👥 Clientes
            </button>
            <button
              role="tab"
              aria-selected={tipo === "emprendedor"}
              className={tipo === "emprendedor" ? "segBtn active" : "segBtn"}
              onClick={() => setTipo("emprendedor")}
            >
              🧑‍💼 Emprendedores
            </button>
          </div>

          <div className="searchBox">
            <input
              aria-label="Buscar en el listado"
              type="search"
              placeholder={`Buscar ${capitalize(tipo)} por nombre, apellido, email o teléfono…`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="searchInput"
            />
            <button className="btn ghost" onClick={fetchLista} title="Actualizar listado">↻</button>
          </div>
        </div>
      </header>

      {/* Mensajes toast */}
      <div className="toastRegion" aria-live="polite" aria-atomic="true">
        {error && <div className="toast toastErr">⚠️ {error}</div>}
        {mensaje && <div className="toast toastOk">✅ {mensaje}</div>}
      </div>

      {/* ====== FORM: CREAR ====== */}
      <section className="card" aria-label="Crear">
        <div className="cardHeader">
          <h2 className="cardTitle">Crear {capitalize(tipo)}</h2>
        </div>
        <form onSubmit={handleCrear}>
          <div className="grid2">
            <div className="formGroup">
              <label className="label">Nombre</label>
              <input
                className="input"
                placeholder="Ej. Ana"
                value={formCrear.nombre}
                onChange={(e) => setFormCrear({ ...formCrear, nombre: e.target.value })}
                required
              />
            </div>
            <div className="formGroup">
              <label className="label">Apellido</label>
              <input
                className="input"
                placeholder="Ej. Pérez"
                value={formCrear.apellido}
                onChange={(e) => setFormCrear({ ...formCrear, apellido: e.target.value })}
                required
              />
            </div>
            <div className="formGroup">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="nombre@dominio.com"
                value={formCrear.email}
                onChange={(e) => setFormCrear({ ...formCrear, email: e.target.value })}
                required
              />
            </div>
            <div className="formGroup">
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={formCrear.password}
                onChange={(e) => setFormCrear({ ...formCrear, password: e.target.value })}
                required
              />
            </div>
            <div className="formGroup">
              <label className="label">Teléfono</label>
              <input
                className="input"
                placeholder="Ej. 0999999999"
                value={formCrear.telefono}
                onChange={(e) => setFormCrear({ ...formCrear, telefono: e.target.value })}
              />
            </div>
          </div>

          <div className="cardFooter">
            <button className="btn primary" type="submit">Crear</button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => setFormCrear(emptyForm)}
              title="Limpiar formulario"
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>

      {/* ====== FORM: EDITAR ====== */}
      {formEditar.id && (
        <section className="card" aria-label="Editar">
          <div className="cardHeader">
            <h2 className="cardTitle">Editar {capitalize(tipo)}</h2>
          </div>
          <form onSubmit={handleActualizar}>
            <div className="grid2">
              <div className="formGroup">
                <label className="label">Nombre</label>
                <input
                  className="input"
                  value={formEditar.nombre}
                  onChange={(e) => setFormEditar({ ...formEditar, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="formGroup">
                <label className="label">Apellido</label>
                <input
                  className="input"
                  value={formEditar.apellido}
                  onChange={(e) => setFormEditar({ ...formEditar, apellido: e.target.value })}
                  required
                />
              </div>
              <div className="formGroup">
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={formEditar.email}
                  onChange={(e) => setFormEditar({ ...formEditar, email: e.target.value })}
                  required
                />
              </div>
              <div className="formGroup">
                <label className="label">Password (opcional)</label>
                <input
                  className="input"
                  type="password"
                  value={formEditar.password}
                  onChange={(e) => setFormEditar({ ...formEditar, password: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label className="label">Teléfono</label>
                <input
                  className="input"
                  value={formEditar.telefono}
                  onChange={(e) => setFormEditar({ ...formEditar, telefono: e.target.value })}
                />
              </div>
            </div>

            <div className="cardFooter">
              <button className="btn primary" type="submit">Actualizar</button>
              <button
                className="btn secondary"
                type="button"
                onClick={() => setFormEditar({ id: null, ...emptyForm })}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ====== LISTADO ====== */}
      <section aria-label="Listado principal" className="card">
        <div className="cardHeader">
          <h2 className="cardTitle">Listado de {capitalize(tipo)}s</h2>
        </div>

        {/* Vista tabla (>=768px) */}
        <div className="tableWrap hideOnMobile">
          <table className="table">
            <thead>
              <tr>
                <th className="th">#</th>
                <th className="th">Nombre</th>
                <th className="th">Apellido</th>
                <th className="th">Email</th>
                <th className="th">Teléfono</th>
                <th className="th">Estado</th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingLista && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`}>
                      <td className="td"><div className="skl w40" /></td>
                      <td className="td"><div className="skl" /></td>
                      <td className="td"><div className="skl" /></td>
                      <td className="td"><div className="skl" /></td>
                      <td className="td"><div className="skl w80" /></td>
                      <td className="td"><div className="skl w80" /></td>
                      <td className="td"><div className="skl w120" /></td>
                    </tr>
                  ))}
                </>
              )}

              {!loadingLista && listaFiltrada.length === 0 && (
                <tr>
                  <td colSpan="7" className="emptyCell">
                    <div style={{ fontSize: 24 }}>🗂️</div>
                    <div style={{ color: "#666" }}>No hay {capitalize(tipo)}s para mostrar.</div>
                  </td>
                </tr>
              )}

              {!loadingLista &&
                listaFiltrada.map((item, i) => (
                  <React.Fragment key={item._id}>
                    <tr
                      className={`row ${expandido === item._id ? "rowActive" : ""}`}
                      onClick={() => toggleExpandido(item._id, item)}
                      aria-expanded={expandido === item._id}
                    >
                      <td className="td">{i + 1}</td>
                      <td className="td">
                        <span className="nameStrong">{item.nombre}</span>
                        <EstadoBadge estado={getEstado(item)} />
                      </td>
                      <td className="td">{item.apellido}</td>
                      <td className="td">{item.email}</td>
                      <td className="td">{item.telefono || "N/A"}</td>

                      <td className="td">
                        <div className="inline">
                          <label htmlFor={`sel-${item._id}`} className="labelInlineSmall">Estado:</label>
                          <select
                            id={`sel-${item._id}`}
                            aria-label="Cambiar estado/advertencia"
                            value={getEstado(item)}
                            onChange={(e) => { e.stopPropagation(); openEstadoModal(item, e.target.value); }}
                            className="select"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {getEstadosPermitidos().map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                            {/* Alias visible (opcional): si eliges, puedes añadir “Baneado (alias)” que internamente mapeamos a Suspendido
                            <option value="Baneado">Baneado (alias)</option>
                            */}
                          </select>
                        </div>
                      </td>

                      <td className="td">
                        <div className="actions">
                          <button
                            className="btn tiny"
                            onClick={(e) => { e.stopPropagation(); prepararEditar(item); }}
                            title="Editar"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            className="btn tiny danger"
                            onClick={(e) => { e.stopPropagation(); solicitarEliminar(item); }}
                            title="Eliminar"
                          >
                            🗑️ Eliminar
                          </button>
                          <button
                            className="btn tiny"
                            onClick={(e) => { e.stopPropagation(); abrirChat(item); }}
                            title="Chatear"
                          >
                            💬 Chat
                          </button>
                          <button
                            className={`btn tiny ${getEstado(item) === "Suspendido" ? "disabled" : "warn"}`}
                            disabled={getEstado(item) === "Suspendido"}
                            title={getEstado(item) === "Suspendido" ? "El cliente ya está suspendido" : "Agregar siguiente advertencia"}
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = siguienteAdvertencia(getEstado(item));
                              openEstadoModal(item, next);
                            }}
                          >
                            ⚠️ Advertencia
                          </button>
                          {/* Atajo directo a “Baneado” (alias) */}
                          <button
                            className={`btn tiny danger ${getEstado(item) === "Suspendido" ? "disabled" : ""}`}
                            disabled={getEstado(item) === "Suspendido"}
                            title="Marcar como Baneado (envía Suspendido)"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEstadoModal(item, "Baneado");
                            }}
                          >
                            🚫 Baneado
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* DETALLES EXPANDIDOS (desktop) */}
                    {expandido === item._id && (
                      <tr>
                        <td colSpan="7" className="detailsCell">
                          {/* Datos generales */}
                          <div className="detailsGrid">
                            <div className="detailItem">
                              <div className="detailLabel">Nombre completo</div>
                              <div className="detailValue">{item.nombre} {item.apellido}</div>
                            </div>
                            <div className="detailItem">
                              <div className="detailLabel">Email</div>
                              <div className="detailValue">{item.email}</div>
                            </div>
                            <div className="detailItem">
                              <div className="detailLabel">Teléfono</div>
                              <div className="detailValue">{item.telefono || "N/A"}</div>
                            </div>
                            <div className="detailItem">
                              <div className="detailLabel">Creado</div>
                              <div className="detailValue">{fmtFechaLocal(item.createdAt)}</div>
                            </div>
                            <div className="detailItem">
                              <div className="detailLabel">Actualizado</div>
                              <div className="detailValue">{fmtFechaLocal(item.updatedAt)}</div>
                            </div>
                          </div>

                          {/* HISTORIAL (solo cliente) */}
                          {tipo === "cliente" && (
                            <div className="histWrap">
                              <div className="sectionHeader">
                                <h4 className="sectionTitle">Historial de Advertencias / Suspensiones</h4>
                                <div className="inline">
                                  <button
                                    className="btn tiny"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await cargarAuditoriaCliente(item._id, mapAuditoria[item._id]?.page || 1, mapAuditoria[item._id]?.limit || 10);
                                      setMensaje("Historial actualizado");
                                    }}
                                  >
                                    ↻ Actualizar
                                  </button>
                                  <button
                                    className="btn tiny"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const info = mapAuditoria[item._id] || { items: [] };
                                      const rows = (info.items || []).map((a) => ({
                                        fecha: fmtFechaLocal(a.fecha),
                                        tipo: a.tipo || "",
                                        motivo: a.motivo || "",
                                        origen: a.origen || "",
                                        modificadoPor: displayActorName(a),
                                        ip: a.ip || "",
                                        userAgent: a.userAgent || ""
                                      }));
                                      if (!rows.length) { setError("No hay registros para exportar."); return; }
                                      exportCSV(rows, `historial_${item.nombre}_${item.apellido}`);
                                    }}
                                  >
                                    ⬇️ CSV
                                  </button>
                                  <button
                                    className="btn tiny"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const info = mapAuditoria[item._id] || { items: [] };
                                      const rows = info.items || [];
                                      if (!rows.length) { setError("No hay registros para exportar."); return; }
                                      const mapper = (r) =>
                                        r?.header
                                          ? ["Fecha", "Tipo", "Motivo", "Origen", "Modificado por", "IP", "UA"]
                                          : [
                                              fmtFechaLocal(r.fecha),
                                              r.tipo || "",
                                              r.motivo || "",
                                              r.origen || "",
                                              displayActorName(r) || "",
                                              r.ip || "",
                                              r.userAgent || ""
                                            ];
                                      exportPDF(`Historial de ${item.nombre} ${item.apellido}`, rows, mapper);
                                    }}
                                  >
                                    🖨️ PDF
                                  </button>
                                </div>
                              </div>

                              <div className="tableWrap">
                                <table className="table mt8">
                                  <thead>
                                    <tr>
                                      <th className="th">Fecha</th>
                                      <th className="th">Tipo</th>
                                      <th className="th">Motivo</th>
                                      <th className="th">Origen</th>
                                      <th className="th">Modificado por</th>
                                      <th className="th">IP</th>
                                      <th className="th">User-Agent</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(mapAuditoria[item._id]?.loading) && (
                                      <tr><td colSpan="7" className="emptyCell">Cargando historial…</td></tr>
                                    )}

                                    {!mapAuditoria[item._id]?.loading &&
                                      (mapAuditoria[item._id]?.items || []).length === 0 && (
                                      <tr><td colSpan="7" className="emptyCell">
                                        {mapAuditoria[item._id]?.lastError
                                          ? `No se pudo obtener el historial (${mapAuditoria[item._id].lastError}).`
                                          : "Sin registros."
                                        }
                                      </td></tr>
                                    )}

                                    {!mapAuditoria[item._id]?.loading &&
                                      (mapAuditoria[item._id]?.items || []).map((a, idx) => (
                                      <tr key={`${a._id || idx}`}>
                                        <td className="td">{fmtFechaLocal(a.fecha)}</td>
                                        <td className="td">{a.tipo || "—"}</td>
                                        <td className="td">{a.motivo || "—"}</td>
                                        <td className="td">{a.origen || "—"}</td>
                                        <td className="td">{displayActorName(a)}</td>
                                        <td className="td">{a.ip || "—"}</td>
                                        <td className="td" title={a.userAgent || ""}>
                                          {a.userAgent ? (a.userAgent.length > 24 ? a.userAgent.slice(0,24) + "…" : a.userAgent) : "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="paginate">
                                <div className="muted">Total: <strong>{mapAuditoria[item._id]?.total || 0}</strong></div>
                                <div className="inline">
                                  <button
                                    className="btn tiny"
                                    onClick={(e) => { e.stopPropagation(); onPaginarAud(item._id, -1); }}
                                  >
                                    ◀ Anterior
                                  </button>
                                  <span className="muted">
                                    Página {mapAuditoria[item._id]?.page || 1} / {Math.max(1, Math.ceil((mapAuditoria[item._id]?.total || 0) / (mapAuditoria[item._id]?.limit || 10)))}
                                  </span>
                                  <button
                                    className="btn tiny"
                                    onClick={(e) => { e.stopPropagation(); onPaginarAud(item._id, +1); }}
                                  >
                                    Siguiente ▶
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        </div>

        {/* Vista tarjetas (mobile <768px) */}
        <div className="cardsWrap showOnMobile">
          {loadingLista && (
            <div className="mobileEmpty">Cargando…</div>
          )}

          {!loadingLista && listaFiltrada.length === 0 && (
            <div className="mobileEmpty">
              <div style={{ fontSize: 24 }}>🗂️</div>
              <div style={{ color: "#666" }}>No hay {capitalize(tipo)}s para mostrar.</div>
            </div>
          )}

          {!loadingLista && listaFiltrada.map((item, i) => (
            <div
              key={item._id}
              className={`mCard ${expandido === item._id ? "mCardActive" : ""}`}
            >
              <div className="mCardHeader" onClick={() => toggleExpandido(item._id, item)}>
                <div className="mCardTitle">
                  <span className="idx">#{i + 1}</span>
                  <span className="nm">{item.nombre} {item.apellido}</span>
                  <EstadoBadge estado={getEstado(item)} />
                </div>
                <div className="mCardMeta">{item.email}</div>
                <div className="mCardMeta">{item.telefono || "N/A"}</div>
              </div>

              <div className="mCardToolbar">
                <select
                  aria-label="Cambiar estado/advertencia"
                  value={getEstado(item)}
                  onChange={(e) => openEstadoModal(item, e.target.value)}
                  className="select full"
                >
                  {getEstadosPermitidos().map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  {/* <option value="Baneado">Baneado (alias)</option> */}
                </select>

                <div className="mActions">
                  <button className="btn tiny" onClick={() => prepararEditar(item)}>✏️ Editar</button>
                  <button className="btn tiny danger" onClick={() => solicitarEliminar(item)}>🗑️ Eliminar</button>
                  <button className="btn tiny" onClick={() => abrirChat(item)}>💬 Chat</button>
                  <button
                    className={`btn tiny ${getEstado(item) === "Suspendido" ? "disabled" : "warn"}`}
                    disabled={getEstado(item) === "Suspendido"}
                    onClick={() => openEstadoModal(item, siguienteAdvertencia(getEstado(item)))}
                  >
                    ⚠️ Advertencia
                  </button>
                  <button
                    className={`btn tiny danger ${getEstado(item) === "Suspendido" ? "disabled" : ""}`}
                    disabled={getEstado(item) === "Suspendido"}
                    onClick={() => openEstadoModal(item, "Baneado")}
                  >
                    🚫 Baneado
                  </button>
                </div>
              </div>

              {expandido === item._id && (
                <div className="mCardBody">
                  <div className="detailItem">
                    <div className="detailLabel">Creado</div>
                    <div className="detailValue">{fmtFechaLocal(item.createdAt)}</div>
                  </div>
                  <div className="detailItem">
                    <div className="detailLabel">Actualizado</div>
                    <div className="detailValue">{fmtFechaLocal(item.updatedAt)}</div>
                  </div>

                  {tipo === "cliente" && (
                    <div className="mt12">
                      <div className="sectionHeader">
                        <h4 className="sectionTitle">Historial</h4>
                        <div className="inline">
                          <button
                            className="btn tiny"
                            onClick={async () => {
                              await cargarAuditoriaCliente(item._id, mapAuditoria[item._id]?.page || 1, mapAuditoria[item._id]?.limit || 10);
                              setMensaje("Historial actualizado");
                            }}
                          >
                            ↻
                          </button>
                          <button
                            className="btn tiny"
                            onClick={() => {
                              const info = mapAuditoria[item._id] || { items: [] };
                              const rows = (info.items || []).map((a) => ({
                                fecha: fmtFechaLocal(a.fecha),
                                tipo: a.tipo || "",
                                motivo: a.motivo || "",
                                origen: a.origen || "",
                                modificadoPor: displayActorName(a),
                                ip: a.ip || "",
                                userAgent: a.userAgent || ""
                              }));
                              if (!rows.length) { setError("No hay registros para exportar."); return; }
                              exportCSV(rows, `historial_${item.nombre}_${item.apellido}`);
                            }}
                          >
                            ⬇️ CSV
                          </button>
                        </div>
                      </div>

                      <div className="mHistory">
                        {mapAuditoria[item._id]?.loading && (
                          <div className="muted">Cargando historial…</div>
                        )}
                        {!mapAuditoria[item._id]?.loading &&
                          (mapAuditoria[item._id]?.items || []).length === 0 && (
                          <div className="muted">Sin registros.</div>
                        )}
                        {!mapAuditoria[item._id]?.loading &&
                          (mapAuditoria[item._id]?.items || []).map((a, idx) => (
                          <div className="mHistoryItem" key={`${a._id || idx}`}>
                            <div className="mHistoryRow">
                              <span className="badge">{a.tipo || "—"}</span>
                              <span className="muted">{fmtFechaLocal(a.fecha)}</span>
                            </div>
                            <div className="mHistoryMeta">
                              <span className="muted">Motivo:</span> {a.motivo || "—"}
                            </div>
                            <div className="mHistoryMeta">
                              <span className="muted">Origen:</span> {a.origen || "—"}
                            </div>
                            <div className="mHistoryMeta">
                              <span className="muted">Modificado por:</span> {displayActorName(a)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="paginate">
                        <button className="btn tiny" onClick={() => onPaginarAud(item._id, -1)}>◀</button>
                        <span className="muted">
                          {mapAuditoria[item._id]?.page || 1} / {Math.max(1, Math.ceil((mapAuditoria[item._id]?.total || 0) / (mapAuditoria[item._id]?.limit || 10)))}
                        </span>
                        <button className="btn tiny" onClick={() => onPaginarAud(item._id, +1)}>▶</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ====== MODAL: CAMBIO DE ESTADO CLIENTE ====== */}
      {estadoModal.visible && tipo === "cliente" && (
        <div className="modalOverlay" onKeyDown={(e) => e.key === "Escape" && closeEstadoModal()}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Confirmar cambio de estado">
            <div className="modalHeader">
              <h3 className="modalTitle">
                Cambiar estado a <span className="pill soft">{estadoModal.nuevoEstado}</span>
              </h3>
              <button className="btn close" onClick={closeEstadoModal} aria-label="Cerrar">✖</button>
            </div>

            <div className="modalBody">
              <div className="formGroup">
                <label className="label">Motivo <span className="req">*</span></label>
                <textarea
                  rows={4}
                  value={estadoModal.motivo}
                  onChange={(e) => setEstadoModal((s) => ({ ...s, motivo: e.target.value }))}
                  placeholder="Describe brevemente el motivo…"
                  className="input"
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>

            <div className="modalFooter">
              <button className="btn secondary" onClick={closeEstadoModal}>Cancelar</button>
              <button className="btn primary" onClick={updateEstadoClienteConfirmed}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL CONFIRM ELIMINACIÓN ====== */}
      {confirmDelete.visible && (
        <div className="modalOverlay">
          <div className="modal" role="dialog" aria-modal="true" aria-label="Confirmar eliminación">
            <div className="modalHeader">
              <h3 className="modalTitle">Confirmar eliminación</h3>
              <button className="btn close" onClick={cancelarEliminar} aria-label="Cerrar">✖</button>
            </div>
            <div className="modalBody">
              <p className="p">
                ¿Eliminar {capitalize(tipo)} <strong>{confirmDelete.nombre}</strong>? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="modalFooter">
              <button className="btn secondary" onClick={cancelarEliminar}>Cancelar</button>
              <button className="btn danger" onClick={confirmarEliminar}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL CHAT ====== */}
      {modalChatVisible && chatUser && (
        <div className="modalOverlay" onKeyDown={(e) => e.key === "Escape" && cerrarChat()}>
          <div className="modal" role="dialog" aria-modal="true" aria-label={`Chat con ${chatUser.nombre}`}>
            <div className="modalHeader">
              <h3 className="modalTitle">
                Chat con <strong>{chatUser.nombre}</strong> <span className="muted">({chatUser.rol})</span>
              </h3>
              <button className="btn close" onClick={cerrarChat} aria-label="Cerrar">✖</button>
            </div>
            <div className="modalBody" style={{ minHeight: 150 }} ref={mensajesRef}>
              {mensajes.length === 0 && (
                <p className="muted" style={{ textAlign: "center", margin: 0 }}>No hay mensajes aún.</p>
              )}
              {mensajes.map((m) => {
                const esEmisor = m.emisorId === emisorId;
                return (
                  <div key={m._id} style={{ marginBottom: 10, textAlign: esEmisor ? "right" : "left" }}>
                    <span className={`chatBubble ${esEmisor ? "right" : "left"}`}>
                      {m.contenido}
                    </span>
                    <br />
                    <small className="muted">{fmtHoraLocal(m.createdAt)}</small>
                  </div>
                );
              })}
            </div>
            <form className="modalFooter" onSubmit={(e) => { e.preventDefault(); enviarMensaje(e); }}>
              <input
                type="text"
                placeholder="Escribe un mensaje…"
                value={mensajeChat}
                onChange={(e) => setMensajeChat(e.target.value)}
                className="input flexGrow"
                autoFocus
              />
              <button type="submit" className="btn primary">Enviar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ===========================
   CSS (Responsivo + UX mejorado)
=========================== */
const css = `
:root{
  --bg:#f8fafc;
  --card:#ffffff;
  --bd:#e2e8f0;
  --bd-strong:#0ea5e9;
  --txt:#1f2937;
  --muted:#64748b;
  --muted2:#475569;
  --ok:#0ea5e9;
  --ok-strong:#0284c7;
  --warn:#f59e0b;
  --danger:#dc2626;
  --success:#16a34a;
  --shadow:0 1px 4px rgba(0,0,0,0.05);
  --shadow-lg:0 10px 25px rgba(0,0,0,0.15);
  --radius:12px;
  --radius-sm:8px;
  --space:16px;
}

*{box-sizing:border-box}
.wrap{
  max-width: 1100px;
  margin: auto;
  padding: 16px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: var(--txt);
}
.hdr{
  display:grid;
  grid-template-columns: 1fr auto;
  gap:12px;
  align-items:center;
  margin-bottom:16px;
}
.ttl{ margin:0; font-size:24px; font-weight:800; }
.subTtl{ margin-top:4px; color:var(--muted); font-size:13px; }
.toolbar{ display:flex; gap:12px; align-items:center; justify-content:flex-end; flex-wrap:wrap; }

.segmented{
  display:inline-flex;
  border:1px solid var(--bd);
  border-radius: var(--radius-sm);
  overflow:hidden;
  background:#fff;
}
.segBtn{
  padding:8px 12px;
  background:#fff;
  color:#334155;
  border:none;
  cursor:pointer;
  font-weight:700;
}
.segBtn.active{ background:var(--ok); color:#fff; }

.searchBox{ display:flex; gap:8px; align-items:center; }
.searchInput{
  width:280px; max-width:60vw;
  padding:8px 10px; border-radius: var(--radius-sm);
  border:1px solid var(--bd); outline:none;
}
.toastRegion{ position:fixed; top:14px; right:14px; display:grid; gap:8px; z-index:10000; }
.toast{
  padding:10px 12px; border-radius:10px; box-shadow: var(--shadow);
  font-size:13px; min-width:240px;
}
.toastErr{ background:#ffe8e6; color:#a33; }
.toastOk{ background:#e7f9ed; color:#1e7e34; }

.card{
  margin-bottom: 16px; padding: 16px;
  border:1px solid var(--bd); border-radius: var(--radius);
  background: var(--card); box-shadow: var(--shadow);
}
.cardHeader{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.cardTitle{ margin:0; font-size:18px; font-weight:800; }
.cardFooter{ display:flex; gap:8px; margin-top:8px; flex-wrap:wrap; }

.grid2{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
.formGroup{ display:flex; flex-direction:column; gap:6px; }
.label{ font-size:13px; color:var(--muted2); font-weight:700; }
.input{
  width:100%; padding:10px; border-radius: var(--radius-sm);
  border:1px solid var(--bd); outline:none; background:#fff;
}
.labelInlineSmall{ font-size:12px; color:var(--muted); margin-right:6px; }

.btn{
  padding:10px 16px; border-radius: var(--radius-sm); border: none; cursor: pointer; font-weight:700;
  background:#fff; color:#0ea5e9; border:1px solid var(--ok);
}
.btn.primary{ background: var(--ok); color:#fff; border:none; }
.btn.primary:hover{ background: var(--ok-strong); }
.btn.secondary{ background:#64748b; color:#fff; }
.btn.ghost{ background:#ffffff; color:var(--ok); border:1px solid var(--ok); }
.btn.danger{ background: var(--danger); color:#fff; border:none; }
.btn.warn{ background: var(--warn); color:#fff; border:none; }
.btn.disabled{ opacity:.5; cursor:not-allowed; }
.btn.tiny{ padding:6px 10px; border-radius:6px; font-size:13px; }
.btn.close{ background:#ef4444; color:#fff; border:none; padding:6px 10px; border-radius:8px; font-weight:800; }
.inline{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

.tableWrap{ overflow-x:auto; }
.table{ width:100%; border-collapse: collapse; }
.th{
  border-bottom: 2px solid var(--bd-strong); padding:10px; text-align:left; background:#eaf7ff;
  font-weight:800; font-size:13px; color:var(--txt); position:sticky; top:0; z-index:1;
}
.td{ border-bottom:1px solid #e5e7eb; padding:10px; vertical-align: top; font-size:14px; }
.row{ background:#fff; cursor:pointer; }
.row:hover{ background:#f8fbff; }
.rowActive{ background:#f5faff; }

.nameStrong{ font-weight:800; margin-right:6px; }
.select{
  padding:8px 10px; border-radius: var(--radius-sm); border:1px solid var(--bd); background:#fff;
}
.actions{ display:flex; gap:6px; flex-wrap:wrap; }

.emptyCell{ text-align:center; padding:20px; color:#666; font-size:14px; }

.detailsCell{ padding:12px; background:#f7fbff; border-top:1px solid #e6eef8; }
.detailsGrid{ display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:12px; }
.detailItem{ padding:10px; border:1px solid var(--bd); border-radius:10px; background:#fff; }
.detailLabel{ font-size:12px; color:var(--muted); font-weight:700; margin-bottom:4px; }
.detailValue{ font-size:14px; color:var(--txt); }

.sectionHeader{ display:flex; justify-content:space-between; align-items:center; }
.sectionTitle{ margin:0; color:var(--ok); }
.mt8{ margin-top:8px; }
.mt12{ margin-top:12px; }
.muted{ color:var(--muted); font-size:13px; }

.paginate{ display:flex; align-items:center; justify-content:space-between; margin-top:10px; }

.pill{
  display:inline-block; margin-left:6px; padding:2px 10px; border-radius:999px; font-size:12px; color:#fff; line-height:18px;
}
.pill.soft{
  background:#0ea5e922; color:#0ea5e9; border:1px solid #0ea5e944;
  padding:2px 8px;
}

/* Skeletons */
.skl{ height:14px; width:100%; background:linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%); background-size:400% 100%; animation:shimmer 1.4s ease infinite; border-radius:6px; }
.skl.w40{ width:40px; }
.skl.w80{ width:80px; }
.skl.w120{ width:120px; }
@keyframes shimmer{ 0%{background-position:100% 0} 100%{background-position:0 0} }

/* Mobile Cards */
.showOnMobile{ display:none; }
.hideOnMobile{ display:block; }

.mCard{
  border:1px solid var(--bd); border-radius: var(--radius); background:#fff; box-shadow: var(--shadow);
  padding:12px; margin-bottom:12px;
}
.mCardActive{ outline:2px solid var(--bd-strong); }
.mCardHeader{ cursor:pointer; }
.mCardTitle{ display:flex; align-items:center; gap:8px; font-weight:800; }
.idx{ color:var(--muted); }
.mCardMeta{ color:var(--muted); font-size:13px; margin-top:2px; }
.mCardToolbar{ display:grid; grid-template-columns: 1fr; gap:8px; margin-top:10px; }
.select.full{ width:100%; }
.mActions{ display:flex; gap:6px; flex-wrap:wrap; }
.mCardBody{ margin-top:10px; }

.mHistory{ display:grid; gap:8px; }
.mHistoryItem{ border:1px solid var(--bd); border-radius:10px; padding:10px; background:#fff; }
.mHistoryRow{ display:flex; align-items:center; justify-content:space-between; }
.badge{
  background:#e2e8f0; color:#0f172a; padding:2px 8px; border-radius:999px; font-size:12px;
}
.mobileEmpty{ text-align:center; color:var(--muted); padding:16px; }

.modalOverlay{
  position:fixed; inset:0; background:rgba(0,0,0,.45);
  display:flex; justify-content:center; align-items:center; z-index:9999; padding:12px;
}
.modal{
  background:#fff; border-radius: var(--radius); width:520px; max-width:95%;
  box-shadow: var(--shadow-lg); display:flex; flex-direction:column; overflow:hidden;
}
.modalHeader{
  padding:12px 16px; background: var(--ok); color:#fff; display:flex; justify-content:space-between; align-items:center; font-weight:800; font-size:16px;
}
.modalTitle{ margin:0; }
.modalBody{ padding:16px; min-height:120px; font-size:14px; color:#333; overflow-y:auto; }
.modalFooter{ padding:12px; border-top:1px solid var(--bd); display:flex; justify-content:flex-end; gap:8px; }
.req{ color:#dc2626; }

.chatBubble{
  display:inline-block; padding:8px 12px; border-radius:15px; max-width:70%; word-wrap:break-word;
  background:#e4e6eb; color:#111827;
}
.chatBubble.right{ background:#0284c7; color:#fff; }
.flexGrow{ flex-grow:1; }

/* RESPONSIVE */
@media (max-width: 768px){
  .hdr{ grid-template-columns: 1fr; }
  .grid2{ grid-template-columns: 1fr; }
  .showOnMobile{ display:block; }
  .hideOnMobile{ display:none; }
  .searchInput{ width:100%; max-width:100%; }
  .detailsGrid{ grid-template-columns: 1fr; }
}
`;

export default Table;
