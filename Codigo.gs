/**
 * =============================
 *  ALMA™ - Sistema de Gestión QA
 *  Archivo: Codigo.gs
 *  Descripción: Backend principal para Google Apps Script
 * =============================
 */

// =============================
// 1. CONSTANTES GLOBALES
// =============================

// --- IDs de Hojas de Cálculo ---
var SPREADSHEET_ID_ASIGNACIONES = "1FcmnSAIsRaas_gYUJG32COh7_SCoc94_r-nu169u2Mg"; // ID Hoja Asignaciones
var SPREADSHEET_ID_QA = "1FcmnSAIsRaas_gYUJG32COh7_SCoc94_r-nu169u2Mg"; // ID Hoja QA y Directorio

// --- Nombres de Hojas ---
var QA_SHEET_NAME = "Registro_Formacion"; // Hoja de registros QA
var USER_DIRECTORY_SHEET_NAME = "Directorio de Usuarios"; // Hoja de directorio de usuarios

// --- Nombres de Columnas Esperadas (Asignaciones) ---
var COL_USUARIO_LDAP = "Usuario LDAP";
var COL_CASO = "#Caso";
var COL_INTERACCION = "Interacción";
var COL_FECHA_ASIGNACION = "Fecha y hora de la asignación";
var COL_SAMPLE_DATE = "Sample Date";
var COL_CONTROL_APERTURA = "Control Apertura Url";
var COL_CONTROL_CIERRE = "Control Cierre Url";
var COL_LINK = "Link";
var COL_CANAL = "Canal";
var COL_PROCESO = "Proceso";
var COL_TIPO_ACCION = "Tipo de accion";
var COL_OFICINA = "Oficina";
var COL_MARCA_EG = "Marca de EG";
var COL_MARCA_CI = "Marca de CI";
var COL_ESTADO_ALMA = "ESTADO_ALMA";

// --- Nombres de Columnas Esperadas (QA) ---
var COL_QA_FECHA_REGISTRO = "FECHA REGISTRO";
var COL_QA_LDAP_QA = "LDAP QA";
var COL_QA_TEAM = "TEAM";
var COL_QA_PROCESO_QA = "PROCESO QA";
var COL_QA_CASO = "Interacción";
var COL_QA_REP_EVALUAR = "REP A EVALUAR";
var COL_QA_PREGUNTA = "PREGUNTA";
var COL_QA_ESTADO = "ESTADO";
var COL_QA_FECHA_RESPUESTA = "FECHA DE RESPUESTA";
var COL_QA_RESPUESTA = "RESPUESTA";
var COL_QA_RESPUESTA_QS = "RESPUESTA QS";
var COL_QA_VISTO_FORMACION = "VISTO FORMACIÓN";
var COL_QA_VISTO_MELI = "VISTO MELI";
var COL_QA_COMENTARIO_BRM ="Comentario adicional";
var COL_QA_CRITICIDAD_QA ="CRITICIDAD";
var COL_QA_CASOREGISTRADO = "Caso_Base";
var COL_BU_QA ="BU";

// --- Nombres de Columnas Esperadas (Directorio Usuarios) ---
var COL_USER_NOMBRE = "Nombre";
var COL_USER_USUARIO = "Usuario";
var COL_USER_ROL = "Rol";
var COL_USER_CONTRASENA = "Contraseña";
var COL_USER_ESTADO = "Estado";
var COL_USER_EMAIL = "Email";

// --- Formato de Fecha/Hora ---
var DATETIME_FORMAT = "d/MM/yyyy, HH:mm:ss";

// =============================
// 2. FUNCIONES AUXILIARES GENERALES
// =============================

/**
 * Devuelve el índice (1-based) de una columna por nombre en una hoja dada.
 * @param {Sheet} sheet - Hoja de cálculo de Google Sheets
 * @param {string} columnName - Nombre de la columna a buscar
 * @return {number} Índice de columna (1-based), o -1 si no se encuentra
 */
function getColumnIndex(sheet, columnName) {
  if (!sheet || !columnName) {
    Logger.log(`Error en getColumnIndex: Parámetros faltantes.`);
    return -1;
  }
  try {
    const headerRow = sheet.getFrozenRows() || 1;
    const headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    const cleanedColumnName = String(columnName).trim().toLowerCase();
    for (let i = 0; i < headers.length; i++) {
      if (headers[i] && String(headers[i]).trim().toLowerCase() === cleanedColumnName) {
        return i + 1;
      }
    }
    return -1;
  } catch (e) {
    Logger.log(`Error crítico en getColumnIndex: ${e.message}`);
    return -1;
  }
}

/**
 * Formatea un valor de celda para mostrarlo como string o fecha legible.
 * @param {*} cellValue - Valor de la celda
 * @return {string} Valor formateado
 */
function formatCell(cellValue) {
  if (cellValue instanceof Date) {
    return Utilities.formatDate(cellValue, Session.getScriptTimeZone(), DATETIME_FORMAT);
  }
  return cellValue != null ? String(cellValue) : '';
}

// =============================
// 3. AUTENTICACIÓN Y GESTIÓN DE USUARIOS
// =============================

/**
 * Verifica las credenciales y el estado de un usuario en el directorio.
 * @param {string} username - El nombre de usuario (LDAP) a verificar.
 * @param {string} password - La contraseña proporcionada por el usuario.
 * @param {string} role - El rol seleccionado por el usuario.
 * @return {object} Un objeto con el resultado de la verificación.
 */
function verificarUsuario(username, password, role) {
  if (!username || !role) {
    return { success: false, message: "Nombre de usuario o rol no proporcionado." };
  }
  const searchUsername = String(username).trim().toLowerCase();
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_QA);
    const sheet = ss.getSheetByName(USER_DIRECTORY_SHEET_NAME);
    if (!sheet) return { success: false, message: "Error de configuración: Hoja de directorio no encontrada." };

    // --- Indexado de columnas para acceso rápido ---
    const userColIdx = getColumnIndex(sheet, COL_USER_USUARIO);
    const nameColIdx = getColumnIndex(sheet, COL_USER_NOMBRE);
    const statusColIdx = getColumnIndex(sheet, COL_USER_ESTADO);
    const rolColIdx = getColumnIndex(sheet, COL_USER_ROL);
    const passwordColIdx = getColumnIndex(sheet, COL_USER_CONTRASENA);

    const requiredCols = {
      "Usuario": userColIdx, "Nombre": nameColIdx, "Estado": statusColIdx, 
      "Rol": rolColIdx, "Contraseña": passwordColIdx
    };
    const missingCols = Object.keys(requiredCols).filter(col => requiredCols[col] === -1);
    if (missingCols.length > 0) {
      return { success: false, message: `Error de configuración: Faltan columnas (${missingCols.join(', ')}) en el directorio.` };
    }

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const sheetUsername = String(row[userColIdx - 1]).trim().toLowerCase();
      if (sheetUsername === searchUsername) {
        const sheetStatus = String(row[statusColIdx - 1]).trim().toLowerCase();
        const sheetRol = String(row[rolColIdx - 1]).trim();
        const sheetPassword = String(row[passwordColIdx - 1]);
        if (sheetRol !== role) {
          return { success: false, message: `El usuario está registrado con el rol '${sheetRol}', pero intentó ingresar como '${role}'.` };
        }
        if (sheetStatus !== 'activo') {
          return { success: false, message: "El usuario se encuentra inactivo." };
        }
        // Validación de contraseña para todos los roles
        if (role === 'Administrador' || role === 'QS' || role === 'QA') {
          if (sheetPassword !== password) {
            return { success: false, message: "Contraseña incorrecta." };
          }
        }
        const nombre = String(row[nameColIdx - 1]).trim();
        return {
          success: true,
          nombre: nombre,
          rol: sheetRol,
          username: String(row[userColIdx - 1]).trim()
        };
      }
    }
    return { success: false, message: "El usuario no se encuentra autorizado." };
  } catch (e) {
    Logger.log(`Error fatal en verificarUsuario: ${e.message}`);
    return { success: false, message: `Error interno del servidor.` };
  }
}

