(function () {
  const DEFAULT_ENDPOINT = window.WEBSITE_ACTIVITY_APPS_SCRIPT_URL || '';
  const SESSION_KEY = 'website_activity_tracker_session_id';
  const TEXT_MAX_LENGTH = 200;
  const SCROLL_DEBOUNCE_MS = 250;
  let scrollTimeoutId = null;
  let lastTrackedScrollX = window.pageXOffset || document.documentElement.scrollLeft || 0;
  let lastTrackedScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getSessionId() {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = uuid();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  function getDeviceType() {
    const userAgent = navigator.userAgent || '';
    const hasTouch = navigator.maxTouchPoints && navigator.maxTouchPoints > 1;
    const width = window.innerWidth || document.documentElement.clientWidth || 0;
    const isAndroidTablet = /Android/i.test(userAgent) && !/Mobi/i.test(userAgent);

    if (/iPad|Tablet|PlayBook|Silk/i.test(userAgent) || isAndroidTablet || (hasTouch && width >= 768 && width <= 1180)) {
      return 'tablet';
    }

    if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      return 'mobile';
    }

    return 'desktop';
  }

  function baseEvent() {
    return {
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer || '',
      user_agent: navigator.userAgent,
      device_type: getDeviceType(),
      session_id: getSessionId(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  function sendEvent(payload) {
    if (!DEFAULT_ENDPOINT) {
      console.warn('Website tracker: missing WEBSITE_ACTIVITY_APPS_SCRIPT_URL');
      return;
    }

    const event = Object.assign({}, baseEvent(), payload);

    fetch(DEFAULT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(event),
      keepalive: true,
      mode: 'cors'
    }).catch(function (error) {
      console.error('Website tracker send failed', error);
    });
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX_LENGTH);
  }

  function getClickedElement(eventTarget) {
    if (!eventTarget || typeof eventTarget.closest !== 'function') {
      return null;
    }

    return eventTarget.closest(
      'a, button, input[type="button"], input[type="submit"], input[type="reset"], label, [role="button"]'
    ) || eventTarget;
  }

  function buildClickPayload(target) {
    const link = target && target.closest ? target.closest('a') : null;
    const button = target && target.closest
      ? target.closest('button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]')
      : null;
    const text = cleanText(
      target.innerText ||
      target.textContent ||
      target.value ||
      target.getAttribute('aria-label') ||
      target.getAttribute('title')
    );

    const payload = {
      event_type: 'click',
      action_category: 'page_click',
      clicked_text: text,
      element_tag: target.tagName ? target.tagName.toLowerCase() : '',
      element_id: target.id || '',
      element_name: target.name || '',
      element_classes: target.className || '',
      element_role: target.getAttribute('role') || ''
    };

    if (link) {
      payload.action_category = 'link_click';
      payload.clicked_link_text = cleanText(link.innerText || link.textContent || '');
      payload.clicked_link_url = link.href || '';
      payload.element_id = link.id || payload.element_id;
      payload.element_name = link.name || payload.element_name;
      payload.element_classes = link.className || payload.element_classes;
      payload.element_role = link.getAttribute('role') || payload.element_role;
      payload.element_tag = 'a';
    } else if (button) {
      payload.action_category = 'button_click';
      payload.button_text = cleanText(
        button.innerText ||
        button.textContent ||
        button.value ||
        button.getAttribute('aria-label') ||
        button.getAttribute('title')
      );
      payload.button_id = button.id || '';
      payload.element_id = button.id || payload.element_id;
      payload.element_name = button.name || payload.element_name;
      payload.element_classes = button.className || payload.element_classes;
      payload.element_role = button.getAttribute('role') || payload.element_role;
      payload.element_tag = button.tagName ? button.tagName.toLowerCase() : payload.element_tag;
    }

    return payload;
  }

  function getScrollMetrics() {
    const documentElement = document.documentElement;
    const body = document.body || {};
    const scrollX = window.pageXOffset || documentElement.scrollLeft || body.scrollLeft || 0;
    const scrollY = window.pageYOffset || documentElement.scrollTop || body.scrollTop || 0;
    const documentHeight = Math.max(
      body.scrollHeight || 0,
      documentElement.scrollHeight || 0,
      body.offsetHeight || 0,
      documentElement.offsetHeight || 0,
      body.clientHeight || 0,
      documentElement.clientHeight || 0
    );
    const scrollableHeight = Math.max(documentHeight - window.innerHeight, 0);
    const scrollPercent = scrollableHeight
      ? Math.round((scrollY / scrollableHeight) * 100)
      : 0;

    return {
      scroll_x: Math.round(scrollX),
      scroll_y: Math.round(scrollY),
      scroll_depth_percent: Math.max(0, Math.min(100, scrollPercent)),
      scrollable_height: scrollableHeight,
      document_height: documentHeight
    };
  }

  function buildScrollPayload() {
    const metrics = getScrollMetrics();
    const scrollDirection = metrics.scroll_y > lastTrackedScrollY
      ? 'down'
      : metrics.scroll_y < lastTrackedScrollY
        ? 'up'
        : metrics.scroll_x > lastTrackedScrollX
          ? 'right'
          : metrics.scroll_x < lastTrackedScrollX
            ? 'left'
            : '';

    return Object.assign({
      event_type: 'scroll',
      action_category: 'page_scroll',
      scroll_direction: scrollDirection
    }, metrics);
  }

  function sendScrollEvent() {
    scrollTimeoutId = null;
    const payload = buildScrollPayload();

    if (payload.scroll_x === lastTrackedScrollX && payload.scroll_y === lastTrackedScrollY) {
      return;
    }

    lastTrackedScrollX = payload.scroll_x;
    lastTrackedScrollY = payload.scroll_y;
    sendEvent(payload);
  }

  document.addEventListener('click', function (event) {
    const target = getClickedElement(event.target);
    if (!target) return;

    sendEvent(buildClickPayload(target));
  }, true);

  document.addEventListener('change', function (event) {
    const field = event.target;
    if (!field || !field.name) return;

    const isSensitive = /(password|passcode|credit|card|cvv|cvc|otp|ssn)/i.test(field.name);
    const value = isSensitive ? '[REDACTED]' : field.value;

    sendEvent({
      event_type: 'form_input',
      action_category: 'field_change',
      field_name: field.name || '',
      field_id: field.id || '',
      entered_data: value,
      field_type: field.type || '',
      form_id: field.form ? field.form.id || '' : ''
    });
  }, true);

  window.addEventListener('scroll', function () {
    if (scrollTimeoutId) {
      window.clearTimeout(scrollTimeoutId);
    }

    scrollTimeoutId = window.setTimeout(sendScrollEvent, SCROLL_DEBOUNCE_MS);
  }, { passive: true });

  window.addEventListener('pagehide', function () {
    if (!scrollTimeoutId) return;

    window.clearTimeout(scrollTimeoutId);
    sendScrollEvent();
  });

  window.websiteActivityTracker = {
    track: sendEvent
  };
})();
