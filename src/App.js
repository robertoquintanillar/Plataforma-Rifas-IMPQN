import { useState, useEffect, useCallback, useMemo } from "react";

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

  nombreCuenta: "Marcela Valdés",
  rutCuenta: "13562069-6",
  banco: "Scotiabank",
  tipoCuenta: "Cuenta Corriente",
  numeroCuenta: "975973239",
  Motivo : "Pago números xxx",
  MailAviso : "mb.valdes.avila@gmail.com",
  
  whatsappAdmin: "56992191358",
  emailAdmin: "quintanormal,imp@gmail.com",
  adminPassword: "iglesia2026",

  // ─── SUPABASE ─────────────────────────────────────────────────────────────
  supabaseUrl: "https://ykqbswfbampfjyxwivvn.supabase.co",
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcWJzd2ZiYW1wZmp5eHdpdnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Nzk1OTEsImV4cCI6MjA5NDU1NTU5MX0.rxN-FGF6JuSNKWpNjVqhmTigJm2L8IHhuRtjJI4oB-0",

  // ─── RESEND (correos — 3.000/mes gratis) ──────────────────────────────────
  // 1. Ve a https://resend.com → crea cuenta
  // 2. Settings → API Keys → Create API Key
  // 3. Domains → Add Domain (o usa el dominio de prueba @resend.dev)
  resendApiKey: "re_LViYq1tr_6UywE63tXwJfEQUNezGzyjYU",
  resendFromEmail: "rifa@impquintanormal.cl",

    // ─── NUEVA SECCIÓN DE COLORES ─────────────────────────────────────────────
  colores: {
    primario: "#0B3B7B", // Azul Institucional
    acento: "#BE2329",   // Rojo Acento
    fondo: "#FFFFFF",   // Blanco
    textoHeader: "#FFFFFF" // Texto blanco sobre fondo azul
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
const pad = (n, len = 4) => String(n).padStart(len, "0");
// const isDemo = CONFIG.supabaseUrl.includes("TU_PROYECTO");

// ─── Demo state ───────────────────────────────────────────────────────────────
/* const DEMO_TAKEN = new Set([
  1,5,12,23,34,45,67,89,100,123,200,250,333,400,500,555,600,700,800,900,
  1000,1100,1200,1300,1400,1500,1600,1700,1800,1900,1999,2000,
  150,160,170,180,190,210,220,230,240,260,270,280,290,
]); */
/* let demoPedidos = [
  { id:"d1", nombre:"María González", rut:"12.345.678-9", email:"maria@ejemplo.cl", telefono:"+56 9 8765 4321", numeros:[1,5,12], total:6000, estado:"confirmado", created_at: new Date(Date.now()-86400000).toISOString(), voucher_url:null },
  { id:"d2", nombre:"Pedro Soto", rut:"9.876.543-2", email:"pedro@ejemplo.cl", telefono:"+56 9 1234 5678", numeros:[23,34,45,67], total:8000, estado:"pendiente", created_at: new Date(Date.now()-3600000).toISOString(), voucher_url:null },
  { id:"d3", nombre:"Ana Muñoz", rut:"15.432.109-8", email:"ana@ejemplo.cl", telefono:"+56 9 5555 1234", numeros:[89,100,123,200,250], total:10000, estado:"rechazado", created_at: new Date(Date.now()-7200000).toISOString(), voucher_url:null },
]; */

// ─── FORMATEADOR Y MÁSCARA DE RUT CHILENO ─────────────────────────────────────
const formatRUT = (value) => {
  if (!value) return "";
  
  // Limpiar dejando solo números y K
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
// ─── FIN FORMATEADOR Y MÁSCARA DE RUT CHILENO ─────────────────────────────────────

// ─── VALIDACIÓN MATEMÁTICA DEL RUT (MÓDULO 11) — VERSIÓN CORREGIDA ───────────
const validateRUT = (rutCompleto) => {
  if (!rutCompleto) return false;

  // 1. Limpiar absolutamente todo para dejar SOLO números y la K (elimina puntos y guion)
  const rutLimpio = rutCompleto.replace(/[^0-9kK]/g, "");
  
  // Un RUT válido tiene entre 8 y 9 caracteres limpios (ej: 12345678K o 98765432)
  if (rutLimpio.length < 8 || rutLimpio.length > 9) return false;

  // 2. Extraer el dígito verificador (el último carácter)
  const dvInput = rutLimpio.slice(-1).toUpperCase();
  
  // 3. Extraer el cuerpo (todo lo anterior al dígito verificador)
  const cuerpo = rutLimpio.slice(0, -1);

  // 4. Algoritmo Módulo 11
  let suma = 0;
  let multiplicador = 2;

  // Recorrer el cuerpo de atrás hacia adelante multiplicando por 2, 3, 4, 5, 6, 7 y volver a empezar
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  // 5. Calcular el residuo de la división por 11
  const residuo = suma % 11;
  const resultado = 11 - residuo;
  
  // 6. Determinar cuál debería ser el dígito verificador teórico
  let dvEsperado = "";
  if (resultado === 11) dvEsperado = "0";
  else if (resultado === 10) dvEsperado = "K";
  else dvEsperado = String(resultado);

  // 7. Comparar lo que calculamos contra lo que ingresó el usuario
  return dvInput === dvEsperado;
};
// ─── FIN VALIDACIÓN MATEMÁTICA DEL RUT (MÓDULO 11) ────────────────────────────────

// ─── FORMATEADOR Y MÁSCARA DE CELULAR CHILENO (+56 9 XXXX XXXX) ───────────────
const formatCelular = (value) => {
  if (!value) return "+56 9 ";

  // 1. Si el usuario intenta borrar el prefijo base "+56 9 ", no dejarlo
  if (value.length < 7 && (value.includes("+56") || value.trim() === "+569")) {
    return "+56 9 ";
  }

  // 2. Extraer solo los números de lo que escriba el usuario
  let numeros = value.replace(/[^0-9]/g, "");

  // 3. Si el usuario pegó o escribió el "56" o "569" al inicio, se los quitamos 
  // para procesar puramente los 8 dígitos móviles restantes
  if (numeros.startsWith("569")) {
    numeros = numeros.slice(3);
  } else if (numeros.startsWith("56") && numeros.length > 2) {
    numeros = numeros.slice(2);
  } else if (numeros.startsWith("9") && numeros.length > 1) {
    numeros = numeros.slice(1);
  }

  // 4. Limitar el largo máximo a 8 dígitos (el "9" inicial va fijo en la máscara)
  if (numeros.length > 8) {
    numeros = numeros.slice(0, 8);
  }

  // 5. Ir armando la máscara dinámicamente: +56 9 XXXX XXXX
  if (numeros.length === 0) {
    return "+56 9 ";
  } else if (numeros.length <= 4) {
    return `+56 9 ${numeros}`;
  } else {
    return `+56 9 ${numeros.slice(0, 4)} ${numeros.slice(4)}`;
  }
};

// ─── LIMPIADOR DE CORREO ELECTRÓNICO EN TIEMPO REAL ───────────────────────────
const cleanEmail = (value) => {
  if (!value) return "";
  // Remueve espacios en blanco y fuerza minúsculas (el estándar para correos)
  return value.replace(/\s+/g, "").toLowerCase();
};

// ─── Supabase client ──────────────────────────────────────────────────────────
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
    // 1. GESTIÓN DE RIFAS (CAMPANAS) - ÚNICA INSTANCIA
    async getRifas() {
      const r = await fetch(`${url}/rest/v1/rifas?select=*&order=created_at.desc`, { headers: h });
      return r.json();
    },
    async insertRifa(rifa) {
      const r = await fetch(`${url}/rest/v1/rifas`, {
        method: "POST", headers: { ...h, Prefer: "return=representation" }, body: JSON.stringify(rifa)
      });
      return r.json();
    },
    async updateRifa(id, rifa) {
      await fetch(`${url}/rest/v1/rifas?id=eq.${id}`, {
        method: "PATCH", headers: h, body: JSON.stringify(rifa)
      });
    },
    async deleteRifa(id) {
      await fetch(`${url}/rest/v1/rifas?id=eq.${id}`, {
        method: "DELETE", headers: h
      });
    },

    // 2. GESTIÓN DE PEDIDOS Y COMPROBANTES
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
      await fetch(`${url}/rest/v1/pedidos?id=eq.${id}`, {
        method: "PATCH", headers: h, body: JSON.stringify({ estado })
      });
    },
    async updateVoucherUrl(id, voucher_url) {
      await fetch(`${url}/rest/v1/pedidos?id=eq.${id}`, {
        method: "PATCH", headers: h, body: JSON.stringify({ voucher_url })
      });
    },

// 3. CONTROL DE NÚMEROS Y ALMACENAMIENTO DE ARCHIVOS
    async getNumerosTomados(rifaId) {
      const r = await fetch(`${url}/rest/v1/pedidos?rifa_id=eq.${rifaId}&estado=neq.rechazado`, { headers: h });
      const data = await r.json();
      // Retornamos un Set directamente para que el .has(n) de la grilla funcione a la perfección
      return new Set(data.reduce((acc, p) => acc.concat(p.numeros || []), []));
    },

    async marcarNumeros(nums, rifaId) {
      // Mantiene consistencia de asignación de números en el cliente
      return true;
    },
    async uploadVoucher(file, pedidoId) {
      const ext = file.name.split(".").pop();
      const path = `${pedidoId}_${Date.now()}.${ext}`;
      
      // 1. Cambia 'vouchers' por 'comprobantes' aquí
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
      
      // 2. Cambia 'vouchers' por 'comprobantes' también aquí
      return `${url}/storage/v1/object/public/comprobantes/${path}`;
    }
  };
}