// =============================
// 4. GESTIÓN DE EQUIPOS
// =============================

/**
 * Obtiene la lista de equipos únicos desde la hoja de asignaciones.
 * @return {Array} Lista de equipos únicos.
 */
function getTeams() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    const sheet = ss.getSheetByName("Base_Datos");
    if (!sheet) {
      Logger.log("Error: Hoja 'Base_Datos' no encontrada en el spreadsheet de asignaciones.");
      return [];
    }
    const headerRowIndex = sheet.getFrozenRows() || 1;
    const lastRow = sheet.getLastRow();
    if (lastRow <= headerRowIndex) {
      Logger.log("Error: No hay datos en la hoja 'Base_Datos'.");
      return [];
    }
    // Indexado de columna TEAM
    const teamBuColIdx = getColumnIndex(sheet, "TEAM");
    if (teamBuColIdx === -1) {
      Logger.log("Error: Columna 'TEAM' no encontrada en la hoja 'Base_Datos'.");
      return [];
    }
    // Obtener todos los valores únicos de la columna TEAM
    const teamBuValues = sheet.getRange(headerRowIndex + 1, teamBuColIdx, lastRow - headerRowIndex, 1).getValues();
    const uniqueTeams = [...new Set(teamBuValues.flat().map(team => String(team || '').trim()).filter(Boolean))].sort();
    if (uniqueTeams.length === 0) {
      Logger.log("Advertencia: No se encontraron equipos válidos en la columna 'TEAM'.");
      return [];
    }
    Logger.log(`Equipos encontrados en Base_Datos: ${uniqueTeams.join(', ')}`);
    return uniqueTeams;
  } catch (e) {
    Logger.log(`Error en getTeams: ${e.message}`);
    return [];
  }
}

/**
 * Obtiene los equipos específicos donde un usuario QA tiene casos asignados.
 * @param {string} qaUsername - El nombre de usuario LDAP del QA.
 * @return {object} Un objeto con el resultado de la búsqueda de equipos.
 */
function getQaUserTeams(qaUsername) {
  if (!qaUsername) {
    return { success: false, message: "Nombre de usuario no proporcionado." };
  }
  const searchUsername = String(qaUsername).trim();
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    const sheet = ss.getSheetByName("Base_Datos");
    if (!sheet) {
      return { success: false, message: "Error de configuración: Hoja de datos no encontrada." };
    }
    const headerRowIndex = sheet.getFrozenRows() || 1;
    const lastRow = sheet.getLastRow();
    if (lastRow <= headerRowIndex) {
      return { success: false, message: "No hay datos disponibles." };
    }
    // --- Indexado de columnas para acceso rápido ---
    const ldapColIdx = getColumnIndex(sheet, COL_USUARIO_LDAP);
    const teamColIdx = getColumnIndex(sheet, "TEAM");
    const cierreColIdx = getColumnIndex(sheet, COL_CONTROL_CIERRE);

    if (ldapColIdx === -1 || teamColIdx === -1) {
      return { success: false, message: "Error de configuración: Columnas requeridas no encontradas." };
    }
    // Obtener todos los datos
    const allData = sheet.getRange(headerRowIndex + 1, 1, lastRow - headerRowIndex, sheet.getLastColumn()).getValues();
    const userTeams = new Set();

    // Filtrar equipos donde el usuario tiene casos pendientes (sin cierre)
    allData.forEach(row => {
      const ldapValue = String(row[ldapColIdx - 1]).trim();
      const teamValue = String(row[teamColIdx - 1]).trim();
      const cierreValue = cierreColIdx !== -1 ? String(row[cierreColIdx - 1]).trim() : '';
      
      if (ldapValue === searchUsername && 
          teamValue && 
          (!cierreValue || cierreValue === '')) {
        userTeams.add(teamValue);
      }
    });

    const teamsArray = Array.from(userTeams).sort();
    Logger.log(`Equipos encontrados para QA ${searchUsername}: ${teamsArray.join(', ')}`);
    
    return {
      success: true,
      teams: teamsArray,
      message: teamsArray.length > 0 ? 
        `Se encontraron ${teamsArray.length} equipo(s) con casos pendientes.` : 
        "No se encontraron equipos con casos pendientes."
    };
    
  } catch (e) {
    Logger.log(`Error en getQaUserTeams: ${e.message}`);
    return { success: false, message: `Error interno del servidor: ${e.message}` };
  }
}

// =============================
// 6. GESTIÓN DE ASIGNACIONES Y CASOS
// =============================

/**
 * Obtiene la lista de usuarios LDAP únicos desde todas las hojas de asignaciones.
 * @return {Array} Lista de usuarios LDAP únicos.
 */
function getLDAPUsers() {
  var cache = CacheService.getScriptCache();
  var cachedUsers = cache.get('ldap_users_list');
  if (cachedUsers != null) return JSON.parse(cachedUsers);

  let allUsers = [];
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    var sheets = ss.getSheets();
    sheets.forEach(sheet => {
      if (sheet.getName().startsWith("_")) return;
      var ldapColIndex = getColumnIndex(sheet, COL_USUARIO_LDAP);
      if (ldapColIndex === -1) return;
      var lastRow = sheet.getLastRow();
      var headerRow = sheet.getFrozenRows() || 1;
      if (lastRow <= headerRow) return;
      var users = sheet.getRange(headerRow + 1, ldapColIndex, lastRow - headerRow, 1).getValues();
      allUsers = allUsers.concat(users.flat().map(u => String(u || '').trim()).filter(Boolean));
    });
    const uniqueSortedUsers = [...new Set(allUsers)].sort();
    cache.put('ldap_users_list', JSON.stringify(uniqueSortedUsers), 21600); // Cache por 6 horas
    return uniqueSortedUsers;
  } catch (e) {
    Logger.log(`Error en getLDAPUsers: ${e.message}`);
    return [];
  }
}

