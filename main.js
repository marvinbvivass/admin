// main.js
// Este archivo maneja la inicialización de Firebase y la navegación principal de la aplicación.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Variables globales para Firebase (accesibles desde otros módulos a través de window)
window.firebaseApp = null;
window.firebaseDb = null;
window.firebaseAuth = null;
window.currentUserId = null;

// Configuración de Firebase (solo para desarrollo local o GitHub Pages si no se usa Canvas)
// En un entorno de producción real, estas credenciales deberían ser gestionadas de forma más segura.
const firebaseConfig = {
  apiKey: "AIzaSyBags4wEqc_v8GGsHoLBwStPf0FIJgT6hE",
  authDomain: "admin-804f6.firebaseapp.com",
  projectId: "admin-804f6",
  storageBucket: "admin-804f6.firebasestorage.app",
  messagingSenderId: "641744033630",
  appId: "1:641744033630:web:7e61b41752b1882a6461cf",
  measurementId: "G-DFL37S2NVX"
};

// Función de inicialización de Firebase
async function initializeFirebase() {
    try {
        // Usar la configuración de Canvas si está disponible, de lo contrario, la local
        const firebaseConfig = typeof __firebase_config !== 'undefined' && Object.keys(JSON.parse(__firebase_config)).length > 0
            ? JSON.parse(__firebase_config)
            : firebaseConfigLocal;

        window.firebaseApp = initializeApp(firebaseConfig);
        window.firebaseDb = getFirestore(window.firebaseApp);
        window.firebaseAuth = getAuth(window.firebaseApp);

        // Observar cambios en el estado de autenticación
        onAuthStateChanged(window.firebaseAuth, async (user) => {
            if (user) {
                window.currentUserId = user.uid;
                console.log('Firebase: User ID activo:', window.currentUserId);
                renderMainAppScreen(); // Renderizar la app principal si el usuario está autenticado
            } else {
                window.currentUserId = null;
                console.log('Firebase: No user is signed in. Signing in anonymously...');
                // Si no hay usuario, intentar iniciar sesión anónimamente para pruebas
                await signInAnonymously(window.firebaseAuth);
            }
        });

        // Intentar autenticar con token personalizado si estamos en Canvas
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token !== '') {
            await signInWithCustomToken(window.firebaseAuth, __initial_auth_token);
            console.log('Firebase: Autenticado con token personalizado (Entorno Canvas).');
        } else {
            // Si no hay token de Canvas, onAuthStateChanged se encargará de signInAnonymously
        }

        console.log('Firebase inicializado con éxito.');
    } catch (error) {
        console.error('Error al inicializar Firebase:', error);
        const appContainer = document.getElementById('app-container');
        appContainer.innerHTML = '<p class="text-red-600 text-center">Error al iniciar la aplicación. Por favor, intente de nuevo más tarde.</p>';
    }
}

/**
 * Muestra un modal de alerta personalizado (simplificado para esta versión).
 * @param {string} message - El mensaje a mostrar en el modal.
 */
function showCustomAlert(message) {
    const modalId = 'custom-alert-modal';
    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[9999] p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-auto">
                <p class="text-lg font-semibold text-gray-800 mb-4" id="alert-message"></p>
                <div class="flex justify-end">
                    <button id="alert-ok-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    modal.querySelector('#alert-message').textContent = message;
    setTimeout(() => {
        modal.classList.remove('hidden');
    }, 50);

    const okBtn = modal.querySelector('#alert-ok-btn');
    const oldOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(oldOkBtn, okBtn);
    const newOkBtn = document.getElementById('alert-ok-btn');

    const cleanup = () => {
        if (modal && modal.parentNode) {
            modal.remove();
        }
    };
    newOkBtn.addEventListener('click', cleanup);
}