// ─── Resend email ─────────────────────────────────────────────────────────────
async function sendEmail({ nombre, email, numeros, total, rifaActiva }) {
  try {
    const numsStr = numeros.map(n=>pad(n)).join(", ");
    
    // ─── GENERACIÓN DINÁMICA DE LA LISTA DE PREMIO(S) ─────────────────────────
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
      body: JSON.stringify({
        email: email,
        nombreIglesia: CONFIG.nombreIglesia,
        html: html
      })
    });
  } catch(e) { console.warn("Email error:", e); }
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
function notifyWhatsApp({ nombre, email, numeros, total }) {
  const msg = encodeURIComponent(
    `🎟️ *Nueva venta — ${CONFIG.nombreIglesia}*\n\n` +
    `👤 *Nombre:* ${nombre}\n` +
    `📧 *Email:* ${email}\n` +
    `🔢 *Números (${numeros.length}):* ${numeros.map(pad).join(", ")}\n` +
    `💰 *Total:* ${formatCLP(total)}\n\n` +
    `⏳ Verificar comprobante en el panel admin.`
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

  // Cargamos el catálogo de rifas desde Supabase apenas abre la página
  useEffect(() => {
    db().getRifas()
      .then(data => {
        setRifas(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error cargando catálogo:", err);
        setLoading(false);
      });
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
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}
        .fade{animation:fadeUp .35s ease both}
        .pop{animation:pop .25s ease}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:${gold}44;border-radius:4px}
      `}</style>

      {/* Barra de Navegación Superior */}
      <nav style={S.nav}>
        <div style={S.navIn}>
          <div style={S.brand} onClick={() => { setView("rifa"); setRifaActiva(null); }}>
            <img 
              src="/logo-iglesia.png" 
              alt="Logo IMP QN" 
              style={{ height: "42px", width: "42px", objectFit: "contain" }} 
            />
            <div>
              <div style={S.brandName}>{CONFIG.nombreIglesia}</div>
              <div style={S.brandSub}>Plataforma Oficial de Rifas Benéficas</div>
            </div>
          </div>
          <button style={S.navBtn} onClick={() => setView(view === "rifa" ? "admin" : "rifa")}>
            {view === "rifa" ? "⚙️ Admin" : "← Volver"}
          </button>
        </div>
      </nav>

      {/* RENDERIZADO CONDICIONAL DE PANTALLAS */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 100 }}>
          <div style={{ ...S.spinner, width: 40, height: 40, borderWidth: 3, borderTopColor: CONFIG.colores.primario }} />
        </div>
      ) : (
        <>
          {/* VISTA DEL PÚBLICO */}
          {view === "rifa" && (
            !rifaActiva ? (
              <PantallaSeleccionRifas rifas={rifas} onSelect={setRifaActiva} />
            ) : (
              <RifaView rifaActiva={rifaActiva} onVolverAlCatalogo={() => setRifaActiva(null)} />
            )
          )}

          {/* VISTA PANEL DE ADMINISTRACIÓN */}
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
          {view === "admin" && adminAuthed && <AdminView listaRifas={rifas} />}
        </>
      )}
    </div>
  );
}

// ─── NUEVA PANTALLA: SELECTOR DINÁMICO DE CAMPAÑAS ────────────────────────────
function PantallaSeleccionRifas({ rifas, onSelect }) {
  // Filtramos para mostrar únicamente las rifas que marcaste como "activas" en Supabase
  const activas = rifas.filter(r => r.activa);

  return (
    <main style={S.main} className="fade">
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: CONFIG.colores.primario, marginBottom: 8 }}>
          Campañas de Recaudación
        </h2>
        <p style={{ color: "#666", fontSize: 14, maxWidth: 460, margin: "0 auto" }}>
          Selecciona una de nuestras rifas activas para cooperar con la construcción del nuevo templo de nuestra iglesia. ¡Dios te bendiga! 🙏
        </p>
      </div>

      {activas.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 16, border: "1px solid #e0d9cc" }}>
          <span style={{ fontSize: 40 }}>⛪</span>
          <p style={{ marginTop: 12, color: "#999", fontWeight: 500 }}>No hay rifas activas en este momento.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {activas.map(rifa => (
            <div 
              key={rifa.id} 
              style={{ 
                background: "#fff", 
                borderRadius: 16, 
                padding: 20, 
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)", 
                border: `1px solid ${gold}33`,
                display: "flex",
                flexDirection: "column",
                gap: 12
              }}
            >
              <div>
                <span style={{ background: `${gold}22`, color: navy, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  🎯 {rifa.motivo || "Campaña General"}
                </span>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: navy, marginTop: 6 }}>
                  {rifa.titulo}
                </h3>
              </div>

              <div style={{ display: "flex", gap: 16, background: cream, padding: 12, borderRadius: 10, fontSize: 13 }}>
                <div>💰 Valor número: <strong>{formatCLP(rifa.precio_por_numero)}</strong></div>
                <div style={{ width: 1, background: `${gold}44` }} />
                <div>📅 Sorteo: <strong>{rifa.fecha_sorteo}</strong></div>
              </div>

              {/* ─── LISTADO DE PREMIOS UNIDOS POR PUNTOS DINÁMICOS ────────────────── */}
              <div style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>
                🎁 <strong>Premios:</strong> {rifa.premios && rifa.premios.length > 0 ? rifa.premios.join(' · ') : 'Por definir'}
              </div>

              <button 
                onClick={() => onSelect(rifa)}
                style={{ 
                  ...S.btnPrimary, 
                  background: `linear-gradient(135deg, ${CONFIG.colores.primario}, #183060)`,
                  width: "100%", 
                  marginTop: 4,
                  padding: "12px"
                }}
              >
                🎟️ Ver Disponibilidad y Comprar
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// ─── 1. VISTA INTERACTIVA DE LA RIFA SELECCIONADA ─────────────────────────────
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

  useEffect(() => {
    db().getNumerosTomados(rifaActiva.id).then(setTomados).catch(() => {});
  }, [rifaActiva.id]);

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
    
    if (!form.rut || !form.rut.trim()) {
      e.rut = "Requerido";
    } else if (!validateRUT(form.rut)) {
      e.rut = "RUT inválido";
    }
    
    // Aquí queda instalada la nueva validación estricta del mail
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!form.email || !form.email.trim()) {
      e.email = "Requerido";
    } else if (!emailRegex.test(form.email)) {
      e.email = "El correo electrónico no es válido. Ejemplo: nombre@dominio.com";
    }
    
    if (!form.telefono || !form.telefono.trim() || form.telefono.trim() === "+56 9") {
      e.telefono = "Requerido";
    } else if (form.telefono.replace(/[^0-9]/g, "").length < 11) {
      e.telefono = "Número incompleto. Asegúrate de ingresar los 8 dígitos de tu celular.";
    }
    
    if (!voucher) e.voucher = "Debes subir el comprobante";
    
    if (Object.keys(e).length) { 
      setErrors(e); 
      setSubmitErr("Por favor, corrige los errores en el formulario.");
      return; 
    }
    
    try {
      setSubmitting(true); 
      setSubmitErr(null);
      
      const nums = [...selected].sort((a, b) => a - b);
      
      let pedido = await db().insertPedido({
        rifa_id: rifaActiva.id,
        nombre: form.nombre,
        rut: form.rut,
        email: form.email,
        telefono: form.telefono,
        numeros: nums,
        total,
        estado: "pendiente",
        voucher_url: null
      });
      
      const vUrl = await db().uploadVoucher(voucher, pedido.id);
      pedido.voucher_url = vUrl;
      
      await db().updateVoucherUrl(pedido.id, vUrl);
      await db().marcarNumeros(nums, rifaActiva.id);
      
      await sendEmail({ ...form, numeros: nums, total, rifaActiva });
      notifyWhatsApp({ nombre: form.nombre, email: form.email, numeros: nums, total });
      
      setStep("success");
    } catch (err) {
      setSubmitErr("Ocurrió un error. Intenta nuevamente o contacta a la iglesia.");
      console.error(err);
    } finally { 
      setSubmitting(false); 
    }
  };

  if (step === "success") return (
    <SuccessView
      nombre={form.nombre} email={form.email} numeros={[...selected].sort((a, b) => a - b)} total={total} rifaActiva={rifaActiva}
      onReset={() => { setStep("select"); setSelected(new Set()); setForm({ nombre: "", rut: "", email: "", telefono: "+56 9 " }); setVoucher(null); setVoucherPreview(null); }}
    />
  );

  if (step === "form") return (
    <FormView
      form={form} setForm={setForm} errors={errors} setErrors={setErrors}
      voucher={voucher} setVoucher={setVoucher} voucherPreview={voucherPreview} setVoucherPreview={setVoucherPreview}
      selected={selected} total={total} submitting={submitting} submitErr={submitErr}
      onBack={() => setStep("select")} onSubmit={handleSubmit}
    />
  );

  return (
    <SelectView
      tomados={tomados} selected={selected} toggle={toggle} total={total} rifaActiva={rifaActiva}
      onContinue={() => setStep("form")} onBack={onVolverAlCatalogo}
    />
  );
}