/**
 * Limpia la caché de la lista de usuarios LDAP para forzar una recarga desde la hoja de cálculo.
 * @return {object} Resultado de la operación de limpieza.
 */
function limpiarCacheUsuariosLDAP() {
  try {
    CacheService.getScriptCache().remove('ldap_users_list');
    Logger.log('La caché de usuarios LDAP ha sido eliminada por un administrador.');
    return { success: true, message: 'La caché de usuarios ha sido limpiada exitosamente.' };
  } catch (e) {
    Logger.log(`Error al limpiar la caché de usuarios LDAP: ${e.message}`);
    throw new Error(`Error del servidor al limpiar la caché: ${e.message}`);
  }
}

/**
 * Obtiene las asignaciones de casos para un usuario LDAP y equipo específicos.
 * @param {string} ldap - Usuario LDAP.
 * @param {string} team - Equipo del usuario.
 * @return {object} Objeto con headers y datos de asignaciones.
 */
function getAssignments(ldap, team) {
  if (!ldap || !team) return { headers: [], data: [] };
  const searchLdap = String(ldap).trim();
  const searchTeam = String(team).trim();

  // Nombres exactos de las columnas requeridas y en el orden correcto
  const columnasRequeridas = [
    "Fecha y hora de la asignación",
    "Interacción",
    "#Caso",
    "Sample Date",
    "Oficina",
    "Canal",
    "Proceso",
    "Tipo de accion",
    "Usuario LDAP",
    "Link"
  ];

  // También necesitamos los índices de Control Apertura Url y Control Cierre Url
  const columnaApertura = "Control Apertura Url";
  const columnaCierre = "Control Cierre Url";

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    const sheet = ss.getSheetByName("Base_Datos");
    if (!sheet) return { headers: [], data: [] };

    const headerRowIndex = sheet.getFrozenRows() || 1;
    let headers = sheet.getRange(headerRowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Obtener los índices de las columnas requeridas
    const indices = columnasRequeridas.map(colName => headers.findIndex(h => String(h).trim() === colName));
    if (indices.some(idx => idx === -1)) return { headers: columnasRequeridas, data: [] };

    // Índices para control de apertura y cierre
    const aperturaColIdx = headers.findIndex(h => String(h).trim() === columnaApertura);
    const cierreColIdx = headers.findIndex(h => String(h).trim() === columnaCierre);
    const teamBuColIdx = getColumnIndex(sheet, "TEAM");
    const ldapColIdx = indices[8]; // Usuario LDAP
    if (ldapColIdx === -1 || cierreColIdx === -1 || teamBuColIdx === -1) return { headers: [...columnasRequeridas, columnaApertura, columnaCierre, 'rowIndex'], data: [] };

    const lastDataRow = sheet.getLastRow();
    if (lastDataRow <= headerRowIndex) return { headers: [...columnasRequeridas, columnaApertura, columnaCierre, 'rowIndex'], data: [] };

    const allData = sheet.getRange(headerRowIndex + 1, 1, lastDataRow - headerRowIndex, sheet.getLastColumn()).getDisplayValues();
    const dataRows = [];

    allData.forEach((rowData, index) => {
      const ldapValue = rowData[ldapColIdx];
      const cierreValue = rowData[cierreColIdx];
      const teamValue = rowData[teamBuColIdx - 1];
      if (
        String(ldapValue).trim() === searchLdap &&
        String(teamValue).trim() === searchTeam &&
        (cierreValue == null || String(cierreValue).trim() === '')
      ) {
        // Solo incluir las columnas requeridas y en el orden correcto
        const filteredRow = indices.map(idx => rowData[idx]);
        // Agregar los campos de control apertura y cierre, y el rowIndex real de la hoja
        filteredRow.push(
          aperturaColIdx !== -1 ? rowData[aperturaColIdx] : '',
          cierreColIdx !== -1 ? rowData[cierreColIdx] : '',
          headerRowIndex + 1 + index
        );
        dataRows.push(filteredRow);
      }
    });

    return { headers: [...columnasRequeridas, columnaApertura, columnaCierre, 'rowIndex'], data: dataRows };
  } catch (e) {
    Logger.log(`FATAL ERROR en getAssignments: ${e.message}`);
    return { headers: [...columnasRequeridas, columnaApertura, columnaCierre, 'rowIndex'], data: [] };
  }
}

/**
 * Finaliza la gestión de un caso y marca las marcas EG y CI correspondientes.
 * @param {object} params - Parámetros de finalización (team, caseNumber, rowIndex, marcasEG, marcasCI).
 * @return {string} Mensaje de confirmación.
 */
function finalizarYMarcarGestion(params) {
  const { team, caseNumber, rowIndex, marcasEG, marcasCI } = params;
  if (!team || !caseNumber || !rowIndex || !Array.isArray(marcasEG) || !Array.isArray(marcasCI)) {
    throw new Error("Parámetros incompletos para finalizar la gestión.");
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    // Siempre usar la hoja Base_Datos
    const sheet = ss.getSheetByName("Base_Datos");
    if (!sheet) throw new Error(`Hoja 'Base_Datos' no encontrada.`);

    // --- Indexado de columnas para acceso rápido ---
    const marcaEGColIdx = getColumnIndex(sheet, COL_MARCA_EG);
    const marcaCIColIdx = getColumnIndex(sheet, COL_MARCA_CI);
    const cierreColIdx = getColumnIndex(sheet, COL_CONTROL_CIERRE);
    const caseColIdx = getColumnIndex(sheet, COL_CASO); 

    if ([marcaEGColIdx, marcaCIColIdx, cierreColIdx, caseColIdx].includes(-1)) {
      throw new Error(`Una o más columnas de configuración no se encontraron en 'Base_Datos'.`);
    }

    const sheetRowToUpdate = parseInt(rowIndex, 10);
    if (isNaN(sheetRowToUpdate) || sheetRowToUpdate <= 0) {
      throw new Error(`El identificador de fila [${rowIndex}] es inválido.`);
    }
    
    const caseInSheet = sheet.getRange(sheetRowToUpdate, caseColIdx).getDisplayValue();
    if (String(caseInSheet).trim() !== String(caseNumber).trim()) {
      Logger.log(`Fallo de verificación. Caso en Sheet: '${caseInSheet}', Caso esperado: '${caseNumber}' en fila ${sheetRowToUpdate}`);
      throw new Error("Verificación de fila falló. El caso puede haber cambiado o ya no existe.");
    }

    const now = new Date();
    const formattedTimestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), DATETIME_FORMAT);
    
    sheet.getRange(sheetRowToUpdate, marcaEGColIdx).setValue(marcasEG.join(', '));
    sheet.getRange(sheetRowToUpdate, marcaCIColIdx).setValue(marcasCI.join(', '));
    sheet.getRange(sheetRowToUpdate, cierreColIdx).setValue(formattedTimestamp);

    Logger.log(`Gestión finalizada y marcada en fila ${sheetRowToUpdate} para el caso ${caseNumber}.`);
    return `Caso #${caseNumber} finalizado y marcado exitosamente.`;

  } catch (e) {
    Logger.log(`Error en finalizarYMarcarGestion: ${e.message}`);
    throw new Error(`Error del servidor al finalizar: ${e.message}`);
  }
}

