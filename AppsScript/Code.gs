/**
 * @OnlyCurrentDoc
 */

// --- Constantes ---
var SPREADSHEET_ID_ASIGNACIONES = "1zFfhkh_ZkPI3te31MSI0UKpI2xSS-HuNzYUGDt-uCYk"; // ID Hoja Asignaciones
var SPREADSHEET_ID_QA = "1NPCGx6v2SpGS8eQjzIa_1wbGORlGqPl2EHHAwTL7O1c"; // ID Hoja QA y Directorio
var QA_SHEET_NAME = "Registros"; // Nombre Hoja Registros QA
var USER_DIRECTORY_SHEET_NAME = "Directorio de Usuarios"; // Nombre Hoja Directorio

// --- Columnas Esperadas Asignaciones ---
var COL_USUARIO_LDAP = "ANALIZADOR";
var COL_CASO = "CASE";
var COL_INTERACCION = "INTERACTION_ID"; // *** NUEVA CONSTANTE PARA IDENTIFICAR FILA UNÍVOCA ***
var COL_FECHA_ASIGNACION = "Fecha y hora de la asignación"; // <-- NOMBRE EXACTO REQUERIDO
var COL_SIMPLE_DAY = "SAMPLE_DATE"; // <-- NOMBRE EXACTO REQUERIDO
var COL_CONTROL_APERTURA = "Control Apertura Url"; // Usado en backend Y AHORA TAMBIÉN EN FRONTEND
var COL_CONTROL_CIERRE = "Control Cierre Url"; // Usado en backend para MARCAR finalizado
var COL_LINK = "Link Alma"; // Nombre EXACTO de la columna Link
var COL_CANAL = "Canal";
var COL_PROCESO = "Proceso";
var COL_TIPO_ACCION = "Accion";
var COL_ESTADO = "ESTADO"; // Nueva columna para el estado del registro
// *** NUEVAS COLUMNAS DE GESTIÓN ***
var COL_MARCA_EG = "Marca de EG"; // Nueva columna N
var COL_MARCA_CI = "Marca de CI"; // Nueva columna O


// --- Columnas Esperadas QA ---
var COL_QA_FECHA_REGISTRO = "FECHA REGISTRO";
var COL_QA_LDAP_QA = "LDAP QA";
var COL_QA_TEAM = "TEAM";
var COL_QA_CASO = "# CASO";
var COL_QA_REP_EVALUAR = "REP A EVALUAR";
var COL_QA_PREGUNTA = "PREGUNTA";
var COL_QA_ESTADO = "ESTADO";
var COL_QA_FECHA_RESPUESTA = "FECHA DE RESPUESTA";
var COL_QA_RESPUESTA = "RESPUESTA";
var COL_QA_VISTO_FORMACION = "CASO VISTO CON FORMACIÓN";
var COL_QA_VISTO_MELI = "CASO VISTO CON MELI";

// --- Columnas Esperadas Directorio Usuarios ---
var COL_USER_NOMBRE = "Nombre";
var COL_USER_USUARIO = "Usuario";
var COL_USER_ROL = "Rol";
var COL_USER_ESTADO = "Estado";
var COL_USER_EMAIL = "Email";

// --- Formato de Fecha/Hora ---
var DATETIME_FORMAT = "dd/MM/yyyy, HH:mm:ss"; // Usado para fechas QA y otras formateadas explícitamente
var DATE_FORMAT = "dd/MM/yyyy"; // Formato de fecha simple (no usado activamente para asignaciones ahora)

// --- Función Principal ---
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Dashboard')
      .setTitle('ALMA™ - Sistema de Gestión y Control - Equipo ME')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// --- Funciones Auxiliares ---
function getColumnIndex(sheet, columnName) {
  if (!sheet || !columnName) { Logger.log(`Error en getColumnIndex: Faltan parámetros.`); return -1; }
  try {
    const headerRow = sheet.getFrozenRows() || 1;
    if (headerRow > sheet.getMaxRows() || headerRow <= 0) { Logger.log(`Error en getColumnIndex: Fila cabecera inválida (${headerRow}).`); return -1; }
    const headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    const cleanedColumnName = String(columnName).trim().toLowerCase();
    for (let i = 0; i < headers.length; i++) {
      if (headers[i] && String(headers[i]).trim().toLowerCase() === cleanedColumnName) {
        return i + 1; // Índice base 1
      }
    }
    Logger.log(`Columna "${columnName}" no encontrada en hoja "${sheet.getName()}".`); return -1;
  } catch (e) { Logger.log(`Error crítico en getColumnIndex ("${columnName}"): ${e}`); return -1; }
}

function formatCell(cellValue) {
  if (cellValue instanceof Date) {
     try {
         return Utilities.formatDate(cellValue, Session.getScriptTimeZone(), DATETIME_FORMAT);
     } catch(e){
          Logger.log(`Error formatCell fecha ${cellValue} con formato ${DATETIME_FORMAT}: ${e}.`);
          try { return cellValue.toISOString(); } catch (isoError) { return "Fecha inválida"; }
     }
  }
  return cellValue != null ? String(cellValue) : '';
}

