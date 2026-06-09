import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import FinalReport from './FinalReport';
import './App.css'; // Mantiene tu hoja de estilos responsiva


// Inicialización del SDK oficial
const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // Reemplaza con tu clave o variable de entorno
const genAI = new GoogleGenerativeAI(apiKey);

// Catálogo de temas para la generación independiente de escenarios
const themesCatalog = [
  {
    id: "ecommerce",
    icon: "🛒",
    title: "E-commerce: Checkout rápido u obligación de registro",
    description: "Conflicto sobre permitir a los clientes comprar como invitados para aumentar ventas, frente a la necesidad de forzar el registro para crear bases de datos y fidelización."
  },
  {
    id: "pos",
    icon: "🍽️",
    title: "Restaurante: Toma de comandas digital",
    description: "Debate entre implementar tablets para que los meseros anoten los pedidos, frente a poner códigos QR en las mesas para que el cliente pida directamente desde su celular."
  },
  {
    id: "hr",
    icon: "📅",
    title: "RRHH: Sistema Automatizado de Vacaciones",
    description: "Fricción sobre un sistema que aprueba automáticamente las vacaciones basado en el calendario, frente a la exigencia de los gerentes de aprobar cada solicitud manualmente."
  }
];

export default function App() {
  const [screen, setScreen] = useState('selection'); // Estados de pantalla: 'selection' | 'chat'
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [expandedScenario, setExpandedScenario] = useState(null)
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Inicializa la sesión de chat inyectando el contexto del tema seleccionado
  const handleStartScenario = async (theme) => {
    setSelectedTheme(theme);
    setScreen('chat');
    setIsLoading(true);
    setMessages([]);

    // Instrucción del sistema estricta para moldear el comportamiento del agente
    const systemInstruction = `
      Actúas como un Evaluador Senior y muy estricto de Ingeniería de Requisitos de Software.
      Tu objetivo es generar un escenario único, realista, complejo y con conflictos de intereses basado en el siguiente tema: "${theme.title} - ${theme.description}".
      
      Para este escenario, debes definir un contexto claro y describir obligatoriamente la postura de tres roles específicos:
      - Sponsor: Quien financia el proyecto, buscando retorno de inversión, reducción de costos o tiempos de entrega rápidos.
      - Usuario de la solución: El empleado o persona que interactúa con el sistema diariamente, buscando usabilidad, eficiencia operativa y evitar trabajo manual extra.
      - Cliente de los resultados: El consumidor final que recibe el valor o servicio producido por el software, buscando calidad, inmediatez y precisión.

      TU ÚNICA TAREA AHORA:
      Presenta el escenario detalladamente y pregúntale al usuario (quien actúa como Analista) cuál es su propuesta para resolver el conflicto. 
      ¡Detente por completo ahí y espera su respuesta!
    `;

    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-3.1-flash-lite",
        systemInstruction: systemInstruction
      });

      // Iniciamos el chat enviando un disparador silencioso para obtener el escenario inicial
      const chat = model.startChat({ history: [] });
      const result = await chat.sendMessage("Genera el escenario inicial con sus 3 roles.");
      const responseText = result.response.text();

      setMessages([{ role: 'model', text: responseText }]);
    } catch (error) {
      console.error("Error al inicializar el agente:", error);
      setMessages([{ role: 'model', text: "Error de conexión al inicializar el agente de IA. Verifica tu configuración de red o API Key." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Maneja el envío de mensajes de texto libre durante la discusión del requisito
 const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    const systemInstruction = `
      Actúas como un Director de Proyectos estricto evaluando a un Analista de Requisitos.
      
      REGLAS DE EVALUACIÓN ESTRICTAS:
      1. NUNCA des la respuesta ideal ni le resuelvas el problema al usuario.
      2. Analiza críticamente la propuesta del usuario. ¿Consideró el impacto financiero del Sponsor? ¿La usabilidad del Usuario? ¿La calidad para el Cliente? ¿Es técnicamente viable?
      3. SI LA RESPUESTA ES VAGA, INCOMPLETA O IGNORA ROLES: 
         No des por concluido el escenario. Cuestiona duramente su decisión. Señala las fallas (ej. "Tu solución es muy cara para el Sponsor", "¿Cómo evitarás que el Usuario se frustre con esa interfaz?") y exígele que mejore, detalle o justifique su propuesta. Usa preguntas socráticas.
      4. SI LA RESPUESTA ES SÓLIDA Y JUSTIFICADA, O EL USUARIO PIDE TERMINAR:
         Solo si la propuesta aborda bien a los 3 roles de forma realista, o si el usuario escribe explícitamente que es su "decisión final" o pide que lo "califiques", entonces y SOLO entonces, indica que aceptas la propuesta, haz un breve resumen de los pros y contras, y dile que cierre el escenario.
    
    `;

    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-3.1-flash-lite", // Recuerda mantener la versión que te esté funcionando
        systemInstruction: systemInstruction
      });

      // =================================================================
      // CONSTRUCCIÓN DEL HISTORIAL VÁLIDO PARA LA API
      // =================================================================
      
      // 1. Iniciamos el historial a la fuerza con un mensaje 'user' 
      // para cumplir la regla estricta de Gemini ("First content should be... 'user'").
      const history = [
        {
          role: 'user',
          parts: [{ text: "Por favor, inicia la simulación presentando el escenario y los 3 roles." }]
        }
      ];

      let lastRole = 'user'; // Ya empezamos con 'user'

      // 2. Iteramos sobre los mensajes que tenemos en pantalla
      messages.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'model') {
          // Solo lo agregamos si intercala correctamente (ping-pong)
          if (msg.role !== lastRole) {
            history.push({
              role: msg.role,
              parts: [{ text: msg.text }]
            });
            lastRole = msg.role;
          }
        }
      });

      // 3. Verificación final de seguridad:
      // Si el historial termina en 'user' (porque un error previo cortó el flujo), 
      // quitamos ese último mensaje para que el chat siempre espere un 'userMessage' nuevo.
      if (history.length > 0 && history[history.length - 1].role === 'user') {
        history.pop();
      }
      // =================================================================

      // Ahora sí, iniciamos el chat con un historial perfecto
      const chat = model.startChat({ history });
      
      const result = await chat.sendMessage(userMessage);
      const responseText = result.response.text();

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error("Error de API:", error);
      // Extraemos el mensaje de error para mostrarlo en pantalla y debuggear mejor si vuelve a ocurrir
      const errorMessage = error.message || "Error desconocido al contactar a la IA.";
      setMessages(prev => [...prev, { role: 'error', text: `Error: ${errorMessage}. Intenta enviar tu mensaje de nuevo.` }]);
    } finally {
      setIsLoading(false);
    }
  };

