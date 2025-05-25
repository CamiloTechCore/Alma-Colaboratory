/**
 * @OnlyCurrentDoc
 */

// --- Constantes ---
var SPREADSHEET_ID_ASIGNACIONES = "1nhf5JZMDgFsqqRmVsu9TF9eoeFRtYvhhfzcRoAVLeQI"; // ID Hoja Asignaciones
var SPREADSHEET_ID_QA = "1NPCGx6v2SpGS8eQjzIa_1wbGORlGqPl2EHHAwTL7O1c"; // ID Hoja QA y Directorio
var QA_SHEET_NAME = "Registros"; // Nombre Hoja Registros QA
var USER_DIRECTORY_SHEET_NAME = "Directorio de Usuarios"; // Nombre Hoja Directorio

// --- Columnas Esperadas Asignaciones ---
var COL_USUARIO_LDAP = "Usuario LDAP";
var COL_CASO = "#Caso";
var COL_INTERACCION = "Interacción"; // *** NUEVA CONSTANTE PARA IDENTIFICAR FILA UNÍVOCA ***
var COL_FECHA_ASIGNACION = "Fecha y hora de la asignación"; // <-- NOMBRE EXACTO REQUERIDO
var COL_SIMPLE_DAY = "Simple Day"; // <-- NOMBRE EXACTO REQUERIDO
var COL_CONTROL_APERTURA = "Control Apertura Url"; // Usado en backend Y AHORA TAMBIÉN EN FRONTEND
var COL_CONTROL_CIERRE = "Control Cierre Url"; // Usado en backend para MARCAR finalizado
var COL_LINK = "Link"; // Nombre EXACTO de la columna Link
var COL_CANAL = "Canal";
var COL_PROCESO = "Proceso";
var COL_TIPO_ACCION = "Tipo de accion";
// *** NUEVAS COLUMNAS DE GESTIÓN ***
var COL_MARCA_EG = "Marca de EG"; // Nueva columna N
var COL_MARCA_CI = "Marca de CI"; // Nueva columna O
var COL_ESTADO_CASO = "Estado_caso"; // Nueva columna para estado del caso


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
var DATETIME_FORMAT = "dd/M/yyyy; hh:mm:ss a"; // Usado para fechas QA y otras formateadas explícitamente
var DATE_FORMAT = "dd/M/yyyy"; // Formato de fecha simple (no usado activamente para asignaciones ahora)

// --- Función Principal ---
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Dashboard')
      .setTitle('Dashboard Operativo')
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
  const match = dateString.match(/^(\d{2})-(\d{2})-(\d{4}),\s+(\d{2}):(\d{2}):(\d{2})\s+(AM|PM)$/i);
  if (!match) return null;
  
  try {
    const [_, day, month, year, hour, minute, second, ampm] = match;
    let h = parseInt(hour, 10);
    if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
    if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    
    const dt = new Date(year, parseInt(month, 10) - 1, parseInt(day, 10), h, parseInt(minute, 10), parseInt(second, 10));
    return dt.getFullYear() === parseInt(year, 10) ? dt : null;
  } catch (e) {
    Logger.log(`Error parseando fecha: ${dateString}`);
    return null;
  }
}

function parseSimpleDayDate(simpleDayStr) {
  if (!simpleDayStr || typeof simpleDayStr !== 'string') return null;
  
  const months = {
    'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
  };

  const match = simpleDayStr.match(/^(\d{1,2})\s+([a-zA-Z]{3})\s+(\d{4})$/i);
  if (!match) return null;

  const [_, day, month, year] = match;
  const monthIndex = months[month.toLowerCase()];
  if (monthIndex === undefined) return null;

  const date = new Date(parseInt(year, 10), monthIndex, parseInt(day, 10));
  return date.getFullYear() === parseInt(year, 10) ? date : null;
}