/**
 * Registra el timestamp de apertura de un enlace para un caso específico.
 * @param {string} team - Equipo del usuario.
 * @param {string} ldap - Usuario LDAP.
 * @param {string} caseNumber - Número de caso.
 * @param {string} interactionId - ID de interacción.
 * @param {string} type - Tipo de acción (solo 'apertura' es válido).
 * @return {string} Mensaje de confirmación.
 */
function recordTimestamp(team, ldap, caseNumber, interactionId, type) {
  if (String(type).trim().toLowerCase() !== 'apertura') {
    Logger.log(`recordTimestamp: Tipo no válido - ${type}`);
    return;
  }

  try {
    Logger.log(`recordTimestamp: Iniciando registro para LDAP=${ldap}, Caso=${caseNumber}, Interacción=${interactionId}, Team=${team}`);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    const sheet = ss.getSheetByName("Base_Datos");
    if (!sheet) {
      Logger.log(`recordTimestamp: Error - Hoja 'Base_Datos' no encontrada`);
      throw new Error(`La hoja 'Base_Datos' no fue encontrada.`);
    }

    // --- Indexado de columnas para acceso rápido ---
    const ldapColIdx = getColumnIndex(sheet, COL_USUARIO_LDAP);
    const caseColIdx = getColumnIndex(sheet, COL_CASO);
    const interaccionColIdx = getColumnIndex(sheet, COL_INTERACCION);
    const targetColIdx = getColumnIndex(sheet, COL_CONTROL_APERTURA);

    Logger.log(`recordTimestamp: Índices de columnas - LDAP:${ldapColIdx}, Caso:${caseColIdx}, Interacción:${interaccionColIdx}, Target:${targetColIdx}`);

    if ([ldapColIdx, caseColIdx, interaccionColIdx, targetColIdx].includes(-1)) {
      Logger.log(`recordTimestamp: Error - Columnas de apertura no encontradas`);
      throw new Error(`Columnas de apertura no encontradas.`);
    }

    // Obtener headers para verificar nombres de columnas
    const headerRow = sheet.getFrozenRows() || 1;
    const headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log(`recordTimestamp: Headers encontrados: ${headers.join(', ')}`);

    const data = sheet.getDataRange().getValues();
    Logger.log(`recordTimestamp: Buscando en ${data.length - headerRow} filas de datos`);
    Logger.log(`recordTimestamp: Criterios de búsqueda - LDAP: "${ldap}", Caso: "${caseNumber}", Interacción: "${interactionId}"`);

    let rowIndexFound = -1;
    let matchCount = 0;

    for (let i = headerRow; i < data.length; i++) {
      const rowLdap = String(data[i][ldapColIdx - 1] || '').trim();
      const rowCase = String(data[i][caseColIdx - 1] || '').trim();
      const rowInteraction = String(data[i][interaccionColIdx - 1] || '').trim();
      
      // Log para debugging
      if (i < headerRow + 5) { // Solo log las primeras 5 filas para no saturar
        Logger.log(`recordTimestamp: Fila ${i + 1} - LDAP: "${rowLdap}", Caso: "${rowCase}", Interacción: "${rowInteraction}"`);
      }
      
      if (rowLdap === ldap && rowCase === caseNumber && rowInteraction === interactionId) {
        rowIndexFound = i;
        matchCount++;
        Logger.log(`recordTimestamp: ¡MATCH ENCONTRADO! Fila ${i + 1} - LDAP: "${rowLdap}", Caso: "${rowCase}", Interacción: "${rowInteraction}"`);
        break;
      }
    }

    Logger.log(`recordTimestamp: Total de matches encontrados: ${matchCount}`);

    if (rowIndexFound === -1) {
      Logger.log(`recordTimestamp: No se encontró la fila para LDAP=${ldap}, Caso=${caseNumber}, Interacción=${interactionId}`);
      return `No se encontró el registro especificado.`;
    }

    const sheetRowIndexToUpdate = rowIndexFound + 1;
    const targetCell = sheet.getRange(sheetRowIndexToUpdate, targetColIdx);
    const currentValue = targetCell.getValue();
    
    Logger.log(`recordTimestamp: Valor actual en celda (${sheetRowIndexToUpdate}, ${targetColIdx}): "${currentValue}"`);

    if (!currentValue || String(currentValue).trim() === '') {
      const now = new Date();
      const formattedTimestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), DATETIME_FORMAT);
      
      Logger.log(`recordTimestamp: Intentando escribir timestamp: "${formattedTimestamp}" en celda (${sheetRowIndexToUpdate}, ${targetColIdx})`);
      
      try {
        targetCell.setValue(formattedTimestamp);
        
        // Verificar que se escribió correctamente
        const verificationValue = targetCell.getValue();
        Logger.log(`recordTimestamp: Verificación - valor después de escribir: "${verificationValue}"`);
        
        if (verificationValue && String(verificationValue).trim() !== '') {
          Logger.log(`recordTimestamp: Timestamp registrado exitosamente: ${formattedTimestamp}`);
          return `Acción de apertura registrada.`;
        } else {
          Logger.log(`recordTimestamp: ERROR - El valor no se guardó correctamente`);
          throw new Error("El timestamp no se pudo guardar en la base de datos.");
        }
      } catch (writeError) {
        Logger.log(`recordTimestamp: Error al escribir en la celda: ${writeError.message}`);
        throw new Error(`Error al escribir en la base de datos: ${writeError.message}`);
      }
    } else {
      Logger.log(`recordTimestamp: La celda ya tiene un valor, no se sobrescribe`);
      return `La acción de apertura ya fue registrada previamente.`;
    }

  } catch (e) {
    Logger.log(`recordTimestamp: Error - ${e.message}`);
    throw new Error(`Error al registrar timestamp: ${e.message}`);
  }
}

/**
 * Función de prueba para verificar el registro de timestamp de apertura.
 * @param {string} ldap - Usuario LDAP para probar.
 * @param {string} caseNumber - Número de caso para probar.
 * @param {string} interactionId - ID de interacción para probar.
 * @return {object} Resultado de la prueba.
 */
