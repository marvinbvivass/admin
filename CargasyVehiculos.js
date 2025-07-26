// CargasyVehiculos.js
// Este archivo gestiona las operaciones CRUD para los vehículos de carga
// y se encarga de renderizar su interfaz de usuario.
// Ahora también incluye la gestión de usuarios (no de autenticación).

// Importa las funciones necesarias de Firebase Firestore.
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
 * Agrega un nuevo vehículo de carga a Firestore.
 * Los datos se guardarán en la colección 'Vehiculos' en la raíz.
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
        // La ruta de la colección es directamente 'Vehiculos'
        const vehiculosCollectionRef = collection(db, `Vehiculos`);
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
 * Modifica los datos de un vehículo existente en Firestore.
 * @param {string} idVehiculo - ID único del vehículo a modificar.
 * @param {object} nuevosDatos - Objeto con los nuevos datos del vehículo.
 * @returns {Promise<boolean>} True si se modificó con éxito, false en caso contrario.
 */
async function modificarVehiculo(idVehiculo, nuevosDatos) {
    console.log('modificarVehiculo: Iniciando. ID:', idVehiculo, 'Nuevos datos:', nuevosDatos);
    try {
        const { db } = await getFirestoreInstances();
        const vehiculoDocRef = doc(db, `Vehiculos`, idVehiculo);
        await updateDoc(vehiculoDocRef, nuevosDatos);
        console.log('Vehículo modificado con éxito. ID:', idVehiculo);
        return true;
    } catch (error) {
        console.error('Error al modificar vehículo:', error);
        return false;
    } finally {
        console.log('modificarVehiculo: Finalizado.');
    }
}

/**
 * Elimina un vehículo del sistema de Firestore.
 * @param {string} idVehiculo - ID único del vehículo a eliminar.
 * @returns {Promise<boolean>} True si se eliminó con éxito, false en caso contrario.
 */
async function eliminarVehiculo(idVehiculo) {
    console.log('eliminarVehiculo: Iniciando. ID:', idVehiculo);
    try {
        const { db } = await getFirestoreInstances();
        const vehiculoDocRef = doc(db, `Vehiculos`, idVehiculo);
        await deleteDoc(vehiculoDocRef);
        console.log('Vehículo eliminado con éxito. ID:', idVehiculo);
        return true;
    } catch (error) {
        console.error('Error al eliminar vehículo:', error);
        return false;
    } finally {
        console.log('eliminarVehiculo: Finalizado.');
    }
}

/**
 * Obtiene todos los vehículos de carga de Firestore.
 * @returns {Promise<Array<object>>} Un array de objetos de vehículo.
 */
export async function obtenerTodosLosVehiculos() {
    console.log('obtenerTodosLosVehiculos: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        const vehiculosCollectionRef = collection(db, `Vehiculos`);
        const querySnapshot = await getDocs(vehiculosCollectionRef);
        const vehiculos = [];
        querySnapshot.forEach((doc) => {
            vehiculos.push({ id: doc.id, ...doc.data() });
        });
        console.log('Todos los vehículos obtenidos:', vehiculos);
        return vehiculos;
    } catch (error) {
        console.error('Error al obtener todos los vehículos:', error);
        return [];
    } finally {
        console.log('obtenerTodosLosVehiculos: Finalizado.');
    }
}

// --- Funciones para la gestión de Usuarios ---

/**
 * Agrega un nuevo usuario a la colección 'configuracion/Usuarios'.
 * @param {object} userData - Objeto con los datos del usuario (ej: { nombre: 'Juan', apellido: 'Perez' }).
 * @param {string} userData.nombre - Nombre del usuario.
 * @param {string} userData.apellido - Apellido del usuario.
 * @returns {Promise<string|null>} El ID del documento del usuario agregado o null si hubo un error.
 */
async function agregarUsuario(userData) {
    console.log('agregarUsuario: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        const usuariosCollectionRef = collection(db, `configuracion`, `Usuarios`);
        const docRef = await addDoc(usuariosCollectionRef, userData);
        console.log('Usuario agregado con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al agregar usuario:', error);
        return null;
    } finally {
        console.log('agregarUsuario: Finalizado.');
    }
}

/**
 * Elimina un usuario de la colección 'configuracion/Usuarios'.
 * @param {string} userId - ID único del usuario a eliminar.
 * @returns {Promise<boolean>} True si se eliminó con éxito, false en caso contrario.
 */