function parseGASDateString(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  dateString = dateString.trim();
  let match = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4}),\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    try {
      let day = parseInt(match[1], 10);
      let month = parseInt(match[2], 10) - 1;
      let year = parseInt(match[3], 10);
      let hour = parseInt(match[4], 10);
      let minute = parseInt(match[5], 10);
      let second = parseInt(match[6], 10);
      let dt = new Date(year, month, day, hour, minute, second);
      if (dt.getFullYear() === year && dt.getMonth() === month && dt.getDate() === day &&
          dt.getHours() === hour && dt.getMinutes() === minute && dt.getSeconds() === second) {
          return dt;
      } else {
          Logger.log(`Error de validación de componentes al parsear fecha: ${dateString}. Objeto Date resultante: ${dt}`); return null;
      }
    } catch (e) {
      Logger.log(`Error parseando fecha string "${dateString}" en parseGASDateString: ${e}`); return null;
    }
  }
  Logger.log(`Fecha string "${dateString}" no coincide con el formato esperado "dd/MM/yyyy, HH:mm:ss".`); return null;
}
  

function verificarUsuario(username) {
  Logger.log("INICIO verificarUsuario para: " + username);
  if (!username || String(username).trim() === '') { Logger.log("Verificación sin usuario."); return { success: false, message: "Usuario no proporcionado." }; }
  const searchUsername = String(username).trim().toLowerCase();
  try {
    Logger.log("Intentando abrir hoja con ID: " + SPREADSHEET_ID_QA);
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID_QA);
    Logger.log("Hoja abierta correctamente");
    Logger.log("Buscando hoja: " + USER_DIRECTORY_SHEET_NAME);
    var sheet = ss.getSheetByName(USER_DIRECTORY_SHEET_NAME);
    if (!sheet) { Logger.log(`Hoja directorio '${USER_DIRECTORY_SHEET_NAME}' no encontrada.`); return { success: false, message: `Error: Hoja de directorio no encontrada.` }; }
    Logger.log("Buscando índices de columnas...");
    var userColIdx = getColumnIndex(sheet, COL_USER_USUARIO); var nameColIdx = getColumnIndex(sheet, COL_USER_NOMBRE); var statusColIdx = getColumnIndex(sheet, COL_USER_ESTADO); var rolColIdx = getColumnIndex(sheet, COL_USER_ROL);
    Logger.log(`Índices: Usuario=${userColIdx}, Nombre=${nameColIdx}, Estado=${statusColIdx}, Rol=${rolColIdx}`);
    if ([userColIdx, nameColIdx, statusColIdx, rolColIdx].includes(-1)) {
       const missingCols = [userColIdx === -1 ? COL_USER_USUARIO : null, nameColIdx === -1 ? COL_USER_NOMBRE : null, statusColIdx === -1 ? COL_USER_ESTADO : null, rolColIdx === -1 ? COL_USER_ROL : null].filter(Boolean).join(', ');
       Logger.log(`Faltan columnas directorio: ${missingCols}.`); return { success: false, message: `Error config.: Faltan columnas (${missingCols}) directorio.` };
    }
    Logger.log("Leyendo datos de la hoja...");
    var data = sheet.getDataRange().getValues();
    Logger.log(`Total filas leídas: ${data.length}`);
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row.length >= Math.max(userColIdx, nameColIdx, statusColIdx, rolColIdx)) {
          var sheetUsername = row[userColIdx - 1] != null ? String(row[userColIdx - 1]).trim().toLowerCase() : '';
          var sheetStatus = row[statusColIdx - 1] != null ? String(row[statusColIdx - 1]).trim().toLowerCase() : '';
          var sheetRol = row[rolColIdx - 1] != null ? String(row[rolColIdx - 1]).trim() : '';
          if (sheetUsername === searchUsername) {
            Logger.log(`Usuario encontrado en fila ${i+1}: ${sheetUsername}, estado: ${sheetStatus}, rol: ${sheetRol}`);
            if (sheetStatus === 'activo') {
              const validRoles = ['Administrador', 'QA', 'QS'];
              if (!validRoles.includes(sheetRol)) { Logger.log(`Usuario ${username} activo, rol inválido: ${sheetRol}.`); return { success: false, message: `Rol '${sheetRol}' no permitido.` }; }
              var nombre = String(row[nameColIdx - 1]).trim();
              Logger.log(`Usuario ${username} OK. Nombre: ${nombre}, Rol: ${sheetRol}`);
              return { success: true, nombre: nombre, rol: sheetRol, username: String(row[userColIdx - 1]).trim() };
            } else { Logger.log(`Usuario ${username} inactivo (${sheetStatus}).`); return { success: false, message: "Usuario inactivo." }; }
          }
      } else { Logger.log(`Fila ${i + 1} directorio con pocas columnas.`); }
    }
    Logger.log(`Usuario ${username} no encontrado.`);
    return { success: false, message: "El Usuario no se encuentra autorizado, solicite acceso al Administrador." };
  } catch (e) {
    Logger.log(`Error fatal verificación usuario ${username}: ${e && e.message ? e.message : e}`);
    if (e && e.stack) Logger.log(`Stack error verificarUsuario: ${e.stack}`);
    return { success: false, message: `Error interno servidor.` };
  }
}