function probarRegistroTimestamp(ldap, caseNumber, interactionId) {
  try {
    Logger.log(`probarRegistroTimestamp: Iniciando prueba para LDAP=${ldap}, Caso=${caseNumber}, Interacción=${interactionId}`);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    const sheet = ss.getSheetByName("Base_Datos");
    if (!sheet) {
      return { success: false, error: "Hoja 'Base_Datos' no encontrada" };
    }

    // Verificar permisos de escritura
    try {
      const testCell = sheet.getRange(1, 1);
      const originalValue = testCell.getValue();
      testCell.setValue("TEST_PERMISOS");
      testCell.setValue(originalValue);
      Logger.log(`probarRegistroTimestamp: Permisos de escritura OK`);
    } catch (permError) {
      return { success: false, error: `Sin permisos de escritura: ${permError.message}` };
    }

    // Obtener información de columnas
    const headerRow = sheet.getFrozenRows() || 1;
    const headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const ldapColIdx = getColumnIndex(sheet, COL_USUARIO_LDAP);
    const caseColIdx = getColumnIndex(sheet, COL_CASO);
    const interaccionColIdx = getColumnIndex(sheet, COL_INTERACCION);
    const targetColIdx = getColumnIndex(sheet, COL_CONTROL_APERTURA);

    const columnInfo = {
      ldap: { name: COL_USUARIO_LDAP, index: ldapColIdx, found: ldapColIdx !== -1 },
      caso: { name: COL_CASO, index: caseColIdx, found: caseColIdx !== -1 },
      interaccion: { name: COL_INTERACCION, index: interaccionColIdx, found: interaccionColIdx !== -1 },
      apertura: { name: COL_CONTROL_APERTURA, index: targetColIdx, found: targetColIdx !== -1 }
    };

    // Buscar la fila
    const data = sheet.getDataRange().getValues();
    let foundRow = null;
    let matchCount = 0;

    for (let i = headerRow; i < data.length; i++) {
      const rowLdap = String(data[i][ldapColIdx - 1] || '').trim();
      const rowCase = String(data[i][caseColIdx - 1] || '').trim();
      const rowInteraction = String(data[i][interaccionColIdx - 1] || '').trim();
      
      if (rowLdap === ldap && rowCase === caseNumber && rowInteraction === interactionId) {
        foundRow = {
          index: i + 1,
          ldap: rowLdap,
          caso: rowCase,
          interaccion: rowInteraction,
          aperturaActual: data[i][targetColIdx - 1] || ''
        };
        matchCount++;
      }
    }

    return {
      success: true,
      headers: headers,
      columnInfo: columnInfo,
      totalRows: data.length - headerRow,
      matchCount: matchCount,
      foundRow: foundRow,
      searchCriteria: { ldap, caseNumber, interactionId }
    };

  } catch (e) {
    Logger.log(`probarRegistroTimestamp: Error - ${e.message}`);
    return { success: false, error: e.message };
  }
}

/**
 * Verifica la estructura de la hoja de cálculo y los nombres de las columnas.
 * @return {object} Información detallada sobre la estructura de la hoja.
 */
function verificarEstructuraHoja() {
  try {
    Logger.log(`verificarEstructuraHoja: Iniciando verificación de estructura`);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    const sheet = ss.getSheetByName("Base_Datos");
    if (!sheet) {
      return { success: false, error: "Hoja 'Base_Datos' no encontrada" };
    }

    const headerRow = sheet.getFrozenRows() || 1;
    const headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    Logger.log(`verificarEstructuraHoja: Headers encontrados: ${headers.join(', ')}`);

    // Verificar cada columna esperada
    const columnasEsperadas = [
      COL_USUARIO_LDAP,
      COL_CASO,
      COL_INTERACCION,
      COL_CONTROL_APERTURA,
      COL_CONTROL_CIERRE,
      "TEAM"
    ];

    const resultados = {};
    columnasEsperadas.forEach(colName => {
      const index = getColumnIndex(sheet, colName);
      const found = index !== -1;
      const actualName = found ? headers[index - 1] : null;
      
      resultados[colName] = {
        esperado: colName,
        encontrado: found,
        indice: index,
        nombreReal: actualName,
        coincide: found && String(actualName).trim().toLowerCase() === String(colName).trim().toLowerCase()
      };
    });

    // Verificar permisos de escritura
    let permisosEscritura = false;
    try {
      const testCell = sheet.getRange(1, 1);
      const originalValue = testCell.getValue();
      testCell.setValue("TEST_PERMISOS");
      testCell.setValue(originalValue);
      permisosEscritura = true;
    } catch (permError) {
      permisosEscritura = false;
    }

    return {
      success: true,
      hoja: "Base_Datos",
      totalColumnas: headers.length,
      filaHeader: headerRow,
      headers: headers,
      columnasEsperadas: resultados,
      permisosEscritura: permisosEscritura,
      recomendaciones: generarRecomendaciones(resultados)
    };

  } catch (e) {
    Logger.log(`verificarEstructuraHoja: Error - ${e.message}`);
    return { success: false, error: e.message };
  }
}

/**
 * Genera recomendaciones basadas en los resultados de la verificación.
 * @param {object} resultados - Resultados de la verificación de columnas.
 * @return {Array} Lista de recomendaciones.
 */
function generarRecomendaciones(resultados) {
  const recomendaciones = [];
  
  Object.keys(resultados).forEach(colName => {
    const resultado = resultados[colName];
    
    if (!resultado.encontrado) {
      recomendaciones.push(`❌ Columna "${colName}" NO ENCONTRADA. Verifique que exista en la hoja.`);
    } else if (!resultado.coincide) {
      recomendaciones.push(`⚠️ Columna "${colName}" encontrada pero con nombre diferente: "${resultado.nombreReal}". Verifique mayúsculas/minúsculas y espacios.`);
    } else {
      recomendaciones.push(`✅ Columna "${colName}" encontrada correctamente en posición ${resultado.indice}.`);
    }
  });
  
  return recomendaciones;
}

// =============================
// 7. GESTIÓN DE SEGUIMIENTO QA
// =============================

/**
 * Guarda un nuevo registro QA en la hoja de seguimiento.
 * @param {Array} datos - Array con los datos del registro QA.
 * @return {string} Mensaje de confirmación.
 */
function guardarEnSheetsQA(datos) {
  try {
    if (!Array.isArray(datos) || datos.length < 7 || datos.slice(1, 7).some(d => d == null || String(d).trim() === '')) {
      throw new Error("Datos para el registro QA están incompletos o son inválidos.");
    }
    var hoja = SpreadsheetApp.openById(SPREADSHEET_ID_QA).getSheetByName(QA_SHEET_NAME);
    if (!hoja) throw new Error(`Hoja de registros QA no encontrada.`);

    var now = new Date();
    var formattedTimestampRegistro = Utilities.formatDate(now, Session.getScriptTimeZone(), DATETIME_FORMAT);

    hoja.appendRow([
      formattedTimestampRegistro,
      String(datos[1]).trim(), String(datos[2]).trim(), String(datos[3]).trim(),
      String(datos[4]).trim(), String(datos[5]).trim(), String(datos[6]).trim(),
      "Pendiente de revisión", "", "", "", "", ""
    ]);
    return "Nuevo registro QA guardado exitosamente.";
  } catch (e) {
    Logger.log(`Error en guardarEnSheetsQA: ${e.message}`);
    throw new Error(`Error del servidor al guardar el registro QA: ${e.message}`);
  }
}

/**
 * Parsea una cadena de fecha en formato GAS a objeto Date.
 * @param {string} dateString - Cadena de fecha a parsear.
 * @return {Date|null} Objeto Date o null si no se puede parsear.
 */