async function eliminarUsuario(userId) {
    console.log('eliminarUsuario: Iniciando. ID:', userId);
    try {
        const { db } = await getFirestoreInstances();
        const userDocRef = doc(db, `configuracion`, `Usuarios`, userId);
        await deleteDoc(userDocRef);
        console.log('Usuario eliminado con éxito. ID:', userId);
        return true;
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        return false;
    } finally {
        console.log('eliminarUsuario: Finalizado.');
    }
}

/**
 * Obtiene todos los usuarios de la colección 'configuracion/Usuarios'.
 * @returns {Promise<Array<object>>} Un array de objetos de usuario.
 */
async function obtenerTodosLosUsuarios() {
    console.log('obtenerTodosLosUsuarios: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        const usuariosCollectionRef = collection(db, `configuracion`, `Usuarios`);
        const querySnapshot = await getDocs(usuariosCollectionRef);
        const usuarios = [];
        querySnapshot.forEach((doc) => {
            usuarios.push({ id: doc.id, ...doc.data() });
        });
        console.log('Todos los usuarios obtenidos:', usuarios);
        return usuarios;
    } catch (error) {
        console.error('Error al obtener todos los usuarios:', error);
        return [];
    } finally {
        console.log('obtenerTodosLosUsuarios: Finalizado.');
    }
}

/**
 * Renderiza la interfaz de usuario para la gestión de usuarios.
 * @param {HTMLElement} parentContainer - El contenedor donde se renderizará el formulario.
 * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de vehículos.
 */
