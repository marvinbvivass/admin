// inventario.js
// Este archivo gestiona las operaciones CRUD para el inventario de productos
// y también se encarga de renderizar su interfaz de usuario.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Variable para almacenar el mapa de rubros a segmentos, cargado desde Firebase
let rubroSegmentoMap = {};
const RUBRO_SEGMENTO_CONFIG_DOC_ID = 'rubrosSegmentos'; // ID fijo para el documento de configuración

// Función auxiliar para obtener la instancia de Firestore
async function getFirestoreInstances() {
    let attempts = 0;
    const maxAttempts = 50; // Intentar por 5 segundos (50 * 100ms)
    while (!window.firebaseDb && attempts < maxAttempts) {
        console.log(`Esperando inicialización de Firebase en inventario.js... Intento ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    if (!window.firebaseDb) {
        console.error('ERROR: Firebase DB no inicializado después de múltiples intentos en inventario.js.');
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
 * Obtiene la configuración de rubros y segmentos desde Firebase.
 * @returns {Promise<object>} El mapa de rubros a segmentos.
 */
async function obtenerConfiguracionRubrosSegmentos() {
    console.log('obtenerConfiguracionRubrosSegmentos: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        // Las configuraciones están en la colección 'configuracion'
        const configDocRef = doc(db, `configuracion`, RUBRO_SEGMENTO_CONFIG_DOC_ID);
        const configSnap = await getDoc(configDocRef);

        if (configSnap.exists()) {
            console.log('Configuración de rubros y segmentos obtenida:', configSnap.data().mapa);
            return configSnap.data().mapa || {};
        } else {
            console.log('No se encontró configuración de rubros y segmentos. Usando mapa vacío.');
            return {}; // Retorna un mapa vacío si no hay configuración
        }
    } catch (error) {
        console.error('Error al obtener configuración de rubros y segmentos:', error);
        return {};
    } finally {
        console.log('obtenerConfiguracionRubrosSegmentos: Finalizado.');
    }
}

/**
 * Guarda la configuración de rubros y segmentos en Firebase.
 * @param {object} newMap - El nuevo mapa de rubros a segmentos a guardar.
 * @returns {Promise<boolean>} True si se guardó con éxito, false en caso contrario.
 */
async function guardarConfiguracionRubrosSegmentos(newMap) {
    console.log('guardarConfiguracionRubrosSegmentos: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        const configDocRef = doc(db, `configuracion`, RUBRO_SEGMENTO_CONFIG_DOC_ID);
        await setDoc(configDocRef, { mapa: newMap }); // Usa setDoc para sobrescribir o crear
        console.log('Configuración de rubros y segmentos guardada con éxito.');
        rubroSegmentoMap = newMap; // Actualiza la variable global
        return true;
    } catch (error) {
        console.error('Error al guardar configuración de rubros y segmentos:', error);
        return false;
    } finally {
        console.log('guardarConfiguracionRubrosSegmentos: Finalizado.');
    }
}

// --- Funciones CRUD de Inventario (Placeholders por ahora) ---
export async function agregarProducto(producto) {
    console.log('agregarProducto: (Placeholder) Producto a agregar:', producto);
    showCustomAlert('Funcionalidad "Agregar Producto" en construcción.');
    return null;
}

export async function modificarProducto(idProducto, nuevosDatos) {
    console.log('modificarProducto: (Placeholder) ID:', idProducto, 'Nuevos datos:', nuevosDatos);
    showCustomAlert('Funcionalidad "Modificar Producto" en construcción.');
    return false;
}

export async function eliminarProducto(idProducto) {
    console.log('eliminarProducto: (Placeholder) ID:', idProducto);
    showCustomAlert('Funcionalidad "Eliminar Producto" en construcción.');
    return false;
}

export async function verInventarioCompleto() {
    console.log('verInventarioCompleto: (Placeholder) Obteniendo inventario completo...');
    // Retorna un array vacío por ahora, ya que la funcionalidad real no está implementada.
    // Esto es para evitar errores en otras secciones que puedan llamarla (ej. Precios).
    return [];
}


/**
 * Renderiza la interfaz de usuario de la sección de inventario dentro del contenedor dado.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal de inventario.
 * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de la aplicación.
 */
export async function renderInventarioSection(container, backToMainMenuCallback) {
    console.log('renderInventarioSection: Iniciando. Contenedor recibido:', container);
    if (!container) {
        console.error('renderInventarioSection: ERROR - El elemento contenedor es nulo o indefinido.');
        return;
    }

    container.innerHTML = `
        <div class="modal-content">
            <h2 class="text-4xl font-bold text-gray-900 mb-6 text-center">Gestión de Inventario</h2>

            <div id="inventario-main-buttons-container" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <button id="btn-gestion-rubro-segmento" class="bg-indigo-600 text-white p-4 rounded-md font-semibold hover:bg-indigo-700 transition duration-200">
                    Gestión Rubro/Segmento
                </button>
                <!-- Otros botones de inventario se añadirán aquí en el futuro -->
            </div>

            <!-- Contenedor para las sub-secciones dinámicas -->
            <div id="inventario-sub-section" class="mt-8">
                <!-- El contenido de las sub-secciones se cargará aquí -->
            </div>

            <button id="btn-back-inventario" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                Volver al Menú Principal
            </button>

            <!-- Botón para cerrar el modal -->
            <button id="close-inventario-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    console.log('renderInventarioSection: HTML inyectado en el contenedor.');
    const inventarioMainButtonsContainer = container.querySelector('#inventario-main-buttons-container');
    const inventarioSubSection = container.querySelector('#inventario-sub-section');
    const btnBack = container.querySelector('#btn-back-inventario');
    const closeInventarioModalBtn = container.querySelector('#close-inventario-modal');

    const btnGestionRubroSegmento = container.querySelector('#btn-gestion-rubro-segmento');

    // Cargar el mapa de rubros y segmentos al inicio de la sección de inventario
    rubroSegmentoMap = await obtenerConfiguracionRubrosSegmentos();
    console.log('renderInventarioSection: obtenerConfiguracionRubrosSegmentos completado. rubroSegmentoMap:', rubroSegmentoMap);

    // Función para mostrar los botones principales y limpiar la sub-sección
    function showInventarioMainButtons() {
        inventarioSubSection.innerHTML = '';
        inventarioMainButtonsContainer.classList.remove('hidden');
    }

    // Lógica para cerrar el modal
    if (closeInventarioModalBtn) {
        closeInventarioModalBtn.addEventListener('click', () => {
            console.log('Cerrar modal de Inventario clickeado. Volviendo al menú principal de la aplicación.');
            container.classList.add('hidden');
            backToMainMenuCallback();
        });
    }

    // Lógica para el botón "Volver al Menú Principal"
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            console.log('Botón "Volver al Menú Principal" clickeado en Inventario. Volviendo al menú principal de la aplicación.');
            container.classList.add('hidden');
            backToMainMenuCallback();
        });
    }

    // Lógica para mostrar la sección de Gestión Rubro/Segmento
    if (btnGestionRubroSegmento) {
        btnGestionRubroSegmento.addEventListener('click', async () => {
            console.log('Botón "Gestión Rubro/Segmento" clickeado.');
            inventarioMainButtonsContainer.classList.add('hidden');
            await renderGestionRubroSegmentoForm(inventarioSubSection, showInventarioMainButtons);
        });
    }

    // --- Funciones para gestionar Rubros y Segmentos ---

    /**
     * Renderiza el menú principal para la gestión de Rubros y Segmentos.
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará el menú.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de inventario.
     */
    async function renderGestionRubroSegmentoForm(parentContainer, backToMainMenuCallback) {
        console.log('renderGestionRubroSegmentoForm: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-6 bg-indigo-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-indigo-800 mb-4">Gestión de Rubros y Segmentos</h3>

                <div id="rubro-segmento-management-buttons" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <button id="btn-add-rubro-segmento" class="bg-blue-600 text-white p-4 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                        Crear Nuevo Rubro o Segmento
                    </button>
                    <button id="btn-modify-delete-rubro-segmento" class="bg-yellow-600 text-white p-4 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                        Modificar o Eliminar Rubro o Segmento
                    </button>
                </div>

                <div id="rubro-segmento-sub-section">
                    <!-- El contenido de añadir o modificar/eliminar se cargará aquí -->
                </div>

                <button id="btn-back-from-rubro-segmento-management" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver al Menú Principal de Inventario
                </button>
            </div>
        `;

        const rubroSegmentoSubSection = parentContainer.querySelector('#rubro-segmento-sub-section');
        const btnBack = parentContainer.querySelector('#btn-back-from-rubro-segmento-management');
        const btnAdd = parentContainer.querySelector('#btn-add-rubro-segmento');
        const btnModifyDelete = parentContainer.querySelector('#btn-modify-delete-rubro-segmento');

        // Función para mostrar los botones principales de gestión de rubros/segmentos
        const showRubroSegmentoMainButtons = () => {
            rubroSegmentoSubSection.innerHTML = '';
            const managementButtons = parentContainer.querySelector('#rubro-segmento-management-buttons');
            if (managementButtons) {
                managementButtons.classList.remove('hidden');
            }
        };

        // Event Listeners para los botones del menú de gestión de rubros/segmentos
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                const managementButtons = parentContainer.querySelector('#rubro-segmento-management-buttons');
                if (managementButtons) {
                    managementButtons.classList.add('hidden');
                }
                renderAddRubroSegmentoForm(rubroSegmentoSubSection, showRubroSegmentoMainButtons);
            });
        }

        if (btnModifyDelete) {
            btnModifyDelete.addEventListener('click', () => {
                const managementButtons = parentContainer.querySelector('#rubro-segmento-management-buttons');
                if (managementButtons) {
                    managementButtons.classList.add('hidden');
                }
                renderModifyDeleteRubroSegmentoForm(rubroSegmentoSubSection, showRubroSegmentoMainButtons);
            });
        }

        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderGestionRubroSegmentoForm: Finalizado.');
    }

    /**
     * Renderiza el formulario para añadir un nuevo Rubro o Segmento.
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará el formulario.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de gestión de rubros/segmentos.
     */
    async function renderAddRubroSegmentoForm(parentContainer, backToMainMenuCallback) {
        console.log('renderAddRubroSegmentoForm: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-4 bg-blue-50 rounded-lg shadow-inner">
                <h4 class="text-xl font-semibold text-blue-800 mb-3">Añadir Nuevo Rubro o Segmento</h4>

                <div class="mb-4">
                    <label for="add-new-rubro-input" class="block text-sm font-medium text-gray-700 mb-1">Añadir Nuevo Rubro:</label>
                    <input type="text" id="add-new-rubro-input" placeholder="Nombre del nuevo Rubro" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <button id="btn-add-new-rubro" class="mt-2 w-full bg-blue-600 text-white p-2 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                        Añadir Rubro
                    </button>
                </div>

                <div class="mb-4">
                    <label for="select-rubro-for-segmento" class="block text-sm font-medium text-gray-700 mb-1">Seleccionar Rubro para Añadir Segmento:</label>
                    <select id="select-rubro-for-segmento" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Selecciona un Rubro --</option>
                        ${Object.keys(rubroSegmentoMap).map(rubro => `<option value="${rubro}">${rubro}</option>`).join('')}
                    </select>
                    <input type="text" id="add-new-segmento-input" placeholder="Nombre del nuevo Segmento" class="mt-2 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled>
                    <button id="btn-add-new-segmento" class="mt-2 w-full bg-blue-600 text-white p-2 rounded-md font-semibold hover:bg-blue-700 transition duration-200" disabled>
                        Añadir Segmento
                    </button>
                </div>

                <button id="btn-back-from-add-form" class="mt-4 w-full bg-gray-400 text-white p-2 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const addNewRubroInput = parentContainer.querySelector('#add-new-rubro-input');
        const btnAddNewRubro = parentContainer.querySelector('#btn-add-new-rubro');
        const selectRubroForSegmento = parentContainer.querySelector('#select-rubro-for-segmento');
        const addNewSegmentoInput = parentContainer.querySelector('#add-new-segmento-input');
        const btnAddNewSegmento = parentContainer.querySelector('#btn-add-new-segmento');
        const btnBack = parentContainer.querySelector('#btn-back-from-add-form');

        // Lógica para añadir nuevo rubro
        if (btnAddNewRubro) {
            btnAddNewRubro.addEventListener('click', async () => {
                const newRubro = addNewRubroInput.value.trim();
                if (newRubro) {
                    if (!rubroSegmentoMap[newRubro]) {
                        rubroSegmentoMap[newRubro] = []; // Inicializa el nuevo rubro con un array vacío de segmentos
                        if (await guardarConfiguracionRubrosSegmentos(rubroSegmentoMap)) {
                            showCustomAlert(`Rubro "${newRubro}" añadido.`);
                            addNewRubroInput.value = '';
                            // Re-poblar el select de rubros para segmentos
                            if (selectRubroForSegmento) {
                                selectRubroForSegmento.innerHTML = `<option value="">-- Selecciona un Rubro --</option>` + Object.keys(rubroSegmentoMap).map(rubro => `<option value="${rubro}">${rubro}</option>`).join('');
                            }
                        } else {
                            showCustomAlert('Fallo al añadir rubro.');
                        }
                    } else {
                        showCustomAlert(`El rubro "${newRubro}" ya existe.`);
                    }
                } else {
                    showCustomAlert('Por favor, ingresa un nombre para el nuevo rubro.');
                }
            });
        }

        // Habilitar/deshabilitar input de segmento basado en la selección de rubro
        if (selectRubroForSegmento) {
            selectRubroForSegmento.addEventListener('change', () => {
                const selectedRubro = selectRubroForSegmento.value;
                if (selectedRubro) {
                    if (addNewSegmentoInput) addNewSegmentoInput.disabled = false;
                    if (btnAddNewSegmento) btnAddNewSegmento.disabled = false;
                } else {
                    if (addNewSegmentoInput) addNewSegmentoInput.disabled = true;
                    if (btnAddNewSegmento) btnAddNewSegmento.disabled = true;
                }
            });
        }

        // Lógica para añadir nuevo segmento
        if (btnAddNewSegmento) {
            btnAddNewSegmento.addEventListener('click', async () => {
                const selectedRubro = selectRubroForSegmento?.value;
                const newSegmento = addNewSegmentoInput?.value.trim();
                if (selectedRubro && newSegmento) {
                    if (rubroSegmentoMap[selectedRubro] && !rubroSegmentoMap[selectedRubro].includes(newSegmento)) {
                        rubroSegmentoMap[selectedRubro].push(newSegmento);
                        if (await guardarConfiguracionRubrosSegmentos(rubroSegmentoMap)) {
                            showCustomAlert(`Segmento "${newSegmento}" añadido a "${selectedRubro}".`);
                            if (addNewSegmentoInput) addNewSegmentoInput.value = '';
                        } else {
                            showCustomAlert('Fallo al añadir segmento.');
                        }
                    } else if (rubroSegmentoMap[selectedRubro] && rubroSegmentoMap[selectedRubro].includes(newSegmento)) {
                        showCustomAlert(`El segmento "${newSegmento}" ya existe en "${selectedRubro}".`);
                    } else {
                        showCustomAlert('Por favor, selecciona un rubro válido.');
                    }
                } else {
                    showCustomAlert('Por favor, selecciona un rubro e ingresa un nombre para el nuevo segmento.');
                }
            });
        }

        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderAddRubroSegmentoForm: Finalizado.');
    }

    /**
     * Renderiza el formulario para modificar o eliminar Rubros y Segmentos.
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará el formulario.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de gestión de rubros/segmentos.
     */
    async function renderModifyDeleteRubroSegmentoForm(parentContainer, backToMainMenuCallback) {
        console.log('renderModifyDeleteRubroSegmentoForm: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-4 bg-yellow-50 rounded-lg shadow-inner">
                <h4 class="text-xl font-semibold text-yellow-800 mb-3">Modificar o Eliminar Rubro o Segmento</h4>

                <input type="text" id="search-rubro-segmento-input" placeholder="Buscar Rubro o Segmento..." class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4">

                <div id="rubro-segmento-list-container" class="max-h-60 overflow-y-auto bg-white p-3 rounded-md border border-gray-200">
                    <p class="text-gray-500">Cargando rubros y segmentos...</p>
                </div>

                <button id="btn-back-from-modify-delete-form" class="mt-4 w-full bg-gray-400 text-white p-2 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const searchInput = parentContainer.querySelector('#search-rubro-segmento-input');
        const listContainer = parentContainer.querySelector('#rubro-segmento-list-container');
        const btnBack = parentContainer.querySelector('#btn-back-from-modify-delete-form');

        const renderList = (filteredMap) => {
            listContainer.innerHTML = '';
            if (Object.keys(filteredMap).length === 0) {
                listContainer.innerHTML = '<p class="text-gray-500">No hay resultados.</p>';
                return;
            }

            for (const rubro in filteredMap) {
                const rubroDiv = document.createElement('div');
                rubroDiv.className = 'mb-4 p-3 border border-gray-300 rounded-md bg-gray-50';
                rubroDiv.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <h5 class="font-bold text-lg text-gray-800">${rubro}</h5>
                        <button class="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 delete-rubro-btn" data-rubro="${rubro}">Eliminar Rubro</button>
                    </div>
                    <ul class="list-disc pl-5 text-gray-700">
                        ${filteredMap[rubro].map(segmento => `
                            <li class="flex justify-between items-center py-1">
                                <span>${segmento}</span>
                                <button class="bg-red-400 text-white px-2 py-0.5 rounded-md text-xs hover:bg-red-500 delete-segmento-btn" data-rubro="${rubro}" data-segmento="${segmento}">Eliminar</button>
                            </li>
                        `).join('')}
                    </ul>
                `;
                listContainer.appendChild(rubroDiv);
            }

            // Añadir event listeners para eliminar rubros
            listContainer.querySelectorAll('.delete-rubro-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const rubroToDelete = event.target.dataset.rubro;
                    const confirmado = await showCustomConfirm(`¿Estás seguro de que quieres eliminar el rubro "${rubroToDelete}" y todos sus segmentos?`);
                    if (confirmado) {
                        delete rubroSegmentoMap[rubroToDelete];
                        await guardarConfiguracionRubrosSegmentos(rubroSegmentoMap);
                        renderList(rubroSegmentoMap); // Re-renderizar la lista con el mapa actualizado
                        showCustomAlert(`Rubro "${rubroToDelete}" eliminado.`);
                    }
                });
            });

            // Añadir event listeners para eliminar segmentos
            listContainer.querySelectorAll('.delete-segmento-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const rubro = event.target.dataset.rubro;
                    const segmentoToDelete = event.target.dataset.segmento;
                    const confirmado = await showCustomConfirm(`¿Estás seguro de que quieres eliminar el segmento "${segmentoToDelete}" de "${rubro}"?`);
                    if (confirmado) {
                        rubroSegmentoMap[rubro] = rubroSegmentoMap[rubro].filter(s => s !== segmentoToDelete);
                        await guardarConfiguracionRubrosSegmentos(rubroSegmentoMap);
                        renderList(rubroSegmentoMap); // Re-renderizar la lista con el mapa actualizado
                        showCustomAlert(`Segmento "${segmentoToDelete}" eliminado de "${rubro}".`);
                    }
                });
            });
        };

        // Renderizado inicial
        renderList(rubroSegmentoMap);

        // Funcionalidad de búsqueda
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();
                const filteredMap = {};
                for (const rubro in rubroSegmentoMap) {
                    if (rubro.toLowerCase().includes(searchTerm)) {
                        filteredMap[rubro] = rubroSegmentoMap[rubro];
                    } else {
                        const matchingSegments = rubroSegmentoMap[rubro].filter(segmento => segmento.toLowerCase().includes(searchTerm));
                        if (matchingSegments.length > 0) {
                            filteredMap[rubro] = matchingSegments;
                        }
                    }
                }
                renderList(filteredMap);
            });
        }

        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderModifyDeleteRubroSegmentoForm: Finalizado.');
    }
    console.log('renderInventarioSection: Función completada.');
}