// --- Funciones para Gestión de Asignaciones ---
// ... existing code ...
function getTeams() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    const sheet = ss.getSheetByName("ME_View");
    if (!sheet) {
      Logger.log("Error: Hoja ME_View no encontrada.");
      return [];
    }

    const headerRow = sheet.getFrozenRows() || 1;
    const teamBuColIndex = getColumnIndex(sheet, "Team_bu");
    
    if (teamBuColIndex === -1) {
      Logger.log("Error: Columna Team_bu no encontrada en ME_View.");
      return [];
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= headerRow) {
      Logger.log("Hoja ME_View no tiene datos.");
      return [];
    }

    const teamRange = sheet.getRange(headerRow + 1, teamBuColIndex, lastRow - headerRow, 1);
    const teams = teamRange.getValues();
    
    // Filtrar valores únicos y no vacíos, y ordenar alfabéticamente
    const uniqueTeams = [...new Set(teams.flat()
      .map(team => team ? String(team).trim() : '')
      .filter(team => team !== ''))]
      .sort();

    Logger.log(`Equipos encontrados en ME_View: ${uniqueTeams.length}`);
    return uniqueTeams;
  } catch (e) {
    Logger.log(`Error en getTeams: ${e.message}`);
    return [];
  }
}

function getLDAPUsers() {
  let allUsers = [];
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    var sheets = ss.getSheets();
    sheets.forEach(sheet => {
      var sheetName = sheet.getName();
      Logger.log(`Procesando hoja: ${sheetName}`);
      try {
        var ldapColIndex = getColumnIndex(sheet, COL_USUARIO_LDAP);
        if (ldapColIndex === -1) { Logger.log(`Columna LDAP no encontrada en '${sheetName}'. Saltando esta hoja.`); return; }
        var lastRow = sheet.getLastRow(); var headerRow = sheet.getFrozenRows() || 1;
        if (lastRow < headerRow + 1) { Logger.log(`Hoja '${sheetName}' no tiene datos.`); return; }
        var usersRange = sheet.getRange(headerRow + 1, ldapColIndex, lastRow - headerRow, 1);
        var users = usersRange.getValues();
        allUsers = allUsers.concat(users.flat().map(user => user != null ? String(user).trim() : '').filter(user => user !== ''));
      } catch (sheetError) { Logger.log(`Error procesando hoja '${sheetName}': ${sheetError.message}`); }
    });
    const uniqueSortedUsers = [...new Set(allUsers)].sort();
    Logger.log(`Usuarios LDAP encontrados en todas las hojas: ${uniqueSortedUsers.length}`);
    return uniqueSortedUsers;
  } catch (e) { Logger.log(`Error fatal en getLDAPUsers: ${e.message}`); return []; }
}

