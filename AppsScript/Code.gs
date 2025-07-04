  /**
   * @OnlyCurrentDoc
   */

  // --- Constantes Globales ---
  var SPREADSHEET_ID_ASIGNACIONES = "1FcmnSAIsRaas_gYUJG32COh7_SCoc94_r-nu169u2Mg"; // ID Hoja Asignaciones
  var SPREADSHEET_ID_QA = "1FcmnSAIsRaas_gYUJG32COh7_SCoc94_r-nu169u2Mg"; // ID Hoja QA y Directorio
  var QA_SHEET_NAME = "Registro_Formacion"; // Nombre Hoja Registros QA
  var USER_DIRECTORY_SHEET_NAME = "Directorio de Usuarios"; // Nombre Hoja Directorio

  // --- Columnas Esperadas Asignaciones ---
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

  // --- Columnas Esperadas QA ---
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

  // --- Columnas Esperadas Directorio Usuarios ---
  var COL_USER_NOMBRE = "Nombre";
  var COL_USER_USUARIO = "Usuario";
  var COL_USER_ROL = "Rol";
  var COL_USER_CONTRASENA = "Contraseña";
  var COL_USER_ESTADO = "Estado";
  var COL_USER_EMAIL = "Email";

  // --- Formato de Fecha/Hora ---
  var DATETIME_FORMAT = "dd/MM/yyyy, HH:mm:ss";

  /**
   * Función Principal que sirve el HTML del Dashboard.
   */
  function doGet() {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('ALMA™')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // --- Funciones Auxiliares ---
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

  function formatCell(cellValue) {
    if (cellValue instanceof Date) {
      return Utilities.formatDate(cellValue, Session.getScriptTimeZone(), DATETIME_FORMAT);
    }
    return cellValue != null ? String(cellValue) : '';
  }

  /**
   * Verifica las credenciales y el estado de un usuario en el directorio.
   * @param {string} username El nombre de usuario (LDAP) a verificar.
   * @param {string} password La contraseña proporcionada por el usuario.
   * @param {string} role El rol seleccionado por el usuario.
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
          
          // --- MODIFICACIÓN AQUÍ: Se añade 'QA' a la validación de contraseña ---
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

  // --- Funciones de Gestión de Asignaciones ---
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

      // Buscar la columna que contiene los equipos (columna "TEAM")
      const teamBuColIdx = getColumnIndex(sheet, "TEAM");
      if (teamBuColIdx === -1) {
        Logger.log("Error: Columna 'TEAM' no encontrada en la hoja 'Base_Datos'.");
        return [];
      }

      // Obtener todos los valores únicos de la columna TEAM
      const teamBuValues = sheet.getRange(headerRowIndex + 1, teamBuColIdx, lastRow - headerRowIndex, 1).getValues();
      const uniqueTeams = [...new Set(teamBuValues.flat().map(team => String(team || '').trim()).filter(Boolean))].sort();
      
      // Validar que hay equipos válidos
      if (uniqueTeams.length === 0) {
        Logger.log("Advertencia: No se encontraron equipos válidos en la columna 'TEAM'.");
        return [];
      }
      
      Logger.log(`Equipos encontrados en Base_Datos: ${uniqueTeams.join(', ')}`);
      return uniqueTeams;
      
    } catch (e) {
      Logger.log(`Error en getTeams: ${e.message}`);
      // Retornar array vacío en caso de error para mantener compatibilidad con el frontend
      return [];
    }
  }

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

  function recordTimestamp(team, ldap, caseNumber, interactionId, type) {
    if (String(type).trim().toLowerCase() !== 'apertura') {
      return;
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID_ASIGNACIONES);
    // Siempre usar la hoja Base_Datos
    const sheet = ss.getSheetByName("Base_Datos");
    if (!sheet) throw new Error(`La hoja 'Base_Datos' no fue encontrada.`);

    const ldapColIdx = getColumnIndex(sheet, COL_USUARIO_LDAP);
    const caseColIdx = getColumnIndex(sheet, COL_CASO);
    const interaccionColIdx = getColumnIndex(sheet, COL_INTERACCION);
    const targetColIdx = getColumnIndex(sheet, COL_CONTROL_APERTURA);

    if ([ldapColIdx, caseColIdx, interaccionColIdx, targetColIdx].includes(-1)) {
      throw new Error(`Columnas de apertura no encontradas.`);
    }

    const data = sheet.getDataRange().getValues();
    const headerRow = sheet.getFrozenRows() || 1;
    let rowIndexFound = -1;

    for (let i = headerRow; i < data.length; i++) {
      if (String(data[i][ldapColIdx - 1]).trim() === ldap &&
        String(data[i][caseColIdx - 1]).trim() === caseNumber &&
        String(data[i][interaccionColIdx - 1]).trim() === interactionId) {
        rowIndexFound = i;
        break;
      }
    }

    if (rowIndexFound > -1) {
      const sheetRowIndexToUpdate = rowIndexFound + 1;
      const targetCell = sheet.getRange(sheetRowIndexToUpdate, targetColIdx);
      if (!targetCell.getValue()) {
        const now = new Date();
        const formattedTimestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), DATETIME_FORMAT);
        targetCell.setValue(formattedTimestamp);
        return `Acción de apertura registrada.`;
      }
    }
  }

  // --- Funciones de Seguimiento QA ---
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


