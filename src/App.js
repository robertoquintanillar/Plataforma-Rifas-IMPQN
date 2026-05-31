import { useState, useEffect, useCallback, useMemo } from "react";
import React from 'react';
import confetti from 'canvas-confetti';

// ─────────────────────────────────────────────────────────────────────────────
// ⚙️  CONFIGURACIÓN — Edita estos valores antes de publicar
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  totalNumeros: 2000,
  precioPorNumero: 3000,
  premio1: "Refrigerador Samsung 253L",
  premio2: "Televisor LG 55 pulgadas",
  premio3: "Licuadora Oster",
  fechaSorteo: "15 septiembre del 2026",
  maxPorPersona: 50,
  nombreIglesia: "Iglesia Metodista Pentecostal de Quinta Normal",

  nombreCuenta: "Margarita del carmen Alvarez",
  rutCuenta: "9155390-2",
  banco: "Estado de Chile",
  tipoCuenta: "Vista",
  numeroCuenta: "9155390",
  Mail: "margaritaalvarezc@gmail.com",
  Motivo: "Pago números xxx",
 
  
  whatsappAdmin: "56992191358",
  emailAdmin: "quintanormal.imp@gmail.com",
  adminPassword: "Admin_IMPQN2026",

  // ─── SUPABASE ─────────────────────────────────────────────────────────────
  supabaseUrl: "https://ykqbswfbampfjyxwivvn.supabase.co",
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcWJzd2ZiYW1wZmp5eHdpdnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Nzk1OTEsImV4cCI6MjA5NDU1NTU5MX0.rxN-FGF6JuSNKWpNjVqhmTigJm2L8IHhuRtjJI4oB-0",

  // ─── RESEND (correos) ─────────────────────────────────────────────────────
  resendApiKey: "re_LViYq1tr_6UywE63tXwJfEQUNezGzyjYU",
  resendFromEmail: "rifa@impquintanormal.cl",

  // ─── NUEVA SECCIÓN DE COLORES ─────────────────────────────────────────────
  colores: {
    primario: "#0B3B7B", // Azul Institucional
    acento: "#BE2329",   // Rojo Acento
    fondo: "#FFFFFF",   // Blanco
    textoHeader: "#FFFFFF", // Texto blanco sobre fondo azul
    oro: "#c9a84c"
  },
};
// ─────────────────────────────────────────────────────────────────────────────

const gold = "#c9a84c";
const navy = "#0d1b3e";
const cream = "#faf7f0";
const emerald = "#1a7a4a";
const rose = "#c0392b";

const formatCLP = (n) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
const pad = (n) => {
  if (n === undefined || n === null) return "0";
  const numeroLimpio = parseInt(String(n).replace(/[^0-9]/g, ""), 10);
  return isNaN(numeroLimpio) ? "0" : String(numeroLimpio);
};

// ─── FORMATEADOR Y MÁSCARA DE RUT CHILENO ─────────────────────────────────────
const formatRUT = (value) => {
  if (!value) return "";
  let rut = value.replace(/[^0-9kK]/g, "").toUpperCase();
  if (rut.length > 9) rut = rut.slice(0, 9);
  if (rut.length === 0) return "";

  const dv = rut.slice(-1);
  const cuerpo = rut.slice(0, -1);
  if (cuerpo.length === 0) return dv;

  let cuerpoFormateado = "";
  if (cuerpo.length <= 3) {
    cuerpoFormateado = cuerpo;
  } else if (cuerpo.length <= 6) {
    cuerpoFormateado = `${cuerpo.slice(0, -3)}.${cuerpo.slice(-3)}`;
  } else {
    cuerpoFormateado = `${cuerpo.slice(0, -6)}.${cuerpo.slice(-6, -3)}.${cuerpo.slice(-3)}`;
  }
  return `${cuerpoFormateado}-${dv}`;
};

// ─── VALIDACIÓN MATEMÁTICA DEL RUT (MÓDULO 11) ───────────────────────────
const validateRUT = (rutCompleto) => {
  if (!rutCompleto) return false;
  const rutLimpio = rutCompleto.replace(/[^0-9kK]/g, "");
  if (rutLimpio.length < 8 || rutLimpio.length > 9) return false;

  const dvInput = rutLimpio.slice(-1).toUpperCase();
  const cuerpo = rutLimpio.slice(0, -1);

  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const residuo = suma % 11;
  const resultado = 11 - residuo;
  
  let dvEsperado = "";
  if (resultado === 11) dvEsperado = "0";
  else if (resultado === 10) dvEsperado = "K";
  else dvEsperado = String(resultado);

  return dvInput === dvEsperado;
};

// ─── FORMATEADOR Y MÁSCARA DE CELULAR CHILENO (+56 9 XXXX XXXX) ───────────────
const formatCelular = (value) => {
  if (!value) return "+56 9 ";
  if (value.length < 7 && (value.includes("+56") || value.trim() === "+569")) return "+56 9 ";

  let numeros = value.replace(/[^0-9]/g, "");
  if (numeros.startsWith("569")) {
    numeros = numeros.slice(3);
  } else if (numeros.startsWith("56") && numeros.length > 2) {
    numeros = numeros.slice(2);
  } else if (numeros.startsWith("9") && numeros.length > 1) {
    numeros = numeros.slice(1);
  }

  if (numeros.length > 8) numeros = numeros.slice(0, 8);
  if (numeros.length === 0) return "+56 9 ";
  if (numeros.length <= 4) return `+56 9 ${numeros}`;
  return `+56 9 ${numeros.slice(0, 4)} ${numeros.slice(4)}`;
};

const cleanEmail = (value) => value ? value.replace(/\s+/g, "").toLowerCase() : "";

// ─── CLIENTE SUPABASE MULTI-RIFAS DEFINITIVO CORREGIDO ────────────────────────
function db() {
  const url = CONFIG.supabaseUrl;
  const key = CONFIG.supabaseKey;
  const h = {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json"
  };

  return {
    async getNumerosConfirmadosParaSorteo(rifaId) {
      const r = await fetch(`${url}/rest/v1/pedidos?rifa_id=eq.${rifaId}&estado=eq.confirmado`, { headers: h });
      const data = await r.json();
      const numerosPlanos = data.reduce((acc, p) => acc.concat(p.numeros || []), []);
      return numerosPlanos.map(n => Number(n));
    },

    async getRifas() {
      const r = await fetch(`${url}/rest/v1/rifas?select=*,n_al_agua&order=created_at.desc`, { headers: h });
      return r.json();
    },
    
    async guardarResultadoSorteo(logSorteo) {
      const r = await fetch(`${url}/rest/v1/sorteos_log`, {
        method: "POST",
        headers: { ...h, "Prefer": "return=representation" },
        body: JSON.stringify(logSorteo)
      });
      return r.json();
    },

    async insertRifa(rifa) {
      const r = await fetch(`${url}/rest/v1/rifas`, {
        method: "POST", headers: { ...h, Prefer: "return=representation" }, body: JSON.stringify(rifa)
      });
      return r.json();
    },

    async updateRifa(id, rifa) {
      await fetch(`${url}/rest/v1/rifas?id=eq.${id}`, { method: "PATCH", headers: h, body: JSON.stringify(rifa) });
    },

    async deleteRifa(id) {
      await fetch(`${url}/rest/v1/rifas?id=eq.${id}`, { method: "DELETE", headers: h });
    },

    async getTodosLosPedidos() {
      const r = await fetch(`${url}/rest/v1/pedidos?select=*`, { headers: h });
      return r.json();
    },

    async getPedidosPorRifa(rifaId) {
      const r = await fetch(`${url}/rest/v1/pedidos?rifa_id=eq.${rifaId}&order=created_at.desc`, { headers: h });
      return r.json();
    },

    async insertPedido(pedido) {
      const r = await fetch(`${url}/rest/v1/pedidos`, {
        method: "POST", headers: { ...h, Prefer: "return=representation" }, body: JSON.stringify(pedido)
      });
      const data = await r.json();
      return data[0];
    },

    async updateEstado(id, estado) {
      await fetch(`${url}/rest/v1/pedidos?id=eq.${id}`, { method: "PATCH", headers: h, body: JSON.stringify({ estado }) });
    },

    async updateVoucherUrl(id, voucher_url) {
      await fetch(`${url}/rest/v1/pedidos?id=eq.${id}`, { method: "PATCH", headers: h, body: JSON.stringify({ voucher_url }) });
    },

    async getNumerosTomados(rifaId) {
      const r = await fetch(`${url}/rest/v1/pedidos?rifa_id=eq.${rifaId}&estado=neq.rechazado`, { headers: h });
      const data = await r.json();
      return new Set(data.reduce((acc, p) => acc.concat(p.numeros || []), []));
    },

    async marcarNumeros(nums, rifaId) { return true; },

    async uploadVoucher(file, pedidoId) {
      const ext = file.name.split(".").pop();
      const path = `${pedidoId}_${Date.now()}.${ext}`;
      const r = await fetch(`${url}/storage/v1/object/comprobantes/${path}`, {
        method: "POST",
        headers: { 
          "apikey": key, 
          "Authorization": `Bearer ${key}`, 
          "Content-Type": file.type || "image/jpeg"
        },
        body: file
      });

      if (!r.ok) {
        const errorData = await r.json();
        console.error("Detalle del error Supabase:", errorData);
        throw new Error("Error al subir comprobante: " + (errorData.message || "400 Bad Request"));
      }
      return `${url}/storage/v1/object/public/comprobantes/${path}`;
    }
  };
}