function parseGASDateString(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  const matchDateTime = dateString.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4}),?\s*(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (!matchDateTime) return null;
  
  try {
    const day = parseInt(matchDateTime[1], 10);
    const month = parseInt(matchDateTime[2], 10) - 1;
    const year = parseInt(matchDateTime[3], 10);
    let hour = parseInt(matchDateTime[4], 10);
    const minute = parseInt(matchDateTime[5], 10);
    const second = parseInt(matchDateTime[6], 10);
    const ampm = matchDateTime[7].toUpperCase();

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    
    return new Date(year, month, day, hour, minute, second);
  } catch(e) {
    return null;
  }
}

/**
 * Obtiene los registros QA según el rol del usuario.
 * @param {object} userInfo - Información del usuario actual.
 * @return {Array} Array con headers y datos de registros QA.
 */
function obtenerRegistrosQA(userInfo) {
  try {
    if (!userInfo || !userInfo.rol || !userInfo.username) {
      Logger.log("obtenerRegistrosQA: Información de usuario inválida o incompleta.");
      return [];
    }
    const userRol = userInfo.rol;
    const usernameLower = userInfo.username.toLowerCase();

    var hoja = SpreadsheetApp.openById(SPREADSHEET_ID_QA).getSheetByName(QA_SHEET_NAME);
    if (!hoja) return [];

    var lastRow = hoja.getLastRow();
    var headerRowIndex = hoja.getFrozenRows() || 1;

    if (lastRow < headerRowIndex + 1) {
      return [hoja.getRange(headerRowIndex, 1, 1, hoja.getLastColumn()).getDisplayValues()[0]];
    }
    
    var dataRange = hoja.getRange(headerRowIndex, 1, lastRow - headerRowIndex + 1, hoja.getLastColumn());
    var allDataDisplayValues = dataRange.getDisplayValues();

    var header = allDataDisplayValues[0];
    var dataRows = allDataDisplayValues.slice(1);

    const fechaRegIdx = header.map(h => String(h).trim().toUpperCase()).indexOf(COL_QA_FECHA_REGISTRO.toUpperCase());
    if (fechaRegIdx > -1) {
      dataRows.sort((a, b) => {
        const dateA = parseGASDateString(a[fechaRegIdx]);
        const dateB = parseGASDateString(b[fechaRegIdx]);
        if (dateA && dateB) return dateB.getTime() - dateA.getTime();
        return 0;
      });
    }
    
    const ldapQaIdx = header.map(h => String(h).trim().toUpperCase()).indexOf(COL_QA_LDAP_QA.toUpperCase());
    const vistoMeliIdx = header.map(h => String(h).trim().toUpperCase()).indexOf(COL_QA_VISTO_MELI.toUpperCase());
    const vistoFormacionIdx = header.map(h => String(h).trim().toUpperCase()).indexOf(COL_QA_VISTO_FORMACION.toUpperCase());

    let filteredDataRows = [];

    if (userRol === 'Administrador') {
      filteredDataRows = dataRows;
    } else if (userRol === 'QA' && ldapQaIdx > -1) {
      filteredDataRows = dataRows.filter(row => row && row.length > ldapQaIdx && String(row[ldapQaIdx]).trim().toLowerCase() === usernameLower);
    } else if (userRol === 'QS' && vistoMeliIdx > -1 && vistoFormacionIdx > -1) {
      filteredDataRows = dataRows.filter(row => 
        row && row.length > Math.max(vistoMeliIdx, vistoFormacionIdx) &&
        String(row[vistoMeliIdx]).trim().toLowerCase() === 'sí' &&
        String(row[vistoFormacionIdx]).trim().toLowerCase() === 'sí'
      );
    } else {
      filteredDataRows = dataRows;
    }
    
    return [header, ...filteredDataRows];

  } catch (e) {
    Logger.log(`Error en obtenerRegistrosQA para ${userInfo ? userInfo.username : 'desconocido'}: ${e.message}`);
    return [];
  }
}

/**
 * Actualiza un registro QA existente con nueva información.
 * @param {string} registroId - ID del registro a actualizar.
 * @param {string} nuevoEstado - Nuevo estado del registro.
 * @param {string} nuevaRespuesta - Nueva respuesta del administrador.
 * @param {string} vistoFormacion - Estado de visto formación.
 * @param {string} vistoMeli - Estado de visto Meli.
 * @param {string} expectedCaso - Número de caso esperado.
 * @param {string} respuestaQS - Respuesta del QS.
 * @param {string} ldapQaQueRegistro - LDAP del QA que registró.
 * @param {object} userInfo - Información del usuario actual.
 * @param {string} complejidad - Nivel de complejidad.
 * @param {string} comentarioAdicional - Comentario adicional.
 * @return {string} Mensaje de confirmación.
 */
