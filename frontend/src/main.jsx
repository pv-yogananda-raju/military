import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global Runtime Diagnostic Catcher: Catch and display any hidden browser crashes instantly
window.onerror = function (message, source, lineno, colno, error) {
  renderDiagnosticScreen('Global Exception Intercepted', error ? error.stack : message);
  return false;
};

window.onunhandledrejection = function (event) {
  renderDiagnosticScreen('Unhandled Promise Rejection', event.reason ? (event.reason.stack || event.reason.message || event.reason) : 'Rejected Promise');
};

function renderDiagnosticScreen(type, traceback) {
  try {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="background-color: #0c0f12; color: #ff7b72; font-family: monospace; padding: 2rem; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: left; box-sizing: border-box;">
          <div style="max-width: 800px; width: 100%; border: 1px solid #da3633; border-radius: 12px; background-color: #161b22; padding: 2rem; box-shadow: 0 0 20px rgba(218, 54, 51, 0.2);">
            <div style="display: flex; align-items: center; border-bottom: 1px solid #30363d; padding-bottom: 1rem; margin-bottom: 1.5rem;">
              <div style="color: #da3633; font-size: 1.5rem; font-weight: bold; margin-right: 1rem;">[⚠️ DIAGNOSTIC WARNING]</div>
              <div>
                <h1 style="color: #fff; font-size: 1rem; margin: 0; text-transform: uppercase;">Portal Runtime Exception</h1>
                <p style="color: #8b949e; font-size: 0.75rem; margin: 0; margin-top: 0.25rem;">MISCS Core System Safeguard</p>
              </div>
            </div>
            <p style="font-size: 0.85rem; color: #c9d1d9; font-weight: bold; margin-bottom: 0.5rem;">Catcher Area: <span style="color: #ff7b72;">${type}</span></p>
            <div style="background-color: #0c0f12; border: 1px solid #30363d; border-radius: 8px; padding: 1rem; overflow-x: auto; max-height: 300px; font-size: 0.75rem; line-height: 1.5; color: #ff7b72; white-space: pre-wrap; word-break: break-all;">
              ${traceback}
            </div>
            <div style="margin-top: 1.5rem; border-t: 1px solid #30363d; padding-top: 1rem; text-align: center;">
              <button onclick="window.location.reload(true)" style="background-color: #da3633; color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; font-family: monospace; font-size: 0.8rem; font-weight: bold; cursor: pointer; transition: all 0.2s;">
                RE-DECRYPT CONSOLE (HARD REFRESH)
              </button>
            </div>
          </div>
        </div>
      `;
    }
  } catch (e) {
    console.error('Failed to render diagnostic overlay', e);
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
