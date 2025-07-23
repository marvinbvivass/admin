// main.js
// Este archivo centraliza la lógica principal de la aplicación,
// incluyendo la inicialización de Firebase y la gestión de la carga de módulos de sección.

// Importa las funciones de Firebase SDK (ya inicializadas en index.html y expuestas globalmente)
// No las importamos directamente aquí, sino que esperamos que estén en el objeto window.

// Importa las funciones de los módulos de sección (las rutas deben ser relativas al subdirectorio del repositorio)
// Asegúrate de que estas rutas coincidan con la ubicación de tus archivos en GitHub.
import { renderClientesSection } from '/admin/clientes.js';
import { renderInventarioSection } from '/admin/inventario.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('main.js: DOMContentLoaded - Iniciando lógica principal.');

    // --- Lógica para mostrar/ocultar el modal de Clientes ---
    const clientesCard = document.getElementById('clientes-card');
    const clientesModalContainer = document.getElementById('clientes-modal-container'); // Nuevo contenedor en index.html

    if (clientesCard && clientesModalContainer) {
        clientesCard.addEventListener('click', async () => {
            console.log('main.js: Clic en tarjeta de Clientes.');
            // Renderiza la sección de clientes dentro de su contenedor
            await renderClientesSection(clientesModalContainer);
            // Muestra el modal (ahora gestionado por el módulo clientes.js)
            clientesModalContainer.classList.remove('hidden');
        });
    } else {
        console.error("main.js: Elementos de la tarjeta o contenedor del modal de clientes no encontrados.");
    }

    // --- Lógica para mostrar/ocultar el modal de Inventario ---
    const inventarioCard = document.getElementById('inventario-card');
    const inventarioModalContainer = document.getElementById('inventario-modal-container'); // Nuevo contenedor en index.html

    if (inventarioCard && inventarioModalContainer) {
        inventarioCard.addEventListener('click', async () => {
            console.log('main.js: Clic en tarjeta de Inventario.');
            // Renderiza la sección de inventario dentro de su contenedor
            await renderInventarioSection(inventarioModalContainer);
            // Muestra el modal (ahora gestionado por el módulo inventario.js)
            inventarioModalContainer.classList.remove('hidden');
        });
    } else {
        console.error("main.js: Elementos de la tarjeta o contenedor del modal de inventario no encontrados.");
    }

    // Nota: Los botones de cierre de los modales se gestionarán dentro de cada módulo de sección (clientes.js, inventario.js)
    // ya que ellos son los que renderizan el contenido del modal y sus botones.
});

// Puedes añadir aquí cualquier otra lógica global que necesite tu aplicación
// Por ejemplo, un listener para el estado de autenticación de Firebase si es necesario para toda la app.
/*
window.addEventListener('firebaseInitialized', () => {
    console.log('main.js: Firebase ha sido inicializado.');
    // Aquí podrías hacer cosas que dependen de que Firebase esté listo
});
*/