function getAssignments(ldap, team) {
  if (!ldap || !team || String(ldap).trim() === '' || String(team).trim() === '') {
    Logger.log(`getAssignments: Parámetros inválidos LDAP='${ldap}', Team='${team}'.`);
    return { headers: [], data: [] };
  }
  const searchLdap = String(ldap).trim();
  const searchTeam = String(team).trim();
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    var sheet = ss.getSheetByName("ME_View"); // Siempre buscar en ME_View
    if (!sheet) {
      Logger.log(`Error: Hoja 'ME_View' no encontrada.`);
      return { headers: [], data: [] };
    }
    var lastRow = sheet.getLastRow();
    var headerRowIndex = sheet.getFrozenRows() || 1;
    if (lastRow <= headerRowIndex) {
      Logger.log(`Hoja 'ME_View' vacía.`);
      return { headers: [], data: [] };
    }
    var dataRange = sheet.getDataRange();
    var allDataValues = dataRange.getValues();
    var allDataDisplayValues = dataRange.getDisplayValues();
    var headers = allDataValues[headerRowIndex - 1].map(h => h ? String(h).trim() : '');
    // Buscar índices de columnas relevantes
    var ldapColIndex0Based = headers.map(h => h.toLowerCase()).indexOf(COL_USUARIO_LDAP.toLowerCase());
    var cierreColIndex0Based = headers.map(h => h.toLowerCase()).indexOf(COL_CONTROL_CIERRE.toLowerCase());
    var teamColIndex0Based = headers.map(h => h.toLowerCase()).indexOf('team');
    var fechaAsignacionColIndex0Based = headers.map(h => h.toLowerCase()).indexOf(COL_FECHA_ASIGNACION.toLowerCase());
    var simpleDayColIndex0Based = headers.map(h => h.toLowerCase()).indexOf(COL_SIMPLE_DAY.toLowerCase());
    var aperturaColIndex0Based = headers.map(h => h.toLowerCase()).indexOf(COL_CONTROL_APERTURA.toLowerCase());
    var interaccionColIndex0Based = headers.map(h => h.toLowerCase()).indexOf(COL_INTERACCION.toLowerCase());
    var estadoColIndex0Based = headers.map(h => h.toLowerCase()).indexOf(COL_ESTADO.toLowerCase());

    if (ldapColIndex0Based === -1) { Logger.log(`ERROR Crítico: Columna '${COL_USUARIO_LDAP}' no encontrada.`); return { headers: [], data: [] }; }
    if (cierreColIndex0Based === -1) { Logger.log(`ERROR Crítico: Columna '${COL_CONTROL_CIERRE}' no encontrada.`); return { headers: [], data: [] }; }
    if (teamColIndex0Based === -1) { Logger.log(`ERROR Crítico: Columna 'TEAM' no encontrada.`); return { headers: [], data: [] }; }
    if (interaccionColIndex0Based === -1) Logger.log(`Advertencia: Columna '${COL_INTERACCION}' no encontrada.`);
    if (estadoColIndex0Based === -1) Logger.log(`Advertencia: Columna '${COL_ESTADO}' no encontrada.`);

    const processedDataRows = [];
    for (let i = headerRowIndex; i < allDataValues.length; i++) {
      const rowValues = allDataValues[i];
      const rowDisplayValues = allDataDisplayValues[i];
      
      // Obtener el estado del registro
      const estado = rowValues[estadoColIndex0Based] != null ? String(rowValues[estadoColIndex0Based]).trim() : '';
      
      // Filtrar por usuario, equipo, que la columna de cierre esté vacía y que el estado no sea "Realizado"
      if (!rowValues ||
          rowValues.length <= Math.max(ldapColIndex0Based, cierreColIndex0Based, teamColIndex0Based) ||
          rowValues[ldapColIndex0Based] == null ||
          String(rowValues[ldapColIndex0Based]).trim() !== searchLdap ||
          String(rowValues[teamColIndex0Based]).trim() !== searchTeam ||
          (rowValues[cierreColIndex0Based] != null && String(rowValues[cierreColIndex0Based]).trim() !== '') ||
          estado === 'Realizado') {
        continue;
      }

      const rowOutput = rowValues.map((cellValue, colIndex) => {
        if (colIndex === fechaAsignacionColIndex0Based || colIndex === simpleDayColIndex0Based || colIndex === aperturaColIndex0Based) {
           return (rowDisplayValues && rowDisplayValues.length > colIndex) ? rowDisplayValues[colIndex] : '';
        } else { return formatCell(cellValue); }
      });
      processedDataRows.push(rowOutput);
    }
    return { headers: headers, data: processedDataRows };
  } catch (e) {
    Logger.log(`Error fatal en getAssignments LDAP '${searchLdap}' Equipo '${searchTeam}': ${e.message}\nStack: ${e.stack}`);
    return { headers: [], data: [] };
  }
}

// --- MODIFICADO: recordTimestamp para escribir SIEMPRE en cierre ---
function recordTimestamp(team, ldap, caseNumber, interactionId, timestamp, type) {
  if (!team || !ldap || !caseNumber || !interactionId || !type) { throw new Error("Faltan parámetros requeridos (incluyendo interactionId)."); }
  const validTypes = ['apertura', 'cierre']; const cleanType = String(type).trim().toLowerCase();
  if (!validTypes.includes(cleanType)) { throw new Error(`Tipo inválido: '${type}'.`); }

  const now = new Date(); const formattedTimestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), DATETIME_FORMAT);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
  // Siempre trabajar sobre la hoja general
  const sheet = ss.getSheetByName("ME_View");
  if (!sheet) { throw new Error(`Hoja 'ME_View' no encontrada.`); }

  const ldapColIdx = getColumnIndex(sheet, COL_USUARIO_LDAP);
  const caseColIdx = getColumnIndex(sheet, COL_CASO);
  const interaccionColIdx = getColumnIndex(sheet, COL_INTERACCION);
  const teamColIdx = getColumnIndex(sheet, "TEAM");
  const targetColName = (cleanType === 'apertura') ? COL_CONTROL_APERTURA : COL_CONTROL_CIERRE;
  const targetColIdx = getColumnIndex(sheet, targetColName);

  if ([ldapColIdx, caseColIdx, interaccionColIdx, teamColIdx, targetColIdx].includes(-1)) {
    const missing = [
      ldapColIdx === -1 ? COL_USUARIO_LDAP : null,
      caseColIdx === -1 ? COL_CASO : null,
      interaccionColIdx === -1 ? COL_INTERACCION : null,
      teamColIdx === -1 ? "TEAM" : null,
      targetColIdx === -1 ? targetColName : null
    ].filter(Boolean).join(', ');
    throw new Error(`Columnas (${missing}) no encontradas en 'ME_View'.`);
  }

  const data = sheet.getDataRange().getValues();
  const headerRow = sheet.getFrozenRows() || 1;
  let rowIndexFound = -1;

  for (let i = headerRow; i < data.length; i++) {
    if (
      data[i].length >= Math.max(ldapColIdx, caseColIdx, interaccionColIdx, teamColIdx) &&
      String(data[i][ldapColIdx - 1]).trim() === ldap &&
      String(data[i][caseColIdx - 1]).trim() === caseNumber &&
      String(data[i][interaccionColIdx - 1]).trim() === interactionId &&
      String(data[i][teamColIdx - 1]).trim() === team
    ) {
      rowIndexFound = i + 1;
      break;
    }
  }

  if (rowIndexFound === -1) { throw new Error(`No se encontró la fila para usuario ${ldap}, caso #${caseNumber}, interacción ${interactionId} y equipo ${team}.`); }

  const targetCell = sheet.getRange(rowIndexFound, targetColIdx);

  // Escribir SIEMPRE si es 'cierre', solo si está vacío si es 'apertura'
  if (cleanType === 'cierre') {
      targetCell.setValue(formattedTimestamp);
      Logger.log(`Acción de cierre registrada en fila ${rowIndexFound} para ${ldap}/${caseNumber}/${interactionId}/${team}.`);
  } else if (cleanType === 'apertura') {
      if (!targetCell.getValue()) {
          targetCell.setValue(formattedTimestamp);
          Logger.log(`Acción de apertura registrada en fila ${rowIndexFound} para ${ldap}/${caseNumber}/${interactionId}/${team}.`);
      } else {
          Logger.log(`Acción de apertura YA registrada en fila ${rowIndexFound} para ${ldap}/${caseNumber}/${interactionId}/${team}. No se sobrescribe.`);
      }
  }

  SpreadsheetApp.flush();
  return `Acción de ${cleanType} registrada para caso #${caseNumber} (Interacción: ${interactionId}).`;
}