const handleEndSimulation = async () => {
    setIsLoading(true);

    const jsonPrompt = `
      La simulación ha terminado. Genera una evaluación final basada en todo el historial.
      DEBES RESPONDER ÚNICA Y ESTRICTAMENTE CON UN OBJETO JSON VÁLIDO. NO agregues formato Markdown ni texto fuera del JSON.
      Usa esta estructura exacta:
      {
        "evaluacion": {
          "sponsor": { "pros": ["...", "..."], "contras": ["...", "..."] },
          "usuario": { "pros": ["...", "..."], "contras": ["...", "..."] },
          "cliente": { "pros": ["...", "..."], "contras": ["...", "..."] }
        },
        "conclusion": "Breve resumen de la decisión final del usuario...",
        "cierre": {
          "porcentaje": "XX%",
          "resultado": "Evaluación general del impacto..."
        },
        "resultados6Meses": {
          "sponsor": "Consecuencia a medio plazo...",
          "usuario": "Consecuencia a medio plazo...",
          "cliente": "Consecuencia a medio plazo..."
        }
      }
    `;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
      
      const history = [{ role: 'user', parts: [{ text: "Inicia la simulación." }] }];
      let lastRole = 'user';
      messages.forEach(msg => {
        if ((msg.role === 'user' || msg.role === 'model') && msg.role !== lastRole) {
          history.push({ role: msg.role, parts: [{ text: msg.text }] });
          lastRole = msg.role;
        }
      });
      if (history.length > 0 && history[history.length - 1].role === 'user') history.pop();

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(jsonPrompt);
      let responseText = result.response.text();
      
      // Limpiamos la respuesta por si la IA envía bloques de código (```json ... ```)
      responseText = responseText.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      
      const parsedData = JSON.parse(responseText);
      setReportData(parsedData);
      setScreen('report'); // Cambiamos la vista al reporte final

    } catch (error) {
      console.error("Error al generar el reporte:", error);
      setMessages(prev => [...prev, { role: 'error', text: "Error al generar el reporte final. Inténtalo de nuevo." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnToMenu = () => {
    setScreen('selection');
    setSelectedTheme(null);
    setMessages([]);
    setReportData(null);
  };
  

  /* ========================================================
     RENDER: PANTALLA 1 - MENÚ DE SELECCIÓN DE ESCENARIOS
     ======================================================== */
  if (screen === 'selection') {
    return (
      <div className="app-container fade-in">
        <header className="app-header">
          <div>
            <span style={{color: 'var(--c-dark)', fontWeight: 'bold'}}>Configuración</span>
            <h1 className="app-main-title">Simulador de Requisitos</h1>
          </div>
        </header>
        <main>
          <p style={{marginBottom: '2rem', color: 'var(--text-secondary)'}}>
            Selecciona un caso de estudio para inicializar al agente de IA.
          </p>
          {themesCatalog.map((theme) => (
            <div key={theme.id} className="card-widget hover-lift">
              {/* Encabezado clicable para abrir acordeón */}
              <div 
                className="scenario-header" 
                onClick={() => setExpandedScenario(expandedScenario === theme.id ? null : theme.id)}
              >
                <span className="scenario-icon">{theme.icon}</span>
                <span className="scenario-title">{theme.title}</span>
                <span style={{marginLeft: 'auto', color: 'var(--c-light)'}}>
                  {expandedScenario === theme.id ? '▲' : '▼'}
                </span>
              </div>
              
              {/* Cuerpo colapsable */}
              <div className={`scenario-body ${expandedScenario === theme.id ? 'expanded' : ''}`}>
                <p style={{color: 'var(--text-secondary)', marginBottom: '1rem'}}>{theme.description}</p>
                <button className="primary-btn" onClick={() => handleStartScenario(theme)}>
                   Iniciar Simulación
                </button>
              </div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  // --- RENDER DE PANTALLA 3: REPORTE FINAL ---
  if (screen === 'report') {
    return <div className="fade-in"><FinalReport reportData={reportData} onReturn={handleReturnToMenu} /></div>;
  }
  /* ========================================================
     RENDER: PANTALLA 2 - ENTORNO DE CHAT INTERACTIVO (AGENTE)
     ======================================================== */
  return (
    <div className="app-container fade-in">
      <header className="app-header">
        <div>
          <span style={{color: 'var(--c-dark)', fontWeight: 'bold'}}>Agente: {selectedTheme?.title}</span>
          <h1 className="app-main-title">Sesión Activa</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="primary-btn" onClick={handleEndSimulation} disabled={isLoading || messages.length < 2}>
            📋 Terminar Simulación
          </button>
          <button className="primary-btn" style={{backgroundColor: 'var(--c-dark)'}} onClick={handleReturnToMenu}>
            ✕ Salir
          </button>
        </div>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <section className="chat-container">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`slide-up ${msg.role === 'user' ? 'align-right' : 'align-left'}`}
              style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}
            >
              <div className={`chat-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
                {msg.role === 'user' ? <strong>🧑‍💻 Tú:</strong> : <h3>🤖 Agente</h3>}
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
              </div>
            </div>
          ))}
          {isLoading && <div className="slide-up" style={{color: 'var(--c-dark)', fontStyle: 'italic'}}>⚙️ Analizando...</div>}
        </section>

        <section style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Escribe tu decisión aquí..."
            disabled={isLoading}
            style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--c-light)' }}
          />
          <button className="primary-btn" onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
            Enviar
          </button>
        </section>
      </main>
    </div>
  );
}