async function renderGestionUsuariosSection(parentContainer, backToMainMenuCallback) {
    console.log('renderGestionUsuariosSection: Iniciando...');
    parentContainer.innerHTML = `
        <div class="p-6 bg-teal-50 rounded-lg shadow-inner">
            <h3 class="text-2xl font-semibold text-teal-800 mb-4">Gestión de Usuarios</h3>

            <div class="mb-6 p-4 bg-white rounded-md shadow-sm">
                <h4 class="text-xl font-semibold text-gray-800 mb-3">Agregar Nuevo Usuario</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="add-user-name" placeholder="Nombre del Usuario" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <input type="text" id="add-user-apellido" placeholder="Apellido del Usuario" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500">
                </div>
                <button id="btn-add-user" class="mt-4 w-full bg-teal-600 text-white p-3 rounded-md font-semibold hover:bg-teal-700 transition duration-200">
                    Añadir Usuario
                </button>
            </div>

            <div class="mb-6 p-4 bg-white rounded-md shadow-sm">
                <h4 class="text-xl font-semibold text-gray-800 mb-3">Lista de Usuarios Existentes</h4>
                <input type="text" id="search-users-input" placeholder="Buscar usuario por nombre o apellido..." class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4">
                <div id="users-table-container" class="max-h-96 overflow-y-auto bg-white p-3 rounded-md border border-gray-200 shadow-md">
                    <p class="text-gray-500">Cargando usuarios...</p>
                </div>
            </div>

            <button id="btn-back-gestion-usuarios" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                Volver
            </button>
        </div>
    `;

    const addUserNameInput = parentContainer.querySelector('#add-user-name');
    const addUserApellidoInput = parentContainer.querySelector('#add-user-apellido'); // Cambiado de email a apellido
    const btnAddUser = parentContainer.querySelector('#btn-add-user');
    const searchUsersInput = parentContainer.querySelector('#search-users-input');
    const usersTableContainer = parentContainer.querySelector('#users-table-container');
    const btnBack = parentContainer.querySelector('#btn-back-gestion-usuarios');

    let allUsers = []; // Para almacenar todos los usuarios y filtrar sobre ellos

    const renderUsersTable = (usersToRender) => {
        usersTableContainer.innerHTML = '';
        if (usersToRender.length === 0) {
            usersTableContainer.innerHTML = '<p class="text-gray-500">No hay usuarios registrados.</p>';
            return;
        }

        let tableHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 sticky top-0">
                    <tr>
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apellido</th>
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
        `;

        usersToRender.forEach(user => {
            tableHTML += `
                <tr class="hover:bg-gray-100">
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${user.nombre || 'N/A'}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${user.apellido || 'N/A'}</td> <!-- Cambiado de email a apellido -->
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                        <button class="bg-red-500 text-white px-2 py-1 rounded-md text-xs hover:bg-red-600 transition duration-200 delete-user-btn" data-user-id="${user.id}">Eliminar</button>
                    </td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table>`;
        usersTableContainer.innerHTML = tableHTML;

        // Añadir event listeners para los botones de eliminar
        usersTableContainer.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const userId = event.target.dataset.userId;
                const userToDelete = allUsers.find(u => u.id === userId);
                const userName = userToDelete ? `${userToDelete.nombre} ${userToDelete.apellido}` : 'este usuario'; // Actualizado para mostrar nombre y apellido
                const confirmed = await showCustomConfirm(`¿Estás seguro de que quieres eliminar a ${userName}?`);
                if (confirmed) {
                    const deleted = await eliminarUsuario(userId);
                    if (deleted) {
                        showCustomAlert(`Usuario ${userName} eliminado con éxito.`);
                        allUsers = allUsers.filter(u => u.id !== userId); // Actualizar lista local
                        renderUsersTable(allUsers); // Re-renderizar tabla
                    } else {
                        showCustomAlert(`Fallo al eliminar a ${userName}.`);
                    }
                }
            });
        });
    };

    // Cargar usuarios al inicio
    allUsers = await obtenerTodosLosUsuarios();
    renderUsersTable(allUsers);

    // Lógica para añadir usuario
    if (btnAddUser) {
        btnAddUser.addEventListener('click', async () => {
            const nombre = addUserNameInput?.value.trim() || '';
            const apellido = addUserApellidoInput?.value.trim() || ''; // Cambiado de email a apellido

            if (!nombre || !apellido) { // Validar ambos campos
                showCustomAlert('Por favor, ingrese el nombre y el apellido del usuario.');
                return;
            }

            const newUserData = { nombre, apellido }; // Solo nombre y apellido
            const id = await agregarUsuario(newUserData);
            if (id) {
                showCustomAlert(`Usuario "${nombre} ${apellido}" agregado con éxito.`);
                addUserNameInput.value = '';
                addUserApellidoInput.value = ''; // Limpiar campo de apellido
                allUsers.push({ id, ...newUserData }); // Añadir a la lista local
                renderUsersTable(allUsers); // Re-renderizar tabla
            } else {
                showCustomAlert('Fallo al agregar usuario.');
            }
        });
    }

    // Lógica de búsqueda de usuarios
    if (searchUsersInput) {
        searchUsersInput.addEventListener('input', () => {
            const searchTerm = searchUsersInput.value.toLowerCase();
            const filteredUsers = allUsers.filter(user =>
                (user.nombre && user.nombre.toLowerCase().includes(searchTerm)) ||
                (user.apellido && user.apellido.toLowerCase().includes(searchTerm)) // Buscar también por apellido
            );
            renderUsersTable(filteredUsers);
        });
    }

    if (btnBack) {
        btnBack.addEventListener('click', backToMainMenuCallback);
    }
    console.log('renderGestionUsuariosSection: Finalizado.');
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

            <div id="vehiculos-main-buttons-container" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button id="btn-show-add-vehiculo" class="bg-orange-600 text-white p-4 rounded-md font-semibold hover:bg-orange-700 transition duration-200">
                    Agregar Vehículo de Carga
                </button>
                <button id="btn-show-modify-delete-vehiculo" class="bg-yellow-600 text-white p-4 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                    Modificar o Eliminar Vehículo
                </button>
                <button id="btn-gestion-usuarios" class="bg-teal-600 text-white p-4 rounded-md font-semibold hover:bg-teal-700 transition duration-200">
                    Gestión de Usuarios
                </button>
            </div>

            <!-- Contenedor para las sub-secciones dinámicas -->
            <div id="vehiculos-sub-section" class="mt-8">
                <!-- El contenido de agregar, modificar/eliminar o gestión de usuarios se cargará aquí -->
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

    const vehiculosMainButtonsContainer = container.querySelector('#vehiculos-main-buttons-container');
    const vehiculosSubSection = container.querySelector('#vehiculos-sub-section');
    const btnBack = container.querySelector('#btn-back-carga-vehiculos');
    const closeCargaVehiculosModalBtn = container.querySelector('#close-carga-vehiculos-modal');

    const btnShowAddVehiculo = container.querySelector('#btn-show-add-vehiculo');
    const btnShowModifyDeleteVehiculo = container.querySelector('#btn-show-modify-delete-vehiculo');
    const btnGestionUsuarios = container.querySelector('#btn-gestion-usuarios'); // Nuevo botón

    // Función para mostrar los botones principales y limpiar la sub-sección
    function showVehiculosMainButtons() {
        vehiculosSubSection.innerHTML = ''; // Limpia el contenido de la sub-sección
        vehiculosMainButtonsContainer.classList.remove('hidden'); // Muestra los botones principales
    }

    // Lógica para cerrar el modal
    if (closeCargaVehiculosModalBtn) {
        closeCargaVehiculosModalBtn.addEventListener('click', () => {
            console.log('Cerrar modal de Carga y Vehículos clickeado. Volviendo al menú principal de la aplicación.');
            container.classList.add('hidden'); // Oculta el modal
            backToMainMenuCallback(); // Vuelve al menú principal de la aplicación
        });
    }

    // Lógica para el botón "Volver al Menú Principal"
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            console.log('Botón "Volver al Menú Principal" clickeado en Carga y Vehículos. Volviendo al menú principal de la aplicación.');
            container.classList.add('hidden'); // Oculta el modal
            backToMainMenuCallback(); // Vuelve al menú principal de la aplicación
        });
    }

    // Lógica para mostrar la sección de agregar vehículo
    if (btnShowAddVehiculo) {
        btnShowAddVehiculo.addEventListener('click', () => {
            console.log('Botón "Agregar Vehículo de Carga" clickeado.');
            vehiculosMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
            renderAddVehiculoForm(vehiculosSubSection, showVehiculosMainButtons);
        });
    }

    // Lógica para mostrar la sección de modificar/eliminar vehículo
    if (btnShowModifyDeleteVehiculo) {
        btnShowModifyDeleteVehiculo.addEventListener('click', async () => {
            console.log('Botón "Modificar o Eliminar Vehículo" clickeado.');
            vehiculosMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
            await renderModifyDeleteVehiculoSection(vehiculosSubSection, showVehiculosMainButtons);
        });
    }

    // Lógica para mostrar la sección de gestión de usuarios
    if (btnGestionUsuarios) {
        btnGestionUsuarios.addEventListener('click', async () => {
            console.log('Botón "Gestión de Usuarios" clickeado.');
            vehiculosMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
            await renderGestionUsuariosSection(vehiculosSubSection, showVehiculosMainButtons);
        });
    }

    // --- Funciones para el formulario de Agregar Vehículo ---
    /**
     * Renderiza el formulario para agregar un nuevo vehículo.
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará el formulario.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de vehículos.
     */
    function renderAddVehiculoForm(parentContainer, backToMainMenuCallback) {
        console.log('renderAddVehiculoForm: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-6 bg-orange-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-orange-800 mb-4">Agregar Nuevo Vehículo de Carga</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="add-vehiculo-marca" placeholder="Marca (Ej: Volswaguen)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <input type="text" id="add-vehiculo-modelo" placeholder="Modelo (Ej: Volswaguen Worker 220)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <input type="text" id="add-vehiculo-placa" placeholder="Placa (Ej: ABC-123)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                </div>
                <button id="btn-submit-add-vehiculo" class="mt-6 w-full bg-orange-600 text-white p-3 rounded-md font-semibold hover:bg-orange-700 transition duration-200">
                    Confirmar Agregar Vehículo
                </button>
                <button id="btn-back-add-vehiculo" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const addVehiculoMarcaInput = parentContainer.querySelector('#add-vehiculo-marca');
        const addVehiculoModeloInput = parentContainer.querySelector('#add-vehiculo-modelo');
        const addVehiculoPlacaInput = parentContainer.querySelector('#add-vehiculo-placa');
        const btnSubmitAddVehiculo = parentContainer.querySelector('#btn-submit-add-vehiculo');
        const btnBackAddVehiculo = parentContainer.querySelector('#btn-back-add-vehiculo');

        if (btnSubmitAddVehiculo) {
            btnSubmitAddVehiculo.addEventListener('click', async () => {
                const vehiculo = {
                    marca: addVehiculoMarcaInput?.value.trim() || '',
                    modelo: addVehiculoModeloInput?.value.trim() || '',
                    placa: addVehiculoPlacaInput?.value.trim() || ''
                };

                if (!vehiculo.marca || !vehiculo.modelo || !vehiculo.placa) {
                    showCustomAlert('Por favor, complete todos los campos (Marca, Modelo, Placa).');
                    return;
                }

                const id = await agregarVehiculo(vehiculo);
                if (id) {
                    showCustomAlert(`Vehículo "${vehiculo.marca} ${vehiculo.modelo}" (Placa: ${vehiculo.placa}) agregado con éxito.`);
                    // Limpiar campos
                    if (addVehiculoMarcaInput) addVehiculoMarcaInput.value = '';
                    if (addVehiculoModeloInput) addVehiculoModeloInput.value = '';
                    if (addVehiculoPlacaInput) addVehiculoPlacaInput.value = '';
                } else {
                    showCustomAlert('Fallo al agregar vehículo.');
                }
            });
        }

        if (btnBackAddVehiculo) {
            btnBackAddVehiculo.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderAddVehiculoForm: Finalizado.');
    }

    // --- Funciones para Modificar o Eliminar Vehículos ---
    async function renderModifyDeleteVehiculoSection(parentContainer, backToMainMenuCallback) {
        console.log('renderModifyDeleteVehiculoSection: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-6 bg-yellow-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-yellow-800 mb-4">Modificar o Eliminar Vehículo</h3>

                <input type="text" id="search-vehiculos-input" placeholder="Buscar vehículo por Marca, Modelo, Placa..." class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4">

                <div id="vehiculos-table-container" class="max-h-96 overflow-y-auto bg-white p-3 rounded-md border border-gray-200 shadow-md">
                    <p class="text-gray-500">Cargando vehículos...</p>
                </div>

                <button id="btn-back-modify-delete-vehiculos" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const searchInput = parentContainer.querySelector('#search-vehiculos-input');
        const tableContainer = parentContainer.querySelector('#vehiculos-table-container');
        const btnBack = parentContainer.querySelector('#btn-back-modify-delete-vehiculos');

        let allVehiculos = await obtenerTodosLosVehiculos();

        const renderTable = (vehiculosToRender) => {
            if (vehiculosToRender.length === 0) {
                tableContainer.innerHTML = '<p class="text-gray-500">No hay vehículos para mostrar.</p>';
                return;
            }

            let tableHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modelo</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
            `;

            vehiculosToRender.forEach(vehiculo => {
                tableHTML += `
                    <tr class="hover:bg-gray-100">
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${vehiculo.marca || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${vehiculo.modelo || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${vehiculo.placa || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                            <button class="bg-blue-500 text-white px-2 py-1 rounded-md text-xs hover:bg-blue-600 transition duration-200 modify-vehiculo-btn" data-vehiculo-id="${vehiculo.id}">Modificar</button>
                            <button class="bg-red-500 text-white px-2 py-1 rounded-md text-xs hover:bg-red-600 transition duration-200 delete-vehiculo-btn" data-vehiculo-id="${vehiculo.id}">Eliminar</button>
                        </td>
                    </tr>
                `;
            });

            tableHTML += `</tbody></table>`;
            tableContainer.innerHTML = tableHTML;

            // Add event listeners for modify and delete buttons
            tableContainer.querySelectorAll('.modify-vehiculo-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const vehiculoId = event.target.dataset.vehiculoId;
                    const vehiculoToModify = allVehiculos.find(v => v.id === vehiculoId);
                    if (vehiculoToModify) {
                        renderEditVehiculoForm(parentContainer, showVehiculosMainButtons, vehiculoToModify);
                    } else {
                        showCustomAlert('Vehículo no encontrado para modificar.');
                    }
                });
            });

            tableContainer.querySelectorAll('.delete-vehiculo-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const vehiculoId = event.target.dataset.vehiculoId;
                    const vehiculoToDelete = allVehiculos.find(v => v.id === vehiculoId);
                    const vehiculoName = vehiculoToDelete ? `${vehiculoToDelete.marca} ${vehiculoToDelete.modelo} (${vehiculoToDelete.placa})` : 'este vehículo';
                    const confirmed = await showCustomConfirm(`¿Estás seguro de que quieres eliminar ${vehiculoName}?`);
                    if (confirmed) {
                        const deleted = await eliminarVehiculo(vehiculoId);
                        if (deleted) {
                            showCustomAlert(`Vehículo ${vehiculoName} eliminado con éxito.`);
                            allVehiculos = allVehiculos.filter(v => v.id !== vehiculoId); // Update local list
                            renderTable(allVehiculos); // Re-render table
                        } else {
                            showCustomAlert(`Fallo al eliminar ${vehiculoName}.`);
                        }
                    }
                });
            });
        };

        renderTable(allVehiculos);

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();
                const filteredVehiculos = allVehiculos.filter(vehiculo =>
                    (vehiculo.marca && vehiculo.marca.toLowerCase().includes(searchTerm)) ||
                    (vehiculo.modelo && vehiculo.modelo.toLowerCase().includes(searchTerm)) ||
                    (vehiculo.placa && vehiculo.placa.toLowerCase().includes(searchTerm))
                );
                renderTable(filteredVehiculos);
            });
        }

        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderModifyDeleteVehiculoSection: Finalizado.');
    }

    /**
     * Renderiza el formulario para editar un vehículo existente.
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará el formulario.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de vehículos.
     * @param {object} vehiculoData - Los datos del vehículo a editar.
     */
    async function renderEditVehiculoForm(parentContainer, backToMainMenuCallback, vehiculoData) {
        console.log('renderEditVehiculoForm: Iniciando con datos:', vehiculoData);
        parentContainer.innerHTML = `
            <div class="p-6 bg-yellow-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-yellow-800 mb-4">Modificar Vehículo: ${vehiculoData.marca || 'N/A'} ${vehiculoData.modelo || 'N/A'}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="edit-vehiculo-marca" placeholder="Marca" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${vehiculoData.marca || ''}">
                    <input type="text" id="edit-vehiculo-modelo" placeholder="Modelo" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${vehiculoData.modelo || ''}">
                    <input type="text" id="edit-vehiculo-placa" placeholder="Placa" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${vehiculoData.placa || ''}">
                </div>
                <button id="btn-submit-edit-vehiculo" class="mt-6 w-full bg-yellow-600 text-white p-3 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                    Confirmar Modificación
                </button>
                <button id="btn-back-edit-vehiculo" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const editVehiculoMarcaInput = parentContainer.querySelector('#edit-vehiculo-marca');
        const editVehiculoModeloInput = parentContainer.querySelector('#edit-vehiculo-modelo');
        const editVehiculoPlacaInput = parentContainer.querySelector('#edit-vehiculo-placa');
        const btnSubmitEditVehiculo = parentContainer.querySelector('#btn-submit-edit-vehiculo');
        const btnBackEditVehiculo = parentContainer.querySelector('#btn-back-edit-vehiculo');

        if (btnSubmitEditVehiculo) {
            btnSubmitEditVehiculo.addEventListener('click', async () => {
                const updatedVehiculoData = {
                    marca: editVehiculoMarcaInput?.value.trim() || '',
                    modelo: editVehiculoModeloInput?.value.trim() || '',
                    placa: editVehiculoPlacaInput?.value.trim() || ''
                };

                if (!updatedVehiculoData.marca || !updatedVehiculoData.modelo || !updatedVehiculoData.placa) {
                    showCustomAlert('Por favor, complete todos los campos obligatorios (Marca, Modelo, Placa).');
                    return;
                }

                const confirmed = await showCustomConfirm(`¿Estás seguro de que quieres modificar los datos del vehículo "${updatedVehiculoData.marca} ${updatedVehiculoData.modelo}"?`);
                if (confirmed) {
                    const updated = await modificarVehiculo(vehiculoData.id, updatedVehiculoData);
                    if (updated) {
                        showCustomAlert(`Vehículo "${updatedVehiculoData.marca} ${updatedVehiculoData.modelo}" modificado con éxito.`);
                        // Volver a la lista después de modificar
                        await renderModifyDeleteVehiculoSection(parentContainer, backToMainMenuCallback);
                    } else {
                        showCustomAlert('Fallo al modificar vehículo.');
                    }
                }
            });
        }

        if (btnBackEditVehiculo) {
            btnBackEditVehiculo.addEventListener('click', async () => {
                // Volver a la sección de modificar/eliminar vehículos
                await renderModifyDeleteVehiculoSection(parentContainer, backToMainMenuCallback);
            });
        }
        console.log('renderEditVehiculoForm: Finalizado.');
    }
}