function verificarUsuario(username) {
  if (!username || String(username).trim() === '') { Logger.log("Verificación sin usuario."); return { success: false, message: "Usuario no proporcionado." }; }
  const searchUsername = String(username).trim().toLowerCase();
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID_QA); var sheet = ss.getSheetByName(USER_DIRECTORY_SHEET_NAME);
    if (!sheet) { Logger.log(`Hoja directorio '${USER_DIRECTORY_SHEET_NAME}' no encontrada.`); return { success: false, message: `Error: Hoja de directorio no encontrada.` }; }
    var userColIdx = getColumnIndex(sheet, COL_USER_USUARIO); var nameColIdx = getColumnIndex(sheet, COL_USER_NOMBRE); var statusColIdx = getColumnIndex(sheet, COL_USER_ESTADO); var rolColIdx = getColumnIndex(sheet, COL_USER_ROL);

    if ([userColIdx, nameColIdx, statusColIdx, rolColIdx].includes(-1)) {
       const missingCols = [userColIdx === -1 ? COL_USER_USUARIO : null, nameColIdx === -1 ? COL_USER_NOMBRE : null, statusColIdx === -1 ? COL_USER_ESTADO : null, rolColIdx === -1 ? COL_USER_ROL : null].filter(Boolean).join(', ');
       Logger.log(`Faltan columnas directorio: ${missingCols}.`); return { success: false, message: `Error config.: Faltan columnas (${missingCols}) directorio.` };
    }
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row.length >= Math.max(userColIdx, nameColIdx, statusColIdx, rolColIdx)) {
          var sheetUsername = row[userColIdx - 1] != null ? String(row[userColIdx - 1]).trim().toLowerCase() : '';
          var sheetStatus = row[statusColIdx - 1] != null ? String(row[statusColIdx - 1]).trim().toLowerCase() : '';
          var sheetRol = row[rolColIdx - 1] != null ? String(row[rolColIdx - 1]).trim() : '';
          if (sheetUsername === searchUsername) {
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
  } catch (e) { Logger.log(`Error fatal verificación usuario ${username}: ${e.message}`); return { success: false, message: `Error interno servidor.` }; }
}

// --- Funciones para Gestión de Asignaciones ---
function getTeams() { return ["FBM", "PRE_DESPACHO", "VIAJE_DEL_PAQUETE", "REDES", "KANGU","DISTRIBUCION"]; }

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