// ─── Resend email ─────────────────────────────────────────────────────────────
async function sendEmail({ nombre, email, numeros, total, rifaActiva }) {
  try {
    const numsStr = numeros.map(n=>pad(n)).join(", ");
    const premiosHtml = rifaActiva.premios && rifaActiva.premios.length > 0
      ? rifaActiva.premios.map((premio, idx) => `
          <div style="margin-bottom:10px;font-size:14px;">
            <strong>🎁 Premio ${idx + 1}:</strong> ${premio}
          </div>`).join('')
      : `<div style="margin-bottom:10px;font-size:14px;"><strong>🎁 Premios:</strong> Por definir</div>`;

    const html = `
<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#faf7f0;border-radius:16px;overflow:hidden;border:1px solid #e0d5c0;">
  <div style="background:#0d1b3e;padding:28px;text-align:center;">
    <div style="font-size:36px;color:#c9a84c;">✝</div>
    <h2 style="color:#fff;margin:8px 0 0;font-size:20px;">${CONFIG.nombreIglesia}</h2>
    <p style="color:rgba(255,255,255,0.55);margin:4px 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;">${rifaActiva.titulo}</p>
  </div>
  <div style="padding:28px;">
    <h3 style="color:#0d1b3e;margin:0 0 12px;">¡Hola, ${nombre.split(" ")[0]}! 🎉</h3>
    <p style="color:#555;line-height:1.7;">Recibimos tu participación en la rifa pro-fondos: <strong>${rifaActiva.motivo}</strong>. Verificaremos tu transferencia y te confirmaremos en las próximas 24 horas.</p>
    <div style="background:#fff;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #e0d5c0;">
      <div style="margin-bottom:10px;font-size:14px;"><strong>🔢 Tus números:</strong><br><span style="color:#c9a84c;font-family:monospace;font-size:14px;font-weight:bold;">${numsStr}</span></div>
      <div style="margin-bottom:10px;font-size:14px;"><strong>💰 Total:</strong> ${formatCLP(total)}</div>
      ${premiosHtml}
      <div style="font-size:14px;margin-top:10px;"><strong>📅 Sorteo:</strong> ${rifaActiva.fecha_sorteo}</div>
    </div>
    <p style="color:#e67e22;font-size:13px;background:#fff8e1;padding:12px;border-radius:8px;">⏳ <strong>Estado actual:</strong> Pendiente de verificación de pago</p>
    <hr style="border:1px solid #e0d5c0;margin:24px 0;">
    <p style="color:#bbb;font-size:11px;text-align:center;">${CONFIG.nombreIglesia} · Dios te bendiga 🙏</p>
  </div>
</div>`;

    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, nombreIglesia: CONFIG.nombreIglesia, html: html })
    });
  } catch(e) { console.warn("Email error:", e); }
}

function notifyWhatsApp({ nombre, email, numeros, total }) {
  const msg = encodeURIComponent(
    `🎟️ *Nueva venta — ${CONFIG.nombreIglesia}*\n\n👤 *Nombre:* ${nombre}\n📧 *Email:* ${email}\n🔢 *Números (${numeros.length}):* ${numeros.map(pad).join(", ")}\n💰 *Total:* ${formatCLP(total)}\n\n⏳ Verificar comprobante en el panel admin.`
  );
  window.open(`https://wa.me/${CONFIG.whatsappAdmin}?text=${msg}`, "_blank");
}