function renderMainAppScreen() {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <header class="text-center mb-10">
            <h1 class="text-5xl font-extrabold text-gray-900 mb-4">
                Bienvenido al Sistema de Gestión
            </h1>
            <p class="text-xl text-gray-600">
                Tu plataforma integral para administrar tu negocio.
            </p>
            <button id="btn-logout" class="mt-4 bg-red-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-600 transition duration-200">
                Cerrar Sesión (No funcional en esta versión)
            </button>
        </header>

        <!-- Sección de botones/tarjetas para las diferentes áreas de gestión -->
        <main class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <!-- Tarjeta para la sección de Clientes -->
            <div id="btn-clientes" class="section-button bg-gradient-to-r from-blue-700 to-blue-800 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer transform hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.3.356-1.857m0 0A5.002 5.002 0 0112 10a5.002 5.002 0 015.644 3.143m0 0L17 20m-2-9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v4m3 2h6m-6 4h6" />
                </svg>
                <h2 class="text-3xl font-bold">Clientes</h2>
                <p class="text-lg text-center mt-2 opacity-90">Gestión de la base de datos de clientes.</p>
            </div>

            <!-- Tarjeta para la sección de Ventas - Verde más profundo -->
            <div id="btn-ventas" class="section-button bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer transform hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h2 class="text-3xl font-bold">Ventas</h2>
                <p class="text-lg text-center mt-2 opacity-90">Registro y seguimiento de transacciones de venta.</p>
            </div>

            <!-- Tarjeta para la sección de Inventario -->
            <div id="btn-inventario" class="section-button bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer transform hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h2 class="text-3xl font-bold">Inventario</h2>
                <p class="text-lg text-center mt-2 opacity-90">Control de productos y existencias en almacén.</p>
            </div>

            <!-- Tarjeta para la sección de Precios - Rojo más vibrante -->
            <div id="btn-precios" class="section-button bg-gradient-to-r from-red-700 to-red-800 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer transform hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <h2 class="text-3xl font-bold">Precios</h2>
                <p class="text-lg text-center mt-2 opacity-90">Configuración y actualización de precios de productos.</p>
            </div>

            <!-- Nueva Tarjeta para la sección de Archivos - Amarillo/Dorado -->
            <div id="btn-archivos" class="section-button bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer transform hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <h2 class="text-3xl font-bold">Archivos</h2>
                <p class="text-lg text-center mt-2 opacity-90">Gestión de documentos y archivos.</p>
            </div>

            <!-- Nueva Tarjeta para la sección de Carga & Vehículos - Naranja/Ámbar -->
            <div id="btn-carga-vehiculos" class="section-button bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer transform hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 10H7a2 2 0 00-2 2v2a2 2 0 002 2h2v.01M15 10h2a2 2 0 012 2v2a2 2 0 01-2 2h-2m-4 0h.01M12 16v.01" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 14V8m0 0l-3 3m3-3l3 3" />
                </svg>
                <h2 class="text-3xl font-bold">Carga & Vehículos</h2>
                <p class="text-lg text-center mt-2 opacity-90">Administración de carga y flota de vehículos.</p>
            </div>
        </main>
    `;

    const modalContainer = document.getElementById('modal-container');

    // Event Listeners para los botones del menú principal
    document.getElementById('btn-clientes').addEventListener('click', () => {
        showCustomAlert('Sección de Clientes en construcción.');
    });

    document.getElementById('btn-inventario').addEventListener('click', () => {
        showCustomAlert('Sección de Inventario en construcción.');
    });

    document.getElementById('btn-precios').addEventListener('click', () => {
        showCustomAlert('Sección de Precios en construcción.');
    });

    document.getElementById('btn-ventas').addEventListener('click', () => {
        showCustomAlert('Sección de Ventas en construcción.');
    });

    document.getElementById('btn-archivos').addEventListener('click', () => {
        showCustomAlert('Sección de Archivos en construcción.');
    });

    document.getElementById('btn-carga-vehiculos').addEventListener('click', () => {
        showCustomAlert('Sección de Carga & Vehículos en construcción.');
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        showCustomAlert('La función de cerrar sesión no está implementada en esta versión simplificada.');
    });
}

// Iniciar la aplicación cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', initializeFirebase);
