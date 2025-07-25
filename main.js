// main.js
// Este archivo maneja la inicialización de Firebase, la autenticación de usuario y la navegación principal de la aplicación.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Importa las funciones de renderizado de cada sección
import { renderClientesSection } from './clientes.js';
import { renderCargaVehiculosSection } from './CargasyVehiculos.js';
import { renderInventarioSection } from './inventario.js';
import { renderCargaProductosSection } from './CargaProductos.js';
import { renderPreciosSection } from './precios.js'; // Descomentado: Importa la función de precios

// Variables globales para Firebase (accesibles desde otros módulos a través de window)
window.firebaseApp = null;
window.firebaseDb = null;
window.firebaseAuth = null;
window.currentUserId = null;

// Función de inicialización de Firebase
async function initializeFirebase() {
    // Configuración de Firebase
    const firebaseConfigLocal = {
        apiKey: "AIzaSyBags4wEqc_v8GGsHoLBwStPf0FIJgT6hE",
        authDomain: "admin-804f6.firebaseapp.com",
        projectId: "admin-804f6",
        storageBucket: "admin-804f6.firebasestorage.app",
        messagingSenderId: "641744033630",
        appId: "1:641744033630:web:7e61b41752b1882a6461cf",
        measurementId: "G-DFL37S2NVX"
    };

    try {
        const firebaseConfig = typeof __firebase_config !== 'undefined' && Object.keys(JSON.parse(__firebase_config)).length > 0
            ? JSON.parse(__firebase_config)
            : firebaseConfigLocal;

        window.firebaseApp = initializeApp(firebaseConfig);
        window.firebaseDb = getFirestore(window.firebaseApp);
        window.firebaseAuth = getAuth(window.firebaseApp);

        onAuthStateChanged(window.firebaseAuth, async (user) => {
            if (user) {
                window.currentUserId = user.uid;
                console.log('Firebase: User ID activo:', window.currentUserId);
                renderMainAppScreen(); // Renderizar la app principal si el usuario está autenticado
            } else {
                window.currentUserId = null;
                console.log('Firebase: No user is signed in. Rendering authentication screen.');
                renderAuthScreen(); // Mostrar la pantalla de autenticación si no hay usuario
            }
        });

        // Intentar autenticar con token personalizado si estamos en Canvas
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token !== '') {
            await signInWithCustomToken(window.firebaseAuth, __initial_auth_token);
            console.log('Firebase: Autenticado con token personalizado (Entorno Canvas).');
        }

        console.log('Firebase inicializado con éxito.');
    } catch (error) {
        console.error('Error al inicializar Firebase:', error);
        const appContainer = document.getElementById('app-container');
        appContainer.innerHTML = '<p class="text-red-600 text-center">Error al iniciar la aplicación. Por favor, intente de nuevo más tarde.</p>';
    }
}

// --- Funciones de Autenticación ---

async function handleRegister(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
        console.log('Usuario registrado:', userCredential.user.uid);
        showCustomAlert('Registro exitoso. ¡Bienvenido!');
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        let errorMessage = 'Error al registrar usuario.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'El email ya está registrado.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Formato de email inválido.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
        }
        showCustomAlert(errorMessage);
    }
}

async function handleLogin(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
        console.log('Usuario inició sesión:', userCredential.user.uid);
        showCustomAlert('Inicio de sesión exitoso. ¡Bienvenido de nuevo!');
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        let errorMessage = 'Error al iniciar sesión.';
        if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = 'Email o contraseña incorrectos.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Demasiados intentos fallidos. Intente de nuevo más tarde.';
        }
        showCustomAlert(errorMessage);
    }
}

async function handleLogout() {
    try {
        await signOut(window.firebaseAuth);
        console.log('Usuario cerró sesión.');
        showCustomAlert('Sesión cerrada.');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showCustomAlert('Error al cerrar sesión.');
    }
}

// --- Renderizado de Pantallas ---