// ─── COMPONENTE RAÍZ COMPATIBLE CON MÚLTIPLES RIFAS ───────────────────────────
export default function App() {
  const [view, setView] = useState("rifa");
  const [rifas, setRifas] = useState([]);
  const [rifaActiva, setRifaActiva] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [passErr, setPassErr] = useState(false);

  useEffect(() => {
    db().getRifas()
      .then(data => { setRifas(data || []); setLoading(false); })
      .catch(err => { console.error("Error cargando catálogo:", err); setLoading(false); });
  }, []);

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght=0,700;0,900;1,700&family=DM+Sans:wght=300;400;500;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        button{transition:all .15s;}
        button:hover:not(:disabled){filter:brightness(1.1);}
        input:focus,select:focus{outline:none;border-color:${gold}!important;box-shadow:0 0 0 3px ${gold}22;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .fade{animation:fadeUp .35s ease both}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:${gold}44;border-radius:4px}
      `}</style>

      <nav style={S.nav}>
        <div style={S.navIn}>
          <div style={S.brand} onClick={() => { setView("rifa"); setRifaActiva(null); }}>
            <img src="/logo-iglesia.png" alt="Logo IMP QN" style={{ height: "42px", width: "42px", objectFit: "contain" }} />
            <div>
              <div style={S.brandName}>{CONFIG.nombreIglesia}</div>
              <div style={S.brandSub}>Plataforma Oficial de Rifas Benéficas</div>
            </div>
          </div>
          <button 
            style={S.navBtn} 
            onClick={async () => {
              if (view === "admin") {
                // 1. Antes de volver, traemos los datos frescos recién guardados del servidor
                try {
                  const rifasActualizadas = await db().getRifas();
                  
                  // 2. Si el usuario estaba editando una rifa, actualizamos su memoria activa en pantalla
                  if (rifaActiva) {
                    const rifaFresca = rifasActualizadas.find(r => r.id === rifaActiva.id);
                    if (rifaFresca) setRifaActiva(rifaFresca);
                  }
                } catch (err) {
                  console.error("Error al sincronizar al volver:", err);
                }
                setView("rifa");
              } else {
                setView("admin");
              }
            }}
          >
            {view === "rifa" ? "⚙️ Admin" : "← Volver"}
          </button>
        </div>
      </nav>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 100 }}>
          <div style={{ ...S.spinner, width: 40, height: 40, borderWidth: 3, borderTopColor: CONFIG.colores.primario }} />
        </div>
      ) : (
        <>
          {view === "rifa" && (
            !rifaActiva ? (
              <PantallaSeleccionRifas rifas={rifas} onSelect={setRifaActiva} />
            ) : (
              <RifaView rifaActiva={rifaActiva} onVolverAlCatalogo={() => setRifaActiva(null)} />
            )
          )}

          {view === "sorteo" && (
            <SorteoView onVolver={() => setView("admin")} />
          )}

          {view === "admin" && !adminAuthed && (
            <div style={S.loginWrap} className="fade">
              <div style={S.loginCard}>
                <div style={{ fontSize: 52, textAlign: "center" }}>🔐</div>
                <h2 style={S.loginTitle}>Panel Admin</h2>
                <input type="password" placeholder="Contraseña" value={pass}
                  onChange={e => { setPass(e.target.value); setPassErr(false); }}
                  onKeyDown={e => e.key === "Enter" && (pass === CONFIG.adminPassword ? setAdminAuthed(true) : setPassErr(true))}
                  style={{ ...S.input, ...(passErr ? { borderColor: rose } : {}) }}
                />
                {passErr && <p style={{ color: rose, fontSize: 13, textAlign: "center" }}>Contraseña incorrecta</p>}
                <button style={{ ...S.btnPrimary, width: "100%" }}
                  onClick={() => pass === CONFIG.adminPassword ? setAdminAuthed(true) : setPassErr(true)}>
                  Ingresar
                </button>
              </div>
            </div>
          )}
          {view === "admin" && adminAuthed && (
            <AdminView 
              listaRifas={rifas} 
              onNavegarSorteo={() => setView("sorteo")} 
              onActualizarCatalogoGlobal={(nuevasRifas) => setRifas(nuevasRifas)} 
            />
          )}
        </>
      )}
    </div>
  );
}

function PantallaSeleccionRifas({ rifas, onSelect }) {
  const activas = rifas.filter(r => r.activa);
  return (
    <main style={{ ...S.main, maxWidth: '1200px' }} className="fade">
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: CONFIG.colores.primario, marginBottom: 8 }}>Campañas de Recaudación</h2>
        <p style={{ color: "#666", fontSize: 14, maxWidth: 460, margin: "0 auto" }}>Selecciona una de nuestras rifas activas para cooperar. ¡Dios te bendiga! 🙏</p>
      </div>
      {activas.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 16, border: "1px solid #e0d9cc" }}>
          <span>⛪</span><p style={{ marginTop: 12, color: "#999" }}>No hay rifas activas en este momento.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {activas.map(rifa => (
            <div key={rifa.id} style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: `1px solid ${gold}33`, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <span style={{ background: `${gold}22`, color: navy, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, textTransform: "uppercase" }}>🎯 {rifa.motivo || "Campaña General"}</span>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: navy, marginTop: 6 }}>{rifa.titulo}</h3>
              </div>
              <div style={{ display: "flex", gap: 16, background: cream, padding: 12, borderRadius: 10, fontSize: 13 }}>
                <div>💰 Valor número: <strong>{formatCLP(rifa.precio_por_numero)}</strong></div>
                <div style={{ width: 1, background: `${gold}44` }} />
                <div>📅 Sorteo: <strong>{rifa.fecha_sorteo}</strong></div>
              </div>
              <div style={{ fontSize: 13, color: "#666" }}>🎁 <strong>Premios:</strong> {rifa.premios && rifa.premios.length > 0 ? rifa.premios.join(' · ') : 'Por definir'}</div>
              <button onClick={() => onSelect(rifa)} style={{ ...S.btnPrimary, background: `linear-gradient(135deg, ${CONFIG.colores.primario}, #183060)`, width: "100%", padding: "12px" }}>🎟️ Ver Disponibilidad y Comprar</button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function RifaView({ rifaActiva, onVolverAlCatalogo }) {
  const [tomados, setTomados] = useState(new Set());
  const [selected, setSelected] = useState(new Set());
  const [step, setStep] = useState("select");
  const [form, setForm] = useState({ nombre: "", rut: "", email: "", telefono: "" });
  const [voucher, setVoucher] = useState(null);
  const [voucherPreview, setVoucherPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState(null);

  // 1. Envolver la función de refresco en un useCallback para poder reutilizarla de manera eficiente
  const refrescarNumerosTomados = useCallback(() => {
    db().getNumerosTomados(rifaActiva.id)
      .then(setTomados)
      .catch((err) => console.error("Error al refrescar números:", err));
  }, [rifaActiva.id]);

  // Carga inicial al montar el componente
  useEffect(() => { 
    refrescarNumerosTomados(); 
  }, [refrescarNumerosTomados]);

  const toggle = useCallback(n => {
    if (tomados.has(n)) return;
    setSelected(prev => {
      const nx = new Set(prev);
      if (nx.has(n)) nx.delete(n);
      else if (nx.size < CONFIG.maxPorPersona) nx.add(n);
      return nx;
    });
  }, [tomados]);

  const total = selected.size * rifaActiva.precio_por_numero;

  const handleSubmit = async () => {
    const e = {};
    if (!form.nombre || !form.nombre.trim()) e.nombre = "Requerido";
    if (!form.rut || !form.rut.trim()) e.rut = "Requerido";
    else if (!validateRUT(form.rut)) e.rut = "RUT inválido";
    
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!form.email || !form.email.trim()) e.email = "Requerido";
    else if (!emailRegex.test(form.email)) e.email = "El correo electrónico no es válido.";
    
    if (!form.telefono || !form.telefono.trim() || form.telefono.trim() === "+56 9") e.telefono = "Requerido";
    else if (form.telefono.replace(/[^0-9]/g, "").length < 11) e.telefono = "Número incompleto.";
    
    if (!voucher) e.voucher = "Debes subir el comprobante";
    if (Object.keys(e).length) { setErrors(e); setSubmitErr("Corrige los errores."); return; }
    
    try {
      setSubmitting(true); setSubmitErr(null);
      const nums = [...selected].sort((a, b) => a - b);
      
      // Inserta el pedido base en la tabla
      let pedido = await db().insertPedido({
        rifa_id: rifaActiva.id, nombre: form.nombre, rut: form.rut, email: form.email, telefono: form.telefono, numeros: nums, total, estado: "pendiente", voucher_url: null
      });
      
      // Sube el comprobante y actualiza su URL en la base de datos
      const vUrl = await db().uploadVoucher(voucher, pedido.id);
      await db().updateVoucherUrl(pedido.id, vUrl);
      
      // Dispara automatizaciones de mensajería externas (Email y WhatsApp)
      await sendEmail({ ...form, numeros: nums, total, rifaActiva });
      notifyWhatsApp({ nombre: form.nombre, email: form.email, numeros: nums, total });
      
      // 2. CORRECCIÓN CLAVE: Sincronizar el estado de la base de datos con la interfaz antes del cambio de pantalla
      refrescarNumerosTomados();
      
      setStep("success");
    } catch (err) { 
      setSubmitErr("Ocurrió un error."); 
      console.error(err); 
    } finally { 
      setSubmitting(false); 
    }
  };

  // 3. CORRECCIÓN CLAVE: Al resetear el flujo, volvemos a consultar para asegurar sincronía total
  const handleResetFlujo = () => {
    setStep("select");
    setSelected(new Set());
    setForm({ nombre: "", rut: "", email: "", telefono: "+56 9 " });
    setVoucher(null);
    setVoucherPreview(null);
    refrescarNumerosTomados();
  };

  if (step === "success") return <SuccessView nombre={form.nombre} email={form.email} numeros={[...selected].sort((a,b)=>a-b)} total={total} rifaActiva={rifaActiva} onReset={handleResetFlujo} />;
  if (step === "form") return <FormView form={form} setForm={setForm} errors={errors} setErrors={setErrors} voucher={voucher} setVoucher={setVoucher} voucherPreview={voucherPreview} setVoucherPreview={setVoucherPreview} selected={selected} total={total} submitting={submitting} submitErr={submitErr} onBack={() => setStep("select")} onSubmit={handleSubmit} />;
  return <SelectView tomados={tomados} selected={selected} toggle={toggle} total={total} rifaActiva={rifaActiva} onContinue={() => setStep("form")} onBack={onVolverAlCatalogo} />;
}

// ─── PANTALLA SELECCIÓN NÚMEROS ──────────────────────────────────────────────
function SelectView({ tomados, selected, toggle, total, rifaActiva, onContinue, onBack }) {
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [page, setPage] = useState(0);
  const PER_PAGE = 200;

  const totalNumerosSeguros = rifaActiva?.total_numeros ? parseInt(rifaActiva.total_numeros, 10) : 2000;
  const tomadosSizeSeguro = tomados?.size || 0;
  const disponibles = totalNumerosSeguros - tomadosSizeSeguro;
  const porcentaje = totalNumerosSeguros > 0 ? Math.round((tomadosSizeSeguro / totalNumerosSeguros) * 100) : 0;

  const numeros = useMemo(() => {
    let arr = Array.from({ length: totalNumerosSeguros }, (_, i) => i + 1);
    if (query.trim()) {
      const q = query.trim();
      arr = arr.filter(n => pad(n).includes(q) || String(n).includes(q));
    }
    if (filtro === "disponibles") arr = arr.filter(n => !tomados.has(n));
    if (filtro === "vendidos") arr = arr.filter(n => tomados.has(n));
    return arr;
  }, [query, filtro, tomados, totalNumerosSeguros]);

  useEffect(() => setPage(0), [query, filtro]);
  const paginated = numeros.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(numeros.length / PER_PAGE);

  const pickRandom = () => {
    const libres = Array.from({ length: totalNumerosSeguros }, (_, i) => i + 1).filter(n => !tomados.has(n) && !selected.has(n));
    const cant = Math.min(5, CONFIG.maxPorPersona - selected.size, libres.length);
    if (cant <= 0) return;
    const shuffled = libres.sort(() => Math.random() - 0.5).slice(0, cant);
    shuffled.forEach(n => toggle(n));
  };

  return (
    <main style={S.main}>
      <button style={{ ...S.backBtn, marginBottom: 12 }} onClick={onBack}>← Volver al Catálogo</button>
      <div style={S.hero} className="fade">
        <div style={S.heroBadge}>🎯 {rifaActiva.motivo || "Campaña"}</div>
        <h1 style={S.heroTitle}>{rifaActiva.titulo}</h1>
        <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "14px 0" }} />
        {rifaActiva && Array.isArray(rifaActiva.premios) && rifaActiva.premios.map((p, idx) => (
          <h2 key={idx} style={{ ...S.heroTitle, fontSize: idx === 0 ? 20 : 15, marginTop: 4 }}>🎁 {idx + 1}° Premio: {p}</h2>
        ))}
        <p style={{ ...S.heroDate, marginTop: 14 }}>Sorteo: {rifaActiva.fecha_sorteo}</p>
        <div style={S.progressWrap}>
          <div style={S.progressBar}><div style={{ ...S.progressFill, width: `${porcentaje}%` }} /></div>
          <div style={S.progressLabels}><span>{tomadosSizeSeguro} vendidos</span><span style={{ color: gold, fontWeight: 700 }}>{porcentaje}%</span><span>{disponibles} libres</span></div>
        </div>
        <div style={S.heroKpis}>
          <div style={S.heroKpi}><span style={S.heroKpiNum}>{formatCLP(rifaActiva.precio_por_numero)}</span><span>por número</span></div>
          <div style={S.kpiDiv}/><div style={S.heroKpi}><span style={S.heroKpiNum}>{CONFIG.maxPorPersona}</span><span>máx</span></div>
          <div style={S.kpiDiv}/><div style={S.heroKpi}><span style={S.heroKpiNum}>{totalNumerosSeguros}</span><span>totales</span></div>
        </div>
      </div>

      <div style={S.controls}>
        <div style={S.searchWrap}>
          <input placeholder="Buscar número" value={query} onChange={e => setQuery(e.target.value)} style={S.searchInput} />
        </div>
        <div style={S.filtros}>
          {["todos", "disponibles", "vendidos"].map(f => (
            <button key={f} style={{ ...S.filtroBtn, ...(filtro === f ? S.filtroBtnActive : {}) }} onClick={() => setFiltro(f)}>{f}</button>
          ))}
        </div>
        <button style={S.randomBtn} onClick={pickRandom} disabled={selected.size >= CONFIG.maxPorPersona}>🎲 Azar 5</button>
      </div>

      <div style={S.grid}>
        {paginated.map(n => {
          const taken = tomados.has(n), sel = selected.has(n);
          return <button key={n} onClick={() => toggle(n)} disabled={taken} style={{ ...S.numBtn, ...(taken ? S.numTaken : sel ? S.numSel : S.numAvail) }}>{pad(n)}</button>;
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ ...S.pagination, marginBottom: "80px" }}> {/* Añadido margen para que no lo tape la stickyBar */}
          <button style={S.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>←</button>
          <span style={{ color: navy, fontWeight: "bold" }}>{page + 1} / {totalPages}</span>
          <button style={S.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>→</button>
        </div>
      )}

      <div style={S.stickyBar}>
        <div style={S.stickyTotal}>{formatCLP(total)}</div>
        <button disabled={selected.size === 0} style={S.btnPrimary} onClick={onContinue}>Continuar ({selected.size}) →</button>
      </div>
    </main>
  );
}

