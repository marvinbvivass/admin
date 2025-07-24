// archivos.js
// Este archivo gestiona la visualización y descarga de datos de las colecciones principales de Firebase Firestore.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Función auxiliar para obtener la instancia de Firestore
async function getFirestoreInstances() {
    while (!window.firebaseDb) {
        console.log('Esperando inicialización de Firebase en archivos.js...');
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return {
        db: window.firebaseDb,
    };
}

/**
 * Convierte un array de objetos JSON a formato CSV.
 * Genera los encabezados a partir de todas las claves únicas encontradas en los datos.
 * @param {Array<object>} data - Array de objetos a convertir.
 * @returns {string} La cadena de texto en formato CSV.
 */
function convertToCsv(data) {
    if (data.length === 0) {
        return '';
    }

    // Recopilar todos los encabezados únicos de todos los objetos
    const allKeys = new Set();
    data.forEach(item => {
        Object.keys(item).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    const csvRows = [];

    // Añadir la fila de encabezados
    csvRows.push(headers.map(header => `"${header}"`).join(','));

    // Añadir filas de datos
    data.forEach(item => {
        const values = headers.map(header => {
            let value = item[header];
            if (value === undefined || value === null) {
                return ''; // Celdas vacías para datos no presentes
            }
            if (typeof value === 'object') {
                // Si es un objeto o array, convertirlo a una cadena JSON
                value = JSON.stringify(value);
            }
            // Escapar comillas dobles y encerrar el valor en comillas si contiene comas o comillas
            value = String(value).replace(/"/g, '""');
            return `"${value}"`;
        });
        csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
}

/**
 * Descarga una cadena de texto como un archivo CSV.
 * @param {string} csvString - La cadena de texto CSV.
 * @param {string} filename - El nombre del archivo a descargar.
 */
function downloadCsvFile(csvString, filename) {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // Feature detection
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Limpiar URL del objeto
    } else {
        alert('Su navegador no soporta la descarga directa de archivos. Por favor, copie el texto CSV manualmente.');
        console.log(csvString); // Para que el usuario pueda copiarlo de la consola
    }
}

/**
 * Descarga los datos de una colección o documento específico de Firestore como CSV.
 * @param {string} path - La ruta de la colección o documento en Firestore.
 * @param {boolean} isCollection - True si es una colección, false si es un documento.
 * @param {string} filenamePrefix - Prefijo para el nombre del archivo CSV.
 */
async function downloadFirestoreDataAsCsv(path, isCollection, filenamePrefix) {
    const { db } = await getFirestoreInstances();
    let dataToExport = [];
    let filename = `${filenamePrefix}_${new Date().toISOString().slice(0,10)}.csv`; // Nombre de archivo con fecha

    try {
        if (isCollection) {
            const collectionRef = collection(db, path);
            const querySnapshot = await getDocs(collectionRef);
            querySnapshot.forEach(docSnap => {
                dataToExport.push({ id: docSnap.id, ...docSnap.data() });
            });
            console.log(`Datos de la colección "${path}" obtenidos para exportar.`, dataToExport);
        } else {
            const docRef = doc(db, path);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                // Si es un documento de configuración, el mapa de datos suele estar en una propiedad 'mapa'
                // o directamente en el documento. Adaptamos para 'mapa' si existe, o el documento completo.
                const docData = docSnap.data();
                if (docData.mapa && typeof docData.mapa === 'object') {
                    // Si es un mapa (como rubrosSegmentos o zonasSectores)
                    // Convertir el mapa en un formato tabular para CSV
                    const mappedData = Object.keys(docData.mapa).map(key => ({
                        Nombre: key,
                        Elementos: docData.mapa[key].join('; ') // Unir elementos con punto y coma
                    }));
                    dataToExport = mappedData;
                } else {
                    // Si es un documento simple (como exchangeRates)
                    dataToExport.push({ id: docSnap.id, ...docData });
                }
                console.log(`Datos del documento "${path}" obtenidos para exportar.`, dataToExport);
            } else {
                alert(`El documento "${path}" no existe.`);
                return;
            }
        }

        if (dataToExport.length === 0) {
            alert(`No hay datos para exportar de "${filenamePrefix}".`);
            return;
        }

        const csvString = convertToCsv(dataToExport);
        downloadCsvFile(csvString, filename);
        alert(`Datos de "${filenamePrefix}" exportados con éxito a ${filename}.`);

    } catch (error) {
        console.error(`Error al descargar datos de "${path}":`, error);
        alert(`Error al descargar datos de "${filenamePrefix}". Verifique la consola para más detalles.`);
    }
}

/**
 * Renderiza la interfaz de usuario de la sección de archivos dentro del contenedor dado.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal de archivos.
 */
export async function renderArchivosSection(container) {
    container.innerHTML = `
        <div class="modal-content">
            <h2 class="text-4xl font-bold text-gray-900 mb-6 text-center">Gestión de Datos de Firestore</h2>

            <div class="p-6 bg-yellow-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-yellow-800 mb-4">Exportar Datos a CSV</h3>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <button id="btn-export-clientes" class="bg-blue-600 text-white p-4 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                        Exportar Clientes
                    </button>
                    <button id="btn-export-inventario" class="bg-green-600 text-white p-4 rounded-md font-semibold hover:bg-green-700 transition duration-200">
                        Exportar Inventario
                    </button>
                    <button id="btn-export-ventas" class="bg-red-600 text-white p-4 rounded-md font-semibold hover:bg-red-700 transition duration-200">
                        Exportar Ventas
                    </button>
                    <button id="btn-export-rubros-segmentos" class="bg-purple-600 text-white p-4 rounded-md font-semibold hover:bg-purple-700 transition duration-200">
                        Exportar Rubros/Segmentos
                    </button>
                    <button id="btn-export-zonas-sectores" class="bg-indigo-600 text-white p-4 rounded-md font-semibold hover:bg-indigo-700 transition duration-200">
                        Exportar Zonas/Sectores
                    </button>
                    <button id="btn-export-exchange-rates" class="bg-orange-600 text-white p-4 rounded-md font-semibold hover:bg-orange-700 transition duration-200">
                        Exportar Valores de Cambio
                    </button>
                    <button id="btn-export-archivos-metadata" class="bg-teal-600 text-white p-4 rounded-md font-semibold hover:bg-teal-700 transition duration-200">
                        Exportar Metadatos de Archivos
                    </button>
                    <button id="btn-export-users" class="bg-gray-600 text-white p-4 rounded-md font-semibold hover:bg-gray-700 transition duration-200">
                        Exportar Usuarios (Cuidado)
                    </button>
                </div>

                <p class="text-sm text-gray-600 mt-4">
                    Haz clic en un botón para descargar un archivo CSV con los datos de la colección o documento correspondiente.
                    Los datos de configuración (Rubros/Segmentos, Zonas/Sectores, Valores de Cambio) se exportarán como un solo documento.
                </p>
            </div>

            <!-- Botón para cerrar el modal -->
            <button id="close-archivos-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    const closeArchivosModalBtn = container.querySelector('#close-archivos-modal');

    // Asignar event listeners a los botones de exportación
    container.querySelector('#btn-export-clientes').addEventListener('click', () =>
        downloadFirestoreDataAsCsv('datosClientes', true, 'clientes')
    );
    container.querySelector('#btn-export-inventario').addEventListener('click', () =>
        downloadFirestoreDataAsCsv('datosInventario', true, 'inventario')
    );
    container.querySelector('#btn-export-ventas').addEventListener('click', () =>
        downloadFirestoreDataAsCsv('datosVentas', true, 'ventas')
    );
    container.querySelector('#btn-export-rubros-segmentos').addEventListener('click', () =>
        downloadFirestoreDataAsCsv('configuracion/rubrosSegmentos', false, 'rubros_segmentos')
    );
    container.querySelector('#btn-export-zonas-sectores').addEventListener('click', () =>
        downloadFirestoreDataAsCsv('configuracion/zonasSectores', false, 'zonas_sectores')
    );
    container.querySelector('#btn-export-exchange-rates').addEventListener('click', () =>
        downloadFirestoreDataAsCsv('configuracion/exchangeRates', false, 'valores_cambio')
    );
    container.querySelector('#btn-export-archivos-metadata').addEventListener('click', () =>
        downloadFirestoreDataAsCsv('archivosMetadata', true, 'archivos_metadata')
    );
    container.querySelector('#btn-export-users').addEventListener('click', () => {
        if (confirm('Advertencia: La exportación de datos de usuarios puede contener información sensible. ¿Desea continuar?')) {
            downloadFirestoreDataAsCsv('users', true, 'usuarios');
        }
    });


    // Lógica para cerrar el modal
    closeArchivosModalBtn.addEventListener('click', () => {
        container.classList.add('hidden'); // Oculta el modal
    });
}