/**
 * Muestra un modal de alerta personalizado.
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


function renderAuthScreen() {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <div class="p-8 bg-white rounded-lg shadow-xl w-full max-w-md text-center">
            <h2 class="text-3xl font-bold text-gray-800 mb-6">Iniciar Sesión / Registrarse</h2>
            <div class="mb-4">
                <input type="email" id="auth-email" placeholder="Email" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="mb-6">
                <input type="password" id="auth-password" placeholder="Contraseña" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <button id="btn-login" class="w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 transition duration-200 mb-3">
                Iniciar Sesión
            </button>
            <button id="btn-register" class="w-full bg-green-600 text-white p-3 rounded-md font-semibold hover:bg-green-700 transition duration-200">
                Registrarse
            </button>
        </div>
    `;

    document.getElementById('btn-login').addEventListener('click', () => {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        handleLogin(email, password);
    });

    document.getElementById('btn-register').addEventListener('click', () => {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        handleRegister(email, password);
    });
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
                Cerrar Sesión
            </button>
        </header>

        <!-- Sección de botones/tarjetas para las diferentes áreas de gestión -->
        <main class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <!-- Tarjeta para la sección de Clientes -->
            <div id="btn-clientes" class="section-button bg-gradient-to-r from-blue-700 to-blue-800 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer transform hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H2v-2a3 3 0 015.356-1.857m0 0A5.002 5.002 0 0112 10a5.002 5.002 0 015.644 3.143m0 0L17 20m-2-9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v4m3 2h6m-6 4h6" />
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

            <!-- Tarjeta para la sección de Vehículos (antes Carga & Vehículos) -->
            <div id="btn-vehiculos" class="section-button bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer transform hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 10H7a2 2 0 00-2 2v2a2 2 0 002 2h2v.01M15 10h2a2 2 0 012 2v2a2 2 0 01-2 2h-2m-4 0h.01M12 16v.01" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 14V8m0 0l-3 3m3-3l3 3" />
                </svg>
                <h2 class="text-3xl font-bold">Vehículos</h2>
                <p class="text-lg text-center mt-2 opacity-90">Administración de la flota de vehículos.</p>
            </div>

            <!-- NUEVA Tarjeta para la sección de Carga Productos -->
            <div id="btn-carga-productos" class="section-button bg-gradient-to-r from-pink-600 to-pink-700 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer transform hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <h2 class="text-3xl font-bold">Carga Productos</h2>
                <p class="text-lg text-center mt-2 opacity-90">Gestión de la carga de productos en vehículos.</p>
            </div>
        </main>
    `;

    const modalContainer = document.getElementById('modal-container');

    // Event Listeners para los botones del menú principal
    document.getElementById('btn-clientes').addEventListener('click', async () => {
        modalContainer.classList.remove('hidden');
        await renderClientesSection(modalContainer);
    });

    document.getElementById('btn-inventario').addEventListener('click', async () => {
        modalContainer.classList.remove('hidden');
        await renderInventarioSection(modalContainer, renderMainAppScreen);
    });

    document.getElementById('btn-precios').addEventListener('click', async () => { // MODIFICADO AQUI
        modalContainer.classList.remove('hidden');
        await renderPreciosSection(modalContainer, renderMainAppScreen); // MODIFICADO AQUI
    });

    document.getElementById('btn-ventas').addEventListener('click', () => {
        showCustomAlert('Sección de Ventas en construcción.');
    });

    document.getElementById('btn-archivos').addEventListener('click', () => {
        showCustomAlert('Sección de Archivos en construcción.');
    });

    // Event Listener para la sección de Vehículos (antes Carga & Vehículos)
    document.getElementById('btn-vehiculos').addEventListener('click', async () => {
        modalContainer.classList.remove('hidden');
        await renderCargaVehiculosSection(modalContainer, renderMainAppScreen);
    });

    // Event Listener para la nueva sección de Carga Productos
    document.getElementById('btn-carga-productos').addEventListener('click', async () => {
        modalContainer.classList.remove('hidden');
        await renderCargaProductosSection(modalContainer, renderMainAppScreen);
    });

    document.getElementById('btn-logout').addEventListener('click', handleLogout);
}

// Iniciar la aplicación cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', initializeFirebase);

