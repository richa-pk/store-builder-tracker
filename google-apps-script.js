// Google Apps Script for tracking events
// Deploy as a web app and use the deployment URL in your tracker

function doPost(e) {
  try {
    const spreadsheet = SpreadsheetApp.openById('189HCeU4ra4-cxymH6mPEMP_BWLnA7t8g-m6EnbN0E5I'); // Replace with your actual sheet ID
    const sheet = spreadsheet.getSheetByName('Events') || spreadsheet.insertSheet('Events');
    
    const data = JSON.parse(e.postData.contents);
    
    // Add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      const headers = [
        'Timestamp', 'Event Type', 'Category', 'Text/Label', 'URL', 
        'Session ID', 'User Agent', 'Viewport', 'Element Details'
      ];
      sheet.appendRow(headers);
    }
    
    // Append event data
    const row = [
      data.timestamp || new Date().toISOString(),
      data.event_type || '',
      data.action_category || '',
      data.clicked_text || data.button_text || data.field_name || '',
      data.page_url || '',
      data.session_id || '',
      data.user_agent || '',
      (data.viewport ? `${data.viewport.width}x${data.viewport.height}` : ''),
      JSON.stringify({
        elementId: data.element_id,
        elementName: data.element_name,
        elementTag: data.element_tag,
        fieldType: data.field_type,
        clickedLink: data.clicked_link_url
      })
    ];
    
    sheet.appendRow(row);
    
    return buildResponse({
      ok: true,
      message: 'Event tracked successfully',
      count: sheet.getLastRow()
    });
    
  } catch (error) {
    return buildResponse({
      ok: false,
      error: error.toString()
    });
  }
}

function doGet(e) {
  try {
    const spreadsheet = SpreadsheetApp.openById('YOUR_SHEET_ID');
    const sheet = spreadsheet.getSheetByName('Events');
    
    if (!sheet || sheet.getLastRow() === 0) {
      return buildResponse([]);
    }
    
    // Get last 25 events
    const data = sheet.getRange(Math.max(2, sheet.getLastRow() - 24), 1, Math.min(25, sheet.getLastRow() - 1), sheet.getLastColumn()).getValues();
    
    const events = data.map(row => ({
      timestamp: row[0],
      event_type: row[1],
      action_category: row[2],
      label: row[3],
      page_url: row[4],
      session_id: row[5]
    }));
    
    return buildResponse(events.reverse());
    
  } catch (error) {
    return buildResponse({
      ok: false,
      error: error.toString()
    });
  }
}

function doOptions(e) {
  return buildResponse({});
}

function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
}