function actualizarRegistroQA(registroId, nuevoEstado, nuevaRespuesta, vistoFormacion, vistoMeli, expectedCaso, respuestaQS, ldapQaQueRegistro, userInfo, complejidad, comentarioAdicional) {
  try {
    const cleanRegistroId = String(registroId).trim();
    const cleanExpectedCaso = String(expectedCaso).trim();

    var hoja = SpreadsheetApp.openById(SPREADSHEET_ID_QA).getSheetByName(QA_SHEET_NAME);
    if (!hoja) throw new Error(`Hoja de registros QA no encontrada.`);

    const columnNames = {
      fechaRegIdx: COL_QA_FECHA_REGISTRO,
      casoIdx: COL_QA_CASO,
      estadoIdx: COL_QA_ESTADO,
      respuestaIdx: COL_QA_RESPUESTA,
      respuestaQsIdx: COL_QA_RESPUESTA_QS,
      fechaRespIdx: COL_QA_FECHA_RESPUESTA,
      formacionIdx: COL_QA_VISTO_FORMACION,
      meliIdx: COL_QA_VISTO_MELI
    };

    const columnIndexes = {};
    const missingColumns = [];

    for (const key in columnNames) {
      const colName = columnNames[key];
      const index = getColumnIndex(hoja, colName);
      if (index === -1) {
        missingColumns.push(colName);
      }
      columnIndexes[key] = index;
    }

    // NUEVO: índices para criticidad y comentario adicional
    const criticidadIdx = getColumnIndex(hoja, COL_QA_CRITICIDAD_QA);
    const comentarioAdicionalIdx = getColumnIndex(hoja, COL_QA_COMENTARIO_BRM);
    if (criticidadIdx === -1) missingColumns.push(COL_QA_CRITICIDAD_QA);
    if (comentarioAdicionalIdx === -1) missingColumns.push(COL_QA_COMENTARIO_BRM);

    if (missingColumns.length > 0) {
      throw new Error(`Las siguientes columnas esenciales no se encontraron en la hoja QA: [${missingColumns.join(', ')}]. Por favor, verifique que los nombres de las columnas en la hoja de cálculo coincidan exactamente con los esperados, incluyendo acentos y espacios.`);
    }

    var dataDisplayValues = hoja.getDataRange().getDisplayValues();
    var headerRowIndex = hoja.getFrozenRows() || 1;
    var rowIndexToUpdate = -1;

    for (var i = headerRowIndex; i < dataDisplayValues.length; i++) {
      let fechaEnHojaFormateada = String(dataDisplayValues[i][columnIndexes.fechaRegIdx - 1] || '').trim();
      let casoEnHoja = String(dataDisplayValues[i][columnIndexes.casoIdx - 1] || '').trim();
      if (fechaEnHojaFormateada === cleanRegistroId && casoEnHoja === cleanExpectedCaso) {
        rowIndexToUpdate = i;
        break;
      }
    }

    if (rowIndexToUpdate === -1) {
      throw new Error(`No se encontró el registro QA especificado.`);
    }

    var sheetRowIndex = rowIndexToUpdate + 1;
    const validVistoOptions = ["Sí", "No", ""];
    
    hoja.getRange(sheetRowIndex, columnIndexes.estadoIdx).setValue(nuevoEstado);
    hoja.getRange(sheetRowIndex, columnIndexes.respuestaIdx).setValue(nuevaRespuesta);
    hoja.getRange(sheetRowIndex, columnIndexes.respuestaQsIdx).setValue(respuestaQS);
    hoja.getRange(sheetRowIndex, columnIndexes.formacionIdx).setValue(validVistoOptions.includes(String(vistoFormacion)) ? String(vistoFormacion) : "");
    hoja.getRange(sheetRowIndex, columnIndexes.meliIdx).setValue(validVistoOptions.includes(String(vistoMeli)) ? String(vistoMeli) : "");

    // NUEVO: Actualizar criticidad y comentario adicional
    hoja.getRange(sheetRowIndex, criticidadIdx).setValue(complejidad);
    hoja.getRange(sheetRowIndex, comentarioAdicionalIdx).setValue(comentarioAdicional);

    if (String(nuevoEstado).trim() !== "" || String(nuevaRespuesta).trim() !== "" || String(respuestaQS).trim() !== "") {
      var now = new Date();
      var formattedTimestampRespuesta = Utilities.formatDate(now, Session.getScriptTimeZone(), DATETIME_FORMAT);
      hoja.getRange(sheetRowIndex, columnIndexes.fechaRespIdx).setValue(formattedTimestampRespuesta);
    } else {
      hoja.getRange(sheetRowIndex, columnIndexes.fechaRespIdx).setValue("");
    }

    const properties = PropertiesService.getScriptProperties();
    const notifiedRecordsStr = properties.getProperty('NOTIFIED_RECORDS');
    const notifiedRecords = notifiedRecordsStr ? JSON.parse(notifiedRecordsStr) : [];
    const notificationKey = `${cleanRegistroId}__${cleanExpectedCaso}`;

    if (notifiedRecords.includes(notificationKey)) {
      return "Registro QA actualizado exitosamente. (Notificación ya enviada previamente).";
    }

    let notificationScheduled = false;

    if (userInfo.rol === 'Administrador' && vistoFormacion === 'Sí' && vistoMeli === 'No') {
      const message = `Su consulta para el caso #${expectedCaso} ha sido respondida por el Administrador.`;
      scheduleNotification(ldapQaQueRegistro, message, notificationKey);
      notificationScheduled = true;
    } 
    else if (userInfo.rol === 'QS' && vistoMeli === 'Sí' && (respuestaQS || '').trim() !== '') {
      const message = `Su consulta para el caso #${expectedCaso} ha sido respondida por QS.`;
      scheduleNotification(ldapQaQueRegistro, message, notificationKey);
      notificationScheduled = true;
    }

    if (notificationScheduled) {
      return "Registro QA actualizado exitosamente. Se programó una notificación para el usuario original.";
    } else {
      return "Registro QA actualizado exitosamente.";
    }

  } catch (e) {
    Logger.log(`Error en actualizarRegistroQA: ${e.message}`);
    throw new Error(`Error del servidor al actualizar el registro QA: ${e.message}`);
  }
}

// =============================
// 8. SISTEMA DE NOTIFICACIONES
// =============================

/**
 * Programa una notificación para un usuario y la registra para evitar duplicados.
 * @param {string} targetUserLdap - El usuario LDAP que recibirá la notificación.
 * @param {string} message - El mensaje de la notificación.
 * @param {string} notificationKey - La clave única del registro para evitar duplicados.
 */
function scheduleNotification(targetUserLdap, message, notificationKey) {
  const properties = PropertiesService.getScriptProperties();
  
  const userNotificationsKey = `PENDING_NOTIFICATIONS_${targetUserLdap.trim().toUpperCase()}`;
  const pendingNotificationsStr = properties.getProperty(userNotificationsKey);
  const pendingNotifications = pendingNotificationsStr ? JSON.parse(pendingNotificationsStr) : [];
  pendingNotifications.push(message);
  properties.setProperty(userNotificationsKey, JSON.stringify(pendingNotifications));

  const notifiedRecordsStr = properties.getProperty('NOTIFIED_RECORDS');
  const notifiedRecords = notifiedRecordsStr ? JSON.parse(notifiedRecordsStr) : [];
  if (!notifiedRecords.includes(notificationKey)) {
    notifiedRecords.push(notificationKey);
    properties.setProperty('NOTIFIED_RECORDS', JSON.stringify(notifiedRecords));
  }
}

/**
 * Revisa si el usuario actual tiene notificaciones pendientes.
 * @param {object} userInfo - El objeto del usuario actual.
 * @return {string[]} Un array con los mensajes de notificación.
 */
function checkForNotifications(userInfo) {
  if (!userInfo || !userInfo.username) return [];
  const properties = PropertiesService.getScriptProperties();
  const userNotificationsKey = `PENDING_NOTIFICATIONS_${userInfo.username.trim().toUpperCase()}`;
  
  const pendingNotificationsStr = properties.getProperty(userNotificationsKey);
  if (pendingNotificationsStr) {
    const notifications = JSON.parse(pendingNotificationsStr);
    properties.deleteProperty(userNotificationsKey); // Limpiar notificaciones después de obtenerlas
    return notifications;
  }
  return [];
}

// =============================
// 9. FUNCIONES DE DIAGNÓSTICO
// =============================

/**
 * Función de diagnóstico para verificar la estructura de la base de datos.
 * @param {string} ldap - Usuario LDAP para buscar.
 * @param {string} caseNumber - Número de caso para buscar.
 * @param {string} interactionId - ID de interacción para buscar.
 * @return {object} Información de diagnóstico.
 */
