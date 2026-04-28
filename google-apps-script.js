const SHEET_ID = '189HCeU4ra4-cxymH6mPEMP_BWLnA7t8g-m6EnbN0E5I';
const SHEET_NAME = 'Website Activity';

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const event = JSON.parse(body);

    const sheet = getOrCreateSheet_();
    ensureHeader_(sheet);
    sheet.appendRow(mapEventToRow_(event));

    return json_({ ok: true, accepted: true, row: sheet.getLastRow() });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  }
}

function doGet(e) {
  try {
    const sheet = getOrCreateSheet_();
    ensureHeader_(sheet);

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return json_([]);

    const startRow = Math.max(2, lastRow - 24);
    const rowCount = lastRow - startRow + 1;
    const values = sheet.getRange(startRow, 1, rowCount, sheet.getLastColumn()).getValues();

    const events = values.map(row => ({
      timestamp: row[0],
      event_type: row[1],
      page_url: row[2],
      page_title: row[3],
      clicked_link_text: row[4],
      clicked_link_url: row[5],
      button_text: row[6],
      field_name: row[7],
      entered_data: row[8],
      user_id: row[9],
      session_id: row[10],
      referrer: row[11],
      device_type: row[12],
      user_agent: row[13],
      notes: row[14]
    })).reverse();

    return json_(events);
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  }
}

function getOrCreateSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const existing = spreadsheet.getSheetByName(SHEET_NAME);
  return existing || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeader_(sheet) {
  const headers = [
    'Timestamp',
    'Activity Type',
    'Page URL',
    'Page Title',
    'Clicked Link',
    'Link URL',
    'Button',
    'Field Name',
    'Entered Data',
    'User ID',
    'Session ID',
    'Referrer',
    'Device Type',
    'Device Info',
    'Notes'
  ];

  if (sheet.getLastRow() > 0) {
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    if (currentHeaders[12] !== 'Device Type') {
      sheet.insertColumnBefore(13);
      sheet.getRange(1, 13).setValue('Device Type');
    }

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  sheet.appendRow(headers);
}

function mapEventToRow_(event) {
  const notes = [
    event.action_category ? `category=${event.action_category}` : '',
    event.device_type ? `device_type=${event.device_type}` : '',
    event.scroll_y !== undefined ? `scroll_y=${event.scroll_y}px` : '',
    event.scroll_x !== undefined ? `scroll_x=${event.scroll_x}px` : '',
    event.scroll_depth_percent !== undefined ? `scroll_depth=${event.scroll_depth_percent}%` : '',
    event.scroll_direction ? `scroll_direction=${event.scroll_direction}` : '',
    event.document_height !== undefined ? `document_height=${event.document_height}px` : '',
    event.scrollable_height !== undefined ? `scrollable_height=${event.scrollable_height}px` : '',
    event.button_id ? `button_id=${event.button_id}` : '',
    event.clicked_text ? `clicked_text=${event.clicked_text}` : '',
    event.element_tag ? `element_tag=${event.element_tag}` : '',
    event.field_id ? `field_id=${event.field_id}` : '',
    event.field_type ? `field_type=${event.field_type}` : '',
    event.element_id ? `element_id=${event.element_id}` : '',
    event.element_name ? `element_name=${event.element_name}` : '',
    event.element_classes ? `classes=${event.element_classes}` : '',
    event.element_role ? `role=${event.element_role}` : '',
    event.viewport ? `viewport=${event.viewport.width}x${event.viewport.height}` : ''
  ].filter(Boolean).join(' | ');

  return [
    event.timestamp || new Date().toISOString(),
    event.event_type || '',
    event.page_url || '',
    event.page_title || '',
    event.clicked_link_text || '',
    event.clicked_link_url || '',
    event.button_text || '',
    event.field_name || '',
    event.entered_data || '',
    event.user_id || '',
    event.session_id || '',
    event.referrer || '',
    event.device_type || '',
    event.user_agent || '',
    notes
  ];
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