function guardarMarcasGestion(team, ldap, caseNumber, interactionId, marcasEG, marcasCI) {
  if (!team || !ldap || !caseNumber || !interactionId || !Array.isArray(marcasEG) || !Array.isArray(marcasCI)) { 
    throw new Error("Faltan parámetros para guardarMarcasGestion (incluyendo interactionId)."); 
  }
  const cleanTeam = String(team).trim();
  const cleanLdap = String(ldap).trim();
  const cleanCaseNumber = String(caseNumber).trim();
  const cleanInteractionId = String(interactionId).trim();

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    // Siempre trabajar sobre la hoja general
    const sheet = ss.getSheetByName("ME_View");
    if (!sheet) { throw new Error(`Hoja 'ME_View' no encontrada.`); }

    // Buscar los índices de las columnas relevantes
    const ldapColIdx = getColumnIndex(sheet, COL_USUARIO_LDAP);
    const caseColIdx = getColumnIndex(sheet, COL_CASO);
    const interaccionColIdx = getColumnIndex(sheet, COL_INTERACCION);
    const teamColIdx = getColumnIndex(sheet, "TEAM");
    const marcaEGColIdx = getColumnIndex(sheet, COL_MARCA_EG);
    const marcaCIColIdx = getColumnIndex(sheet, COL_MARCA_CI);

    if ([ldapColIdx, caseColIdx, interaccionColIdx, teamColIdx, marcaEGColIdx, marcaCIColIdx].includes(-1)) {
      const missing = [
        ldapColIdx === -1 ? COL_USUARIO_LDAP : null,
        caseColIdx === -1 ? COL_CASO : null,
        interaccionColIdx === -1 ? COL_INTERACCION : null,
        teamColIdx === -1 ? "TEAM" : null,
        marcaEGColIdx === -1 ? COL_MARCA_EG : null,
        marcaCIColIdx === -1 ? COL_MARCA_CI : null
      ].filter(Boolean).join(', ');
      throw new Error(`Faltan columnas (${missing}) en 'ME_View'.`);
    }

    const data = sheet.getDataRange().getValues();
    const headerRow = sheet.getFrozenRows() || 1;
    let rowIndexFound = -1;
    for (let i = headerRow; i < data.length; i++) {
      if (
        data[i].length >= Math.max(ldapColIdx, caseColIdx, interaccionColIdx, teamColIdx) &&
        String(data[i][ldapColIdx - 1]).trim() === cleanLdap &&
        String(data[i][caseColIdx - 1]).trim() === cleanCaseNumber &&
        String(data[i][interaccionColIdx - 1]).trim() === cleanInteractionId &&
        String(data[i][teamColIdx - 1]).trim() === cleanTeam
      ) {
        rowIndexFound = i + 1;
        break;
      }
    }

    if (rowIndexFound === -1) { 
      throw new Error(`No se encontró la fila para usuario ${cleanLdap}, caso #${cleanCaseNumber}, interacción ${cleanInteractionId} y equipo ${cleanTeam}.`); 
    }

    const marcasEGString = marcasEG.join(', ');
    const marcasCIString = marcasCI.join(', ');
    sheet.getRange(rowIndexFound, marcaEGColIdx).setValue(marcasEGString);
    sheet.getRange(rowIndexFound, marcaCIColIdx).setValue(marcasCIString);

    SpreadsheetApp.flush();
    Logger.log(`Marcas guardadas para ${cleanLdap}/${cleanCaseNumber}/${cleanInteractionId} (Fila ${rowIndexFound}). EG: [${marcasEGString}], CI: [${marcasCIString}]`);
    return `Marcas guardadas para caso #${cleanCaseNumber} (Interacción: ${cleanInteractionId}).`;

  } catch (e) { 
    Logger.log(`Error en guardarMarcasGestion para ${cleanTeam}/${cleanLdap}/${cleanCaseNumber}/${cleanInteractionId}: ${e.message} \nStack: ${e.stack}`); 
    throw new Error(`Error servidor guardando marcas: ${e.message}`); 
  }
}