function getAssignments(ldap, team, simpleDayFilter) {
  if (!ldap || !team || String(ldap).trim() === '' || String(team).trim() === '') { 
    Logger.log(`getAssignments: Parámetros inválidos LDAP='${ldap}', Team='${team}'.`); 
    return { headers: [], data: [] }; 
  }

  const searchLdap = String(ldap).trim(); 
  const searchTeam = String(team).trim();
  const columnasEsperadas = [
    COL_FECHA_ASIGNACION,
    COL_INTERACCION,
    COL_CASO,
    COL_SIMPLE_DAY,
    "Oficina",
    "Población",
    COL_CANAL,
    COL_PROCESO,
    COL_TIPO_ACCION,
    COL_USUARIO_LDAP,
    COL_CONTROL_APERTURA,
    COL_CONTROL_CIERRE,
    COL_LINK,
    COL_MARCA_EG,
    COL_MARCA_CI
  ];

  const sheet = getSheetByTeam(searchTeam);
  if (!sheet) {
    Logger.log(`getAssignments: No se encontró la hoja para el equipo '${searchTeam}'.`);
    return { headers: columnasEsperadas, data: [] };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { headers: columnasEsperadas, data: [] };

  const headers = data[0];
  const indices = {
    ldap: headers.indexOf(COL_USUARIO_LDAP),
    simpleDay: headers.indexOf(COL_SIMPLE_DAY)
  };

  if (indices.ldap === -1) return { headers: columnasEsperadas, data: [] };

  const filteredRows = data.slice(1).filter(row => {
    if (String(row[indices.ldap]).trim() !== searchLdap) return false;
    if (simpleDayFilter && indices.simpleDay !== -1) {
      return String(row[indices.simpleDay]).trim() === String(simpleDayFilter).trim();
    }
    return true;
  });

  const resultData = filteredRows.map(row => 
    columnasEsperadas.map(col => {
      const idx = headers.indexOf(col);
      return idx !== -1 ? row[idx] : '';
    })
  );

  return { headers: columnasEsperadas, data: resultData };
}

// --- MODIFICADO: recordTimestamp para escribir SIEMPRE en cierre ---
function recordTimestamp(team, ldap, caseNumber, interactionId, timestamp, type) {
  if (!team || !ldap || !caseNumber || !interactionId || !type) { throw new Error("Faltan parámetros requeridos (incluyendo interactionId)."); }
  const validTypes = ['apertura', 'cierre']; const cleanType = String(type).trim().toLowerCase();
  if (!validTypes.includes(cleanType)) { throw new Error(`Tipo inválido: '${type}'.`); }

  const now = new Date(); const formattedTimestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), DATETIME_FORMAT);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES); const sheet = ss.getSheetByName(String(team).trim());
  if (!sheet) { throw new Error(`Hoja equipo '${team}' no encontrada.`); }

  const ldapColIdx = getColumnIndex(sheet, COL_USUARIO_LDAP); const caseColIdx = getColumnIndex(sheet, COL_CASO);
  const interaccionColIdx = getColumnIndex(sheet, COL_INTERACCION);
  const targetColName = (cleanType === 'apertura') ? COL_CONTROL_APERTURA : COL_CONTROL_CIERRE;
  const targetColIdx = getColumnIndex(sheet, targetColName);

  if ([ldapColIdx, caseColIdx, interaccionColIdx, targetColIdx].includes(-1)) {
    const missing = [ ldapColIdx === -1 ? COL_USUARIO_LDAP : null, caseColIdx === -1 ? COL_CASO : null, interaccionColIdx === -1 ? COL_INTERACCION : null, targetColIdx === -1 ? targetColName : null ].filter(Boolean).join(', ');
    throw new Error(`Columnas (${missing}) no encontradas en '${team}'.`);
  }

  const data = sheet.getDataRange().getValues(); const headerRow = sheet.getFrozenRows() || 1;
  let rowIndexFound = -1;

  for (let i = headerRow; i < data.length; i++) {
    if (data[i].length >= Math.max(ldapColIdx, caseColIdx, interaccionColIdx) &&
        String(data[i][ldapColIdx - 1]).trim() === ldap &&
        String(data[i][caseColIdx - 1]).trim() === caseNumber &&
        String(data[i][interaccionColIdx - 1]).trim() === interactionId) {
      rowIndexFound = i + 1; break;
    }
  }

  if (rowIndexFound === -1) { throw new Error(`No se encontró la fila para usuario ${ldap}, caso #${caseNumber} e interacción ${interactionId}.`); }

  const targetCell = sheet.getRange(rowIndexFound, targetColIdx);

  // *** CORRECCIÓN: Escribir SIEMPRE si es 'cierre', solo si está vacío si es 'apertura' ***
  if (cleanType === 'cierre') {
      targetCell.setValue(formattedTimestamp);
      Logger.log(`Acción de cierre registrada en fila ${rowIndexFound} para ${ldap}/${caseNumber}/${interactionId}.`);
  } else if (cleanType === 'apertura') {
      if (!targetCell.getValue()) {
          targetCell.setValue(formattedTimestamp);
          Logger.log(`Acción de apertura registrada en fila ${rowIndexFound} para ${ldap}/${caseNumber}/${interactionId}.`);
      } else {
          Logger.log(`Acción de apertura YA registrada en fila ${rowIndexFound} para ${ldap}/${caseNumber}/${interactionId}. No se sobrescribe.`);
      }
  }

  SpreadsheetApp.flush();
  return `Acción de ${cleanType} registrada para caso #${caseNumber} (Interacción: ${interactionId}).`;
}

