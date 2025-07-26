// clientes.js
// Este archivo gestiona las operaciones CRUD (Crear, Leer, Actualizar, Eliminar) para los clientes
// utilizando Firebase Firestore, y también se encarga de renderizar su interfaz de usuario.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Variable para almacenar el mapa de zonas a sectores, cargado desde Firebase
let zonaSectorMap = {};
const ZONA_SECTOR_CONFIG_DOC_ID = 'zonasSectores'; // ID fijo para el documento de configuración

// Función auxiliar para obtener la instancia de Firestore
async function getFirestoreInstances() {
    let attempts = 0;
    const maxAttempts = 50; // Intentar por 5 segundos (50 * 100ms)
    while (!window.firebaseDb && attempts < maxAttempts) {
        console.log(`Esperando inicialización de Firebase en clientes.js... Intento ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    if (!window.firebaseDb) {
        console.error('ERROR: Firebase DB no inicializado después de múltiples intentos en clientes.js.');
        throw new Error('Firebase DB no disponible.');
    }
    return {
        db: window.firebaseDb,
    };
}

/**
 * Muestra un modal de confirmación personalizado.
 * @param {string} message - El mensaje a mostrar en el modal.
 * @returns {Promise<boolean>} Resuelve a true si el usuario confirma, false si cancela.
 */
function showCustomConfirm(message) {
    return new Promise(resolve => {
        const modalId = 'custom-confirm-modal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[9999] p-4';
            modal.innerHTML = `
                <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-auto">
                    <p class="text-lg font-semibold text-gray-800 mb-4" id="confirm-message"></p>
                    <div class="flex justify-end space-x-3">
                        <button id="confirm-no-btn" class="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200">No</button>
                        <button id="confirm-yes-btn" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200">Sí</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        modal.querySelector('#confirm-message').textContent = message;
        setTimeout(() => {
            modal.classList.remove('hidden');
        }, 50);

        const yesBtn = modal.querySelector('#confirm-yes-btn');
        const noBtn = modal.querySelector('#confirm-no-btn');

        const oldYesBtn = yesBtn.cloneNode(true);
        const oldNoBtn = noBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(oldYesBtn, yesBtn);
        noBtn.parentNode.replaceChild(oldNoBtn, noBtn);

        const newYesBtn = document.getElementById('confirm-yes-btn');
        const newNoBtn = document.getElementById('confirm-no-btn');


        const cleanup = () => {
            if (modal && modal.parentNode) {
                modal.remove();
            }
        };

        const onYesClick = () => {
            cleanup();
            resolve(true);
        };

        const onNoClick = () => {
            cleanup();
            resolve(false);
        };

        newYesBtn.addEventListener('click', onYesClick);
        newNoBtn.addEventListener('click', onNoClick);
    });
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
 * Obtiene la configuración de zonas y sectores desde Firebase.
 * @returns {Promise<object>} El mapa de zonas a sectores.
 */
async function obtenerConfiguracionZonasSectores() {
    console.log('obtenerConfiguracionZonasSectores: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        // Colección 'configuracion' está en la raíz
        const configDocRef = doc(db, `configuracion`, ZONA_SECTOR_CONFIG_DOC_ID);
        const configSnap = await getDoc(configDocRef);

        if (configSnap.exists()) {
            console.log('Configuración de zonas y sectores obtenida:', configSnap.data().mapa);
            return configSnap.data().mapa || {};
        } else {
            console.log('No se encontró configuración de zonas y sectores. Usando mapa predeterminado.');
            return {
                "Santa Teresa": ["Barrio Bolivar", "Principal Santa Teresa", "Los Teques", "Calle 4", "La Villa"],
                "Foraneo": ["No Aplica"],
                "Zona Industrial": ["Zona Industrial"],
                "Machiri": ["Parte Alta", "Parte Baja", "Barrio el Lago"],
                "Palo Gordo": ["Gallardin", "Gallardin Parte Baja", "Gallardin Parte Alta", "Principal Palo Gordo", "Calle Tachira", "Calle del Medio", "Toica", "Nazareno", "La Trinidad", "Calle del Hambre", "Puente/Cancha"]
            };
        }
    } catch (error) {
        console.error('Error al obtener configuración de zonas y sectores:', error);
        return {};
    } finally {
        console.log('obtenerConfiguracionZonasSectores: Finalizado.');
    }
}

/**
 * Guarda la configuración de zonas y sectores en Firebase.
 * @param {object} newMap - El nuevo mapa de zonas a sectores a guardar.
 * @returns {Promise<boolean>} True si se guardó con éxito, false en caso contrario.
 */
async function guardarConfiguracionZonasSectores(newMap) {
    console.log('guardarConfiguracionZonasSectores: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        // Colección 'configuracion' está en la raíz
        const configDocRef = doc(db, `configuracion`, ZONA_SECTOR_CONFIG_DOC_ID);
        await setDoc(configDocRef, { mapa: newMap }); // Usa setDoc para sobrescribir o crear
        console.log('Configuración de zonas y sectores guardada con éxito.');
        zonaSectorMap = newMap; // Actualiza la variable global
        return true;
    } catch (error) {
        console.error('Error al guardar configuración de zonas y sectores:', error);
        return false;
    } finally {
        console.log('guardarConfiguracionZonasSectores: Finalizado.');
    }
}

/**
 * Agrega un nuevo cliente al sistema en Firestore.
 * Los datos se guardarán en la colección compartida en la raíz.
 * Ruta: /datosClientes
 * @param {object} cliente - Objeto con los datos del cliente a agregar.
 * @param {string} cliente.CEP - Código de Enrutamiento Postal.
 * @param {string} cliente.NombreComercial - Nombre comercial del cliente.
 * @param {string} cliente.NombrePersonal - Nombre personal del contacto.
 * @param {string} cliente.Rif - Registro de Información Fiscal.
 * @param {string} cliente.Zona - Zona geográfica del cliente.
 * @param {string} cliente.Sector - Sector de actividad del cliente.
 * @param {string} cliente.Tlf - Número de teléfono.
 * @param {string} [cliente.Observaciones] - Observaciones adicionales (opcional).
 * @returns {Promise<string|null>} El ID del documento del cliente agregado o null si hubo un error.
 */
export async function agregarCliente(cliente) {
    console.log('agregarCliente: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        // La ruta de la colección es directamente 'datosClientes'
        const clientesCollectionRef = collection(db, `datosClientes`);
        const docRef = await addDoc(clientesCollectionRef, cliente);
        console.log('Cliente agregado con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al agregar cliente:', error);
        return null;
    } finally {
        console.log('agregarCliente: Finalizado.');
    }
}

/**
 * Modifica los datos de un cliente existente en Firestore.
 * @param {string} idCliente - ID único del cliente a modificar.
 * @param {object} nuevosDatos - Objeto con los nuevos datos del cliente.
 * @returns {Promise<boolean>} True si se modificó con éxito, false en caso contrario.
 */
export async function modificarCliente(idCliente, nuevosDatos) {
    console.log('modificarCliente: Iniciando. ID:', idCliente, 'Nuevos datos:', nuevosDatos);
    try {
        const { db } = await getFirestoreInstances();
        const clienteDocRef = doc(db, `datosClientes`, idCliente);
        await updateDoc(clienteDocRef, nuevosDatos);
        console.log('Cliente modificado con éxito. ID:', idCliente);
        return true;
    } catch (error) {
        console.error('Error al modificar cliente:', error);
        return false;
    } finally {
        console.log('modificarCliente: Finalizado.');
    }
}

/**
 * Elimina un cliente del sistema de Firestore.
 * @param {string} idCliente - ID único del cliente a eliminar.
 * @returns {Promise<boolean>} True si se eliminó con éxito, false en caso contrario.
 */
export async function eliminarCliente(idCliente) {
    console.log('eliminarCliente: Iniciando. ID:', idCliente);
    try {
        const { db } = await getFirestoreInstances();
        const clienteDocRef = doc(db, `datosClientes`, idCliente);
        await deleteDoc(clienteDocRef);
        console.log('Cliente eliminado con éxito. ID:', idCliente);
        return true;
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        return false;
    } finally {
        console.log('eliminarCliente: Finalizado.');
    }
}

/**
 * Obtiene un cliente específico de Firestore.
 * @param {string} idCliente - ID único del cliente a obtener.
 * @returns {Promise<object|null>} El objeto del cliente o null si no se encuentra.
 */
export async function obtenerCliente(idCliente) {
    console.log('obtenerCliente: Iniciando. ID:', idCliente);
    try {
        const { db } = await getFirestoreInstances();
        const clienteDocRef = doc(db, `datosClientes`, idCliente);
        const docSnap = await getDoc(clienteDocRef);
        if (docSnap.exists()) {
            console.log('Cliente obtenido:', docSnap.data());
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log('No se encontró el cliente con ID:', idCliente);
            return null;
        }
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        return null;
    } finally {
        console.log('obtenerCliente: Finalizado.');
    }
}

/**
 * Obtiene todos los clientes de Firestore.
 * @returns {Promise<Array<object>>} Un array de objetos de cliente.
 */
export async function obtenerTodosLosClientes() {
    console.log('obtenerTodosLosClientes: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        const clientesCollectionRef = collection(db, `datosClientes`);
        const querySnapshot = await getDocs(clientesCollectionRef);
        const clientes = [];
        querySnapshot.forEach((doc) => {
            clientes.push({ id: doc.id, ...doc.data() });
        });
        console.log('Todos los clientes obtenidos:', clientes);
        return clientes;
    } catch (error) {
        console.error('Error al obtener todos los clientes:', error);
        return [];
    } finally {
        console.log('obtenerTodosLosClientes: Finalizado.');
    }
}


/**
 * Renderiza la interfaz de usuario de la sección de clientes dentro del contenedor dado.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal de clientes.
 */
export async function renderClientesSection(container) {
    console.log('renderClientesSection: Iniciando. Contenedor recibido:', container);
    if (!container) {
        console.error('renderClientesSection: ERROR - El elemento contenedor es nulo o indefinido.');
        return;
    }

    container.innerHTML = `
        <div class="modal-content">
            <h2 class="text-4xl font-bold text-gray-900 mb-6 text-center">Gestión de Clientes</h2>

            <div id="clientes-main-buttons-container" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <button id="btn-show-add-cliente" class="bg-blue-600 text-white p-4 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                    Agregar Cliente
                </button>
                <button id="btn-show-list-clientes" class="bg-green-600 text-white p-4 rounded-md font-semibold hover:bg-green-700 transition duration-200">
                    Lista Clientes
                </button>
                <button id="btn-show-modify-delete-clientes" class="bg-yellow-600 text-white p-4 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                    Modificar o Eliminar Clientes
                </button>
                <button id="btn-show-manage-zones-sectors" class="bg-purple-600 text-white p-4 rounded-md font-semibold hover:bg-purple-700 transition duration-200">
                    Gestionar Zonas y Sectores
                </button>
            </div>

            <!-- Contenedor para las sub-secciones dinámicas -->
            <div id="clientes-sub-section" class="mt-8">
                <!-- El contenido de agregar, modificar/eliminar o buscar/listar se cargará aquí -->
            </div>

            <!-- Botón para cerrar el modal -->
            <button id="close-clientes-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    console.log('renderClientesSection: HTML inyectado en el contenedor.');
    const clientesMainButtonsContainer = container.querySelector('#clientes-main-buttons-container');
    const clientesSubSection = container.querySelector('#clientes-sub-section');
    const closeClientesModalBtn = container.querySelector('#close-clientes-modal');

    const btnShowAddCliente = container.querySelector('#btn-show-add-cliente');
    const btnShowListClientes = container.querySelector('#btn-show-list-clientes');
    const btnShowModifyDeleteClientes = container.querySelector('#btn-show-modify-delete-clientes');
    const btnShowManageZonesSectors = container.querySelector('#btn-show-manage-zones-sectors');

    console.log('renderClientesSection: Llamando a obtenerConfiguracionZonasSectores...');
    zonaSectorMap = await obtenerConfiguracionZonasSectores();
    console.log('renderClientesSection: obtenerConfiguracionZonasSectores completado. zonaSectorMap:', zonaSectorMap);


    function showClientesMainButtons() {
        clientesSubSection.innerHTML = '';
        clientesMainButtonsContainer.classList.remove('hidden');
    }

    if (closeClientesModalBtn) {
        closeClientesModalBtn.addEventListener('click', () => {
            container.classList.add('hidden');
            showClientesMainButtons();
        });
    } else {
        console.error('renderClientesSection: Botón #close-clientes-modal no encontrado.');
    }


    if (btnShowAddCliente) {
        btnShowAddCliente.addEventListener('click', () => {
            clientesMainButtonsContainer.classList.add('hidden');
            renderAddClienteForm(clientesSubSection, showClientesMainButtons);
        });
    } else {
        console.error('renderClientesSection: Botón #btn-show-add-cliente no encontrado.');
    }

    if (btnShowListClientes) {
        btnShowListClientes.addEventListener('click', async () => {
            clientesMainButtonsContainer.classList.add('hidden');
            await renderListaClientesSection(clientesSubSection, showClientesMainButtons);
        });
    } else {
        console.error('renderClientesSection: Botón #btn-show-list-clientes no encontrado.');
    }

    if (btnShowModifyDeleteClientes) {
        btnShowModifyDeleteClientes.addEventListener('click', async () => {
            clientesMainButtonsContainer.classList.add('hidden');
            await renderModificarEliminarClientesSection(clientesSubSection, showClientesMainButtons);
        });
    } else {
        console.error('renderClientesSection: Botón #btn-show-modify-delete-clientes no encontrado.');
    }

    if (btnShowManageZonesSectors) {
        btnShowManageZonesSectors.addEventListener('click', async () => {
            clientesMainButtonsContainer.classList.add('hidden');
            await renderGestionarZonasSectoresForm();
        });
    } else {
        console.error('renderClientesSection: Botón #btn-show-manage-zones-sectors no encontrado.');
    }


    // --- Funciones para el formulario de Agregar Cliente ---
    /**
     * Renderiza el formulario para agregar un nuevo cliente.
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará el formulario.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de clientes.
     */
    function renderAddClienteForm(parentContainer, backToMainMenuCallback) {
        console.log('renderAddClienteForm: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-6 bg-blue-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-blue-800 mb-4">Agregar Nuevo Cliente</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="add-cep" placeholder="CEP" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <input type="text" id="add-nombre-comercial" placeholder="Nombre Comercial" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <input type="text" id="add-nombre-personal" placeholder="Nombre Personal" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <input type="text" id="add-rif" placeholder="Rif" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <select id="add-zona" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Selecciona Zona</option>
                        ${Object.keys(zonaSectorMap).map(zona => `<option value="${zona}">${zona}</option>`).join('')}
                    </select>
                    <select id="add-sector" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled>
                        <option value="">Selecciona Sector</option>
                    </select>
                    <input type="tel" id="add-tlf" placeholder="Teléfono" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <textarea id="add-observaciones" placeholder="Observaciones (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-full"></textarea>
                </div>
                <button id="btn-submit-add-cliente" class="mt-6 w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                    Confirmar Agregar Cliente
                </button>
                <button id="btn-back-add-cliente" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;
        const addZonaSelect = parentContainer.querySelector('#add-zona');
        const addSectorSelect = parentContainer.querySelector('#add-sector');
        if (addZonaSelect && addSectorSelect) {
            addZonaSelect.addEventListener('change', () => {
                const selectedZona = addZonaSelect.value;
                addSectorSelect.innerHTML = '<option value="">Selecciona Sector</option>';
                if (selectedZona && zonaSectorMap[selectedZona]) {
                    zonaSectorMap[selectedZona].forEach(sector => {
                        const option = document.createElement('option');
                        option.value = sector;
                        option.textContent = sector;
                        addSectorSelect.appendChild(option);
                    });
                    addSectorSelect.disabled = false;
                } else {
                    addSectorSelect.disabled = true;
                }
            });
        }

        const btnSubmitAddCliente = parentContainer.querySelector('#btn-submit-add-cliente');
        if (btnSubmitAddCliente) {
            btnSubmitAddCliente.addEventListener('click', async () => {
                const cliente = {
                    CEP: parentContainer.querySelector('#add-cep')?.value || '',
                    NombreComercial: parentContainer.querySelector('#add-nombre-comercial')?.value || '',
                    NombrePersonal: parentContainer.querySelector('#add-nombre-personal')?.value || '',
                    Rif: parentContainer.querySelector('#add-rif')?.value || '',
                    Zona: parentContainer.querySelector('#add-zona')?.value || '',
                    Sector: parentContainer.querySelector('#add-sector')?.value || '',
                    Tlf: parentContainer.querySelector('#add-tlf')?.value || '',
                    Observaciones: parentContainer.querySelector('#add-observaciones')?.value || ''
                };

                if (!cliente.CEP || !cliente.NombreComercial || !cliente.NombrePersonal || !cliente.Rif || !cliente.Zona || !cliente.Sector || !cliente.Tlf) {
                    showCustomAlert('Por favor, complete todos los campos obligatorios (CEP, Nombre Comercial, Nombre Personal, Rif, Zona, Sector, Teléfono).');
                    return;
                }

                const id = await agregarCliente(cliente);
                if (id) {
                    // CAMBIO: Mostrar Nombre Comercial en lugar de ID
                    showCustomAlert(`Cliente "${cliente.NombreComercial}" agregado con éxito.`);
                    // Limpiar campos
                    if (parentContainer.querySelector('#add-cep')) parentContainer.querySelector('#add-cep').value = '';
                    if (parentContainer.querySelector('#add-nombre-comercial')) parentContainer.querySelector('#add-nombre-comercial').value = '';
                    if (parentContainer.querySelector('#add-nombre-personal')) parentContainer.querySelector('#add-nombre-personal').value = '';
                    if (parentContainer.querySelector('#add-rif')) parentContainer.querySelector('#add-rif').value = '';
                    if (parentContainer.querySelector('#add-zona')) parentContainer.querySelector('#add-zona').value = '';
                    if (parentContainer.querySelector('#add-sector')) {
                        parentContainer.querySelector('#add-sector').innerHTML = '<option value="">Selecciona Sector</option>';
                        parentContainer.querySelector('#add-sector').disabled = true;
                    }
                    if (parentContainer.querySelector('#add-tlf')) parentContainer.querySelector('#add-tlf').value = '';
                    if (parentContainer.querySelector('#add-observaciones')) parentContainer.querySelector('#add-observaciones').value = '';
                } else {
                    showCustomAlert('Fallo al agregar cliente.');
                }
            });
        }

        const btnBackAddCliente = parentContainer.querySelector('#btn-back-add-cliente');
        if (btnBackAddCliente) {
            btnBackAddCliente.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderAddClienteForm: Finalizado.');
    }

    // --- Funciones para la Lista de Clientes ---
    async function renderListaClientesSection(parentContainer, backToMainMenuCallback) {
        console.log('renderListaClientesSection: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-6 bg-green-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-green-800 mb-4">Lista de Clientes</h3>

                <input type="text" id="search-clientes-list-input" placeholder="Buscar cliente por CEP, Nombre Comercial, Rif, Zona, etc." class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-4">

                <div id="clientes-table-container" class="max-h-96 overflow-y-auto bg-white p-3 rounded-md border border-gray-200 shadow-md">
                    <p class="text-gray-500">Cargando clientes...</p>
                </div>

                <button id="btn-back-list-clientes" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const searchInput = parentContainer.querySelector('#search-clientes-list-input');
        const tableContainer = parentContainer.querySelector('#clientes-table-container');
        const btnBack = parentContainer.querySelector('#btn-back-list-clientes');

        let allClients = await obtenerTodosLosClientes();

        const renderTable = (clientsToRender) => {
            if (clientsToRender.length === 0) {
                tableContainer.innerHTML = '<p class="text-gray-500">No hay clientes para mostrar.</p>';
                return;
            }

            let tableHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CEP</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Comercial</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Personal</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rif</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zona</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observaciones</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
            `;

            clientsToRender.forEach(client => {
                tableHTML += `
                    <tr class="hover:bg-gray-100">
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${client.CEP || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${client.NombreComercial || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${client.NombrePersonal || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${client.Rif || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${client.Zona || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${client.Sector || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${client.Tlf || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-normal text-xs text-gray-500 max-w-xs overflow-hidden text-ellipsis">${client.Observaciones || 'N/A'}</td>
                    </tr>
                `;
            });

            tableHTML += `</tbody></table>`;
            tableContainer.innerHTML = tableHTML;
        };

        renderTable(allClients);

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();
                const filteredClients = allClients.filter(client =>
                    (client.CEP && client.CEP.toLowerCase().includes(searchTerm)) ||
                    (client.NombreComercial && client.NombreComercial.toLowerCase().includes(searchTerm)) ||
                    (client.NombrePersonal && client.NombrePersonal.toLowerCase().includes(searchTerm)) ||
                    (client.Rif && client.Rif.toLowerCase().includes(searchTerm)) ||
                    (client.Zona && client.Zona.toLowerCase().includes(searchTerm)) ||
                    (client.Sector && client.Sector.toLowerCase().includes(searchTerm)) ||
                    (client.Tlf && client.Tlf.toLowerCase().includes(searchTerm)) ||
                    (client.Observaciones && client.Observaciones.toLowerCase().includes(searchTerm))
                );
                renderTable(filteredClients);
            });
        }

        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderListaClientesSection: Finalizado.');
    }

    // --- Funciones para Modificar o Eliminar Clientes ---
    async function renderModificarEliminarClientesSection(parentContainer, backToMainMenuCallback) {
        console.log('renderModificarEliminarClientesSection: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-6 bg-yellow-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-yellow-800 mb-4">Modificar o Eliminar Clientes</h3>

                <input type="text" id="search-modify-delete-input" placeholder="Buscar cliente por CEP, Nombre Comercial, Rif, Zona, etc." class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4">

                <div id="modify-delete-table-container" class="max-h-96 overflow-y-auto bg-white p-3 rounded-md border border-gray-200 shadow-md">
                    <p class="text-gray-500">Cargando clientes...</p>
                </div>

                <button id="btn-back-modify-delete-clientes" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const searchInput = parentContainer.querySelector('#search-modify-delete-input');
        const tableContainer = parentContainer.querySelector('#modify-delete-table-container');
        const btnBack = parentContainer.querySelector('#btn-back-modify-delete-clientes');

        let allClients = await obtenerTodosLosClientes();

        const renderTable = (clientsToRender) => {
            if (clientsToRender.length === 0) {
                tableContainer.innerHTML = '<p class="text-gray-500">No hay clientes para mostrar.</p>';
                return;
            }

            let tableHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Comercial</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CEP</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rif</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zona</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
            `;

            clientsToRender.forEach(client => {
                tableHTML += `
                    <tr class="hover:bg-gray-100">
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${client.NombreComercial || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${client.CEP || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${client.Rif || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${client.Zona || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                            <button class="bg-blue-500 text-white px-2 py-1 rounded-md text-xs hover:bg-blue-600 transition duration-200 modify-client-btn" data-client-id="${client.id}">Modificar</button>
                            <button class="bg-red-500 text-white px-2 py-1 rounded-md text-xs hover:bg-red-600 transition duration-200 delete-client-btn" data-client-id="${client.id}">Eliminar</button>
                        </td>
                    </tr>
                `;
            });

            tableHTML += `</tbody></table>`;
            tableContainer.innerHTML = tableHTML;

            // Add event listeners for modify and delete buttons
            tableContainer.querySelectorAll('.modify-client-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const clientId = event.target.dataset.clientId;
                    const clientToModify = allClients.find(c => c.id === clientId);
                    if (clientToModify) {
                        renderEditClientForm(parentContainer, showClientesMainButtons, clientToModify);
                    } else {
                        showCustomAlert('Cliente no encontrado para modificar.');
                    }
                });
            });

            tableContainer.querySelectorAll('.delete-client-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const clientId = event.target.dataset.clientId;
                    const clientToDelete = allClients.find(c => c.id === clientId);
                    const clientName = clientToDelete ? clientToDelete.NombreComercial : 'este cliente';
                    const confirmed = await showCustomConfirm(`¿Estás seguro de que quieres eliminar a "${clientName}"?`);
                    if (confirmed) {
                        const deleted = await eliminarCliente(clientId);
                        if (deleted) {
                            showCustomAlert(`Cliente "${clientName}" eliminado con éxito.`);
                            allClients = allClients.filter(c => c.id !== clientId); // Update local list
                            renderTable(allClients); // Re-render table
                        } else {
                            showCustomAlert(`Fallo al eliminar a "${clientName}".`);
                        }
                    }
                });
            });
        };

        renderTable(allClients);

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();
                const filteredClients = allClients.filter(client =>
                    (client.CEP && client.CEP.toLowerCase().includes(searchTerm)) ||
                    (client.NombreComercial && client.NombreComercial.toLowerCase().includes(searchTerm)) ||
                    (client.NombrePersonal && client.NombrePersonal.toLowerCase().includes(searchTerm)) ||
                    (client.Rif && client.Rif.toLowerCase().includes(searchTerm)) ||
                    (client.Zona && client.Zona.toLowerCase().includes(searchTerm)) ||
                    (client.Sector && client.Sector.toLowerCase().includes(searchTerm)) ||
                    (client.Tlf && client.Tlf.toLowerCase().includes(searchTerm)) ||
                    (client.Observaciones && client.Observaciones.toLowerCase().includes(searchTerm))
                );
                renderTable(filteredClients);
            });
        }

        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderModificarEliminarClientesSection: Finalizado.');
    }

    /**
     * Renderiza el formulario para editar un cliente existente.
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará el formulario.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de clientes.
     * @param {object} clientData - Los datos del cliente a editar.
     */
    async function renderEditClientForm(parentContainer, backToMainMenuCallback, clientData) {
        console.log('renderEditClientForm: Iniciando con datos:', clientData);
        parentContainer.innerHTML = `
            <div class="p-6 bg-yellow-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-yellow-800 mb-4">Modificar Cliente: ${clientData.NombreComercial || 'N/A'}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="edit-cep" placeholder="CEP" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${clientData.CEP || ''}">
                    <input type="text" id="edit-nombre-comercial" placeholder="Nombre Comercial" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${clientData.NombreComercial || ''}">
                    <input type="text" id="edit-nombre-personal" placeholder="Nombre Personal" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${clientData.NombrePersonal || ''}">
                    <input type="text" id="edit-rif" placeholder="Rif" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${clientData.Rif || ''}">
                    <select id="edit-zona" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                        <option value="">Selecciona Zona</option>
                        ${Object.keys(zonaSectorMap).map(zona => `<option value="${zona}" ${zona === clientData.Zona ? 'selected' : ''}>${zona}</option>`).join('')}
                    </select>
                    <select id="edit-sector" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                        <option value="">Selecciona Sector</option>
                        ${clientData.Zona && zonaSectorMap[clientData.Zona] ?
                            zonaSectorMap[clientData.Zona].map(sector => `<option value="${sector}" ${sector === clientData.Sector ? 'selected' : ''}>${sector}</option>`).join('')
                            : ''
                        }
                    </select>
                    <input type="tel" id="edit-tlf" placeholder="Teléfono" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${clientData.Tlf || ''}">
                    <textarea id="edit-observaciones" placeholder="Observaciones (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 col-span-full">${clientData.Observaciones || ''}</textarea>
                </div>
                <button id="btn-submit-edit-client" class="mt-6 w-full bg-yellow-600 text-white p-3 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                    Confirmar Modificación
                </button>
                <button id="btn-back-edit-client" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const editZonaSelect = parentContainer.querySelector('#edit-zona');
        const editSectorSelect = parentContainer.querySelector('#edit-sector');

        // Lógica para actualizar el select de Sector cuando cambia la Zona
        if (editZonaSelect && editSectorSelect) {
            editZonaSelect.addEventListener('change', () => {
                const selectedZona = editZonaSelect.value;
                editSectorSelect.innerHTML = '<option value="">Selecciona Sector</option>';
                if (selectedZona && zonaSectorMap[selectedZona]) {
                    zonaSectorMap[selectedZona].forEach(sector => {
                        const option = document.createElement('option');
                        option.value = sector;
                        option.textContent = sector;
                        editSectorSelect.appendChild(option);
                    });
                    editSectorSelect.disabled = false;
                } else {
                    editSectorSelect.disabled = true;
                }
            });
            // Asegurarse de que el sector esté habilitado si ya hay una zona seleccionada en los datos iniciales
            if (clientData.Zona) {
                 editSectorSelect.disabled = false;
            }
        }

        const btnSubmitEditClient = parentContainer.querySelector('#btn-submit-edit-client');
        if (btnSubmitEditClient) {
            btnSubmitEditClient.addEventListener('click', async () => {
                const updatedClientData = {
                    CEP: parentContainer.querySelector('#edit-cep')?.value || '',
                    NombreComercial: parentContainer.querySelector('#edit-nombre-comercial')?.value || '',
                    NombrePersonal: parentContainer.querySelector('#edit-nombre-personal')?.value || '',
                    Rif: parentContainer.querySelector('#edit-rif')?.value || '',
                    Zona: parentContainer.querySelector('#edit-zona')?.value || '',
                    Sector: parentContainer.querySelector('#edit-sector')?.value || '',
                    Tlf: parentContainer.querySelector('#edit-tlf')?.value || '',
                    Observaciones: parentContainer.querySelector('#edit-observaciones')?.value || ''
                };

                if (!updatedClientData.CEP || !updatedClientData.NombreComercial || !updatedClientData.NombrePersonal || !updatedClientData.Rif || !updatedClientData.Zona || !updatedClientData.Sector || !updatedClientData.Tlf) {
                    showCustomAlert('Por favor, complete todos los campos obligatorios (CEP, Nombre Comercial, Nombre Personal, Rif, Zona, Sector, Teléfono).');
                    return;
                }

                const confirmed = await showCustomConfirm(`¿Estás seguro de que quieres modificar los datos de "${updatedClientData.NombreComercial}"?`);
                if (confirmed) {
                    const updated = await modificarCliente(clientData.id, updatedClientData);
                    if (updated) {
                        showCustomAlert(`Cliente "${updatedClientData.NombreComercial}" modificado con éxito.`);
                        // Volver a la lista después de modificar
                        backToMainMenuCallback(); // Esto debería llevar al menú principal de clientes
                        // Opcional: Volver a la sección de modificar/eliminar para ver los cambios
                        // await renderModificarEliminarClientesSection(parentContainer, showClientesMainButtons);
                    } else {
                        showCustomAlert('Fallo al modificar cliente.');
                    }
                }
            });
        }

        const btnBackEditClient = parentContainer.querySelector('#btn-back-edit-client');
        if (btnBackEditClient) {
            btnBackEditClient.addEventListener('click', async () => {
                // Volver a la sección de modificar/eliminar clientes
                await renderModificarEliminarClientesSection(parentContainer, backToMainMenuCallback);
            });
        }
        console.log('renderEditClientForm: Finalizado.');
    }


    // --- Funciones para gestionar Zonas y Sectores ---

    async function renderGestionarZonasSectoresForm() {
        console.log('renderGestionarZonasSectoresForm: Iniciando...');
        clientesSubSection.innerHTML = `
            <div class="p-6 bg-purple-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-purple-800 mb-4">Gestionar Zonas y Sectores</h3>

                <div id="zones-sectors-management-buttons" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <button id="btn-add-zone-sector" class="bg-blue-600 text-white p-4 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                        Añadir Zona o Sector
                    </button>
                    <button id="btn-modify-delete-zone-sector" class="bg-yellow-600 text-white p-4 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                        Eliminar Zona o Sector
                    </button>
                </div>

                <div id="zones-sectors-sub-section">
                    <!-- El contenido de añadir o modificar/eliminar se cargará aquí -->
                </div>

                <button id="btn-back-from-zones-sectors-management" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver al Menú Principal de Clientes
                </button>
            </div>
        `;

        const zonesSectorsSubSection = clientesSubSection.querySelector('#zones-sectors-sub-section');
        const btnBack = clientesSubSection.querySelector('#btn-back-from-zones-sectors-management');
        const btnAdd = clientesSubSection.querySelector('#btn-add-zone-sector');
        const btnModifyDelete = clientesSubSection.querySelector('#btn-modify-delete-zone-sector');

        const showZonesSectorsMainButtons = () => {
            zonesSectorsSubSection.innerHTML = '';
            const managementButtons = clientesSubSection.querySelector('#zones-sectors-management-buttons');
            if (managementButtons) {
                managementButtons.classList.remove('hidden');
            }
        };

        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                const managementButtons = clientesSubSection.querySelector('#zones-sectors-management-buttons');
                if (managementButtons) {
                    managementButtons.classList.add('hidden');
                }
                renderAddZoneSectorFormForManagement(zonesSectorsSubSection, showZonesSectorsMainButtons);
            });
        }

        if (btnModifyDelete) {
            btnModifyDelete.addEventListener('click', () => {
                const managementButtons = clientesSubSection.querySelector('#zones-sectors-management-buttons');
                if (managementButtons) {
                    managementButtons.classList.add('hidden');
                }
                renderModifyDeleteZoneSectorForm(zonesSectorsSubSection, showZonesSectorsMainButtons);
            });
        }

        if (btnBack) {
            btnBack.addEventListener('click', showClientesMainButtons);
        }
        console.log('renderGestionarZonasSectoresForm: Finalizado.');
    }

    async function renderAddZoneSectorFormForManagement(parentContainer, backToMainMenuCallback) {
        console.log('renderAddZoneSectorFormForManagement: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-4 bg-blue-50 rounded-lg shadow-inner">
                <h4 class="text-xl font-semibold text-blue-800 mb-3">Añadir Zona o Sector</h4>

                <div class="mb-4">
                    <label for="add-new-zone-input" class="block text-sm font-medium text-gray-700 mb-1">Añadir Nueva Zona:</label>
                    <input type="text" id="add-new-zone-input" placeholder="Nombre de la nueva Zona" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <button id="btn-add-new-zone" class="mt-2 w-full bg-blue-600 text-white p-2 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                        Añadir Zona
                    </button>
                </div>

                <div class="mb-4">
                    <label for="select-zone-for-sector" class="block text-sm font-medium text-gray-700 mb-1">Seleccionar Zona para Añadir Sector:</label>
                    <select id="select-zone-for-sector" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Selecciona una Zona --</option>
                        ${Object.keys(zonaSectorMap).map(zona => `<option value="${zona}">${zona}</option>`).join('')}
                    </select>
                    <input type="text" id="add-new-sector-input" placeholder="Nombre del nuevo Sector" class="mt-2 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled>
                    <button id="btn-add-new-sector" class="mt-2 w-full bg-blue-600 text-white p-2 rounded-md font-semibold hover:bg-blue-700 transition duration-200" disabled>
                        Añadir Sector
                    </button>
                </div>

                <button id="btn-back-from-add-form" class="mt-4 w-full bg-gray-400 text-white p-2 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const addNewZoneInput = parentContainer.querySelector('#add-new-zone-input');
        const btnAddNewZone = parentContainer.querySelector('#btn-add-new-zone');
        const selectZoneForSector = parentContainer.querySelector('#select-zone-for-sector');
        const addNewSectorInput = parentContainer.querySelector('#add-new-sector-input');
        const btnAddNewSector = parentContainer.querySelector('#btn-add-new-sector');
        const btnBack = parentContainer.querySelector('#btn-back-from-add-form');

        if (btnAddNewZone) {
            btnAddNewZone.addEventListener('click', async () => {
                const newZona = addNewZoneInput.value.trim();
                if (newZona) {
                    if (!zonaSectorMap[newZona]) {
                        zonaSectorMap[newZona] = [];
                        if (await guardarConfiguracionZonasSectores(zonaSectorMap)) {
                            showCustomAlert(`Zona "${newZona}" añadida.`);
                            addNewZoneInput.value = '';
                            if (selectZoneForSector) {
                                selectZoneForSector.innerHTML = `<option value="">-- Selecciona una Zona --</option>` + Object.keys(zonaSectorMap).map(zona => `<option value="${zona}">${zona}</option>`).join('');
                            }
                        } else {
                            showCustomAlert('Fallo al añadir zona.');
                        }
                    } else {
                        showCustomAlert(`La zona "${newZona}" ya existe.`);
                    }
                } else {
                    showCustomAlert('Por favor, ingresa un nombre para la nueva zona.');
                }
            });
        }

        if (selectZoneForSector) {
            selectZoneForSector.addEventListener('change', () => {
                const selectedZone = selectZoneForSector.value;
                if (selectedZone) {
                    if (addNewSectorInput) addNewSectorInput.disabled = false;
                    if (btnAddNewSector) btnAddNewSector.disabled = false;
                } else {
                    if (addNewSectorInput) addNewSectorInput.disabled = true;
                    if (btnAddNewSector) btnAddNewSector.disabled = true;
                }
            });
        }

        if (btnAddNewSector) {
            btnAddNewSector.addEventListener('click', async () => {
                const selectedZone = selectZoneForSector?.value;
                const newSector = addNewSectorInput?.value.trim();
                if (selectedZone && newSector) {
                    if (zonaSectorMap[selectedZone] && !zonaSectorMap[selectedZone].includes(newSector)) {
                        zonaSectorMap[selectedZone].push(newSector);
                        if (await guardarConfiguracionZonasSectores(zonaSectorMap)) {
                            showCustomAlert(`Sector "${newSector}" añadido a "${selectedZone}".`);
                            if (addNewSectorInput) addNewSectorInput.value = '';
                        } else {
                            showCustomAlert('Fallo al añadir sector.');
                        }
                    } else if (zonaSectorMap[selectedZone] && zonaSectorMap[selectedZone].includes(newSector)) {
                        showCustomAlert(`El sector "${newSector}" ya existe en "${selectedZone}".`);
                    } else {
                        showCustomAlert('Por favor, selecciona una zona válida.');
                    }
                } else {
                    showCustomAlert('Por favor, selecciona una zona e ingresa un nombre para el nuevo sector.');
                }
            });
        }

        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderAddZoneSectorFormForManagement: Finalizado.');
    }

    async function renderModifyDeleteZoneSectorForm(parentContainer, backToMainMenuCallback) {
        console.log('renderModifyDeleteZoneSectorForm: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-4 bg-yellow-50 rounded-lg shadow-inner">
                <h4 class="text-xl font-semibold text-yellow-800 mb-3">Eliminar Zona o Sector</h4>

                <input type="text" id="search-zone-sector-input" placeholder="Buscar Zona o Sector..." class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4">

                <div id="zone-sector-list-container" class="max-h-60 overflow-y-auto bg-white p-3 rounded-md border border-gray-200">
                    <p class="text-gray-500">Cargando zonas y sectores...</p>
                </div>

                <button id="btn-back-from-modify-delete-form" class="mt-4 w-full bg-gray-400 text-white p-2 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const searchInput = parentContainer.querySelector('#search-zone-sector-input');
        const listContainer = parentContainer.querySelector('#zone-sector-list-container');
        const btnBack = parentContainer.querySelector('#btn-back-from-modify-delete-form');

        const renderList = (filteredMap) => {
            listContainer.innerHTML = '';
            if (Object.keys(filteredMap).length === 0) {
                listContainer.innerHTML = '<p class="text-gray-500">No hay resultados.</p>';
                return;
            }

            for (const zona in filteredMap) {
                const zonaDiv = document.createElement('div');
                zonaDiv.className = 'mb-4 p-3 border border-gray-300 rounded-md bg-gray-50';
                zonaDiv.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <h5 class="font-bold text-lg text-gray-800">${zona}</h5>
                        <button class="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 delete-zona-btn" data-zona="${zona}">Eliminar Zona</button>
                    </div>
                    <ul class="list-disc pl-5 text-gray-700">
                        ${filteredMap[zona].map(sector => `
                            <li class="flex justify-between items-center py-1">
                                <span>${sector}</span>
                                <button class="bg-red-400 text-white px-2 py-0.5 rounded-md text-xs hover:bg-red-500 delete-sector-btn" data-zona="${zona}" data-sector="${sector}">Eliminar</button>
                            </li>
                        `).join('')}
                    </ul>
                `;
                listContainer.appendChild(zonaDiv);
            }

            listContainer.querySelectorAll('.delete-zona-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const zonaToDelete = event.target.dataset.zona;
                    const confirmado = await showCustomConfirm(`¿Estás seguro de que quieres eliminar la zona "${zonaToDelete}" y todos sus sectores?`);
                    if (confirmado) {
                        delete zonaSectorMap[zonaToDelete];
                        await guardarConfiguracionZonasSectores(zonaSectorMap);
                        renderList(zonaSectorMap);
                        showCustomAlert(`Zona "${zonaToDelete}" eliminada.`);
                    }
                });
            });

            listContainer.querySelectorAll('.delete-sector-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const zona = event.target.dataset.zona;
                    const sectorToDelete = event.target.dataset.sector;
                    const confirmado = await showCustomConfirm(`¿Estás seguro de que quieres eliminar el sector "${sectorToDelete}" de "${zona}"?`);
                    if (confirmado) {
                        zonaSectorMap[zona] = zonaSectorMap[zona].filter(s => s !== sectorToDelete);
                        await guardarConfiguracionZonasSectores(zonaSectorMap);
                        renderList(zonaSectorMap);
                        showCustomAlert(`Sector "${sectorToDelete}" eliminado de "${zona}".`);
                    }
                });
            });
        };

        renderList(zonaSectorMap);

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();
                const filteredMap = {};
                for (const zona in zonaSectorMap) {
                    if (zona.toLowerCase().includes(searchTerm)) {
                        filteredMap[zona] = zonaSectorMap[zona];
                    } else {
                        const matchingSectors = zonaSectorMap[zona].filter(sector => sector.toLowerCase().includes(searchTerm));
                        if (matchingSectors.length > 0) {
                            filteredMap[zona] = matchingSectors;
                        }
                    }
                }
                renderList(filteredMap);
            });
        }

        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderModifyDeleteZoneSectorForm: Finalizado.');
    }
    console.log('renderClientesSection: Función completada.');
}