function ensureGestionColumns() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES); const sheets = ss.getSheets();
    const colN = 14; const colO = 15;
    sheets.forEach(sheet => {
      const sheetName = sheet.getName(); Logger.log(`Verificando columnas en hoja: ${sheetName}`);
      const maxCols = sheet.getMaxColumns(); const headerRow = sheet.getFrozenRows() || 1;
      if (maxCols < colO) { sheet.insertColumnsAfter(maxCols, colO - maxCols); Logger.log(`Columnas insertadas hasta ${colO} en '${sheetName}'.`); }
      const headerNCell = sheet.getRange(headerRow, colN);
      if (headerNCell.getValue() !== COL_MARCA_EG) { headerNCell.setValue(COL_MARCA_EG); Logger.log(`Encabezado "${COL_MARCA_EG}" puesto en N${headerRow} de '${sheetName}'.`); }
      const headerOCell = sheet.getRange(headerRow, colO);
      if (headerOCell.getValue() !== COL_MARCA_CI) { headerOCell.setValue(COL_MARCA_CI); Logger.log(`Encabezado "${COL_MARCA_CI}" puesto en O${headerRow} de '${sheetName}'.`); }
    });
    SpreadsheetApp.flush(); Logger.log("Verificación/Creación de columnas N y O completada.");
    Browser.msgBox("Proceso completado", "Se verificó/creó las columnas 'Marca de EG' (N) y 'Marca de CI' (O) en todas las hojas.", Browser.Buttons.OK);
  } catch (e) { Logger.log(`Error en ensureGestionColumns: ${e.message}`); Browser.msgBox("Error", `Ocurrió un error: ${e.message}`, Browser.Buttons.OK); }
}