function diagnosticarRecordTimestamp(ldap, caseNumber, interactionId) {
  try {
    Logger.log(`diagnosticarRecordTimestamp: Iniciando diagnóstico para LDAP=${ldap}, Caso=${caseNumber}, Interacción=${interactionId}`);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    const sheet = ss.getSheetByName("Base_Datos");
    if (!sheet) {
      return { error: "Hoja 'Base_Datos' no encontrada" };
    }

    const headerRow = sheet.getFrozenRows() || 1;
    const headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const ldapColIdx = getColumnIndex(sheet, COL_USUARIO_LDAP);
    const caseColIdx = getColumnIndex(sheet, COL_CASO);
    const interaccionColIdx = getColumnIndex(sheet, COL_INTERACCION);
    const targetColIdx = getColumnIndex(sheet, COL_CONTROL_APERTURA);

    const data = sheet.getDataRange().getValues();
    let foundRows = [];

    for (let i = headerRow; i < data.length; i++) {
      const rowLdap = String(data[i][ldapColIdx - 1] || '').trim();
      const rowCase = String(data[i][caseColIdx - 1] || '').trim();
      const rowInteraction = String(data[i][interaccionColIdx - 1] || '').trim();
      
      if (rowLdap === ldap && rowCase === caseNumber && rowInteraction === interactionId) {
        foundRows.push({
          rowIndex: i + 1,
          ldap: rowLdap,
          case: rowCase,
          interaction: rowInteraction,
          currentAperturaValue: data[i][targetColIdx - 1] || ''
        });
      }
    }

    return {
      success: true,
      headers: headers,
      columnIndexes: {
        ldap: ldapColIdx,
        case: caseColIdx,
        interaction: interaccionColIdx,
        apertura: targetColIdx
      },
      totalRows: data.length - headerRow,
      foundRows: foundRows,
      searchCriteria: {
        ldap: ldap,
        case: caseNumber,
        interaction: interactionId
      }
    };

  } catch (e) {
    Logger.log(`diagnosticarRecordTimestamp: Error - ${e.message}`);
    return { error: e.message };
  }
}

// =============================
// 10. FUNCIÓN PRINCIPAL DEL SISTEMA
// =============================

/**
 * Obtiene las métricas de estado ALMA para un usuario y equipo específicos.
 * @param {string} username - Usuario LDAP (opcional para administradores).
 * @param {string} team - Equipo específico (opcional).
 * @param {string} userRole - Rol del usuario actual.
 * @param {object} filters - Filtros adicionales para administradores.
 * @return {object} Objeto con métricas de estado ALMA.
 */
function getEstadoAlmaMetrics(username, team, userRole, filters) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    const sheet = ss.getSheetByName("Base_Datos");
    if (!sheet) {
      return { success: false, message: "Hoja de datos no encontrada." };
    }

    const headerRowIndex = sheet.getFrozenRows() || 1;
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= headerRowIndex) {
      return { 
        success: true, 
        metrics: { pendientes: 0, realizados: 0, aperturados: 0 } 
      };
    }

    // --- Indexado de columnas para acceso rápido ---
    const ldapColIdx = getColumnIndex(sheet, COL_USUARIO_LDAP);
    const teamColIdx = getColumnIndex(sheet, "TEAM");
    const cierreColIdx = getColumnIndex(sheet, COL_CONTROL_CIERRE);
    const aperturaColIdx = getColumnIndex(sheet, COL_CONTROL_APERTURA);
    const sampleDateColIdx = getColumnIndex(sheet, COL_SAMPLE_DATE);
    const canalColIdx = getColumnIndex(sheet, COL_CANAL);
    const procesoColIdx = getColumnIndex(sheet, COL_PROCESO);
    const tipoAccionColIdx = getColumnIndex(sheet, COL_TIPO_ACCION);
    const oficinaColIdx = getColumnIndex(sheet, COL_OFICINA);

    if ([ldapColIdx, teamColIdx, cierreColIdx, aperturaColIdx].includes(-1)) {
      return { success: false, message: "Columnas requeridas no encontradas." };
    }

    const allData = sheet.getRange(headerRowIndex + 1, 1, lastRow - headerRowIndex, sheet.getLastColumn()).getDisplayValues();
    
    let pendientes = 0;
    let realizados = 0;
    let aperturados = 0;

    allData.forEach(row => {
      const rowLdap = String(row[ldapColIdx - 1] || '').trim();
      const rowTeam = String(row[teamColIdx - 1] || '').trim();
      const rowCierre = String(row[cierreColIdx - 1] || '').trim();
      const rowApertura = String(row[aperturaColIdx - 1] || '').trim();

      // Aplicar filtros según el rol y parámetros
      let shouldInclude = true;

      // Filtro por usuario LDAP
      if (username && username.trim() !== '') {
        if (rowLdap !== username.trim()) {
          shouldInclude = false;
        }
      }

      // Filtro por equipo
      if (team && team.trim() !== '') {
        if (rowTeam !== team.trim()) {
          shouldInclude = false;
        }
      }

      // Filtros adicionales para administradores
      if (userRole === 'Administrador' && filters) {
        if (filters.sampleDate && filters.sampleDate.trim() !== '') {
          const rowSampleDate = String(row[sampleDateColIdx - 1] || '').trim();
          if (rowSampleDate !== filters.sampleDate.trim()) {
            shouldInclude = false;
          }
        }

        if (filters.canal && filters.canal.trim() !== '') {
          const rowCanal = String(row[canalColIdx - 1] || '').trim();
          if (rowCanal !== filters.canal.trim()) {
            shouldInclude = false;
          }
        }

        if (filters.procesos && filters.procesos.length > 0) {
          const rowProceso = String(row[procesoColIdx - 1] || '').trim();
          if (!filters.procesos.includes(rowProceso)) {
            shouldInclude = false;
          }
        }

        if (filters.tiposAccion && filters.tiposAccion.length > 0) {
          const rowTipoAccion = String(row[tipoAccionColIdx - 1] || '').trim();
          if (!filters.tiposAccion.includes(rowTipoAccion)) {
            shouldInclude = false;
          }
        }

        if (filters.oficinas && filters.oficinas.length > 0) {
          const rowOficina = String(row[oficinaColIdx - 1] || '').trim();
          if (!filters.oficinas.includes(rowOficina)) {
            shouldInclude = false;
          }
        }
      }

      if (!shouldInclude) return;

      // Clasificar el caso según su estado
      if (rowCierre && rowCierre.trim() !== '') {
        // Caso finalizado
        realizados++;
      } else if (rowApertura && rowApertura.trim() !== '') {
        // Caso aperturado pero no finalizado
        aperturados++;
      } else {
        // Caso pendiente (sin apertura ni cierre)
        pendientes++;
      }
    });

    return {
      success: true,
      metrics: {
        pendientes: pendientes,
        realizados: realizados,
        aperturados: aperturados
      }
    };

  } catch (e) {
    Logger.log(`Error en getEstadoAlmaMetrics: ${e.message}`);
    return { 
      success: false, 
      message: `Error interno del servidor: ${e.message}`,
      metrics: { pendientes: 0, realizados: 0, aperturados: 0 }
    };
  }
}

/**
 * Función Principal que sirve el HTML del Dashboard.
 * @return {HtmlOutput} Página HTML del sistema ALMA™.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ALMA™')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


