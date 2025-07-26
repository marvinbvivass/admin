// CargasyVehiculos.js
// Este archivo gestiona las operaciones CRUD para los vehículos de carga
// y se encarga de renderizar su interfaz de usuario.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Función auxiliar para obtener la instancia de Firestore
async function getFirestoreInstances() {
    let attempts = 0;
    const maxAttempts = 50; // Intentar por 5 segundos (50 * 100ms)
    while (!window.firebaseDb && attempts < maxAttempts) {
        console.log(`Esperando inicialización de Firebase en CargasyVehiculos.js... Intento ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    if (!window.firebaseDb) {
        console.error('ERROR: Firebase DB no inicializado después de múltiples intentos en CargasyVehiculos.js.');
        throw new Error('Firebase DB no disponible.');
    }
    return {
        db: window.firebaseDb,
    };
}

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

/**
 * Agrega un nuevo vehículo de carga a Firestore.
 * Los datos se guardarán en la colección 'vehiculosCarga' en la raíz.
 * @param {object} vehiculo - Objeto con los datos del vehículo a agregar.
 * @param {string} vehiculo.marca - Marca del vehículo.
 * @param {string} vehiculo.modelo - Modelo del vehículo.
 * @param {string} vehiculo.placa - Placa del vehículo.
 * @returns {Promise<string|null>} El ID del documento del vehículo agregado o null si hubo un error.
 */
async function agregarVehiculo(vehiculo) {
    console.log('agregarVehiculo: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        // La ruta de la colección es directamente 'vehiculosCarga'
        const vehiculosCollectionRef = collection(db, `vehiculosCarga`);
        const docRef = await addDoc(vehiculosCollectionRef, vehiculo);
        console.log('Vehículo agregado con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al agregar vehículo:', error);
        return null;
    } finally {
        console.log('agregarVehiculo: Finalizado.');
    }
}

/**
 * Renderiza la interfaz de usuario de la sección de Carga y Vehículos.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal.
 * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal.
 */
export async function renderCargaVehiculosSection(container, backToMainMenuCallback) {
    console.log('renderCargaVehiculosSection: Iniciando. Contenedor recibido:', container);
    if (!container) {
        console.error('renderCargaVehiculosSection: ERROR - El elemento contenedor es nulo o indefinido.');
        return;
    }

    container.innerHTML = `
        <div class="modal-content">
            <h2 class="text-4xl font-bold text-gray-900 mb-6 text-center">Gestión de Carga y Vehículos</h2>

            <div class="p-6 bg-orange-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-orange-800 mb-4">Vehículos de Carga</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="vehiculo-marca" placeholder="Marca (Ej: Volswaguen)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <input type="text" id="vehiculo-modelo" placeholder="Modelo (Ej: Volswaguen Worker 220)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <input type="text" id="vehiculo-placa" placeholder="Placa (Ej: ABC-123)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                </div>
                <button id="btn-add-vehiculo" class="mt-6 w-full bg-orange-600 text-white p-3 rounded-md font-semibold hover:bg-orange-700 transition duration-200">
                    Agregar Vehículo
                </button>
            </div>

            <button id="btn-back-carga-vehiculos" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                Volver al Menú Principal
            </button>

            <!-- Botón para cerrar el modal -->
            <button id="close-carga-vehiculos-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    const vehiculoMarcaInput = container.querySelector('#vehiculo-marca');
    const vehiculoModeloInput = container.querySelector('#vehiculo-modelo');
    const vehiculoPlacaInput = container.querySelector('#vehiculo-placa');
    const btnAddVehiculo = container.querySelector('#btn-add-vehiculo');
    const btnBack = container.querySelector('#btn-back-carga-vehiculos');
    const closeCargaVehiculosModalBtn = container.querySelector('#close-carga-vehiculos-modal');

    // Lógica para agregar vehículo
    if (btnAddVehiculo) {
        btnAddVehiculo.addEventListener('click', async () => {
            const vehiculo = {
                marca: vehiculoMarcaInput?.value.trim() || '',
                modelo: vehiculoModeloInput?.value.trim() || '',
                placa: vehiculoPlacaInput?.value.trim() || ''
            };

            if (!vehiculo.marca || !vehiculo.modelo || !vehiculo.placa) {
                showCustomAlert('Por favor, complete todos los campos (Marca, Modelo, Placa).');
                return;
            }

            const id = await agregarVehiculo(vehiculo);
            if (id) {
                showCustomAlert(`Vehículo "${vehiculo.marca} ${vehiculo.modelo}" (Placa: ${vehiculo.placa}) agregado con éxito.`);
                // Limpiar campos
                if (vehiculoMarcaInput) vehiculoMarcaInput.value = '';
                if (vehiculoModeloInput) vehiculoModeloInput.value = '';
                if (vehiculoPlacaInput) vehiculoPlacaInput.value = '';
            } else {
                showCustomAlert('Fallo al agregar vehículo.');
            }
        });
    } else {
        console.error('renderCargaVehiculosSection: Botón #btn-add-vehiculo no encontrado.');
    }

    // Lógica para el botón "Volver"
    if (btnBack) {
        btnBack.addEventListener('click', backToMainMenuCallback);
    } else {
        console.error('renderCargaVehiculosSection: Botón #btn-back-carga-vehiculos no encontrado.');
    }

    // Lógica para cerrar el modal
    if (closeCargaVehiculosModalBtn) {
        closeCargaVehiculosModalBtn.addEventListener('click', () => {
            container.classList.add('hidden'); // Oculta el modal
            backToMainMenuCallback(); // Vuelve al menú principal al cerrar
        });
    } else {
        console.error('renderCargaVehiculosSection: Botón #close-carga-vehiculos-modal no encontrado.');
    }

    console.log('renderCargaVehiculosSection: Función completada.');
}