// --- Funciones QA (Sin cambios) ---
function guardarEnSheetsQA(datos) {
  try {
    if (!Array.isArray(datos) || datos.length < 6 || datos.slice(1, 6).some(d => d == null || String(d).trim() === '')) { throw new Error("Datos QA incompletos."); }
    var hoja = SpreadsheetApp.openById(SPREADSHEET_ID_QA).getSheetByName(QA_SHEET_NAME); if (!hoja) throw new Error(`Hoja QA '${QA_SHEET_NAME}' no encontrada.`);
    var now = new Date(); var formattedTimestampRegistro = Utilities.formatDate(now, Session.getScriptTimeZone(), DATETIME_FORMAT);
    var filaCompleta = [formattedTimestampRegistro, String(datos[1]).trim(), String(datos[2]).trim(), String(datos[3]).trim(), String(datos[4]).trim(), String(datos[5]).trim(), "Pendiente de revisión", "", "", "", ""];
    hoja.appendRow(filaCompleta); SpreadsheetApp.flush();
    Logger.log(`Nuevo registro QA guardado por ${datos[1]}`); return "Nuevo registro QA guardado.";
  } catch (e) { Logger.log(`Error guardarEnSheetsQA: ${e.message}`); throw new Error(`Error servidor guardando QA.`); }
}
function obtenerRegistrosQA(userInfo) {
  try {
    if (!userInfo || !userInfo.rol || !userInfo.username) { Logger.log("obtenerRegistrosQA: userInfo inválido."); return []; }
    const userRol = userInfo.rol; const usernameLower = userInfo.username.toLowerCase();
    var hoja = SpreadsheetApp.openById(SPREADSHEET_ID_QA).getSheetByName(QA_SHEET_NAME);
    if (!hoja) { Logger.log(`Hoja QA no existe.`); return []; }
    var lastRow = hoja.getLastRow(); var headerRowIndex = hoja.getFrozenRows() || 1;
    if (lastRow < headerRowIndex + 1) { Logger.log(`Hoja QA vacía.`); return [hoja.getRange(headerRowIndex, 1, 1, hoja.getLastColumn()).getValues()[0].map(cell => formatCell(cell))]; }
    var dataRange = hoja.getRange(headerRowIndex, 1, lastRow - headerRowIndex + 1, hoja.getLastColumn());
    var allDataValues = dataRange.getValues(); var allDataDisplayValues = dataRange.getDisplayValues();
    var header = allDataValues[0]; var dataRows = allDataValues.slice(1); var displayDataRows = allDataDisplayValues.slice(1);
    const fechaRegIdx = header.map(h => String(h).trim()).indexOf(COL_QA_FECHA_REGISTRO);
    if (fechaRegIdx > -1) {
       let combinedData = dataRows.map((row, index) => ({ originalRow: row, displayDateString: (displayDataRows[index] && displayDataRows[index].length > fechaRegIdx) ? displayDataRows[index][fechaRegIdx] : null }));
       combinedData.sort((a, b) => { const dateA = parseGASDateString(a.displayDateString); const dateB = parseGASDateString(b.displayDateString); if (dateA && dateB) { return dateB.getTime() - dateA.getTime(); } else if (dateB) { return 1; } else if (dateA) { return -1; } return 0; });
       dataRows = combinedData.map(item => item.originalRow);
    } else { Logger.log(`Advertencia: Columna "${COL_QA_FECHA_REGISTRO}" no encontrada. No se pudo ordenar.`); }
    const ldapQaIdx = header.map(h => String(h).trim()).indexOf(COL_QA_LDAP_QA);
    const vistoMeliIdx = header.map(h => String(h).trim()).indexOf(COL_QA_VISTO_MELI);
    let filteredDataRows = [];
    if (userRol === 'Administrador') { filteredDataRows = dataRows; }
    else if (userRol === 'QA' && ldapQaIdx > -1) { filteredDataRows = dataRows.filter(row => row && row.length > ldapQaIdx && String(row[ldapQaIdx]).trim().toLowerCase() === usernameLower); }
    else if (userRol === 'QS' && vistoMeliIdx > -1) { filteredDataRows = dataRows.filter(row => row && row.length > vistoMeliIdx && String(row[vistoMeliIdx]).trim().toLowerCase() === 'sí'); }
    else { Logger.log(`Rol ${userRol} sin filtro QA aplicable.`); filteredDataRows = dataRows; }
    const resultData = [header.map(cell => formatCell(cell)), ...filteredDataRows.map(row => row.map(cell => formatCell(cell)))];
    return resultData;
  } catch (e) { Logger.log(`Error obtenerRegistrosQA: ${e.message} \nStack: ${e.stack}`); return []; }
}
function actualizarRegistroQA(registroId, nuevoEstado, nuevaRespuesta, vistoFormacion, vistoMeli, expectedCaso) {
  try {
    if (!registroId || expectedCaso === undefined || nuevoEstado === undefined || nuevaRespuesta === undefined || vistoFormacion === undefined || vistoMeli === undefined) { throw new Error("Parámetros inválidos actualizarRegistroQA."); }
    const cleanRegistroId = String(registroId).trim(); const cleanExpectedCaso = String(expectedCaso).trim();
    var hoja = SpreadsheetApp.openById(SPREADSHEET_ID_QA).getSheetByName(QA_SHEET_NAME); if (!hoja) throw new Error(`Hoja QA '${QA_SHEET_NAME}' no existe.`);
    var fechaRegIdx = getColumnIndex(hoja, COL_QA_FECHA_REGISTRO); var casoIdx = getColumnIndex(hoja, COL_QA_CASO);
    var estadoIdx = getColumnIndex(hoja, COL_QA_ESTADO); var respuestaIdx = getColumnIndex(hoja, COL_QA_RESPUESTA);
    var fechaRespIdx = getColumnIndex(hoja, COL_QA_FECHA_RESPUESTA); var formacionIdx = getColumnIndex(hoja, COL_QA_VISTO_FORMACION); var meliIdx = getColumnIndex(hoja, COL_QA_VISTO_MELI);
    if ([fechaRegIdx, casoIdx, estadoIdx, respuestaIdx, fechaRespIdx, formacionIdx, meliIdx].includes(-1)) { throw new Error(`Faltan columnas QA requeridas.`); }
    var dataRange = hoja.getDataRange(); var dataValues = dataRange.getValues(); var dataDisplayValues = dataRange.getDisplayValues();
    var headerRowIndex = hoja.getFrozenRows() || 1; var rowIndexToUpdate = -1;
    for (var i = headerRowIndex; i < dataDisplayValues.length; i++) {
        if (dataDisplayValues[i] && dataValues[i] && dataDisplayValues[i].length >= fechaRegIdx && dataValues[i].length >= casoIdx) {
            let fechaEnHojaFormateada = dataDisplayValues[i][fechaRegIdx - 1] != null ? String(dataDisplayValues[i][fechaRegIdx - 1]).trim() : '';
            let casoEnHoja = dataValues[i][casoIdx - 1] != null ? String(dataValues[i][casoIdx - 1]).trim() : '';
            if (fechaEnHojaFormateada === cleanRegistroId && casoEnHoja === cleanExpectedCaso) { rowIndexToUpdate = i; break; }
        }
    }
    if (rowIndexToUpdate !== -1) {
        var sheetRowIndex = rowIndexToUpdate + 1;
        const MAX_LENGTH = 50000; const cleanNuevoEstado = String(nuevoEstado).substring(0, MAX_LENGTH); const cleanNuevaRespuesta = String(nuevaRespuesta).substring(0, MAX_LENGTH); const validVisto = ["Sí", "No", ""];
        const cleanVistoFormacion = validVisto.includes(String(vistoFormacion)) ? String(vistoFormacion) : ""; const cleanVistoMeli = validVisto.includes(String(vistoMeli)) ? String(vistoMeli) : "";
        hoja.getRange(sheetRowIndex, estadoIdx).setValue(cleanNuevoEstado); hoja.getRange(sheetRowIndex, respuestaIdx).setValue(cleanNuevaRespuesta);
        hoja.getRange(sheetRowIndex, formacionIdx).setValue(cleanVistoFormacion); hoja.getRange(sheetRowIndex, meliIdx).setValue(cleanVistoMeli);
        if (cleanNuevoEstado.trim() !== "" || cleanNuevaRespuesta.trim() !== "") { var now = new Date(); var formattedTimestampRespuesta = Utilities.formatDate(now, Session.getScriptTimeZone(), DATETIME_FORMAT); hoja.getRange(sheetRowIndex, fechaRespIdx).setValue(formattedTimestampRespuesta); }
        else { hoja.getRange(sheetRowIndex, fechaRespIdx).setValue(""); }
        Logger.log(`Registro QA actualizado ID: ${cleanRegistroId}, Fila ${sheetRowIndex}.`); SpreadsheetApp.flush(); return "Registro QA actualizado.";
    } else { throw new Error(`No se encontró registro QA (ID: '${cleanRegistroId}', Caso: '${cleanExpectedCaso}').`); }
  } catch (e) { Logger.log(`Error actualizarRegistroQA: ${e.message}`); throw new Error(`Error servidor actualizando QA.`); }
}
function checkForQaUpdatesForUser(username) {
  // Nota: Errores de red (HTTP 0, CONNECTION_CLOSED) suelen ser transitorios o de plataforma.
  // El código actual lee datos en bloque, lo cual es eficiente. Optimizar más allá
  // requeriría cambios más profundos (ej. índices, triggers) que exceden la solicitud actual.
  if (!username) { Logger.log("Polling QA sin username."); return []; }
  const searchUsernameLower = String(username).trim().toLowerCase();
  let results = [];
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_QA); const sheet = ss.getSheetByName(QA_SHEET_NAME);
    if (!sheet) { Logger.log(`Polling: Hoja QA no encontrada.`); return []; }
    const lastRow = sheet.getLastRow(); const headerRowIndex = sheet.getFrozenRows() || 1;
    if (lastRow <= headerRowIndex) { return []; }
    const fechaRegIdx = getColumnIndex(sheet, COL_QA_FECHA_REGISTRO);
    const ldapQaIdx = getColumnIndex(sheet, COL_QA_LDAP_QA); const casoIdx = getColumnIndex(sheet, COL_QA_CASO);
    const teamIdx = getColumnIndex(sheet, COL_QA_TEAM); const respuestaIdx = getColumnIndex(sheet, COL_QA_RESPUESTA);
    if ([fechaRegIdx, ldapQaIdx, casoIdx, teamIdx, respuestaIdx].includes(-1)) { Logger.log(`Polling: Faltan columnas QA.`); return []; }
    const numRows = lastRow - headerRowIndex; const startRow = headerRowIndex + 1;
    const dataValues = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn()).getValues();
    const dataDisplayValues = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn()).getDisplayValues();
    for (let i = 0; i < dataValues.length; i++) { const rowValues = dataValues[i]; const rowDisplayValues = dataDisplayValues[i];
      if (rowValues && rowDisplayValues && rowValues.length >= Math.max(ldapQaIdx, respuestaIdx, casoIdx, teamIdx) && rowDisplayValues.length >= fechaRegIdx) {
        const rowLdap = rowValues[ldapQaIdx - 1] != null ? String(rowValues[ldapQaIdx - 1]).trim().toLowerCase() : '';
        const rowRespuesta = rowValues[respuestaIdx - 1] != null ? String(rowValues[respuestaIdx - 1]).trim() : '';
        if (rowLdap === searchUsernameLower && rowRespuesta !== '') {
            const formattedId = rowDisplayValues[fechaRegIdx - 1] != null ? String(rowDisplayValues[fechaRegIdx - 1]).trim() : `fila-${startRow + i}`;
            const numeroCaso = formatCell(rowValues[casoIdx - 1]); const teamCaso = formatCell(rowValues[teamIdx - 1]);
            results.push({ id: formattedId, numero: numeroCaso, team: teamCaso });
        }
      }
    }
    return results;
  } catch (e) { Logger.log(`Error Polling QA para ${username}: ${e.message}`); return []; }
}

function getChannels() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    var sheet = ss.getSheetByName("ME_View");
    if (!sheet) {
      Logger.log(`Error: Hoja 'ME_View' no encontrada.`);
      return [];
    }

    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var headers = values[0];
    
    // Buscar el índice de la columna Canal
    var canalColIndex = headers.findIndex(h => h.toString().toLowerCase() === 'canal');
    if (canalColIndex === -1) {
      Logger.log('Columna Canal no encontrada');
      return [];
    }

    // Obtener valores únicos de la columna Canal, excluyendo el encabezado
    var channels = new Set();
    for (var i = 1; i < values.length; i++) {
      var canal = values[i][canalColIndex];
      if (canal && canal.toString().trim() !== '') {
        channels.add(canal.toString().trim());
      }
    }

    return Array.from(channels).sort();
  } catch (error) {
    Logger.log('Error en getChannels: ' + error.toString());
    return [];
  }
}