// ─── 2. SELECCIÓN DE NÚMEROS ADAPTATIVA ───────────────────────────────────────
function SelectView({ tomados, selected, toggle, total, rifaActiva, onContinue, onBack }) {
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [page, setPage] = useState(0);
  const PER_PAGE = 200;

  // 🔥 VALORES DE RESPALDO DE SEGURIDAD (Si no vienen en rifaActiva, asume el estándar de 2000)
  const totalNumerosSeguros = rifaActiva?.total_numeros ? parseInt(rifaActiva.total_numeros, 10) : 2000;
  const tomadosSizeSeguro = tomados?.size || 0;

  const disponibles = totalNumerosSeguros - tomadosSizeSeguro;
  const porcentaje = totalNumerosSeguros > 0 ? Math.round((tomadosSizeSeguro / totalNumerosSeguros) * 100) : 0;

  const numeros = useMemo(() => {
    // Usamos el total de números seguro para evitar que Array.from colapse
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
    const libres = Array.from({ length: rifaActiva.total_numeros }, (_, i) => i + 1).filter(n => !tomados.has(n) && !selected.has(n));
    const cant = Math.min(5, CONFIG.maxPorPersona - selected.size, libres.length);
    if (cant <= 0) return;
    const shuffled = libres.sort(() => Math.random() - 0.5).slice(0, cant);
    shuffled.forEach(n => toggle(n));
  };

  return (
    <main style={S.main}>
      <button style={{ ...S.backBtn, marginBottom: 12 }} onClick={onBack}>← Volver al Catálogo de Rifas</button>
      
      <div style={S.hero} className="fade">
        <div style={S.heroBadge}>🎯 {rifaActiva.motivo || "Campaña de Recaudación"}</div>
        <h1 style={S.heroTitle}>{rifaActiva.titulo}</h1>
        <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "14px 0" }} />
        
        {/* ─── RENDERIZADO DINÁMICO DE N PREMIOS CON JERARQUÍA VISUAL ─── */}
        {rifaActiva && Array.isArray(rifaActiva.premios) && rifaActiva.premios.length > 0 ? (
          rifaActiva.premios.map((premio, idx) => (
            <h2 
              key={idx} 
              style={{ 
                ...S.heroTitle, 
                fontSize: idx === 0 ? 20 : idx === 1 ? 17 : 14, 
                opacity: idx === 0 ? 1 : idx === 1 ? 0.9 : 0.8,
                marginTop: 4,
                fontWeight: idx === 0 ? "700" : "400"
              }}
            >
              🎁 {idx + 1}° Premio: {premio}
            </h2>
          ))
        ) : (
          <h2 style={{ ...S.heroTitle, fontSize: 16, opacity: 0.7, marginTop: 4, fontWeight: "400" }}>
            🎁 Premios: Por confirmar por la administración
          </h2>
        )}

        <p style={{ ...S.heroDate, marginTop: 14, marginBottom: 14 }}>Sorteo: {rifaActiva.fecha_sorteo}</p>

        <div style={S.progressWrap}>
          <div style={S.progressBar}>
            <div style={{ ...S.progressFill, width: `${porcentaje}%` }} />
          </div>
          <div style={S.progressLabels}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{tomados.size.toLocaleString("es-CL")} vendidos</span>
            <span style={{ color: gold, fontWeight: 700 }}>{porcentaje}% vendido</span>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{disponibles.toLocaleString("es-CL")} disponibles</span>
          </div>
        </div>

        <div style={S.heroKpis}>
          <div style={S.heroKpi}><span style={S.heroKpiNum}>{formatCLP(rifaActiva.precio_por_numero)}</span><span style={S.heroKpiLbl}>por número</span></div>
          <div style={S.kpiDiv} />
          <div style={S.heroKpi}><span style={S.heroKpiNum}>{CONFIG.maxPorPersona}</span><span style={S.heroKpiLbl}>máx. por persona</span></div>
          <div style={S.kpiDiv} />
          <div style={S.heroKpi}><span style={S.heroKpiNum}>{rifaActiva.total_numeros.toLocaleString("es-CL")}</span><span style={S.heroKpiLbl}>números totales</span></div>
        </div>
      </div>

      <div style={S.controls} className="fade">
        <div style={S.searchWrap}>
          <span style={S.searchIcon}>🔍</span>
          <input placeholder="Buscar número (ej: 0042)" value={query} onChange={e => setQuery(e.target.value)} style={S.searchInput} />
          {query && <button style={S.clearBtn} onClick={() => setQuery("")}>✕</button>}
        </div>
        <div style={S.filtros}>
          {["todos", "disponibles", "vendidos"].map(f => (
            <button key={f} style={{ ...S.filtroBtn, ...(filtro === f ? S.filtroBtnActive : {}) }} onClick={() => setFiltro(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button style={S.randomBtn} onClick={pickRandom} disabled={selected.size >= CONFIG.maxPorPersona}>
          🎲 Elegir 5 al azar
        </button>
      </div>

      <div style={S.legend}>
        {[{ bg: "#fff", border: `1.5px solid #ddd`, lbl: "Disponible" }, { bg: gold, border: `1.5px solid ${gold}`, lbl: "Seleccionado" }, { bg: "#e2e2e2", border: "1.5px solid #ccc", lbl: "Vendido" }].map(({ bg, border, lbl }) => (
          <div key={lbl} style={S.legendItem}>
            <span style={{ ...S.legendDot, background: bg, border }} />
            <span>{lbl}</span>
          </div>
        ))}
      </div>

      <div style={S.resultsInfo}>
        Mostrando {paginated.length} de {numeros.length.toLocaleString("es-CL")} números
      </div>

      <div style={S.grid}>
        {paginated.map(n => {
          const taken = tomados.has(n), sel = selected.has(n);
          return (
            <button key={n} onClick={() => toggle(n)} disabled={taken} style={{ ...S.numBtn, ...(taken ? S.numTaken : sel ? S.numSel : S.numAvail) }}>
              {pad(n)}
            </button>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={S.pagination}>
          <button style={S.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</button>
          <span style={S.pageInfo}>Página {page + 1} de {totalPages}</span>
          <button style={S.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
        </div>
      )}

      <div style={{ height: 110 }} />

      <div style={S.stickyBar}>
        <div>
          {selected.size > 0 ? (
            <>
              <div style={S.stickyNums}>
                {[...selected].sort((a, b) => a - b).slice(0, 8).map(n => (
                  <span key={n} style={S.stickyTag}>{pad(n)}</span>
                ))}
                {selected.size > 8 && <span style={S.stickyMore}>+{selected.size - 8}</span>}
              </div>
              <div style={S.stickyTotal}>{formatCLP(total)}</div>
            </>
          ) : (
            <div style={S.stickyEmpty}>Selecciona tus números 👆</div>
          )}
        </div>
        <button disabled={selected.size === 0} style={{ ...S.btnPrimary, ...(selected.size === 0 ? { opacity: .4, cursor: "not-allowed" } : {}) }} onClick={onContinue}>
          Continuar ({selected.size}) →
        </button>
      </div>
    </main>
  );
}

// ─── 3. FORMULARIO DE INSCRIPCIÓN (Se mantiene intacto tu diseño original) ───
function FormView({form,setForm,errors,setErrors,voucher,setVoucher,voucherPreview,setVoucherPreview,selected,total,submitting,submitErr,onBack,onSubmit}) {
  const nums=[...selected].sort((a,b)=>a-b);

  const handleFile=e=>{
    const f=e.target.files[0]; if(!f) return;
    if(f.size>10*1024*1024){setErrors({...errors,voucher:"Máximo 10MB"});return;}
    setVoucher(f); setVoucherPreview(URL.createObjectURL(f));
    setErrors({...errors,voucher:null});
  };

  return (
    <main style={S.main}>
      <div style={S.card} className="fade">
        <button style={S.backBtn} onClick={onBack}>← Volver</button>
        <h2 style={S.cardTitle}>Datos y comprobante de pago</h2>

        <div style={S.summaryBox}>
          <div style={S.summaryRow}>
            <span style={S.summaryLbl}>Números seleccionados ({nums.length})</span>
          </div>
          <div style={S.numsWrap}>
            {nums.map(n=><span key={n} style={S.numTagForm}>{pad(n)}</span>)}
          </div>
          <div style={S.summaryDiv}/>
          <div style={S.summaryRow}>
            <span style={S.summaryLbl}>Total a transferir</span>
            <span style={{color:gold,fontWeight:900,fontSize:22,fontFamily:"'Playfair Display',serif"}}>{formatCLP(total)}</span>
          </div>
        </div>

        <div style={S.bankBox}>
          <p style={S.bankTitle}>📲 Transfiere a esta cuenta</p>
          {[["Banco",CONFIG.banco],["Tipo",CONFIG.tipoCuenta],["N° Cuenta",CONFIG.numeroCuenta],["Nombre",CONFIG.nombreCuenta],["RUT",CONFIG.rutCuenta]].map(([k,v])=>(
            <div key={k} style={S.bankRow}>
              <span style={S.bankKey}>{k}</span>
              <span style={S.bankVal}>{v}</span>
            </div>
          ))}
        </div>

<div style={S.fields}>
  {/* 1. CAMPO NOMBRE */}
  <div style={S.fieldGroup}>
    <label style={S.label}>Nombre completo</label>
    <input 
      type="text" 
      placeholder="Juan Pérez González" 
      value={form.nombre}
      onChange={e => {
        setForm({ ...form, nombre: e.target.value });
        setErrors({ ...errors, nombre: null });
      }}
      style={{...S.input,...(errors.nombre ? {borderColor:rose} : {})}}
    />
    {errors.nombre && <span style={S.errMsg}>{errors.nombre}</span>}
  </div>

{/* 2. CAMPO RUT (MÁSCARA ESTABLE EN TIEMPO REAL) */}
  <div style={S.fieldGroup}>
    <label style={S.label}>RUT</label>
    <input 
      type="text" 
      placeholder="12.345.678-9" 
      value={form.rut} 
      onChange={e => {
        const val = e.target.value;
        const formateado = formatRUT(val);
        
        // Actualización estándar y directa
        setForm({ ...form, rut: formateado });
        setErrors({ ...errors, rut: null });
      }}
      style={{...S.input,...(errors.rut ? {borderColor:rose} : {})}}
    />
    {errors.rut && <span style={S.errMsg}>{errors.rut}</span>}
  </div>

{/* 3. CAMPO CORREO ELECTRÓNICO (FILTRO EN TIEMPO REAL) */}
  <div style={S.fieldGroup}>
    <label style={S.label}>Correo electrónico</label>
    <input 
      type="email" 
      placeholder="juan@ejemplo.cl" 
      value={form.email}
      onChange={e => {
        const val = e.target.value;
        const correoLimpio = cleanEmail(val);
        
        setForm({ ...form, email: correoLimpio });
        setErrors({ ...errors, email: null });
      }}
      style={{...S.input,...(errors.email ? {borderColor:rose} : {})}}
    />
    {errors.email && <span style={S.errMsg}>{errors.email}</span>}
  </div>

{/* 4. CAMPO TELÉFONO / WHATSAPP (MÁSCARA +56 9 FORZADA) */}
  <div style={S.fieldGroup}>
    <label style={S.label}>Teléfono / WhatsApp</label>
    <input 
      type="tel" 
      placeholder="+56 9 8765 4321" 
      value={form.telefono || "+56 9 "}
      onFocus={e => {
        // Si el campo está vacío al hacer clic, le pone el prefijo automáticamente
        if (!form.telefono) setForm({ ...form, telefono: "+56 9 " });
      }}
      onChange={e => {
        const val = e.target.value;
        const celularFormateado = formatCelular(val);
        
        setForm({ ...form, telefono: celularFormateado });
        setErrors({ ...errors, telefono: null });
      }}
      style={{...S.input,...(errors.telefono ? {borderColor:rose} : {})}}
    />
    {errors.telefono && <span style={S.errMsg}>{errors.telefono}</span>}
  </div>

  {/* 5. ZONA DE COMPROBANTE DE TRANSFERENCIA (Mantenemos tu lógica intacta) */}
  <div style={S.fieldGroup}>
    <label style={S.label}>Comprobante de transferencia</label>
    <label style={{...S.uploadZone,...(errors.voucher?{borderColor:rose}:{})}}>
      <input type="file" accept="image/*,application/pdf" onChange={handleFile} style={{display:"none"}}/>
      {voucherPreview ? (
        <div style={{textAlign:"center"}}>
          {voucher?.type==="application/pdf"
            ? <div style={S.pdfBadge}>📄 {voucher.name}</div>
            : <img src={voucherPreview} alt="comprobante" style={S.voucherImg}/>
          }
          <div style={{color:gold,fontSize:12,marginTop:8}}>Toca para cambiar</div>
        </div>
      ):(
        <div style={S.uploadInner}>
          <span style={{fontSize:36}}>📎</span>
          <span style={S.uploadTxt}>Subir comprobante</span>
          <span style={S.uploadHint}>JPG, PNG o PDF · Máx 10MB</span>
        </div>
      )}
    </label>
    {errors.voucher&&<span style={S.errMsg}>{errors.voucher}</span>}
  </div>
</div>

        {submitErr&&<div style={S.alertErr}>{submitErr}</div>}

        <button
          style={{...S.btnPrimary,width:"100%",fontSize:16,padding:"14px",...(submitting?{opacity:.7,cursor:"not-allowed"}:{})}}
          onClick={onSubmit} disabled={submitting}
        >
          {submitting&&<span style={S.spinner}/>}
          {submitting?" Enviando..." : "✅ Confirmar participación"}
        </button>
        <p style={S.legal}>Al confirmar aceptas que tus datos serán usados únicamente para esta rifa.</p>
      </div>
    </main>
  );
}

// ─── 4. PANTALLA ÉXITO DINÁMICA ───────────────────────────────────────────────
function SuccessView({ nombre, email, numeros, total, rifaActiva, onReset }) {
  return (
    <main style={S.main}>
      <div style={{ ...S.card, textAlign: "center" }} className="fade">
        <div style={{ fontSize: 72, marginBottom: 12 }}>🎉</div>
        <h2 style={{ ...S.cardTitle, textAlign: "center" }}>¡Gracias, {nombre.split(" ")[0]}!</h2>
        <p style={{ color: "#666", lineHeight: 1.8, marginBottom: 20, fontSize: 14 }}>
          Tu participación fue recibida con éxito. Verificaremos tu transferencia y recibirás la confirmación oficial en{" "}
          <strong>{email}</strong> dentro de las próximas 24 horas.
        </p>
        <div style={S.successNums}>
          {numeros.slice(0, 20).map(n => <span key={n} style={S.successNum}>{pad(n)}</span>)}
          {numeros.length > 20 && <span style={{ ...S.successNum, background: "#eee", color: "#999" }}>+{numeros.length - 20} más</span>}
        </div>
        <div style={S.infoBox}>
          <div style={{ fontWeight: "bold", color: navy, borderBottom: "1px solid #e0d5c0", paddingBottom: 4, marginBottom: 4 }}>
            📋 Detalles de tu compra — {rifaActiva.titulo}
          </div>
          
          {/* ─── RENDERIZADO DINÁMICO DE N PREMIOS EN EL RESUMEN DE COMPRA ─── */}
          {rifaActiva.premios && rifaActiva.premios.map((premio, idx) => (
            <div key={idx}>
              🎁 {idx + 1}° Premio: <strong>{premio}</strong>
            </div>
          ))}
          
          <div style={{ marginTop: 4 }}>📅 Fecha Sorteo: <strong>{rifaActiva.fecha_sorteo}</strong></div>
          <div>💰 Total Cooperación: <strong>{formatCLP(total)}</strong></div>
        </div>
        <p style={{ color: "#aaa", fontSize: 12, margin: "16px 0" }}>Te notificaremos por WhatsApp y correo electrónico.</p>
        <button style={{ ...S.btnPrimary, width: "100%" }} onClick={onReset}>Comprar números en otra campaña</button>
      </div>
    </main>
  );
}

// ─── PANEL DE ADMINISTRACIÓN GLOBAL CONSOLIDADO Y FILTRADO ───────────────────
function AdminView({ listaRifas }) {
  const [tab, setTab] = useState("comprobantes"); // "comprobantes" o "campanas"
  const [rifasLocales, setRifasLocales] = useState(listaRifas || []);
  
  // Estados para los Pedidos/Comprobantes
  const [pedidos, setPedidos] = useState([]);
  const [todosLosPedidos, setTodosLosPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rifaSeleccionada, setRifaSeleccionada] = useState(listaRifas[0]?.id || "");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(null);
  const [adminPage, setAdminPage] = useState(0);
  const ADMIN_PER_PAGE = 20;

  // Estados para el Formulario de Rifas (Mantenedor)
  const [editandoId, setEditandoId] = useState(null); // null = creando nueva
  const [rifaForm, setRifaForm] = useState({
    titulo: "", motivo: "", precio_por_numero: 3000, total_numeros: 2000, fecha_sorteo: "", premios: "", activa: true
  });

  const cargarTotalesGlobales = useCallback(async () => {
    try {
      const data = await db().getTodosLosPedidos();
      setTodosLosPedidos(data || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchPedidos = useCallback(async () => {
    if (!rifaSeleccionada) return;
    setLoading(true);
    try {
      const data = await db().getPedidosPorRifa(rifaSeleccionada);
      setPedidos(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [rifaSeleccionada]);

  const refrescarRifas = async () => {
    try {
      const data = await db().getRifas();
      setRifasLocales(data || []);
      if (data && data.length && !rifaSeleccionada) {
        setRifaSeleccionada(data[0].id);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    cargarTotalesGlobales();
    fetchPedidos();
  }, [cargarTotalesGlobales, fetchPedidos]);

  const cambiarEstado = async (id, estado) => {
    setUpdating(id);
    await db().updateEstado(id, estado);
    await fetchPedidos();
    await cargarTotalesGlobales();
    setUpdating(null);
  };

  // Lógica de Guardar Rifa (Crear o Modificar)
  const handleGuardarRifa = async (e) => {
    e.preventDefault();
    if (!rifaForm.titulo.trim() || !rifaForm.fecha_sorteo.trim()) {
      alert("Título y Fecha de Sorteo son obligatorios");
      return;
    }

    // Convertir la cadena de premios separada por comas en un Array limpio
    const listaPremios = rifaForm.premios
      ? rifaForm.premios.split(",").map(p => p.trim()).filter(p => p !== "")
      : [];

    const datosRifa = {
      titulo: rifaForm.titulo,
      motivo: rifaForm.motivo,
      precio_por_numero: parseInt(rifaForm.precio_por_numero, 10),
      total_numeros: parseInt(rifaForm.total_numeros, 10),
      fecha_sorteo: rifaForm.fecha_sorteo,
      premios: listaPremios,
      activa: rifaForm.activa
    };

    try {
      if (editandoId) {
        await db().updateRifa(editandoId, datosRifa);
        alert("Campaña actualizada con éxito");
      } else {
        await db().insertRifa(datosRifa);
        alert("Nueva campaña creada con éxito");
      }
      setRifaForm({ titulo: "", motivo: "", precio_por_numero: 3000, total_numeros: 2000, fecha_sorteo: "", premios: "", activa: true });
      setEditandoId(null);
      await refrescarRifas();
    } catch (err) {
      alert("Error al guardar la rifa: " + err.message);
    }
  };

  const handleEliminarRifa = async (id, titulo) => {
    if (window.confirm(`¿Estás completamente seguro de eliminar la rifa "${titulo}"?\nEsta acción no se puede deshacer.`)) {
      try {
        await db().deleteRifa(id);
        alert("Rifa eliminada.");
        await refrescarRifas();
      } catch (err) {
        alert("No se pudo eliminar la rifa. Es posible que tenga números vendidos asociados.");
      }
    }
  };

  const handleIniciarEditar = (rifa) => {
    setEditandoId(rifa.id);
    setRifaForm({
      titulo: rifa.titulo || "",
      motivo: rifa.motivo || "",
      precio_por_numero: rifa.precio_por_numero || 3000,
      total_numeros: rifa.total_numeros || 2000,
      fecha_sorteo: rifa.fecha_sorteo || "",
      premios: rifa.premios ? rifa.premios.join(", ") : "",
      activa: rifa.activa === undefined ? true : rifa.activa
    });
  };

  const filtrados = pedidos.filter(p => {
    const okF = filtroEstado === "todos" || p.estado === filtroEstado;
    const q = search.toLowerCase();
    const okS = !q || p.nombre?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.rut?.includes(q);
    return okF && okS;
  });

  const paginatedAdmin = filtrados.slice(adminPage * ADMIN_PER_PAGE, (adminPage + 1) * ADMIN_PER_PAGE);
  //const adminPages = Math.ceil(filtrados.length / ADMIN_PER_PAGE);

  const granTotalRecaudadoGlobal = todosLosPedidos
    .filter(p => p.estado !== "rechazado")
    .reduce((a, p) => a + (p.total || 0), 0);

  const totalRifaActual = pedidos.filter(p => p.estado !== "rechazado").reduce((a, p) => a + (p.total || 0), 0);
  const numerosVendidosRifaActual = pedidos.filter(p => p.estado !== "rechazado").reduce((a, p) => a + (p.numeros?.length || 0), 0);
  const rifaInfoActual = rifasLocales.find(r => r.id === rifaSeleccionada);

  return (
    <main style={S.main} className="fade">
      <h2 style={{ ...S.cardTitle, textAlign: "center", marginBottom: 4 }}>Panel de Administración</h2>
      <p style={{ textAlign: "center", color: "#aaa", fontSize: 12, marginBottom: 20 }}>
        Consolidado unificado multirifas · Gestión Operativa
      </p>

      {/* 🧭 BARRA DE PESTAÑAS (TABS) */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "2px solid #e0d9cc", paddingBottom: 8 }}>
        <button 
          onClick={() => setTab("comprobantes")}
          style={{ 
            ...S.filtroBtn, 
            flex: 1, 
            padding: "10px", 
            fontWeight: "bold",
            background: tab === "comprobantes" ? CONFIG.colores.primario : "#fff",
            color: tab === "comprobantes" ? "#fff" : "#777",
            borderColor: tab === "comprobantes" ? CONFIG.colores.primario : "#e0d9cc"
          }}
        >
          📋 Ver Comprobantes
        </button>
        <button 
          onClick={() => setTab("campanas")}
          style={{ 
            ...S.filtroBtn, 
            flex: 1, 
            padding: "10px", 
            fontWeight: "bold",
            background: tab === "campanas" ? CONFIG.colores.primario : "#fff",
            color: tab === "campanas" ? "#fff" : "#777",
            borderColor: tab === "campanas" ? CONFIG.colores.primario : "#e0d9cc"
          }}
        >
          ⛪ Gestionar Campañas (Rifas)
        </button>
      </div>

      {/* ─── PESTAÑA 1: REVISIÓN DE COMPROBANTES (TU DISEÑO ORIGINAL) ─── */}
      {tab === "comprobantes" && (
        <>
          <div style={{ background: `linear-gradient(135deg, ${emerald} 0%, #0e4e2e 100%)`, color: "#fff", borderRadius: 16, padding: 24, marginBottom: 24, textAlign: "center", boxShadow: "0 6px 20px rgba(26,122,74,0.3)" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.9, fontWeight: 700 }}>⛪ RECAUDACIÓN HISTÓRICA TOTAL CONSOLIDADA (Todas las Rifas)</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 900, marginTop: 4 }}>{formatCLP(granTotalRecaudadoGlobal)}</div>
          </div>

          <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 24, border: "1px solid #e0d9cc" }}>
            <label style={{ ...S.label, display: "block", marginBottom: 6, color: navy }}>Selecciona la Campaña a gestionar:</label>
            <select value={rifaSeleccionada} onChange={e => { setRifaSeleccionada(e.target.value); setAdminPage(0); }} style={{ ...S.input, width: "100%", fontWeight: "bold", borderColor: gold, color: navy }}>
              {rifasLocales.map(r => (
                <option key={r.id} value={r.id}>{r.titulo} ({r.motivo || "Campaña"})</option>
              ))}
            </select>
          </div>

          <div style={S.kpiGrid}>
            {[
              { icon: "💵", val: formatCLP(totalRifaActual), lbl: "Recaudado Rifa", c: emerald },
              { icon: "🎟️", val: numerosVendidosRifaActual.toLocaleString("es-CL"), lbl: "Números vendidos", c: navy },
              { icon: "✅", val: pedidos.filter(p => p.estado === "confirmado").length, lbl: "Confirmados", c: emerald },
              { icon: "⏳", val: pedidos.filter(p => p.estado === "pendiente").length, lbl: "Pendientes", c: "#e67e22" },
              { icon: "❌", val: pedidos.filter(p => p.estado === "rechazado").length, lbl: "Rechazados", c: rose },
              { icon: "📊", val: rifaInfoActual ? `${Math.round(numerosVendidosRifaActual / rifaInfoActual.total_numeros * 100)}%` : "0%", lbl: "Avance", c: gold },
            ].map(({ icon, val, lbl, c }) => (
              <div key={lbl} style={S.kpiCard}>
                <div style={{ fontSize: 20 }}>{icon}</div>
                <div style={{ ...S.kpiVal, color: c, fontSize: 14, marginTop: 2 }}>{val}</div>
                <div style={S.kpiLbl}>{lbl}</div>
              </div>
            ))}
          </div>

          <div style={S.filterBar}>
            <input placeholder="🔍 Buscar por nombre, RUT o email de esta campaña..." value={search} onChange={e => { setSearch(e.target.value); setAdminPage(0); }} style={{ ...S.input, flex: 1, minWidth: 0 }} />
            <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setAdminPage(0); }} style={{ ...S.input, width: 140 }}>
              <option value="todos">Todos ({pedidos.length})</option>
              <option value="pendiente">Pendientes ({pedidos.filter(p => p.estado === "pendiente").length})</option>
              <option value="confirmado">Confirmados ({pedidos.filter(p => p.estado === "confirmado").length})</option>
              <option value="rechazado">Rechazados ({pedidos.filter(p => p.estado === "rechazado").length})</option>
            </select>
            <button style={S.refreshBtn} onClick={() => { fetchPedidos(); cargarTotalesGlobales(); }} title="Actualizar">🔄</button>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div style={{ ...S.spinner, width: 36, height: 36, borderWidth: 3 }} /></div>
          ) : paginatedAdmin.length === 0 ? (
            <div style={{ textAlign: "center", color: "#ccc", padding: 48, fontSize: 15 }}>Sin órdenes registradas en esta rifa aún</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {paginatedAdmin.map(p => <PedidoCard key={p.id} pedido={p} onCambiar={cambiarEstado} updating={updating === p.id} />)}
            </div>
          )}
        </>
      )}

      {/* ─── PESTAÑA 2: MANTENEDOR CRUD DE RIFAS (NUEVO REQUERIMIENTO) ─── */}
      {tab === "campanas" && (
        <div className="fade">
          {/* Formulario de Registro / Edición */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", border: `1px solid ${gold}44`, marginBottom: 28 }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: navy, marginBottom: 16 }}>
              {editandoId ? "📝 Modificar Campaña Existing" : "✨ Crear Nueva Campaña de Rifa"}
            </h3>
            <form onSubmit={handleGuardarRifa} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Título de la Rifa</label>
                  <input type="text" placeholder="Ej: Gran Rifa Pro-Templo 2026" value={rifaForm.titulo} onChange={e => setRifaForm({ ...rifaForm, titulo: e.target.value })} style={S.input} required />
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Motivo / Objetivo Corto</label>
                  <input type="text" placeholder="Ej: Construcción Sala Cuna" value={rifaForm.motivo} onChange={e => setRifaForm({ ...rifaForm, motivo: e.target.value })} style={S.input} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Precio por Número ($)</label>
                  <input type="number" value={rifaForm.precio_por_numero} onChange={e => setRifaForm({ ...rifaForm, precio_por_numero: e.target.value })} style={S.input} required />
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Total Números Disponibles</label>
                  <input type="number" value={rifaForm.total_numeros} onChange={e => setRifaForm({ ...rifaForm, total_numeros: e.target.value })} style={S.input} required />
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Fecha del Sorteo</label>
                  <input type="text" placeholder="Ej: 24 de Diciembre 2026" value={rifaForm.fecha_sorteo} onChange={e => setRifaForm({ ...rifaForm, fecha_sorteo: e.target.value })} style={S.input} required />
                </div>
              </div>

              <div style={S.fieldGroup}>
                <label style={S.label}>Lista de Premios (Separados por comas ",")</label>
                <input type="text" placeholder="Ej: Refrigerador Samsung, Smart TV 55, Licuadora Oster" value={rifaForm.premios} onChange={e => setRifaForm({ ...rifaForm, premios: e.target.value })} style={S.input} />
                <span style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Los premios aparecerán ordenados numéricamente (1°, 2°, 3° Premio) divididos por comas.</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                <input type="checkbox" id="activa" checked={rifaForm.activa} onChange={e => setRifaForm({ ...rifaForm, activa: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer" }} />
                <label htmlFor="activa" style={{ fontSize: 13, fontWeight: "bold", color: navy, cursor: "pointer" }}>Visible para el público general en la cartelera</label>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="submit" style={{ ...S.btnPrimary, flex: 1, background: emerald }}>
                  {editandoId ? "💾 Guardar Cambios" : "➕ Crear Campaña"}
                </button>
                {editandoId && (
                  <button type="button" onClick={() => { setEditandoId(null); setRifaForm({ titulo: "", motivo: "", precio_por_numero: 3000, total_numeros: 2000, fecha_sorteo: "", premios: "", activa: true }); }} style={{ ...S.btnPrimary, background: "#888" }}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Listado de control de campañas */}
          <h3 style={{ fontSize: 12, fontWeight: 700, color: navy, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
            📋 Catálogo Histórico de Rifas en Sistema
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rifasLocales.map(r => (
              <div key={r.id} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e0d9cc", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: "bold", color: navy, fontSize: 16 }}>{r.titulo}</span>
                    <span style={{ background: r.activa ? `${emerald}22` : "#eee", color: r.activa ? emerald : "#999", fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: "bold" }}>
                      {r.activa ? "● Activa" : "Oculta"}
                    </span>
                  </div>
                  <p style={{ color: "#777", fontSize: 13, marginTop: 4 }}>
                    🎯 Objetivo: {r.motivo || "General"} · 🎫 Valor n°: {formatCLP(r.precio_por_numero)} · 📅 Sorteo: {r.fecha_sorteo}
                  </p>
                  <p style={{ color: gold, fontSize: 12, marginTop: 4, fontWeight: "500" }}>
                    🎁 Premios: {r.premios && r.premios.length > 0 ? r.premios.join(" · ") : "Ninguno configurado"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => handleIniciarEditar(r)} style={{ background: `${gold}22`, color: navy, border: `1px solid ${gold}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>
                    ⚙️ Editar
                  </button>
                  <button onClick={() => handleEliminarRifa(r.id, r.titulo)} style={{ background: "#fde8e8", color: rose, border: `1px solid ${rose}44`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>
                    🗑️ Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

// ─── COMPONENTE: TARJETA DE PEDIDO CON PREVISUALIZACIÓN DE COMPROBANTE ───────
function PedidoCard({ pedido, onCambiar, updating }) {
  const [open, setOpen] = useState(false);
  
  const est = {
    confirmado: { bg: "#e8f5e9", c: emerald, lbl: "✅ Confirmado" },
    pendiente: { bg: "#fff8e1", c: "#e67e22", lbl: "⏳ Pendiente" },
    rechazado: { bg: "#fde8e8", c: rose, lbl: "❌ Rechazado" },
  }[pedido.estado] || { bg: "#eee", c: "#999", lbl: pedido.estado };

  // Detectamos si el archivo del comprobante es un PDF o una Imagen
  const esPdf = pedido.voucher_url?.toLowerCase().endsWith(".pdf");

  return (
    <div style={S.pedidoCard}>
      {/* Cabecera de la tarjeta */}
      <div style={S.pedidoHead} onClick={() => setOpen(!open)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.pedidoNombre}>{pedido.nombre}</div>
          <div style={S.pedidoMeta}>{pedido.email} · {pedido.telefono}</div>
          <div style={S.pedidoNums}>
            {(pedido.numeros || []).slice(0, 10).map(n => <span key={n} style={S.numTagAdmin}>{pad(n)}</span>)}
            {(pedido.numeros || []).length > 10 && <span style={{ ...S.numTagAdmin, background: "#f0f0f0", color: "#999" }}>+{pedido.numeros.length - 10}</span>}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ ...S.estadoBadge, background: est.bg, color: est.c }}>{est.lbl}</div>
          <div style={{ fontWeight: 900, color: navy, fontSize: 15, marginTop: 4 }}>{formatCLP(pedido.total)}</div>
          <div style={{ color: "#ccc", fontSize: 11 }}>{new Date(pedido.created_at).toLocaleString("es-CL")}</div>
          <div style={{ color: gold, fontSize: 11, marginTop: 4, fontWeight: "bold" }}>
            {open ? "▲ Ocultar" : "▼ Revisar Comprobante"}
          </div>
        </div>
      </div>

      {/* Cuerpo desplegable con los detalles y el archivo visible */}
      {open && (
        <div style={S.pedidoBody} className="fade">
          <div style={S.detailGrid}>
            <div style={S.detailRow}><span style={S.detailK}>RUT</span><span>{pedido.rut}</span></div>
            <div style={S.detailRow}>
              <span style={S.detailK}>Números ({(pedido.numeros || []).length})</span>
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>{(pedido.numeros || []).map(pad).join(", ")}</span>
            </div>
          </div>

          {/* 🖼️ SECCIÓN DE PREVISUALIZACIÓN INCORPORADA */}
          {pedido.voucher_url ? (
            <div style={{ 
              marginTop: 14, 
              marginBottom: 16, 
              background: "#faf7f0", 
              border: `1px solid ${gold}44`, 
              borderRadius: 12, 
              padding: 10, 
              textAlign: "center" 
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: navy, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                📄 Comprobante de Pago Adjunto:
              </div>
              
              {esPdf ? (
                /* Vista para archivos PDF (usa un visor interactivo integrado) */
                <iframe 
                  src={pedido.voucher_url} 
                  title="Visor Comprobante PDF" 
                  style={{ width: "100%", height: "350px", border: "none", borderRadius: 8, background: "#fff" }} 
                />
              ) : (
                /* Vista para imágenes normales (JPG, PNG) */
                <img 
                  src={pedido.voucher_url} 
                  alt="Comprobante de transferencia" 
                  style={{ maxWidth: "100%", maxHeight: "380px", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} 
                />
              )}
              
              <div style={{ marginTop: 8 }}>
                <a href={pedido.voucher_url} target="_blank" rel="noreferrer" style={{ color: gold, fontWeight: 700, fontSize: 12, textDecoration: "underline" }}>
                  Ver en pantalla completa ↗
                </a>
              </div>
            </div>
          ) : (
            <div style={{ color: rose, fontSize: 13, padding: "10px 0", fontWeight: "bold" }}>
              ⚠️ Alerta: Este pedido no registra un archivo de comprobante.
            </div>
          )}

          {/* Botoneras de decisión justo debajo de la foto */}
          <div style={S.actionRow}>
            {pedido.estado === "pendiente" && <>
              <button style={{ ...S.btnAction, background: emerald }} disabled={updating} onClick={() => onCambiar(pedido.id, "confirmado")}>
                {updating ? "..." : "✅ Confirmar depósito"}
              </button>
              <button style={{ ...S.btnAction, background: rose }} disabled={updating} onClick={() => onCambiar(pedido.id, "rechazado")}>
                {updating ? "..." : "❌ Rechazar / Datos incorrectos"}
              </button>
            </>}
            {pedido.estado === "confirmado" && (
              <button style={{ ...S.btnAction, background: rose, width: "100%" }} disabled={updating} onClick={() => onCambiar(pedido.id, "rechazado")}>
                ❌ Deshacer aprobación y marcar como rechazado
              </button>
            )}
            {pedido.estado === "rechazado" && (
              <button style={{ ...S.btnAction, background: "#888", width: "100%" }} disabled={updating} onClick={() => onCambiar(pedido.id, "pendiente")}>
                ↩️ Reabrir y volver a dejar en Pendiente
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const S = {
  root:{minHeight:"100vh",background:cream,fontFamily:"'DM Sans',sans-serif",color:navy},
  nav:{background:navy,padding:"12px 20px",position:"sticky",top:0,zIndex:200,boxShadow:"0 2px 20px rgba(0,0,0,0.35)"},
  navIn:{maxWidth:700,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"},
  brand:{display:"flex",gap:12,alignItems:"center",cursor:"pointer"},
  cross:{fontSize:30,color:gold,textShadow:`0 0 20px ${gold}66`},
  brandName:{color:"#fff",fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700},
  brandSub:{color:`${gold}bb`,fontSize:11,letterSpacing:1.5,textTransform:"uppercase"},
  navBtn:{background:"transparent",border:`1px solid ${gold}66`,color:gold,borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif"},
  demoBanner:{background:"#fff3cd",color:"#7d5a00",padding:"9px 20px",textAlign:"center",fontSize:13,borderBottom:"1px solid #ffe08a"},
  main:{maxWidth:700,margin:"0 auto",padding:"20px 14px 40px"},

  // Hero
  hero:{background:`linear-gradient(145deg,${navy} 0%,#183060 100%)`,borderRadius:20,padding:"28px 22px 24px",marginBottom:20,border:`2px solid ${gold}44`,boxShadow:"0 8px 40px rgba(13,27,62,0.3)"},
  heroBadge:{color:gold,fontSize:11,letterSpacing:3,textTransform:"uppercase",marginBottom:10,textAlign:"center"},
  heroTitle:{color:"#fff",fontFamily:"'Playfair Display',serif",fontSize:26,textAlign:"center",marginBottom:6,lineHeight:1.3},
  heroDate:{color:"rgba(255,255,255,0.5)",textAlign:"center",fontSize:13,marginBottom:20},
  progressWrap:{marginBottom:20},
  progressBar:{background:"rgba(255,255,255,0.12)",borderRadius:99,height:10,overflow:"hidden",marginBottom:6},
  progressFill:{height:"100%",background:`linear-gradient(90deg,${gold},#e8b84b)`,borderRadius:99,transition:"width .5s ease"},
  progressLabels:{display:"flex",justifyContent:"space-between",fontSize:11},
  heroKpis:{display:"flex",justifyContent:"center",alignItems:"center"},
  heroKpi:{textAlign:"center",padding:"0 18px"},
  heroKpiNum:{display:"block",color:gold,fontSize:22,fontWeight:900,fontFamily:"'Playfair Display',serif"},
  heroKpiLbl:{color:"rgba(255,255,255,0.45)",fontSize:11,letterSpacing:0.5},
  kpiDiv:{width:1,height:36,background:"rgba(255,255,255,0.12)"},

  // Controles
  controls:{display:"flex",flexDirection:"column",gap:10,marginBottom:14},
  searchWrap:{position:"relative",display:"flex",alignItems:"center"},
  searchIcon:{position:"absolute",left:12,fontSize:16,pointerEvents:"none"},
  searchInput:{width:"100%",border:"1.5px solid #e0d9cc",borderRadius:11,padding:"10px 36px 10px 38px",fontSize:15,fontFamily:"'DM Sans',sans-serif",color:navy,background:"#fff"},
  clearBtn:{position:"absolute",right:10,background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:14},
  filtros:{display:"flex",gap:8},
  filtroBtn:{background:"#fff",border:"1.5px solid #e0d9cc",borderRadius:99,padding:"6px 14px",cursor:"pointer",fontSize:13,color:"#777",fontFamily:"'DM Sans',sans-serif"},
  filtroBtnActive:{background:navy,borderColor:navy,color:"#fff",fontWeight:700},
  randomBtn:{background:`${gold}18`,border:`1.5px solid ${gold}`,color:navy,borderRadius:10,padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",alignSelf:"flex-start"},

  legend:{display:"flex",gap:16,marginBottom:10,flexWrap:"wrap"},
  legendItem:{display:"flex",gap:6,alignItems:"center",fontSize:12,color:"#777"},
  legendDot:{width:15,height:15,borderRadius:4,display:"inline-block"},
  resultsInfo:{color:"#aaa",fontSize:12,marginBottom:10},

  // Grid
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(52px,1fr))",gap:5,marginBottom:16},
  numBtn:{padding:"7px 4px",borderRadius:8,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"monospace",transition:"transform .12s"},
  numAvail:{background:"#fff",color:navy,border:"1.5px solid #e0d9cc",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"},
  numSel:{background:gold,color:"#fff",border:`1.5px solid ${gold}`,boxShadow:`0 3px 10px ${gold}55`,transform:"scale(1.08)"},
  numTaken:{background:"#e8e8e8",color:"#c0c0c0",cursor:"not-allowed",textDecoration:"line-through",border:"1.5px solid #d8d8d8"},

  pagination:{display:"flex",justifyContent:"center",alignItems:"center",gap:12,marginTop:16},
  pageBtn:{background:"#fff",border:`1.5px solid ${gold}`,color:navy,borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:600},
  pageInfo:{fontSize:13,color:"#888"},

  stickyBar:{position:"fixed",bottom:0,left:0,right:0,background:navy,padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,boxShadow:"0 -4px 24px rgba(0,0,0,0.3)",zIndex:100},
  stickyNums:{display:"flex",gap:4,flexWrap:"wrap",maxWidth:260,marginBottom:3},
  stickyTag:{background:`${gold}33`,color:gold,borderRadius:5,padding:"2px 6px",fontSize:11,fontFamily:"monospace",fontWeight:700},
  stickyMore:{background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)",borderRadius:5,padding:"2px 6px",fontSize:11},
  stickyTotal:{color:gold,fontSize:18,fontWeight:900,fontFamily:"'Playfair Display',serif"},
  stickyEmpty:{color:"rgba(255,255,255,0.4)",fontSize:14},

  btnPrimary:{background:`linear-gradient(135deg,${gold},#a8791e)`,color:"#fff",border:"none",borderRadius:12,padding:"11px 22px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,whiteSpace:"nowrap"},

  // Card / Form
  card:{background:"#fff",borderRadius:20,padding:"24px 18px",boxShadow:"0 4px 28px rgba(0,0,0,0.09)"},
  cardTitle:{fontFamily:"'Playfair Display',serif",fontSize:22,color:navy,marginBottom:20},
  backBtn:{background:"none",border:"none",color:"#aaa",fontSize:13,cursor:"pointer",marginBottom:16,padding:0,fontFamily:"'DM Sans',sans-serif"},
  summaryBox:{background:"#f9f5eb",borderRadius:14,padding:16,marginBottom:16,border:`1px solid ${gold}33`},
  summaryRow:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12},
  summaryLbl:{color:"#777",fontSize:13},
  numsWrap:{display:"flex",flexWrap:"wrap",gap:5,marginTop:10,marginBottom:10},
  numTagForm:{background:`${gold}22`,color:navy,borderRadius:6,padding:"3px 8px",fontFamily:"monospace",fontWeight:700,fontSize:12},
  summaryDiv:{height:1,background:`${gold}33`,margin:"10px 0"},
  bankBox:{background:`linear-gradient(135deg,${navy}08,${gold}08)`,border:`1px solid ${gold}44`,borderRadius:12,padding:16,marginBottom:20},
  bankTitle:{fontWeight:700,color:navy,fontSize:13,marginBottom:10},
  bankRow:{display:"flex",gap:8,fontSize:13,marginBottom:5},
  bankKey:{color:"#999",minWidth:80,flexShrink:0},
  bankVal:{color:navy,fontWeight:700},
  fields:{display:"flex",flexDirection:"column",gap:16,marginBottom:20},
  fieldGroup:{display:"flex",flexDirection:"column",gap:4},
  label:{fontSize:11,fontWeight:700,color:"#777",textTransform:"uppercase",letterSpacing:0.6},
  input:{border:"1.5px solid #e0d9cc",borderRadius:10,padding:"10px 14px",fontSize:15,fontFamily:"'DM Sans',sans-serif",color:navy,background:"#fafaf8",transition:"border-color .2s"},
  errMsg: {
    color: "#c0392b", // O usa la constante: rose
    fontSize: "12px",
    marginTop: "4px",
    display: "block",
    fontWeight: "bold"
  },
  alertErr:{background:"#fde8e8",color:rose,borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13},
  uploadZone:{display:"block",border:`2px dashed ${gold}`,borderRadius:12,padding:20,textAlign:"center",cursor:"pointer",background:"#fdf8f0",transition:"border-color .2s"},
  uploadInner:{display:"flex",flexDirection:"column",gap:6,alignItems:"center"},
  uploadTxt:{color:navy,fontSize:14,fontWeight:700},
  uploadHint:{color:"#bbb",fontSize:12},
  voucherImg:{maxWidth:"100%",maxHeight:180,borderRadius:8,objectFit:"contain"},
  pdfBadge:{background:"#fde8e8",color:rose,padding:"10px 16px",borderRadius:8,fontWeight:700,fontSize:13},
  legal:{textAlign:"center",color:"#ccc",fontSize:11,marginTop:12},
  spinner:{display:"inline-block",width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"},

  // Success
  successNums:{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",marginBottom:20},
  successNum:{background:gold,color:"#fff",borderRadius:8,padding:"4px 10px",fontFamily:"monospace",fontWeight:700,fontSize:13},
  infoBox:{background:"#f9f5eb",borderRadius:12,padding:16,display:"flex",flexDirection:"column",gap:8,fontSize:14,lineHeight:1.7,textAlign:"left"},

  // Login
  loginWrap:{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"80vh",padding:20},
  loginCard:{background:"#fff",borderRadius:20,padding:32,width:"100%",maxWidth:360,boxShadow:"0 8px 32px rgba(0,0,0,0.12)",display:"flex",flexDirection:"column",gap:16},
  loginTitle:{fontFamily:"'Playfair Display',serif",textAlign:"center",color:navy,fontSize:22},

  // Admin
  kpiGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20},
  kpiCard:{background:"#fff",borderRadius:14,padding:"14px 10px",textAlign:"center",boxShadow:"0 2px 12px rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",gap:4,alignItems:"center"},
  kpiVal:{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:900},
  kpiLbl:{color:"#aaa",fontSize:11},
  filterBar:{display:"flex",gap:8,marginBottom:10,alignItems:"center",flexWrap:"wrap"},
  refreshBtn:{background:"#fff",border:"1.5px solid #e0d9cc",borderRadius:10,padding:"10px 12px",cursor:"pointer",fontSize:16,flexShrink:0},
  pedidoCard:{background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.07)"},
  pedidoHead:{padding:"14px 16px",display:"flex",gap:12,cursor:"pointer",alignItems:"flex-start"},
  pedidoNombre:{fontWeight:700,color:navy,fontSize:15,marginBottom:2},
  pedidoMeta:{color:"#aaa",fontSize:12,marginBottom:6,wordBreak:"break-all"},
  pedidoNums:{display:"flex",flexWrap:"wrap",gap:4},
  numTagAdmin:{background:`${gold}18`,color:navy,borderRadius:5,padding:"2px 6px",fontSize:10,fontFamily:"monospace",fontWeight:700},
  estadoBadge:{display:"inline-block",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,marginBottom:4,whiteSpace:"nowrap"},
  pedidoBody:{borderTop:"1px solid #f0f0f0",padding:"14px 16px",background:"#fafaf8"},
  detailGrid:{display:"flex",flexDirection:"column",gap:8,marginBottom:14},
  detailRow:{display:"flex",gap:10,fontSize:13,alignItems:"flex-start"},
  detailK:{color:"#aaa",minWidth:100,flexShrink:0,fontSize:12},
  actionRow:{display:"flex",gap:8,flexWrap:"wrap"},
  btnAction:{flex:1,color:"#fff",border:"none",borderRadius:9,padding:"10px",fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif",minWidth:100},
};