function FormView({form,setForm,errors,setErrors,voucher,setVoucher,voucherPreview,setVoucherPreview,selected,total,submitting,submitErr,onBack,onSubmit}) {
  const nums=[...selected].sort((a,b)=>a-b);
  const handleFile=e=>{
    const f=e.target.files[0]; if(!f) return;
    if(f.size>10*1024*1024){setErrors({...errors,voucher:"Máximo 10MB"});return;}
    setVoucher(f); setVoucherPreview(URL.createObjectURL(f));
  };

  return (
    <main style={S.main}>
      <div style={S.card} className="fade">
        <button style={S.backBtn} onClick={onBack}>← Volver</button>
        <h2 style={S.cardTitle}>Datos de transferencia</h2>
        <div style={S.summaryBox}>
          <div style={S.numsWrap}>{nums.map(n=><span key={n} style={S.numTagForm}>{pad(n)}</span>)}</div>
          <div style={S.summaryDiv}/><div style={{textAlign:"right",color:gold,fontWeight:900}}>{formatCLP(total)}</div>
        </div>
        <div style={S.bankBox}>
          {[["Banco",CONFIG.banco],["Cuenta Rut",CONFIG.numeroCuenta],["Nombre",CONFIG.nombreCuenta],["RUT",CONFIG.rutCuenta],["Mail Aviso",CONFIG.Mail]].map(([k,v])=>(
            <div key={k} style={S.bankRow}><span style={S.bankKey}>{k}:</span><span style={S.bankVal}>{v}</span></div>
          ))}
        </div>
        <div style={S.fields}>
          <input placeholder="Nombre" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} style={S.input}/>
          <input placeholder="RUT" value={form.rut} onChange={e=>setForm({...form,rut:formatRUT(e.target.value)})} style={S.input}/>
          <input placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:cleanEmail(e.target.value)})} style={S.input}/>
          <input placeholder="Teléfono" value={form.telefono} onChange={e=>setForm({...form,telefono:formatCelular(e.target.value)})} style={S.input}/>
          
          <label style={S.uploadZone}>
            <input type="file" onChange={handleFile} style={{display:"none"}}/>
            {voucherPreview ? <img src={voucherPreview} alt="v" style={S.voucherImg}/> : <span>📎 Subir comprobante</span>}
          </label>
        </div>
        {submitErr&&<div style={S.alertErr}>{submitErr}</div>}
        <button style={{...S.btnPrimary,width:"100%"}} onClick={onSubmit} disabled={submitting}>{submitting?"Enviando...":"Confirmar"}</button>
      </div>
    </main>
  );
}

function SuccessView({ nombre, email, numeros, total, rifaActiva, onReset }) {
  return (
    <main style={S.main}>
      <div style={{ ...S.card, textAlign: "center" }}>
        <h2>¡Gracias, {nombre}!</h2>
        <p>Verificaremos tu pago. Detalles enviados a {email}.</p>
        <div style={S.successNums}>{numeros.map(n => <span key={n} style={S.successNum}>{pad(n)}</span>)}</div>
        <button style={S.btnPrimary} onClick={onReset}>Volver al inicio</button>
      </div>
    </main>
  );
}

