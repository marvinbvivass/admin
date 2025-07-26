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
        // Podrías lanzar un error o mostrar un mensaje al usuario aquí
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
            // Aumentar z-index para asegurar que esté por encima de todo
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
        // Usar setTimeout para asegurar que el modal se muestre después de que el DOM esté listo
        setTimeout(() => {
            modal.classList.remove('hidden');
        }, 50); // Pequeño retraso

        const yesBtn = modal.querySelector('#confirm-yes-btn');
        const noBtn = modal.querySelector('#confirm-no-btn');

        // Limpiar listeners previos para evitar duplicados si el modal se reutiliza
        const oldYesBtn = yesBtn.cloneNode(true);
        const oldNoBtn = noBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(oldYesBtn, yesBtn);
        noBtn.parentNode.replaceChild(oldNoBtn, noBtn);

        const newYesBtn = document.getElementById('confirm-yes-btn');
        const newNoBtn = document.getElementById('confirm-no-btn');


        const cleanup = () => {
            if (modal && modal.parentNode) { // Verificar si el modal todavía está en el DOM
                modal.remove(); // Eliminar el modal del DOM
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
        // Aumentar z-index para asegurar que esté por encima de todo
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
    // Usar setTimeout para asegurar que el modal se muestre después de que el DOM esté listo
    setTimeout(() => {
        modal.classList.remove('hidden');
    }, 50); // Pequeño retraso

    const okBtn = modal.querySelector('#alert-ok-btn');
    // Clonar y reemplazar el botón para limpiar listeners previos
    const oldOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(oldOkBtn, okBtn);
    const newOkBtn = document.getElementById('alert-ok-btn');

    const cleanup = () => {
        if (modal && modal.parentNode) { // Verificar si el modal todavía está en el DOM
            modal.remove(); // Eliminar el modal del DOM
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
        // Las configuraciones ahora están en la raíz de la colección 'configuracion'
        const configDocRef = doc(db, `configuracion`, ZONA_SECTOR_CONFIG_DOC_ID);
        const configSnap = await getDoc(configDocRef);

        if (configSnap.exists()) {
            console.log('Configuración de zonas y sectores obtenida:', configSnap.data().mapa);
            return configSnap.data().mapa || {};
        } else {
            console.log('No se encontró configuración de zonas y sectores. Usando mapa predeterminado.');
            // Si no existe, inicializa con un mapa predeterminado o vacío
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
        // En caso de error, devuelve un mapa vacío para evitar que la app falle.
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

// --- Funciones CRUD de Clientes (Placeholders por ahora) ---
export async function agregarCliente(cliente) {
    console.log('agregarCliente: (Placeholder) Cliente a agregar:', cliente);
    showCustomAlert('Funcionalidad "Agregar Cliente" en construcción.');
    return null;
}

export async function modificarCliente(idCliente, nuevosDatos) {
    console.log('modificarCliente: (Placeholder) ID:', idCliente, 'Nuevos datos:', nuevosDatos);
    showCustomAlert('Funcionalidad "Modificar Cliente" en construcción.');
    return false;
}

export async function eliminarCliente(idCliente) {
    console.log('eliminarCliente: (Placeholder) ID:', idCliente);
    showCustomAlert('Funcionalidad "Eliminar Cliente" en construcción.');
    return false;
}

export async function obtenerCliente(idCliente) {
    console.log('obtenerCliente: (Placeholder) ID:', idCliente);
    showCustomAlert('Funcionalidad "Obtener Cliente" en construcción.');
    return null;
}

export async function obtenerTodosLosClientes() {
    console.log('obtenerTodosLosClientes: (Placeholder) Obteniendo todos los clientes...');
    showCustomAlert('Funcionalidad "Ver Lista de Clientes" en construcción.');
    return [];
}


/**
 * Renderiza la interfaz de usuario de la sección de clientes dentro del contenedor dado.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal de clientes.
 */
export async function renderClientesSection(container) {
    console.log('renderClientesSection: Iniciando. Contenedor recibido:', container);
    if (!container) {
        console.error('renderClientesSection: ERROR - El elemento contenedor es nulo o indefinido.');
        return; // Detener la ejecución si no hay contenedor
    }

    container.innerHTML = `
        <div class="modal-content">
            <h2 class="text-4xl font-bold text-gray-900 mb-6 text-center">Gestión de Clientes</h2>

            <div id="clientes-main-buttons-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <button id="btn-show-add-cliente" class="bg-blue-600 text-white p-4 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                    Agregar Cliente
                </button>
                <button id="btn-show-modify-delete-cliente" class="bg-yellow-600 text-white p-4 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                    Modificar/Eliminar Cliente
                </button>
                <button id="btn-show-ver-clientes" class="bg-green-600 text-white p-4 rounded-md font-semibold hover:bg-green-700 transition duration-200">
                    Ver Lista de Clientes
                </button>
                <button id="btn-show-manage-zones-sectors" class="bg-purple-600 text-white p-4 rounded-md font-semibold hover:bg-purple-700 transition duration-200 col-span-full">
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
    // Obtener referencias a los elementos del DOM después de que se hayan renderizado
    const clientesMainButtonsContainer = container.querySelector('#clientes-main-buttons-container');
    const clientesSubSection = container.querySelector('#clientes-sub-section');
    const closeClientesModalBtn = container.querySelector('#close-clientes-modal');

    // Referencias a los botones principales
    const btnShowAddCliente = container.querySelector('#btn-show-add-cliente');
    const btnShowModifyDeleteCliente = container.querySelector('#btn-show-modify-delete-cliente');
    const btnShowVerClientes = container.querySelector('#btn-show-ver-clientes');
    const btnShowManageZonesSectors = container.querySelector('#btn-show-manage-zones-sectors');

    console.log('renderClientesSection: Llamando a obtenerConfiguracionZonasSectores...');
    // Cargar el mapa de zonas y sectores al inicio de la sección de clientes
    zonaSectorMap = await obtenerConfiguracionZonasSectores();
    console.log('renderClientesSection: obtenerConfiguracionZonasSectores completado. zonaSectorMap:', zonaSectorMap);


    // Función para mostrar los botones principales y limpiar la sub-sección
    function showClientesMainButtons() {
        clientesSubSection.innerHTML = ''; // Limpia el contenido de la sub-sección
        clientesMainButtonsContainer.classList.remove('hidden'); // Muestra los botones principales
    }

    // Lógica para cerrar el modal
    if (closeClientesModalBtn) {
        closeClientesModalBtn.addEventListener('click', () => {
            container.classList.add('hidden'); // Oculta el modal
            showClientesMainButtons(); // Vuelve a la vista de botones principales al cerrar
        });
    } else {
        console.error('renderClientesSection: Botón #close-clientes-modal no encontrado.');
    }


    // Lógica para mostrar la sección de agregar cliente (placeholder)
    if (btnShowAddCliente) {
        btnShowAddCliente.addEventListener('click', () => {
            clientesMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
            showCustomAlert('Funcionalidad "Agregar Cliente" en construcción.');
            // renderAddClienteForm(clientesSubSection, showClientesMainButtons); // Descomentar cuando se implemente
        });
    } else {
        console.error('renderClientesSection: Botón #btn-show-add-cliente no encontrado.');
    }


    // Lógica para mostrar la sección de modificar/eliminar cliente (placeholder)
    if (btnShowModifyDeleteCliente) {
        btnShowModifyDeleteCliente.addEventListener('click', () => {
            clientesMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
            showCustomAlert('Funcionalidad "Modificar/Eliminar Cliente" en construcción.');
            // showModifyDeleteSearch(); // Descomentar cuando se implemente
        });
    } else {
        console.error('renderClientesSection: Botón #btn-show-modify-delete-cliente no encontrado.');
    }


    // Lógica para mostrar la sección de ver clientes (placeholder)
    if (btnShowVerClientes) {
        btnShowVerClientes.addEventListener('click', async () => {
            clientesMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
            showCustomAlert('Funcionalidad "Ver Lista de Clientes" en construcción.');
            // await renderVerClientesSection(clientesSubSection, showClientesMainButtons); // Descomentar cuando se implemente
        });
    } else {
        console.error('renderClientesSection: Botón #btn-show-ver-clientes no encontrado.');
    }


    // Lógica para mostrar la sección de gestionar zonas y sectores
    if (btnShowManageZonesSectors) {
        btnShowManageZonesSectors.addEventListener('click', async () => {
            clientesMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
            await renderGestionarZonasSectoresForm(); // Llama a la nueva función para gestionar zonas/sectores
        });
    } else {
        console.error('renderClientesSection: Botón #btn-show-manage-zones-sectors no encontrado.');
    }


    // --- Funciones para gestionar Zonas y Sectores ---

    // Función principal para el menú de gestión de Zonas y Sectores
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
                        Modificar o Eliminar Zona o Sector
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

        // Función para mostrar los botones principales de gestión de zonas/sectores
        const showZonesSectorsMainButtons = () => {
            zonesSectorsSubSection.innerHTML = ''; // Limpiar el contenido de la sub-sección
            const managementButtons = clientesSubSection.querySelector('#zones-sectors-management-buttons');
            if (managementButtons) {
                managementButtons.classList.remove('hidden'); // Mostrar los botones principales
            } else {
                console.error('showZonesSectorsMainButtons: Contenedor de botones de gestión no encontrado.');
            }
        };

        // Event Listeners para los botones del menú de gestión de zonas/sectores
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                const managementButtons = clientesSubSection.querySelector('#zones-sectors-management-buttons');
                if (managementButtons) {
                    managementButtons.classList.add('hidden'); // Oculta los botones del menú
                }
                renderAddZoneSectorForm(zonesSectorsSubSection, showZonesSectorsMainButtons);
            });
        } else {
            console.error('renderGestionarZonasSectoresForm: Botón #btn-add-zone-sector no encontrado.');
        }

        if (btnModifyDelete) {
            btnModifyDelete.addEventListener('click', () => {
                const managementButtons = clientesSubSection.querySelector('#zones-sectors-management-buttons');
                if (managementButtons) {
                    managementButtons.classList.add('hidden'); // Oculta los botones del menú
                }
                renderModifyDeleteZoneSectorForm(zonesSectorsSubSection, showZonesSectorsMainButtons);
            });
        } else {
            console.error('renderGestionarZonasSectoresForm: Botón #btn-modify-delete-zone-sector no encontrado.');
        }

        if (btnBack) {
            btnBack.addEventListener('click', showClientesMainButtons); // Vuelve al menú principal de clientes
        } else {
            console.error('renderGestionarZonasSectoresForm: Botón #btn-back-from-zones-sectors-management no encontrado.');
        }
        console.log('renderGestionarZonasSectoresForm: Finalizado.');
    }

    // Función para renderizar el formulario de añadir Zona o Sector
    async function renderAddZoneSectorForm(parentContainer, backToMainMenuCallback) {
        console.log('renderAddZoneSectorForm: Iniciando...');
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

        // Lógica para añadir nueva zona
        if (btnAddNewZone) {
            btnAddNewZone.addEventListener('click', async () => {
                const newZona = addNewZoneInput.value.trim();
                if (newZona) {
                    if (!zonaSectorMap[newZona]) {
                        zonaSectorMap[newZona] = []; // Inicializa la nueva zona con un array vacío de sectores
                        if (await guardarConfiguracionZonasSectores(zonaSectorMap)) {
                            showCustomAlert(`Zona "${newZona}" añadida.`);
                            addNewZoneInput.value = '';
                            // Re-poblar el select de zonas para sectores
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
        } else {
            console.error('renderAddZoneSectorForm: Botón #btn-add-new-zone no encontrado.');
        }


        // Habilitar/deshabilitar input de sector basado en la selección de zona
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
        } else {
            console.error('renderAddZoneSectorForm: Select #select-zone-for-sector no encontrado.');
        }


        // Lógica para añadir nuevo sector
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
                        showCustomAlert('Por favor, selecciona una zona válida.'); // Zona no encontrada en el mapa
                    }
                } else {
                    showCustomAlert('Por favor, selecciona una zona e ingresa un nombre para el nuevo sector.');
                }
            });
        } else {
            console.error('renderAddZoneSectorForm: Botón #btn-add-new-sector no encontrado.');
        }


        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        } else {
            console.error('renderAddZoneSectorForm: Botón #btn-back-from-add-form no encontrado.');
        }
        console.log('renderAddZoneSectorForm: Finalizado.');
    }

    // Función para renderizar el formulario de modificar/eliminar Zona o Sector
    async function renderModifyDeleteZoneSectorForm(parentContainer, backToMainMenuCallback) {
        console.log('renderModifyDeleteZoneSectorForm: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-4 bg-yellow-50 rounded-lg shadow-inner">
                <h4 class="text-xl font-semibold text-yellow-800 mb-3">Modificar o Eliminar Zona o Sector</h4>

                <input type="text" id="search-zone-sector-input" placeholder="Buscar Zona o Sector..." class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4">

                <div id="zone-sector-list-container" class="max-h-60 overflow-y-auto bg-white p-3 rounded-md border border-gray-200">
                    <!-- Las zonas y sectores se cargarán aquí -->
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

        // Función interna para renderizar la lista de zonas y sectores con opciones de eliminar
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

            // Añadir event listeners para eliminar zonas
            listContainer.querySelectorAll('.delete-zona-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const zonaToDelete = event.target.dataset.zona;
                    const confirmado = await showCustomConfirm(`¿Estás seguro de que quieres eliminar la zona "${zonaToDelete}" y todos sus sectores?`);
                    if (confirmado) {
                        delete zonaSectorMap[zonaToDelete];
                        await guardarConfiguracionZonasSectores(zonaSectorMap);
                        renderList(zonaSectorMap); // Re-renderizar la lista con el mapa actualizado
                        showCustomAlert(`Zona "${zonaToDelete}" eliminada.`);
                    }
                });
            });

            // Añadir event listeners para eliminar sectores
            listContainer.querySelectorAll('.delete-sector-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const zona = event.target.dataset.zona;
                    const sectorToDelete = event.target.dataset.sector;
                    const confirmado = await showCustomConfirm(`¿Estás seguro de que quieres eliminar el sector "${sectorToDelete}" de "${zona}"?`);
                    if (confirmado) {
                        zonaSectorMap[zona] = zonaSectorMap[zona].filter(s => s !== sectorToDelete);
                        await guardarConfiguracionZonasSectores(zonaSectorMap);
                        renderList(zonaSectorMap); // Re-renderizar la lista con el mapa actualizado
                        showCustomAlert(`Sector "${sectorToDelete}" eliminado de "${zona}".`);
                    }
                });
            });
        };

        // Renderizado inicial
        renderList(zonaSectorMap);

        // Funcionalidad de búsqueda
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
        } else {
            console.error('renderModifyDeleteZoneSectorForm: Input #search-zone-sector-input no encontrado.');
        }


        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        } else {
            console.error('renderModifyDeleteZoneSectorForm: Botón #btn-back-from-modify-delete-form no encontrado.');
        }
        console.log('renderModifyDeleteZoneSectorForm: Finalizado.');
    }
    console.log('renderClientesSection: Función completada.');
}