function guardarMarcasGestion(team, ldap, caseNumber, interactionId, marcasEG, marcasCI) {
  if (!team || !ldap || !caseNumber || !interactionId || !Array.isArray(marcasEG) || !Array.isArray(marcasCI)) { throw new Error("Faltan parámetros para guardarMarcasGestion (incluyendo interactionId)."); }
  const cleanTeam = String(team).trim(); const cleanLdap = String(ldap).trim();
  const cleanCaseNumber = String(caseNumber).trim(); const cleanInteractionId = String(interactionId).trim();

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES); const sheet = ss.getSheetByName(cleanTeam);
    if (!sheet) { throw new Error(`Hoja equipo '${cleanTeam}' no encontrada.`); }

    const ldapColIdx = getColumnIndex(sheet, COL_USUARIO_LDAP); const caseColIdx = getColumnIndex(sheet, COL_CASO);
    const interaccionColIdx = getColumnIndex(sheet, COL_INTERACCION); const marcaEGColIdx = getColumnIndex(sheet, COL_MARCA_EG);
    const marcaCIColIdx = getColumnIndex(sheet, COL_MARCA_CI);

    if ([ldapColIdx, caseColIdx, interaccionColIdx, marcaEGColIdx, marcaCIColIdx].includes(-1)) {
        const missing = [ ldapColIdx === -1 ? COL_USUARIO_LDAP : null, caseColIdx === -1 ? COL_CASO : null, interaccionColIdx === -1 ? COL_INTERACCION : null, marcaEGColIdx === -1 ? COL_MARCA_EG : null, marcaCIColIdx === -1 ? COL_MARCA_CI : null ].filter(Boolean).join(', ');
        Logger.log(`Error: Faltan columnas en hoja '${cleanTeam}': ${missing}`);
        throw new Error(`Faltan columnas (${missing}) en '${cleanTeam}'.`);
    }

    const data = sheet.getDataRange().getValues(); const headerRow = sheet.getFrozenRows() || 1;
    let rowIndexFound = -1;
    for (let i = headerRow; i < data.length; i++) {
        if (data[i].length >= Math.max(ldapColIdx, caseColIdx, interaccionColIdx) &&
            String(data[i][ldapColIdx - 1]).trim() === cleanLdap &&
            String(data[i][caseColIdx - 1]).trim() === cleanCaseNumber &&
            String(data[i][interaccionColIdx - 1]).trim() === cleanInteractionId) {
            rowIndexFound = i + 1; break;
        }
    }

    if (rowIndexFound === -1) { throw new Error(`No se encontró la fila para usuario ${cleanLdap}, caso #${cleanCaseNumber} e interacción ${cleanInteractionId}.`); }

    const marcasEGString = marcasEG.join(', '); const marcasCIString = marcasCI.join(', ');
    sheet.getRange(rowIndexFound, marcaEGColIdx).setValue(marcasEGString); sheet.getRange(rowIndexFound, marcaCIColIdx).setValue(marcasCIString);

    SpreadsheetApp.flush();
    Logger.log(`Marcas guardadas para ${cleanLdap}/${cleanCaseNumber}/${cleanInteractionId} (Fila ${rowIndexFound}). EG: [${marcasEGString}], CI: [${marcasCIString}]`);
    return `Marcas guardadas para caso #${cleanCaseNumber} (Interacción: ${cleanInteractionId}).`;

  } catch (e) { Logger.log(`Error en guardarMarcasGestion para ${cleanTeam}/${cleanLdap}/${cleanCaseNumber}/${cleanInteractionId}: ${e.message} \nStack: ${e.stack}`); throw new Error(`Error servidor guardando marcas: ${e.message}`); }
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
  if (!userInfo?.rol || !userInfo?.username) {
    Logger.log("obtenerRegistrosQA: userInfo inválido.");
    return [];
  }

  try {
    const userRol = userInfo.rol;
    const usernameLower = userInfo.username.toLowerCase();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_QA);
    const hoja = ss.getSheetByName(QA_SHEET_NAME);
    
    if (!hoja) {
      Logger.log(`Hoja QA no existe.`);
      return [];
    }

    const lastRow = hoja.getLastRow();
    const headerRowIndex = hoja.getFrozenRows() || 1;
    
    if (lastRow < headerRowIndex + 1) {
      Logger.log(`Hoja QA vacía.`);
      return [hoja.getRange(headerRowIndex, 1, 1, hoja.getLastColumn()).getValues()[0].map(cell => formatCell(cell))];
    }

    const dataRange = hoja.getRange(headerRowIndex, 1, lastRow - headerRowIndex + 1, hoja.getLastColumn());
    const [header, ...dataRows] = dataRange.getValues();
    const displayValues = dataRange.getDisplayValues().slice(1);

    const indices = {
      fechaReg: header.map(h => String(h).trim()).indexOf(COL_QA_FECHA_REGISTRO),
      ldapQa: header.map(h => String(h).trim()).indexOf(COL_QA_LDAP_QA),
      vistoMeli: header.map(h => String(h).trim()).indexOf(COL_QA_VISTO_MELI)
    };

    let filteredDataRows = dataRows;
    
    if (indices.fechaReg > -1) {
      const combinedData = dataRows.map((row, index) => ({
        originalRow: row,
        displayDateString: displayValues[index]?.[indices.fechaReg] || null
      }));
      
      combinedData.sort((a, b) => {
        const dateA = parseGASDateString(a.displayDateString);
        const dateB = parseGASDateString(b.displayDateString);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.getTime() - dateA.getTime();
      });
      
      filteredDataRows = combinedData.map(item => item.originalRow);
    }

    if (userRol !== 'Administrador') {
      if (userRol === 'QA' && indices.ldapQa > -1) {
        filteredDataRows = filteredDataRows.filter(row => 
          row && row.length > indices.ldapQa && 
          String(row[indices.ldapQa]).trim().toLowerCase() === usernameLower
        );
      } else if (userRol === 'QS' && indices.vistoMeli > -1) {
        filteredDataRows = filteredDataRows.filter(row => 
          row && row.length > indices.vistoMeli && 
          String(row[indices.vistoMeli]).trim().toLowerCase() === 'sí'
        );
      }
    }

    return [
      header.map(cell => formatCell(cell)),
      ...filteredDataRows.map(row => row.map(cell => formatCell(cell)))
    ];
  } catch (e) {
    Logger.log(`Error obtenerRegistrosQA: ${e.message} \nStack: ${e.stack}`);
    return [];
  }
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