// ─── SORTEOS CON IDENTIFICACIÓN DE COMPRADORES ───────────────────────────────
function SorteoView({ onVolver }) {
  const [rifas, setRifas] = useState([]);
  const [rifaSeleccionada, setRifaSeleccionada] = useState(null);
  const [claveAdmin, setClaveAdmin] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [numerosValidos, setNumerosValidos] = useState([]);
  
  const [premiosDisponibles, setPremiosDisponibles] = useState([]);
  const [premioSeleccionadoForm, setPremioSeleccionadoForm] = useState("");

  const [premioActual, setPremioActual] = useState("");
  const [historialExtracciones, setHistorialExtracciones] = useState([]);
  const [numeroDestacado, setNumeroDestacado] = useState("----");
  const [estadoAnuncio, setEstadoAnuncio] = useState("Esperando inicio...");
  const [sorteando, setSorteando] = useState(false);
  const [tandasAnteriores, setTandasAnteriores] = useState([]);
  const [numerosYaGanadores, setNumerosYaGanadores] = useState(new Set());
  const [mapaCompradores, setMapaCompradores] = useState({});

  useEffect(() => { db().getRifas().then(setRifas).catch(console.error); }, []);

  const cargarHistorialSorteos = useCallback((rifaId) => {
    const url = CONFIG.supabaseUrl;
    const key = CONFIG.supabaseKey;
    const h = { "apikey": key, "Authorization": `Bearer ${key}` };

    fetch(`${url}/rest/v1/sorteos_log?rifa_id=eq.${rifaId}&order=created_at.desc`, { headers: h })
      .then(r => r.json())
      .then(logs => {
        setTandasAnteriores(logs || []);
        
        const yaGanaron = (logs || []).map(log => Number(log.numero_ganador));
        setNumerosYaGanadores(new Set(yaGanaron));
        
        if (rifaSeleccionada) {
          const premiosYaSorteados = (logs || []).map(log => log.premio_nombre);
          const premiosOriginales = rifaSeleccionada.premios || [];
          const disponibles = premiosOriginales.filter(p => !premiosYaSorteados.includes(p));
          setPremiosDisponibles(disponibles);
          setPremioSeleccionadoForm(disponibles[0] || "");
        }
      })
      .catch(err => console.error("Error cargando logs de sorteos:", err));
  }, [rifaSeleccionada]);

  useEffect(() => {
    if (rifaSeleccionada) {
      const url = CONFIG.supabaseUrl;
      const key = CONFIG.supabaseKey;
      const h = { "apikey": key, "Authorization": `Bearer ${key}` };

      db().getNumerosConfirmadosParaSorteo(rifaSeleccionada.id)
        .then(setNumerosValidos)
        .catch(console.error);

      fetch(`${url}/rest/v1/pedidos?rifa_id=eq.${rifaSeleccionada.id}&estado=eq.confirmado`, { headers: h })
        .then(res => res.json())
        .then(pedidos => {
          const nuevoMapa = {};
          (pedidos || []).forEach(p => {
            let listaNumeros = [];
            if (typeof p.numeros === 'string') {
              try { listaNumeros = JSON.parse(p.numeros); } catch(e) { listaNumeros = []; }
            } else if (Array.isArray(p.numeros)) {
              listaNumeros = p.numeros;
            }

            listaNumeros.forEach(num => {
              const numNormalizado = Number(num);
              nuevoMapa[numNormalizado] = {
                nombre: p.nombre || "Sin Nombre",
                celular: p.telefono || "Sin Celular"
              };
            });
          });
          setMapaCompradores(nuevoMapa);
        })
        .catch(err => console.error("Error creando mapa de compradores:", err));

      cargarHistorialSorteos(rifaSeleccionada.id);
    } else {
      setNumerosValidos([]);
      setPremiosDisponibles([]);
      setPremioSeleccionadoForm("");
      setTandasAnteriores([]);
      setNumerosYaGanadores(new Set());
      setMapaCompradores({});
    }
  }, [rifaSeleccionada, cargarHistorialSorteos]);

  const lanzarFuegosArtificiales = () => {
    const duracion = 5 * 1000;
    const fin = Date.now() + duracion;
    (function frame() {
      confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors: ['#d4af37', '#ffffff', '#1e3a8a'] });
      confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors: ['#d4af37', '#ffffff', '#1e3a8a'] });
      if (Date.now() < fin) requestAnimationFrame(frame);
    }());
  };

  const ejecutarSorteoEfecto = async () => {
    if (!premioSeleccionadoForm) {
      alert("Por favor, seleccione un premio válido.");
      return;
    }

    const listaNumerosValidos = Array.from(numerosValidos)
      .map(n => Number(n))
      .filter(n => !numerosYaGanadores.has(n));

    if (!listaNumerosValidos.length) { 
      alert("No quedan números disponibles para sortear."); 
      return; 
    }

    const nAlAgua = Number(rifaSeleccionada.n_al_agua);
    if (listaNumerosValidos.length <= nAlAgua) { 
      alert(`Se necesitan más de ${nAlAgua} números disponibles.`); 
      return; 
    }

    setSorteando(true); 
    setPremioActual(premioSeleccionadoForm); 
    setHistorialExtracciones([]);
    setNumeroDestacado("----"); 
    setEstadoAnuncio("Mezclando bombo digital...");
    
    let pozo = [...listaNumerosValidos].sort(() => Math.random() - 0.5);
    let paso = 0;

    const intervalo = setInterval(async () => {
      if (paso < nAlAgua) {
        const numAgua = pozo[paso];
        setNumeroDestacado(String(numAgua));
        setEstadoAnuncio(`💧 ¡AL AGUA! (${paso + 1} de ${nAlAgua})`);
        
        const datosDueno = mapaCompradores[numAgua] || { nombre: "No identificado", celular: "S/N" };
        setHistorialExtracciones(prev => [...prev, { numero: numAgua, tipo: 'agua', ...datosDueno }]);
        
        paso++;
      } else {
        clearInterval(intervalo);
        const numGanador = pozo[nAlAgua];
        setNumeroDestacado(String(numGanador));
        setEstadoAnuncio(`👑 ¡GANADOR DEL ${premioSeleccionadoForm.toUpperCase()}!`);
        
        const datosDueno = mapaCompradores[numGanador] || { nombre: "No identificado", celular: "S/N" };
        setHistorialExtracciones(prev => [...prev, { numero: numGanador, tipo: 'ganador', ...datosDueno }]);
        
        try {
          const arrayAgua = pozo.slice(0, nAlAgua).map(n => Number(n));
          await db().guardarResultadoSorteo({
            rifa_id: rifaSeleccionada.id, 
            premio_nombre: premioSeleccionadoForm, 
            numero_ganador: Number(numGanador), 
            numeros_agua: arrayAgua
          });

          cargarHistorialSorteos(rifaSeleccionada.id);

        } catch (err) { console.error("Error guardando log:", err); }

        lanzarFuegosArtificiales(); 
        setSorteando(false);
      }
    }, 3000);
  };

  const verificarAcceso = (e) => {
    e.preventDefault();
    if (claveAdmin === CONFIG.adminPassword) setAutorizado(true);
    else alert("Clave incorrecta.");
  };

  return (
    <main style={{ padding: '20px', maxWidth: '1000px', margin: '40px auto', color: '#ffffff' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#d4af37' }}>{CONFIG.nombreIglesia}</h2>
        <p style={{ opacity: 0.8, fontSize: '14px' }}>MÓDULO DE SORTEOS — V2.0</p>
      </div>

      {!autorizado ? (
        <div style={{ background: '#111827', border: '2px solid #d4af37', borderRadius: '12px', padding: '30px' }}>
          <h3>🔐 Validación de Autoridad</h3>
          <form onSubmit={verificarAcceso}>
            <input type="password" value={claveAdmin} onChange={e => setClaveAdmin(e.target.value)} style={{ width: '100%', padding: '12px', background: '#1f2937', color: '#fff', border: '1px solid #d4af37', margin: '15px 0' }} placeholder="Contraseña Sorteo" required />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={onVolver} style={{ background: '#374151', padding: '10px 20px', border: 'none', color: '#fff', borderRadius: 6 }}>Volver</button>
              <button type="submit" style={{ background: '#d4af37', padding: '10px 20px', border: 'none', flex: 1, fontWeight: 'bold', borderRadius: 6 }}>Ingresar</button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          
          <div style={{ background: '#111827', borderRadius: '12px', padding: '20px' }}>
            <label style={{ color: '#d4af37', fontWeight: 'bold' }}>1. Seleccione la Campaña:</label>
            <select onChange={e => setRifaSeleccionada(rifas.find(r => r.id === e.target.value))} style={{ width: '100%', padding: '12px', background: '#1f2937', color: '#fff', marginTop: '10px', borderRadius: 6 }}>
              <option value="">-- Seleccionar Rifa --</option>
              {rifas.map(r => <option key={r.id} value={r.id}>{r.titulo} ({r.n_al_agua || 2} al agua)</option>)}
            </select>
            {rifaSeleccionada && (
              <p style={{ marginTop: 10 }}>
                📊 Total boletos confirmados: <strong>{numerosValidos.length}</strong> 
                {numerosYaGanadores.size > 0 && ` | 🎯 Jugando ahora en tómbola: ${numerosValidos.length - numerosYaGanadores.size} (Excluyendo ${numerosYaGanadores.size} ganadores)`}
              </p>
            )}
          </div>

          {rifaSeleccionada && (
            <>
              <div style={{ background: '#111827', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <label style={{ color: '#d4af37', fontWeight: 'bold' }}>2. Premio a disputar:</label>
                {premiosDisponibles.length === 0 ? (
                  <p style={{ color: '#ef4444', marginTop: '10px', fontWeight: 'bold' }}>⚠️ Todos los premios de esta campaña ya fueron sorteados.</p>
                ) : (
                  <select 
                    value={premioSeleccionadoForm} 
                    onChange={e => setPremioSeleccionadoForm(e.target.value)} 
                    style={{ width: '100%', padding: '12px', background: '#1f2937', color: '#fff', marginTop: '10px', borderRadius: 6, border: '1px solid #d4af37' }}
                  >
                    {premiosDisponibles.map((p, idx) => <option key={idx} value={p}>{p}</option>)}
                  </select>
                )}
              </div>

              <div style={{ background: '#0b0f19', border: '3px solid #d4af37', borderRadius: '20px', padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '100px', fontWeight: '800', margin: '20px 0', fontFamily: 'monospace', textShadow: '0 0 15px rgba(212,175,55,0.4)' }}>{numeroDestacado}</div>
                <h3 style={{ color: '#d4af37' }}>{estadoAnuncio}</h3>
                
                <div style={{ display: 'flex', gap: 15, marginTop: 25, justifyContent: 'center' }}>
                  <button type="button" onClick={onVolver} disabled={sorteando} style={{ background: '#374151', padding: '10px 20px', border: 'none', color: '#fff', borderRadius: 6 }}>Salir</button>
                  <button 
                    disabled={sorteando || premiosDisponibles.length === 0} 
                    onClick={ejecutarSorteoEfecto} 
                    style={{ 
                      background: sorteando || premiosDisponibles.length === 0 ? '#4b5563' : '#16a34a', 
                      color: '#fff', 
                      padding: '14px 40px', 
                      border: 'none', 
                      borderRadius: '30px', 
                      fontWeight: 'bold', 
                      cursor: sorteando || premiosDisponibles.length === 0 ? 'not-allowed' : 'pointer' 
                    }}
                  >
                    {sorteando ? "🔮 Extrayendo..." : "🎲 Iniciar Tanda de Extracción"}
                  </button>
                </div>
              </div>

              <div style={{ background: '#111827', borderRadius: '12px', padding: '20px' }}>
                <h4 style={{ color: '#d4af37', marginBottom: 15 }}>📋 Registro de la Tanda Actual {premioActual && `(${premioActual})`}</h4>
                {historialExtracciones.length === 0 ? (
                  <p style={{ color: '#666', fontSize: 13 }}>No se han realizado extracciones en esta tanda.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {historialExtracciones.map((ext, idx) => (
                      <div key={idx} style={{ padding: '12px 16px', borderRadius: '8px', borderLeft: ext.tipo==='agua'?'4px solid #ef4444':'4px solid #22c55e', background: '#1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <span style={{ fontWeight: 'bold', marginRight: 10, color: ext.tipo==='agua'?'#ef4444':'#22c55e' }}>
                            {ext.tipo === 'agua' ? "💧 Al Agua:" : "👑 Ganador:"} {pad(ext.numero)}
                          </span>
                          <span style={{ color: '#fff', fontWeight: 500 }}>👤 {ext.nombre}</span>
                        </div>
                        <span style={{ color: '#aaa', fontSize: '13px', fontFamily: 'monospace' }}>📞 {ext.celular}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: '#111827', borderRadius: '12px', padding: '20px', marginTop: '10px', borderTop: '2px solid #d4af37' }}>
                <h4 style={{ color: '#d4af37', marginBottom: 15 }}>🕒 Historial de Tandas Anteriores</h4>
                {tandasAnteriores.length === 0 ? (
                  <p style={{ color: '#666', fontSize: 13 }}>No hay registros de sorteos previos.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {tandasAnteriores.map((tanda, idx) => (
                      <div key={tanda.id || idx} style={{ background: '#1f2937', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #d4af37' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>🎁 Premio Sorteado: <span style={{ color: '#d4af37' }}>{tanda.premio_nombre}</span></span>
                          <span style={{ fontSize: '11px', color: '#888' }}>{tanda.created_at ? new Date(tanda.created_at).toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {Array.isArray(tanda.numeros_agua) && tanda.numeros_agua.map((num, i) => {
                            const d = mapaCompradores[Number(num)] || { nombre: "No identificado", celular: "S/N" };
                            return (
                              <div key={i} style={{ padding: '8px 12px', borderRadius: '6px', background: '#111827', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#ef4444' }}>💧 Al Agua: <strong>{pad(num)}</strong> <span style={{ color: '#fff', marginLeft: 10, fontWeight: 'normal' }}>— {d.nombre}</span></span>
                                <span style={{ color: '#888', fontFamily: 'monospace', fontSize: '12px' }}>📞 {d.celular}</span>
                              </div>
                            );
                          })}
                          
                          {(() => {
                            const d = mapaCompradores[Number(tanda.numero_ganador)] || { nombre: "No identificado", celular: "S/N" };
                            return (
                              <div style={{ padding: '10px 12px', borderRadius: '6px', background: '#111827', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px dashed #22c55e' }}>
                                <span style={{ color: '#22c55e', fontWeight: 'bold' }}>👑 Ganador: {pad(tanda.numero_ganador)} <span style={{ color: '#fff', marginLeft: 10, fontWeight: 'bold' }}>🏆 {d.nombre}</span></span>
                                <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold' }}>📞 {d.celular}</span>
                              </div>
                            );
                          })()}
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}

// ─── PANEL ADMINISTRATIVO PRINCIPAL CORREGIDO ──────────────────────────────────────────
function AdminView({ listaRifas, onNavegarSorteo, onActualizarCatalogoGlobal }) {
  const [tab, setTab] = useState("comprobantes");
  const [rifasLocales, setRifasLocales] = useState(listaRifas || []);
  
  const [pedidos, setPedidos] = useState([]);
  const [todosLosPedidos, setTodosLosPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rifaSeleccionada, setRifaSeleccionada] = useState(listaRifas[0]?.id || "");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(null);
  const [adminPage, setAdminPage] = useState(0);
  const ADMIN_PER_PAGE = 20;

  const [editandoId, setEditandoId] = useState(null);
  const [rifaForm, setRifaForm] = useState({
    titulo: "", motivo: "", precio_por_numero: 3000, total_numeros: 2000, fecha_sorteo: "", premios: "", activa: true, n_al_agua: 2
  });

  const cargarTotalesGlobales = useCallback(async () => {
    try { const data = await db().getTodosLosPedidos(); setTodosLosPedidos(data || []); } catch (e) { console.error(e); }
  }, []);

  const fetchPedidos = useCallback(async () => {
    if (!rifaSeleccionada) return;
    setLoading(true);
    try { const data = await db().getPedidosPorRifa(rifaSeleccionada); setPedidos(data || []); } catch (e) { console.error(e); }
    setLoading(false);
  }, [rifaSeleccionada]);

  // CORRECCIÓN CLAVE: Sincroniza tanto el estado del admin como el catálogo global que ven los clientes
  const refrescarRifas = async () => {
    try { 
      const data = await db().getRifas(); 
      setRifasLocales(data || []); // Actualiza la vista del admin
      
      // CORRECCIÓN AUTOMATIZADA: Actualiza el catálogo global inmediatamente
      if (onActualizarCatalogoGlobal) {
        onActualizarCatalogoGlobal(data || []);
      }
    } catch (e) { 
      console.error("Error al sincronizar catálogo:", e); 
    }
  };

  useEffect(() => { cargarTotalesGlobales(); fetchPedidos(); }, [cargarTotalesGlobales, fetchPedidos]);

  const cambiarEstado = async (id, estado) => {
    setUpdating(id); await db().updateEstado(id, estado); await fetchPedidos(); await cargarTotalesGlobales(); setUpdating(null);
  };

  const handleGuardarRifa = async (e) => {
    e.preventDefault();
    const listaPremios = rifaForm.premios ? rifaForm.premios.split(",").map(p => p.trim()).filter(p => p !== "") : [];
    const datosRifa = {
      titulo: rifaForm.titulo, motivo: rifaForm.motivo, precio_por_numero: parseInt(rifaForm.precio_por_numero, 10),
      total_numeros: parseInt(rifaForm.total_numeros, 10), fecha_sorteo: rifaForm.fecha_sorteo, premios: listaPremios, activa: rifaForm.activa,
      n_al_agua: parseInt(rifaForm.n_al_agua, 10)
    };

    try {
      if (editandoId) { 
        await db().updateRifa(editandoId, datosRifa); 
        alert("Rifa modificada con éxito.");
      } else { 
        await db().insertRifa(datosRifa); 
        alert("Nueva Rifa publicada con éxito.");
      }
      setRifaForm({ titulo: "", motivo: "", precio_por_numero: 3000, total_numeros: 2000, fecha_sorteo: "", premios: "", activa: true, n_al_agua: 2 });
      setEditandoId(null); 
      await refrescarRifas(); 
    } catch (err) { alert("Error: " + err.message); }
  };

  const handleEliminarRifa = async (id, titulo) => {
    if (window.confirm(`¿Está seguro de que desea ELIMINAR permanentemente la rifa "${titulo}"? Esta operación no se puede deshacer.`)) {
      try {
        await db().deleteRifa(id);
        alert("Rifa eliminada correctamente.");
        if (rifaSeleccionada === id) setRifaSeleccionada(rifasLocales[0]?.id || "");
        await refrescarRifas();
      } catch (err) {
        alert("Error al eliminar la rifa: " + err.message);
      }
    }
  };

  const handleSeleccionarEditar = (rifa) => {
    setEditandoId(rifa.id);
    setRifaForm({
      titulo: rifa.titulo || "",
      motivo: rifa.motivo || "",
      precio_por_numero: rifa.precio_por_numero || 3000,
      total_numeros: rifa.total_numeros || 2000,
      fecha_sorteo: rifa.fecha_sorteo || "",
      premios: rifa.premios ? rifa.premios.join(", ") : "",
      activa: rifa.activa ?? true,
      n_al_agua: rifa.n_al_agua || 2
    });
  };

  const filtrados = pedidos.filter(p => {
    const okF = filtroEstado === "todos" || p.estado === filtroEstado;
    const q = search.toLowerCase();
    return okF && (!q || p.nombre?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.rut?.includes(q));
  });

  const paginatedAdmin = filtrados.slice(adminPage * ADMIN_PER_PAGE, (adminPage + 1) * ADMIN_PER_PAGE);
  const granTotalRecaudadoGlobal = todosLosPedidos.filter(p => p.estado !== "rechazado").reduce((a, p) => a + (p.total || 0), 0);
  
  const totalRifaActual = pedidos.filter(p => p.estado !== "rechazado").reduce((a, p) => a + (p.total || 0), 0);
  const numerosVendidosRifaActual = pedidos.filter(p => p.estado !== "rechazado").reduce((a, p) => a + (p.numeros?.length || 0), 0);
  const confirmadosRifaActual = pedidos.filter(p => p.estado === "confirmado").reduce((a, p) => a + (p.numeros?.length || 0), 0);
  const pendientesRifaActual = pedidos.filter(p => p.estado === "pendiente").reduce((a, p) => a + (p.numeros?.length || 0), 0);
  const rechazadosRifaActual = pedidos.filter(p => p.estado === "rechazado").reduce((a, p) => a + (p.numeros?.length || 0), 0);
  
  const rifaInfoActual = rifasLocales.find(r => r.id === rifaSeleccionada);

  return (
    <main style={{ ...S.main, maxWidth: '1200px' }} className="fade">
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Panel Administrativo</h2>
      
      {/* ─── NAVEGACIÓN DE PESTAÑAS DEL PANEL ─── */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "25px", flexWrap: "wrap" }}>
        <button 
          onClick={() => setTab("comprobantes")} 
          style={{ ...S.filtroBtn, background: tab === "comprobantes" ? CONFIG.colores.primario : "#fff", color: tab === "comprobantes" ? "#fff" : "#333", border: "1.5px solid #e0d9cc", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
        >
          👁️ Ver Pedidos
        </button>
        <button 
          onClick={() => {
            setTab("gestionar_rifas");
            setEditandoId(null);
            setRifaForm({ titulo: "", motivo: "", precio_por_numero: 3000, total_numeros: 2000, fecha_sorteo: "", premios: "", activa: true, n_al_agua: 2 });
          }} 
          style={{ ...S.filtroBtn, background: tab === "gestionar_rifas" ? CONFIG.colores.primario : "#fff", color: tab === "gestionar_rifas" ? "#fff" : "#333", border: "1.5px solid #e0d9cc", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
        >
          ⚙️ Gestionar Rifas
        </button>
        <button 
          onClick={onNavegarSorteo} 
          style={{ ...S.filtroBtn, background: "#16a34a", color: "#fff", border: "none", padding: "10px 22px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 10px rgba(22,163,74,0.2)" }}
        >
          🎲 Sorteo V2
        </button>
      </div>

      {tab === "comprobantes" && (
        <>
          <div style={{ background: emerald, color: "#fff", padding: 20, borderRadius: 12, textAlign: "center", marginBottom: 25, boxShadow: "0 4px 15px rgba(26,122,74,0.15)" }}>
            <div style={{ fontSize: "13px", letterSpacing: "1px", opacity: 0.9 }}>💰 RECAUDACIÓN GLOBAL CONSOLIDADA</div>
            <h2 style={{ fontSize: "32px", marginTop: "5px", fontWeight: "800" }}>{formatCLP(granTotalRecaudadoGlobal)}</h2>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: "14px", fontWeight: "bold", color: navy, display: "block", marginBottom: "8px" }}>Seleccionar Campaña de Rifa Activa:</label>
            <select value={rifaSeleccionada} onChange={e => { setRifaSeleccionada(e.target.value); setAdminPage(0); }} style={{ ...S.input, width: "100%", padding: "12px", borderRadius: "8px", background: "#fff" }}>
              {rifasLocales.map(r => <option key={r.id} value={r.id}>{r.titulo}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "25px" }}>
            <div style={S.kpiCard}>
              <span style={{ fontSize: "20px" }}>💰</span>
              <h4 style={{ color: emerald, fontSize: "18px", margin: "5px 0 2px 0" }}>{formatCLP(totalRifaActual)}</h4>
              <span style={{ fontSize: "12px", color: "#666" }}>Total Recaudado</span>
            </div>
            <div style={S.kpiCard}>
              <span style={{ fontSize: "20px" }}>🎟️</span>
              <h4 style={{ color: navy, fontSize: "18px", margin: "5px 0 2px 0" }}>{numerosVendidosRifaActual}</h4>
              <span style={{ fontSize: "12px", color: "#666" }}>Números Vendidos</span>
            </div>
            <div style={S.kpiCard}>
              <span style={{ fontSize: "20px" }}>✅</span>
              <h4 style={{ color: "#16a34a", fontSize: "18px", margin: "5px 0 2px 0" }}>{confirmadosRifaActual}</h4>
              <span style={{ fontSize: "12px", color: "#666" }}>Confirmados</span>
            </div>
            <div style={S.kpiCard}>
              <span style={{ fontSize: "20px" }}>⏳</span>
              <h4 style={{ color: "#e67e22", fontSize: "18px", margin: "5px 0 2px 0" }}>{pendientesRifaActual}</h4>
              <span style={{ fontSize: "12px", color: "#666" }}>Pendientes</span>
            </div>
            <div style={S.kpiCard}>
              <span style={{ fontSize: "20px" }}>❌</span>
              <h4 style={{ color: rose, fontSize: "18px", margin: "5px 0 2px 0" }}>{rechazadosRifaActual}</h4>
              <span style={{ fontSize: "12px", color: "#666" }}>Rechazados</span>
            </div>
            <div style={S.kpiCard}>
              <span style={{ fontSize: "20px" }}>📈</span>
              <h4 style={{ color: gold, fontSize: "18px", margin: "5px 0 2px 0" }}>{rifaInfoActual ? `${Math.round(numerosVendidosRifaActual / rifaInfoActual.total_numeros * 100)}%` : "0%"}</h4>
              <span style={{ fontSize: "12px", color: "#666" }}>Avance Rifa</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap", alignItems: "center" }}>
            <input 
              placeholder="🔍 Buscar por nombre, RUT o email de comprador..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setAdminPage(0); }} 
              style={{ ...S.input, flex: 1, minWidth: "260px" }} 
            />
            <select 
              value={filtroEstado} 
              onChange={e => { setFiltroEstado(e.target.value); setAdminPage(0); }} 
              style={{ ...S.input, width: "160px" }}
            >
              <option value="todos">Todos ({filtrados.length})</option>
              <option value="pendiente">Pendientes</option>
              <option value="confirmado">Confirmados</option>
              <option value="rechazado">Rechazados</option>
            </select>
          </div>

          {loading ? (
            <p style={{ textAlign: "center", color: "#666", padding: 20 }}>Cargando listado de transferencias...</p>
          ) : (
            <>
              {filtrados.length === 0 ? (
                <p style={{ textAlign: "center", color: "#999", padding: 30, background: "#fff", borderRadius: 12 }}>No se encontraron transacciones con los filtros aplicados.</p>
              ) : (
                paginatedAdmin.map(p => <PedidoCard key={p.id} pedido={p} onCambiar={cambiarEstado} updating={updating === p.id} />)
              )}
            </>
          )}
        </>
      )}

      {tab === "gestionar_rifas" && (
        <div style={{ animation: "fadeUp 0.35s ease", display: "flex", flexDirection: "column", gap: "30px" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ color: navy, marginBottom: 5, fontFamily: "'Playfair Display', serif" }}>
              {editandoId ? "✏️ Modificar Configuración de Rifa" : "⛪ Registrar Nueva Campaña de Rifa"}
            </h3>
            <form onSubmit={handleGuardarRifa} style={{ background: "#fff", padding: 25, borderRadius: 12, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 4px 15px rgba(0,0,0,0.03)", border: editandoId ? `2px solid ${gold}` : "1px solid #e0d9cc" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "bold", color: "#555" }}>Título Oficial de la Rifa:</label>
                <input placeholder="Ej: Gran Rifa Pro Fondos Templo" value={rifaForm.titulo} onChange={e=>setRifaForm({...rifaForm,titulo:e.target.value})} style={S.input} required/>
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "bold", color: "#555" }}>Objetivo / Motivo:</label>
                <input placeholder="Ej: Juntar fondos para nuevo templo" value={rifaForm.motivo} onChange={e=>setRifaForm({...rifaForm,motivo:e.target.value})} style={S.input}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "bold", color: "#555" }}>Precio por Número ($):</label>
                  <input type="number" placeholder="3000" value={rifaForm.precio_por_numero} onChange={e=>setRifaForm({...rifaForm,precio_por_numero:e.target.value})} style={S.input} required/>
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "bold", color: "#555" }}>Total Números Disponibles:</label>
                  <input type="number" placeholder="2000" value={rifaForm.total_numeros} onChange={e=>setRifaForm({...rifaForm,total_numeros:e.target.value})} style={S.input} required/>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "bold", color: "#555" }}>Fecha del Sorteo:</label>
                  <input placeholder="Ej: 15 de Septiembre" value={rifaForm.fecha_sorteo} onChange={e=>setRifaForm({...rifaForm,fecha_sorteo:e.target.value})} style={S.input} required/>
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "bold", color: "#555" }}>Cantidad Bolillas Al Agua:</label>
                  <input type="number" placeholder="2" value={rifaForm.n_al_agua} onChange={e=>setRifaForm({...rifaForm,n_al_agua:e.target.value})} style={S.input} required/>
                </div>
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "bold", color: "#555" }}>Listado de Premios (Separados por coma):</label>
                <input placeholder="Ej: Refrigerador, Televisor 55', Licuadora" value={rifaForm.premios} onChange={e=>setRifaForm({...rifaForm,premios:e.target.value})} style={S.input} required/>
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "bold", color: "#555", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="checkbox" checked={rifaForm.activa} onChange={e=>setRifaForm({...rifaForm,activa:e.target.checked})} style={{ width: "auto" }}/>
                  ¿Campaña visible y activa para el público general?
                </label>
              </div>
              
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                {editandoId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditandoId(null);
                      setRifaForm({ titulo: "", motivo: "", precio_por_numero: 3000, total_numeros: 2000, fecha_sorteo: "", premios: "", activa: true, n_al_agua: 2 });
                    }} 
                    style={{ ...S.btnPrimary, background: "#6b7280", flex: 1 }}
                  >
                    Cancelar Edición
                  </button>
                )}
                <button type="submit" style={{ ...S.btnPrimary, flex: 2 }}>
                  {editandoId ? "💾 Guardar Cambios" : "⛪ Publicar Nueva Rifa"}
                </button>
              </div>
            </form>
          </div>

          <div>
            <h3 style={{ color: navy, marginBottom: 15, fontFamily: "'Playfair Display', serif" }}>⛪ Catálogo Total de Rifas Registradas</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {rifasLocales.map(r => (
                <div key={r.id} style={{ background: "#fff", padding: "16px", borderRadius: "12px", border: "1.5px solid #e0d9cc", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "16px", color: navy }}>{r.titulo}</strong>
                      <span style={{ fontSize: "11px", fontWeight: "bold", padding: "2px 6px", borderRadius: "4px", background: r.activa ? "#22c55e22" : "#ef444422", color: r.activa ? "#16a34a" : "#dc2626" }}>
                        {r.activa ? "Activa" : "Pausada"}
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#666", marginTop: "2px" }}>🎯 Motivo: {r.motivo || "Campaña General"} · 💰 {formatCLP(r.precio_por_numero)} c/u</p>
                    <p style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>🎁 Premios: {r.premios?.join(" · ")}</p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button 
                      onClick={() => handleSeleccionarEditar(r)}
                      style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      onClick={() => handleEliminarRifa(r.id, r.titulo)}
                      style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </main>
  );
}

function PedidoCard({ pedido, onCambiar, updating }) {
  const [open, setOpen] = useState(false);
  const esPdf = pedido.voucher_url?.toLowerCase().endsWith(".pdf");
  return (
    <div style={{ background: "#fff", padding: 15, borderRadius: 12, marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
        <div>
          <strong>{pedido.nombre}</strong>
          <p style={{ fontSize: 12, color: "#666" }}>{pedido.telefono} · {pedido.email}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontWeight: "bold" }}>{formatCLP(pedido.total)}</span>
          <p style={{ fontSize: 11, color: gold }}>{open ? "▲ Ocultar" : "▼ Revisar"}</p>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 15, borderTop: "1px solid #eee", paddingTop: 10 }}>
          <p style={{ fontSize: 13 }}>🔢 <strong>Números:</strong> {pedido.numeros?.map(pad).join(", ")}</p>
          {pedido.voucher_url ? (
            <div style={{ margin: "10px 0", textAlign: "center" }}>
              {esPdf ? <iframe src={pedido.voucher_url} title="p" style={{ width: "100%", height: "300px" }}/> : <img src={pedido.voucher_url} alt="v" style={{ maxWidth: "100%", maxHeight: 250 }}/>}
            </div>
          ) : <p style={{ color: rose }}>Sin comprobante</p>}
          {pedido.estado === "pendiente" && (
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button onClick={() => onCambiar(pedido.id, "confirmado")} disabled={updating} style={{ background: emerald, color: "#fff", border: "none", padding: 8, borderRadius: 6, flex: 1 }}>Aprobar</button>
              <button onClick={() => onCambiar(pedido.id, "rechazado")} disabled={updating} style={{ background: rose, color: "#fff", border: "none", padding: 8, borderRadius: 6, flex: 1 }}>Rechazar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  root:{minHeight:"100vh",background:cream,fontFamily:"'DM Sans',sans-serif",color:navy},
  nav:{background:navy,padding:"12px 20px",position:"sticky",top:0,zIndex:200},
  navIn:{maxWidth:700,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"},
  brand:{display:"flex",gap:12,alignItems:"center",cursor:"pointer"},
  brandName:{color:"#fff",fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700},
  brandSub:{color:`${gold}bb`,fontSize:11,letterSpacing:1.5,textTransform:"uppercase"},
  navBtn:{background:"transparent",border:`1px solid ${gold}66`,color:gold,borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:13},
  main:{maxWidth:700,margin:"0 auto",padding:"20px 14px 40px"},
  hero:{background:`linear-gradient(145deg,${navy} 0%,#183060 100%)`,borderRadius:20,padding:"28px 22px 24px",marginBottom:20,border:`2px solid ${gold}44`},
  heroBadge:{color:gold,fontSize:11,letterSpacing:3,textTransform:"uppercase",textAlign:"center",marginBottom:10},
  heroTitle:{color:"#fff",fontFamily:"'Playfair Display',serif",fontSize:24,textAlign:"center"},
  heroDate:{color:"rgba(255,255,255,0.5)",textAlign:"center",fontSize:13},
  progressWrap:{margin: "15px 0"},
  progressBar:{background:"rgba(255,255,255,0.12)",borderRadius:99,height:10,overflow:"hidden",marginBottom:6},
  progressFill:{height:"100%",background:gold,transition:"width .5s ease"},
  progressLabels:{display:"flex",justifyContent:"space-between",fontSize:11,color:"#fff"},
  heroKpis:{display:"flex",justifyContent:"center",gap:20,marginTop:15},
  heroKpi:{textAlign:"center", color:"rgba(255, 255, 255, 0.7)", fontSize:"13px"},
  heroKpiNum:{display:"block",color:gold,fontSize:18,fontWeight:900},
  kpiDiv:{width:1,height:30,background:"rgba(255,255,255,0.2)"},
  controls:{display:"flex",flexDirection:"column",gap:10,marginBottom:15},
  searchInput:{width:"100%",border:"1.5px solid #e0d9cc",borderRadius:10,padding:10,fontSize:14},
  filtros:{display:"flex",gap:8},
  filtroBtn:{background:"#fff",border:"1.5px solid #e0d9cc",borderRadius:20,padding:"5px 12px",cursor:"pointer",fontSize:12},
  filtroBtnActive:{background:navy,color:"#fff"},
  randomBtn:{background:"#fff",border:`1px solid ${gold}`,color:navy,borderRadius:8,padding:6,cursor:"pointer",alignSelf:"flex-start"},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(52px,1fr))",gap:5},
  numBtn:{padding:8,borderRadius:6,border:"none",fontWeight:700,cursor:"pointer",fontFamily:"monospace"},
  numAvail:{background:"#fff",color:navy,border:"1.5px solid #e0d9cc"},
  numSel:{background:gold,color:"#fff"},
  numTaken:{background:"#e8e8e8",color:"#c0c0c0",cursor:"not-allowed",textDecoration:"line-through"},
  pagination:{display:"flex",justifyContent:"center",gap:10,marginTop:15},
  pageBtn:{background:"#fff",border:"1px solid #ccc",padding:"5px 10px",borderRadius:6},
  stickyBar:{position:"fixed",bottom:0,left:0,right:0,background:navy,padding:15,display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:100},
  stickyTotal:{color:gold,fontSize:20,fontWeight:900},
  btnPrimary:{background:gold,color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontWeight:"bold",cursor:"pointer"},
  card:{background:"#fff",padding:20,borderRadius:16,boxShadow:"0 4px 12px rgba(0,0,0,0.05)"},
  cardTitle:{fontFamily:"'Playfair Display',serif",fontSize:20,color:navy,marginBottom:15},
  backBtn:{background:"none",border:"none",color:"#999",cursor:"pointer",marginBottom:10},
  summaryBox:{background:"#f9f5eb",padding:15,borderRadius:12,marginBottom:15},
  numsWrap:{display:"flex",flexWrap:"wrap",gap:4},
  numTagForm:{background:`${gold}22`,padding:"2px 6px",borderRadius:4,fontFamily:"monospace",fontSize:12},
  summaryDiv:{height:1,background:"#ddd",margin:"10px 0"},
  bankBox:{background:"#fafafa",padding:12,borderRadius:10,marginBottom:15,fontSize:13},
  bankRow:{display:"flex",justifyContent:"space-between",marginBottom:4},
  bankKey:{color:"#888"},
  bankVal:{fontWeight:"bold"},
  fields:{display:"flex",flexDirection:"column",gap:10,marginBottom:15},
  input:{border:"1.5px solid #e0d9cc",borderRadius:8,padding:10,width:"100%"},
  uploadZone:{display:"block",border:`2px dashed ${gold}`,padding:20,borderRadius:10,textAlign:"center",cursor:"pointer",background:"#fffdf9"},
  voucherImg:{maxWidth:"100%",maxHeight:150},
  alertErr:{background:"#fde8e8",color:rose,padding:10,borderRadius:8,marginBottom:15},
  spinner:{display:"inline-block",width:14,height:14,border:"2px solid #fff",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .6s linear infinite"},
  successNums:{display:"flex",flexWrap:"wrap",gap:4,margin:"15px 0"},
  successNum:{background:gold,color:"#fff",padding:"3px 8px",borderRadius:4,fontFamily:"monospace"},
  loginWrap:{display:"flex",justifyContent:"center",paddingTop:50},
  loginCard:{background:"#fff",padding:25,borderRadius:16,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",width:320,display:"flex",flexDirection:"column",gap:12},
  loginTitle:{textAlign:"center",fontFamily:"'Playfair Display',serif"},
  kpiGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:15},
  kpiCard:{background:"#fff",padding:15,borderRadius:12,textAlign:"center",boxShadow:"0 4px 10px rgba(0,0,0,0.04)",border:"1px solid #e0d9cc",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},
  filterBar:{marginBottom:15}
};