function getMetricsData(ldap, simpleDayFilter = null) {
  if (!ldap) {
    Logger.log("getMetricsData: LDAP no proporcionado");
    return null;
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    const sheets = ss.getSheets();
    const metrics = {
      totalCasos: 0,
      casosHoy: 0,
      casosPendientes: 0,
      casosAperturados: 0,
      conductasInadecuadas: 0,
      tmoPromedio: '00:00:00'
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const searchLdap = String(ldap).trim().toLowerCase();

    sheets.forEach(sheet => {
      try {
        const data = sheet.getDataRange().getValues();
        if (data.length < 2) return;

        const headers = data[0];
        const indices = {
          ldap: headers.findIndex(h => String(h).trim().toLowerCase() === COL_USUARIO_LDAP.toLowerCase()),
          fecha: headers.findIndex(h => String(h).trim().toLowerCase() === COL_FECHA_ASIGNACION.toLowerCase()),
          estado: headers.findIndex(h => String(h).trim().toLowerCase() === COL_ESTADO_CASO.toLowerCase()),
          tipo: headers.findIndex(h => String(h).trim().toLowerCase() === COL_TIPO_ACCION.toLowerCase())
        };

        if (indices.ldap === -1) return;

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (String(row[indices.ldap]).trim().toLowerCase() !== searchLdap) continue;

          metrics.totalCasos++;

          if (indices.fecha !== -1 && row[indices.fecha]) {
            const fechaAsignacion = parseGASDateString(row[indices.fecha]);
            if (fechaAsignacion && fechaAsignacion >= today) {
              metrics.casosHoy++;
            }
          }

          if (indices.estado !== -1) {
            const estado = String(row[indices.estado]).trim().toLowerCase();
            if (estado === 'pendiente') metrics.casosPendientes++;
            else if (estado === 'aperturado') metrics.casosAperturados++;
          }

          if (indices.tipo !== -1) {
            const tipo = String(row[indices.tipo]).trim().toLowerCase();
            if (tipo === 'conducta inadecuada') metrics.conductasInadecuadas++;
          }
        }
      } catch (e) {
        Logger.log(`Error procesando hoja ${sheet.getName()}: ${e.message}`);
      }
    });

    return metrics;
  } catch (e) {
    Logger.log(`Error en getMetricsData: ${e.message}`);
    return null;
  }
}

function getUniqueSimpleDays(team, ldap) {
  if (!team || !ldap) {
    Logger.log("getUniqueSimpleDays: No se proporcionó el equipo o el LDAP");
    return [];
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    const sheet = ss.getSheetByName(team);
    
    if (!sheet) {
      Logger.log(`Hoja '${team}' no encontrada`);
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return []; // Solo encabezados o sin datos
    
    const headers = data[0];
    const simpleDayColIndex = headers.findIndex(h => String(h).trim().toLowerCase() === COL_SIMPLE_DAY.toLowerCase());
    const ldapColIndex = headers.findIndex(h => String(h).trim().toLowerCase() === COL_USUARIO_LDAP.toLowerCase());
    
    if (simpleDayColIndex === -1) {
      Logger.log(`Columna '${COL_SIMPLE_DAY}' no encontrada en hoja '${team}`);
      return [];
    }
    
    if (ldapColIndex === -1) {
      Logger.log(`Columna '${COL_USUARIO_LDAP}' no encontrada en hoja '${team}`);
      return [];
    }
    
    // Obtener valores únicos de la columna Simple Day solo para el LDAP seleccionado
    const uniqueSimpleDays = new Set();
    for (let i = 1; i < data.length; i++) {
      const rowLdap = String(data[i][ldapColIndex]).trim().toLowerCase();
      const simpleDay = data[i][simpleDayColIndex];
      
      // Filtrar el valor específico y asegurarse de que sea una fecha válida
      if (rowLdap === String(ldap).trim().toLowerCase() && 
          simpleDay && 
          String(simpleDay).trim() !== "Sun May 18 2025 23:00:00 GMT-0500 (hora estándar de Colombia)" &&
          parseSimpleDayDate(String(simpleDay).trim())) {
        uniqueSimpleDays.add(String(simpleDay).trim());
      }
    }
    
    // Convertir a array y ordenar
    return Array.from(uniqueSimpleDays).sort((a, b) => {
      const dateA = parseSimpleDayDate(a);
      const dateB = parseSimpleDayDate(b);
      if (dateA && dateB) {
        return dateB.getTime() - dateA.getTime(); // Orden descendente (más reciente primero)
      }
      return 0;
    });
  } catch (e) {
    Logger.log(`Error en getUniqueSimpleDays: ${e.message}`);
    return [];
  }
}

function getSheetByTeam(team) {
  if (!team || String(team).trim() === '') {
    Logger.log('getSheetByTeam: Equipo no proporcionado');
    return null;
  }
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    const sheet = ss.getSheetByName(String(team).trim());
    if (!sheet) {
      Logger.log(`getSheetByTeam: No se encontró la hoja para el equipo '${team}'`);
      return null;
    }
    return sheet;
  } catch (e) {
    Logger.log(`Error en getSheetByTeam para equipo '${team}': ${e.message}`);
    return null;
  }
}