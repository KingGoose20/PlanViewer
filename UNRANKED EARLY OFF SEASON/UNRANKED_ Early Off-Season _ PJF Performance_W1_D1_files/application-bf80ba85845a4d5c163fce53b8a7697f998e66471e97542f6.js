/* jshint node: true */

/**
 * Unobtrusive scripting adapter for jQuery
 * https://github.com/rails/jquery-ujs
 *
 * Requires jQuery 1.8.0 or later.
 *
 * Released under the MIT license
 *
 */


(function() {
  'use strict';

  var jqueryUjsInit = function($, undefined) {

  // Cut down on the number of issues from people inadvertently including jquery_ujs twice
  // by detecting and raising an error when it happens.
  if ( $.rails !== undefined ) {
    $.error('jquery-ujs has already been loaded!');
  }

  // Shorthand to make it a little easier to call public rails functions from within rails.js
  var rails;
  var $document = $(document);

  $.rails = rails = {
    // Link elements bound by jquery-ujs
    linkClickSelector: 'a[data-confirm], a[data-method], a[data-remote]:not([disabled]), a[data-disable-with], a[data-disable]',

    // Button elements bound by jquery-ujs
    buttonClickSelector: 'button[data-remote]:not([form]):not(form button), button[data-confirm]:not([form]):not(form button)',

    // Select elements bound by jquery-ujs
    inputChangeSelector: 'select[data-remote], input[data-remote], textarea[data-remote]',

    // Form elements bound by jquery-ujs
    formSubmitSelector: 'form:not([data-turbo=true])',

    // Form input elements bound by jquery-ujs
    formInputClickSelector: 'form:not([data-turbo=true]) input[type=submit], form:not([data-turbo=true]) input[type=image], form:not([data-turbo=true]) button[type=submit], form:not([data-turbo=true]) button:not([type]), input[type=submit][form], input[type=image][form], button[type=submit][form], button[form]:not([type])',

    // Form input elements disabled during form submission
    disableSelector: 'input[data-disable-with]:enabled, button[data-disable-with]:enabled, textarea[data-disable-with]:enabled, input[data-disable]:enabled, button[data-disable]:enabled, textarea[data-disable]:enabled',

    // Form input elements re-enabled after form submission
    enableSelector: 'input[data-disable-with]:disabled, button[data-disable-with]:disabled, textarea[data-disable-with]:disabled, input[data-disable]:disabled, button[data-disable]:disabled, textarea[data-disable]:disabled',

    // Form required input elements
    requiredInputSelector: 'input[name][required]:not([disabled]), textarea[name][required]:not([disabled])',

    // Form file input elements
    fileInputSelector: 'input[name][type=file]:not([disabled])',

    // Link onClick disable selector with possible reenable after remote submission
    linkDisableSelector: 'a[data-disable-with], a[data-disable]',

    // Button onClick disable selector with possible reenable after remote submission
    buttonDisableSelector: 'button[data-remote][data-disable-with], button[data-remote][data-disable]',

    // Up-to-date Cross-Site Request Forgery token
    csrfToken: function() {
     return $('meta[name=csrf-token]').attr('content');
    },

    // URL param that must contain the CSRF token
    csrfParam: function() {
     return $('meta[name=csrf-param]').attr('content');
    },

    // Make sure that every Ajax request sends the CSRF token
    CSRFProtection: function(xhr) {
      var token = rails.csrfToken();
      if (token) xhr.setRequestHeader('X-CSRF-Token', token);
    },

    // Make sure that all forms have actual up-to-date tokens (cached forms contain old ones)
    refreshCSRFTokens: function(){
      $('form input[name="' + rails.csrfParam() + '"]').val(rails.csrfToken());
    },

    // Triggers an event on an element and returns false if the event result is false
    fire: function(obj, name, data) {
      var event = $.Event(name);
      obj.trigger(event, data);
      return event.result !== false;
    },

    // Default confirm dialog, may be overridden with custom confirm dialog in $.rails.confirm
    confirm: function(message) {
      return confirm(message);
    },

    // Default ajax function, may be overridden with custom function in $.rails.ajax
    ajax: function(options) {
      return $.ajax(options);
    },

    // Default way to get an element's href. May be overridden at $.rails.href.
    href: function(element) {
      return element[0].href;
    },

    // Checks "data-remote" if true to handle the request through a XHR request.
    isRemote: function(element) {
      return element.data('remote') !== undefined && element.data('remote') !== false;
    },

    // Submits "remote" forms and links with ajax
    handleRemote: function(element) {
      var method, url, data, withCredentials, dataType, options;

      if (rails.fire(element, 'ajax:before')) {
        withCredentials = element.data('with-credentials') || null;
        dataType = element.data('type') || ($.ajaxSettings && $.ajaxSettings.dataType);

        if (element.is('form')) {
          method = element.data('ujs:submit-button-formmethod') || element.attr('method');
          url = element.data('ujs:submit-button-formaction') || element.attr('action');
          data = $(element[0]).serializeArray();
          // memoized value from clicked submit button
          var button = element.data('ujs:submit-button');
          if (button) {
            data.push(button);
            element.data('ujs:submit-button', null);
          }
          element.data('ujs:submit-button-formmethod', null);
          element.data('ujs:submit-button-formaction', null);
        } else if (element.is(rails.inputChangeSelector)) {
          method = element.data('method');
          url = element.data('url');
          data = element.serialize();
          if (element.data('params')) data = data + '&' + element.data('params');
        } else if (element.is(rails.buttonClickSelector)) {
          method = element.data('method') || 'get';
          url = element.data('url');
          data = element.serialize();
          if (element.data('params')) data = data + '&' + element.data('params');
        } else {
          method = element.data('method');
          url = rails.href(element);
          data = element.data('params') || null;
        }

        options = {
          type: method || 'GET', data: data, dataType: dataType,
          // stopping the "ajax:beforeSend" event will cancel the ajax request
          beforeSend: function(xhr, settings) {
            if (settings.dataType === undefined) {
              xhr.setRequestHeader('accept', '*/*;q=0.5, ' + settings.accepts.script);
            }
            if (rails.fire(element, 'ajax:beforeSend', [xhr, settings])) {
              element.trigger('ajax:send', xhr);
            } else {
              return false;
            }
          },
          success: function(data, status, xhr) {
            element.trigger('ajax:success', [data, status, xhr]);
          },
          complete: function(xhr, status) {
            element.trigger('ajax:complete', [xhr, status]);
          },
          error: function(xhr, status, error) {
            element.trigger('ajax:error', [xhr, status, error]);
          },
          crossDomain: rails.isCrossDomain(url)
        };

        // There is no withCredentials for IE6-8 when
        // "Enable native XMLHTTP support" is disabled
        if (withCredentials) {
          options.xhrFields = {
            withCredentials: withCredentials
          };
        }

        // Only pass url to `ajax` options if not blank
        if (url) { options.url = url; }

        return rails.ajax(options);
      } else {
        return false;
      }
    },

    // Determines if the request is a cross domain request.
    isCrossDomain: function(url) {
      var originAnchor = document.createElement('a');
      originAnchor.href = location.href;
      var urlAnchor = document.createElement('a');

      try {
        urlAnchor.href = url;
        // This is a workaround to a IE bug.
        urlAnchor.href = urlAnchor.href;

        // If URL protocol is false or is a string containing a single colon
        // *and* host are false, assume it is not a cross-domain request
        // (should only be the case for IE7 and IE compatibility mode).
        // Otherwise, evaluate protocol and host of the URL against the origin
        // protocol and host.
        return !(((!urlAnchor.protocol || urlAnchor.protocol === ':') && !urlAnchor.host) ||
          (originAnchor.protocol + '//' + originAnchor.host ===
            urlAnchor.protocol + '//' + urlAnchor.host));
      } catch (e) {
        // If there is an error parsing the URL, assume it is crossDomain.
        return true;
      }
    },

    // Handles "data-method" on links such as:
    // <a href="/users/5" data-method="delete" rel="nofollow" data-confirm="Are you sure?">Delete</a>
    handleMethod: function(link) {
      var href = rails.href(link),
        method = link.data('method'),
        target = link.attr('target'),
        csrfToken = rails.csrfToken(),
        csrfParam = rails.csrfParam(),
        form = $('<form method="post" action="' + href + '"></form>'),
        metadataInput = '<input name="_method" value="' + method + '" type="hidden" />';

      if (csrfParam !== undefined && csrfToken !== undefined && !rails.isCrossDomain(href)) {
        metadataInput += '<input name="' + csrfParam + '" value="' + csrfToken + '" type="hidden" />';
      }

      if (target) { form.attr('target', target); }

      form.hide().append(metadataInput).appendTo('body');
      form.submit();
    },

    // Helper function that returns form elements that match the specified CSS selector
    // If form is actually a "form" element this will return associated elements outside the from that have
    // the html form attribute set
    formElements: function(form, selector) {
      return form.is('form') ? $(form[0].elements).filter(selector) : form.find(selector);
    },

    /* Disables form elements:
      - Caches element value in 'ujs:enable-with' data store
      - Replaces element text with value of 'data-disable-with' attribute
      - Sets disabled property to true
    */
    disableFormElements: function(form) {
      rails.formElements(form, rails.disableSelector).each(function() {
        rails.disableFormElement($(this));
      });
    },

    disableFormElement: function(element) {
      var method, replacement;

      method = element.is('button') ? 'html' : 'val';
      replacement = element.data('disable-with');

      if (replacement !== undefined) {
        element.data('ujs:enable-with', element[method]());
        element[method](replacement);
      }

      element.prop('disabled', true);
      element.data('ujs:disabled', true);
    },

    /* Re-enables disabled form elements:
      - Replaces element text with cached value from 'ujs:enable-with' data store (created in `disableFormElements`)
      - Sets disabled property to false
    */
    enableFormElements: function(form) {
      rails.formElements(form, rails.enableSelector).each(function() {
        rails.enableFormElement($(this));
      });
    },

    enableFormElement: function(element) {
      var method = element.is('button') ? 'html' : 'val';
      if (element.data('ujs:enable-with') !== undefined) {
        element[method](element.data('ujs:enable-with'));
        element.removeData('ujs:enable-with'); // clean up cache
      }
      element.prop('disabled', false);
      element.removeData('ujs:disabled');
    },

   /* For 'data-confirm' attribute:
      - Fires `confirm` event
      - Shows the confirmation dialog
      - Fires the `confirm:complete` event

      Returns `true` if no function stops the chain and user chose yes; `false` otherwise.
      Attaching a handler to the element's `confirm` event that returns a `falsy` value cancels the confirmation dialog.
      Attaching a handler to the element's `confirm:complete` event that returns a `falsy` value makes this function
      return false. The `confirm:complete` event is fired whether or not the user answered true or false to the dialog.
   */
    allowAction: function(element) {
      var message = element.data('confirm'),
          answer = false, callback;
      if (!message) { return true; }

      if (rails.fire(element, 'confirm')) {
        try {
          answer = rails.confirm(message);
        } catch (e) {
          (console.error || console.log).call(console, e.stack || e);
        }
        callback = rails.fire(element, 'confirm:complete', [answer]);
      }
      return answer && callback;
    },

    // Helper function which checks for blank inputs in a form that match the specified CSS selector
    blankInputs: function(form, specifiedSelector, nonBlank) {
      var foundInputs = $(),
        input,
        valueToCheck,
        radiosForNameWithNoneSelected,
        radioName,
        selector = specifiedSelector || 'input,textarea',
        requiredInputs = form.find(selector),
        checkedRadioButtonNames = {};

      requiredInputs.each(function() {
        input = $(this);
        if (input.is('input[type=radio]')) {

          // Don't count unchecked required radio as blank if other radio with same name is checked,
          // regardless of whether same-name radio input has required attribute or not. The spec
          // states https://www.w3.org/TR/html5/forms.html#the-required-attribute
          radioName = input.attr('name');

          // Skip if we've already seen the radio with this name.
          if (!checkedRadioButtonNames[radioName]) {

            // If none checked
            if (form.find('input[type=radio]:checked[name="' + radioName + '"]').length === 0) {
              radiosForNameWithNoneSelected = form.find(
                'input[type=radio][name="' + radioName + '"]');
              foundInputs = foundInputs.add(radiosForNameWithNoneSelected);
            }

            // We only need to check each name once.
            checkedRadioButtonNames[radioName] = radioName;
          }
        } else {
          valueToCheck = input.is('input[type=checkbox],input[type=radio]') ? input.is(':checked') : !!input.val();
          if (valueToCheck === nonBlank) {
            foundInputs = foundInputs.add(input);
          }
        }
      });
      return foundInputs.length ? foundInputs : false;
    },

    // Helper function which checks for non-blank inputs in a form that match the specified CSS selector
    nonBlankInputs: function(form, specifiedSelector) {
      return rails.blankInputs(form, specifiedSelector, true); // true specifies nonBlank
    },

    // Helper function, needed to provide consistent behavior in IE
    stopEverything: function(e) {
      $(e.target).trigger('ujs:everythingStopped');
      e.stopImmediatePropagation();
      return false;
    },

    //  Replace element's html with the 'data-disable-with' after storing original html
    //  and prevent clicking on it
    disableElement: function(element) {
      var replacement = element.data('disable-with');

      if (replacement !== undefined) {
        element.data('ujs:enable-with', element.html()); // store enabled state
        element.html(replacement);
      }

      element.on('click.railsDisable', function(e) { // prevent further clicking
        return rails.stopEverything(e);
      });
      element.data('ujs:disabled', true);
    },

    // Restore element to its original state which was disabled by 'disableElement' above
    enableElement: function(element) {
      if (element.data('ujs:enable-with') !== undefined) {
        element.html(element.data('ujs:enable-with')); // set to old enabled state
        element.removeData('ujs:enable-with'); // clean up cache
      }
      element.off('click.railsDisable'); // enable element
      element.removeData('ujs:disabled');
    }
  };

  if (rails.fire($document, 'rails:attachBindings')) {

    $.ajaxPrefilter(function(options, originalOptions, xhr){ if ( !options.crossDomain ) { rails.CSRFProtection(xhr); }});

    // This event works the same as the load event, except that it fires every
    // time the page is loaded.
    //
    // See https://github.com/rails/jquery-ujs/issues/357
    // See https://developer.mozilla.org/en-US/docs/Using_Firefox_1.5_caching
    $(window).on('pageshow.rails', function () {
      $($.rails.enableSelector).each(function () {
        var element = $(this);

        if (element.data('ujs:disabled')) {
          $.rails.enableFormElement(element);
        }
      });

      $($.rails.linkDisableSelector).each(function () {
        var element = $(this);

        if (element.data('ujs:disabled')) {
          $.rails.enableElement(element);
        }
      });
    });

    $document.on('ajax:complete', rails.linkDisableSelector, function() {
        rails.enableElement($(this));
    });

    $document.on('ajax:complete', rails.buttonDisableSelector, function() {
        rails.enableFormElement($(this));
    });

    $document.on('click.rails', rails.linkClickSelector, function(e) {
      var link = $(this), method = link.data('method'), data = link.data('params'), metaClick = e.metaKey || e.ctrlKey;
      if (!rails.allowAction(link)) return rails.stopEverything(e);

      if (!metaClick && link.is(rails.linkDisableSelector)) rails.disableElement(link);

      if (rails.isRemote(link)) {
        if (metaClick && (!method || method === 'GET') && !data) { return true; }

        var handleRemote = rails.handleRemote(link);
        // Response from rails.handleRemote() will either be false or a deferred object promise.
        if (handleRemote === false) {
          rails.enableElement(link);
        } else {
          handleRemote.fail( function() { rails.enableElement(link); } );
        }
        return false;

      } else if (method) {
        rails.handleMethod(link);
        return false;
      }
    });

    $document.on('click.rails', rails.buttonClickSelector, function(e) {
      var button = $(this);

      if (!rails.allowAction(button) || !rails.isRemote(button)) return rails.stopEverything(e);

      if (button.is(rails.buttonDisableSelector)) rails.disableFormElement(button);

      var handleRemote = rails.handleRemote(button);
      // Response from rails.handleRemote() will either be false or a deferred object promise.
      if (handleRemote === false) {
        rails.enableFormElement(button);
      } else {
        handleRemote.fail( function() { rails.enableFormElement(button); } );
      }
      return false;
    });

    $document.on('change.rails', rails.inputChangeSelector, function(e) {
      var link = $(this);
      if (!rails.allowAction(link) || !rails.isRemote(link)) return rails.stopEverything(e);

      rails.handleRemote(link);
      return false;
    });

    $document.on('submit.rails', rails.formSubmitSelector, function(e) {
      var form = $(this),
        remote = rails.isRemote(form),
        blankRequiredInputs,
        nonBlankFileInputs;

      if (!rails.allowAction(form)) return rails.stopEverything(e);

      // Skip other logic when required values are missing or file upload is present
      if (form.attr('novalidate') === undefined) {
        if (form.data('ujs:formnovalidate-button') === undefined) {
          blankRequiredInputs = rails.blankInputs(form, rails.requiredInputSelector, false);
          if (blankRequiredInputs && rails.fire(form, 'ajax:aborted:required', [blankRequiredInputs])) {
            return rails.stopEverything(e);
          }
        } else {
          // Clear the formnovalidate in case the next button click is not on a formnovalidate button
          // Not strictly necessary to do here, since it is also reset on each button click, but just to be certain
          form.data('ujs:formnovalidate-button', undefined);
        }
      }

      if (remote) {
        nonBlankFileInputs = rails.nonBlankInputs(form, rails.fileInputSelector);
        if (nonBlankFileInputs) {
          // Slight timeout so that the submit button gets properly serialized
          // (make it easy for event handler to serialize form without disabled values)
          setTimeout(function(){ rails.disableFormElements(form); }, 13);
          var aborted = rails.fire(form, 'ajax:aborted:file', [nonBlankFileInputs]);

          // Re-enable form elements if event bindings return false (canceling normal form submission)
          if (!aborted) { setTimeout(function(){ rails.enableFormElements(form); }, 13); }

          return aborted;
        }

        rails.handleRemote(form);
        return false;

      } else {
        // Slight timeout so that the submit button gets properly serialized
        setTimeout(function(){ rails.disableFormElements(form); }, 13);
      }
    });

    $document.on('click.rails', rails.formInputClickSelector, function(event) {
      var button = $(this);

      if (!rails.allowAction(button)) return rails.stopEverything(event);

      // Register the pressed submit button
      var name = button.attr('name'),
        data = name ? {name:name, value:button.val()} : null;

      var form = button.closest('form');
      if (form.length === 0) {
        form = $('#' + button.attr('form'));
      }
      form.data('ujs:submit-button', data);

      // Save attributes from button
      form.data('ujs:formnovalidate-button', button.attr('formnovalidate'));
      form.data('ujs:submit-button-formaction', button.attr('formaction'));
      form.data('ujs:submit-button-formmethod', button.attr('formmethod'));
    });

    $document.on('ajax:send.rails', rails.formSubmitSelector, function(event) {
      if (this === event.target) rails.disableFormElements($(this));
    });

    $document.on('ajax:complete.rails', rails.formSubmitSelector, function(event) {
      if (this === event.target) rails.enableFormElements($(this));
    });

    $(function(){
      rails.refreshCSRFTokens();
    });
  }

  };

  if (window.jQuery) {
    jqueryUjsInit(jQuery);
  } else if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = jqueryUjsInit;
  }
})();
/*! iFrame Resizer (iframeSizer.min.js ) - v4.3.9 - 2023-11-10
 *  Desc: Force cross domain iframes to size to content.
 *  Requires: iframeResizer.contentWindow.min.js to be loaded into the target frame.
 *  Copyright: (c) 2023 David J. Bradshaw - dave@bradshaw.net
 *  License: MIT
 */

!function (d) { var c, u, a, v, x, I, M, r, f, k, i, l, z; function m() { return window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver } function F(e, n, i) { e.addEventListener(n, i, !1) } function B(e, n, i) { e.removeEventListener(n, i, !1) } function p(e) { return x + "[" + (n = "Host page: " + (e = e), n = window.top !== window.self ? window.parentIFrame && window.parentIFrame.getId ? window.parentIFrame.getId() + ": " + e : "Nested host page: " + e : n) + "]"; var n } function t(e) { return k[e] ? k[e].log : u } function O(e, n) { o("log", e, n, t(e)) } function E(e, n) { o("info", e, n, t(e)) } function R(e, n) { o("warn", e, n, !0) } function o(e, n, i, t) { !0 === t && "object" == typeof window.console && console[e](p(n), i) } function w(e) { function i() { t("Height"), t("Width"), P(function () { H(w), C(b), l("onResized", w) }, w, "init") } function n() { var e = p.slice(I).split(":"), n = e[1] ? parseInt(e[1], 10) : 0, i = k[e[0]] && k[e[0]].iframe, t = getComputedStyle(i); return { iframe: i, id: e[0], height: n + function (e) { if ("border-box" !== e.boxSizing) return 0; var n = e.paddingTop ? parseInt(e.paddingTop, 10) : 0, e = e.paddingBottom ? parseInt(e.paddingBottom, 10) : 0; return n + e }(t) + function (e) { if ("border-box" !== e.boxSizing) return 0; var n = e.borderTopWidth ? parseInt(e.borderTopWidth, 10) : 0, e = e.borderBottomWidth ? parseInt(e.borderBottomWidth, 10) : 0; return n + e }(t), width: e[2], type: e[3] } } function t(e) { var n = Number(k[b]["max" + e]), i = Number(k[b]["min" + e]), e = e.toLowerCase(), t = Number(w[e]); O(b, "Checking " + e + " is in range " + i + "-" + n), t < i && (t = i, O(b, "Set " + e + " to min value")), n < t && (t = n, O(b, "Set " + e + " to max value")), w[e] = "" + t } function o() { var t = e.origin, o = k[b] && k[b].checkOrigin; if (o && "" + t != "null" && !function () { if (o.constructor !== Array) return e = k[b] && k[b].remoteHost, O(b, "Checking connection is from: " + e), t === e; var e, n = 0, i = !1; for (O(b, "Checking connection is from allowed list of origins: " + o); n < o.length; n++)if (o[n] === t) { i = !0; break } return i }()) throw new Error("Unexpected message received from: " + t + " for " + w.iframe.id + ". Message was: " + e.data + ". This error can be disabled by setting the checkOrigin: false option or by providing of array of trusted domains."); return 1 } function a(e) { return p.slice(p.indexOf(":") + v + e) } function s(i, t) { var e, n, o; e = function () { var e, n; A("Send Page Info", "pageInfo:" + (e = document.body.getBoundingClientRect(), n = w.iframe.getBoundingClientRect(), JSON.stringify({ iframeHeight: n.height, iframeWidth: n.width, clientHeight: Math.max(document.documentElement.clientHeight, window.innerHeight || 0), clientWidth: Math.max(document.documentElement.clientWidth, window.innerWidth || 0), offsetTop: parseInt(n.top - e.top, 10), offsetLeft: parseInt(n.left - e.left, 10), scrollTop: window.pageYOffset, scrollLeft: window.pageXOffset, documentHeight: document.documentElement.clientHeight, documentWidth: document.documentElement.clientWidth, windowHeight: window.innerHeight, windowWidth: window.innerWidth })), i, t) }, n = 32, z[o = t] || (z[o] = setTimeout(function () { z[o] = null, e() }, n)) } function r(e) { e = e.getBoundingClientRect(); return W(b), { x: Math.floor(Number(e.left) + Number(M.x)), y: Math.floor(Number(e.top) + Number(M.y)) } } function d(e) { var n = e ? r(w.iframe) : { x: 0, y: 0 }, i = { x: Number(w.width) + n.x, y: Number(w.height) + n.y }; O(b, "Reposition requested from iFrame (offset x:" + n.x + " y:" + n.y + ")"), window.top === window.self ? (M = i, c(), O(b, "--")) : window.parentIFrame ? window.parentIFrame["scrollTo" + (e ? "Offset" : "")](i.x, i.y) : R(b, "Unable to scroll to requested position, window.parentIFrame not found") } function c() { !1 === l("onScroll", M) ? S() : C(b) } function u(e) { var e = e.split("#")[1] || "", n = decodeURIComponent(e), n = document.getElementById(n) || document.getElementsByName(n)[0]; n ? (n = r(n), O(b, "Moving to in page link (#" + e + ") at x: " + n.x + " y: " + n.y), M = { x: n.x, y: n.y }, c(), O(b, "--")) : window.top === window.self ? O(b, "In page link #" + e + " not found") : window.parentIFrame ? window.parentIFrame.moveToAnchor(e) : O(b, "In page link #" + e + " not found and window.parentIFrame not found") } function f(e) { var n, i = {}; i = 0 === Number(w.width) && 0 === Number(w.height) ? { x: (n = a(9).split(":"))[1], y: n[0] } : { x: w.width, y: w.height }, l(e, { iframe: w.iframe, screenX: Number(i.x), screenY: Number(i.y), type: w.type }) } function l(e, n) { return T(b, e, n) } function m() { switch (k[b] && k[b].firstRun && k[b] && (k[b].firstRun = !1), w.type) { case "close": N(w.iframe); break; case "message": n = a(6), O(b, "onMessage passed: {iframe: " + w.iframe.id + ", message: " + n + "}"), l("onMessage", { iframe: w.iframe, message: JSON.parse(n) }), O(b, "--"); break; case "mouseenter": f("onMouseEnter"); break; case "mouseleave": f("onMouseLeave"); break; case "autoResize": k[b].autoResize = JSON.parse(a(9)); break; case "scrollTo": d(!1); break; case "scrollToOffset": d(!0); break; case "pageInfo": s(k[b] && k[b].iframe, b), r = b, e("Add ", F), k[r] && (k[r].stopPageInfo = o); break; case "pageInfoStop": k[b] && k[b].stopPageInfo && (k[b].stopPageInfo(), delete k[b].stopPageInfo); break; case "inPageLink": u(a(9)); break; case "reset": j(w); break; case "init": i(), l("onInit", w.iframe); break; default: 0 === Number(w.width) && 0 === Number(w.height) ? R("Unsupported message received (" + w.type + "), this is likely due to the iframe containing a later version of iframe-resizer than the parent page") : i() }function e(n, i) { function t() { k[r] ? s(k[r].iframe, r) : o() } ["scroll", "resize"].forEach(function (e) { O(r, n + e + " listener for sendPageInfo"), i(window, e, t) }) } function o() { e("Remove ", B) } var r, n } var g, h, p = e.data, w = {}, b = null; if ("[iFrameResizerChild]Ready" === p) for (var y in k) A("iFrame requested init", L(y), k[y].iframe, y); else x === ("" + p).slice(0, I) && p.slice(I).split(":")[0] in k ? (w = n(), b = w.id, k[b] && (k[b].loaded = !0), (h = w.type in { true: 1, false: 1, undefined: 1 }) && O(b, "Ignoring init message from meta parent page"), !h && (h = !0, k[g = b] || (h = !1, R(w.type + " No settings for " + g + ". Message was: " + p)), h) && (O(b, "Received: " + p), g = !0, null === w.iframe && (R(b, "IFrame (" + w.id + ") not found"), g = !1), g && o() && m())) : E(b, "Ignored: " + p) } function T(e, n, i) { var t = null, o = null; if (k[e]) { if ("function" != typeof (t = k[e][n])) throw new TypeError(n + " on iFrame[" + e + "] is not a function"); o = t(i) } return o } function g(e) { e = e.id; delete k[e] } function N(e) { var n = e.id; if (!1 === T(n, "onClose", n)) O(n, "Close iframe cancelled by onClose event"); else { O(n, "Removing iFrame: " + n); try { e.parentNode && e.parentNode.removeChild(e) } catch (e) { R(e) } T(n, "onClosed", n), O(n, "--"), g(e) } } function W(e) { null === M && O(e, "Get page position: " + (M = { x: window.pageXOffset === d ? document.documentElement.scrollLeft : window.pageXOffset, y: window.pageYOffset === d ? document.documentElement.scrollTop : window.pageYOffset }).x + "," + M.y) } function C(e) { null !== M && (window.scrollTo(M.x, M.y), O(e, "Set page position: " + M.x + "," + M.y), S()) } function S() { M = null } function j(e) { O(e.id, "Size reset requested by " + ("init" === e.type ? "host page" : "iFrame")), W(e.id), P(function () { H(e), A("reset", "reset", e.iframe, e.id) }, e, "reset") } function H(o) { function i(e) { var n; function i() { Object.keys(k).forEach(function (e) { function n(e) { return "0px" === (k[i] && k[i].iframe.style[e]) } var i; k[i = e] && null !== k[i].iframe.offsetParent && (n("height") || n("width")) && A("Visibility change", "resize", k[i].iframe, i) }) } function t(e) { O("window", "Mutation observed: " + e[0].target + " " + e[0].type), h(i, 16) } !a && "0" === o[e] && (a = !0, O(r, "Hidden iFrame detected, creating visibility listener"), e = m()) && (n = document.querySelector("body"), new e(t).observe(n, { attributes: !0, attributeOldValue: !1, characterData: !0, characterDataOldValue: !1, childList: !0, subtree: !0 })) } function e(e) { var n; n = e, o.id ? (o.iframe.style[n] = o[n] + "px", O(o.id, "IFrame (" + r + ") " + n + " set to " + o[n] + "px")) : O("undefined", "messageData id not set"), i(e) } var r = o.iframe.id; k[r] && (k[r].sizeHeight && e("height"), k[r].sizeWidth) && e("width") } function P(e, n, i) { i !== n.type && r && !window.jasmine ? (O(n.id, "Requesting animation frame"), r(e)) : e() } function A(n, i, t, o, e) { function r() { var e; t && "contentWindow" in t && null !== t.contentWindow ? (e = k[o] && k[o].targetOrigin, O(o, "[" + n + "] Sending msg to iframe[" + o + "] (" + i + ") targetOrigin: " + e), t.contentWindow.postMessage(x + i, e)) : R(o, "[" + n + "] IFrame(" + o + ") not found") } function a() { e && k[o] && k[o].warningTimeout && (k[o].msgTimeout = setTimeout(function () { !k[o] || k[o].loaded || s || (s = !0, R(o, "IFrame has not responded within " + k[o].warningTimeout / 1e3 + " seconds. Check iFrameResizer.contentWindow.js has been loaded in iFrame. This message can be ignored if everything is working, or you can set the warningTimeout option to a higher value or zero to suppress this warning.")) }, k[o].warningTimeout)) } var s = !1; o = o || t.id, k[o] && (r(), a()) } function L(e) { return e + ":" + k[e].bodyMarginV1 + ":" + k[e].sizeWidth + ":" + k[e].log + ":" + k[e].interval + ":" + k[e].enablePublicMethods + ":" + k[e].autoResize + ":" + k[e].bodyMargin + ":" + k[e].heightCalculationMethod + ":" + k[e].bodyBackground + ":" + k[e].bodyPadding + ":" + k[e].tolerance + ":" + k[e].inPageLinks + ":" + k[e].resizeFrom + ":" + k[e].widthCalculationMethod + ":" + k[e].mouseEvents } function s(t, i) { function e(i) { var e = m(); e && (e = e, t.parentNode) && new e(function (e) { e.forEach(function (e) { Array.prototype.slice.call(e.removedNodes).forEach(function (e) { e === t && N(t) }) }) }).observe(t.parentNode, { childList: !0 }), F(t, "load", function () { var e, n; A("iFrame.onload", i, t, d, !0), e = k[r] && k[r].firstRun, n = k[r] && k[r].heightCalculationMethod in f, !e && n && j({ iframe: t, height: 0, width: 0, type: "init" }) }), A("init", i, t, d, !0) } function o(e) { var n = e.split("Callback"); 2 === n.length && (this[n = "on" + n[0].charAt(0).toUpperCase() + n[0].slice(1)] = this[e], delete this[e], R(r, "Deprecated: '" + e + "' has been renamed '" + n + "'. The old method will be removed in the next major version.")) } function n(e) { if (e = e || {}, k[r] = Object.create(null), k[r].iframe = t, k[r].firstRun = !0, k[r].remoteHost = t.src && t.src.split("/").slice(0, 3).join("/"), "object" != typeof e) throw new TypeError("Options is not an object"); Object.keys(e).forEach(o, e); var n, i = e; for (n in l) Object.prototype.hasOwnProperty.call(l, n) && (k[r][n] = (Object.prototype.hasOwnProperty.call(i, n) ? i : l)[n]); k[r] && (k[r].targetOrigin = !0 !== k[r].checkOrigin || "" === (e = k[r].remoteHost) || null !== e.match(/^(about:blank|javascript:|file:\/\/)/) ? "*" : e) } var r = function (e) { if ("string" != typeof e) throw new TypeError("Invaild id for iFrame. Expected String"); var n; return "" === e && (t.id = (n = i && i.id || l.id + c++, null !== document.getElementById(n) && (n += c++), e = n), u = (i || {}).log, O(e, "Added missing iframe ID: " + e + " (" + t.src + ")")), e }(t.id); if (r in k && "iFrameResizer" in t) R(r, "Ignored iFrame, already setup."); else { switch (n(i), O(r, "IFrame scrolling " + (k[r] && k[r].scrolling ? "enabled" : "disabled") + " for " + r), t.style.overflow = !1 === (k[r] && k[r].scrolling) ? "hidden" : "auto", k[r] && k[r].scrolling) { case "omit": break; case !0: t.scrolling = "yes"; break; case !1: t.scrolling = "no"; break; default: t.scrolling = k[r] ? k[r].scrolling : "no" }s("Height"), s("Width"), a("maxHeight"), a("minHeight"), a("maxWidth"), a("minWidth"), "number" != typeof (k[r] && k[r].bodyMargin) && "0" !== (k[r] && k[r].bodyMargin) || (k[r].bodyMarginV1 = k[r].bodyMargin, k[r].bodyMargin = k[r].bodyMargin + "px"), e(L(r)), k[r] && (k[r].iframe.iFrameResizer = { close: N.bind(null, k[r].iframe), removeListeners: g.bind(null, k[r].iframe), resize: A.bind(null, "Window resize", "resize", k[r].iframe), moveToAnchor: function (e) { A("Move to anchor", "moveToAnchor:" + e, k[r].iframe, r) }, sendMessage: function (e) { A("Send Message", "message:" + (e = JSON.stringify(e)), k[r].iframe, r) } }) } function a(e) { var n = k[r][e]; 1 / 0 !== n && 0 !== n && (t.style[e] = "number" == typeof n ? n + "px" : n, O(r, "Set " + e + " = " + t.style[e])) } function s(e) { if (k[r]["min" + e] > k[r]["max" + e]) throw new Error("Value for min" + e + " can not be greater than max" + e) } } function h(e, n) { null === i && (i = setTimeout(function () { i = null, e() }, n)) } function e() { "hidden" !== document.visibilityState && (O("document", "Trigger event: Visibility change"), h(function () { b("Tab Visible", "resize") }, 16)) } function b(i, t) { Object.keys(k).forEach(function (e) { var n; k[n = e] && "parent" === k[n].resizeFrom && k[n].autoResize && !k[n].firstRun && A(i, t, k[e].iframe, e) }) } function y() { F(window, "message", w), F(window, "resize", function () { var e; O("window", "Trigger event: " + (e = "resize")), h(function () { b("Window " + e, "resize") }, 16) }), F(document, "visibilitychange", e), F(document, "-webkit-visibilitychange", e) } function n() { function t(e, n) { if (n) { if (!n.tagName) throw new TypeError("Object is not a valid DOM element"); if ("IFRAME" !== n.tagName.toUpperCase()) throw new TypeError("Expected <IFRAME> tag, found <" + n.tagName + ">"); s(n, e), o.push(n) } } for (var o, e = ["moz", "webkit", "o", "ms"], n = 0; n < e.length && !r; n += 1)r = window[e[n] + "RequestAnimationFrame"]; return r ? r = r.bind(window) : O("setup", "RequestAnimationFrame not supported"), y(), function (e, n) { var i; switch (o = [], (i = e) && i.enablePublicMethods && R("enablePublicMethods option has been removed, public methods are now always available in the iFrame"), typeof n) { case "undefined": case "string": Array.prototype.forEach.call(document.querySelectorAll(n || "iframe"), t.bind(d, e)); break; case "object": t(e, n); break; default: throw new TypeError("Unexpected data type (" + typeof n + ")") }return o } } function q(e) { e.fn ? e.fn.iFrameResize || (e.fn.iFrameResize = function (i) { return this.filter("iframe").each(function (e, n) { s(n, i) }).end() }) : E("", "Unable to bind to jQuery, it is not fully loaded.") } "undefined" != typeof window && (c = 0, a = u = !1, v = "message".length, I = (x = "[iFrameSizer]").length, M = null, r = window.requestAnimationFrame, f = Object.freeze({ max: 1, scroll: 1, bodyScroll: 1, documentElementScroll: 1 }), k = {}, i = null, l = Object.freeze({ autoResize: !0, bodyBackground: null, bodyMargin: null, bodyMarginV1: 8, bodyPadding: null, checkOrigin: !0, inPageLinks: !1, enablePublicMethods: !0, heightCalculationMethod: "bodyOffset", id: "iFrameResizer", interval: 32, log: !1, maxHeight: 1 / 0, maxWidth: 1 / 0, minHeight: 0, minWidth: 0, mouseEvents: !0, resizeFrom: "parent", scrolling: !1, sizeHeight: !0, sizeWidth: !1, warningTimeout: 5e3, tolerance: 0, widthCalculationMethod: "scroll", onClose: function () { return !0 }, onClosed: function () { }, onInit: function () { }, onMessage: function () { R("onMessage function not defined") }, onMouseEnter: function () { }, onMouseLeave: function () { }, onResized: function () { }, onScroll: function () { return !0 } }), z = {}, window.jQuery !== d && q(window.jQuery), "function" == typeof define && define.amd ? define([], n) : "object" == typeof module && "object" == typeof module.exports && (module.exports = n()), window.iFrameResize = window.iFrameResize || n()) }();

/*! iFrame Resizer (iframeSizer.contentWindow.min.js) - v4.3.9 - 2023-11-10
 *  Desc: Include this file in any page being loaded into an iframe
 *        to force the iframe to resize to the content size.
 *  Requires: iframeResizer.min.js on host page.
 *  Copyright: (c) 2023 David J. Bradshaw - dave@bradshaw.net
 *  License: MIT
 */

!function (a) { if ("undefined" != typeof window) { var r = !0, P = "", u = 0, c = "", s = null, D = "", d = !1, j = { resize: 1, click: 1 }, l = 128, q = !0, f = 1, n = "bodyOffset", m = n, H = !0, W = "", h = {}, g = 32, B = null, p = !1, v = !1, y = "[iFrameSizer]", J = y.length, w = "", U = { max: 1, min: 1, bodyScroll: 1, documentElementScroll: 1 }, b = "child", V = !0, X = window.parent, T = "*", E = 0, i = !1, Y = null, O = 16, S = 1, K = "scroll", M = K, Q = window, G = function () { x("onMessage function not defined") }, Z = function () { }, $ = function () { }, _ = { height: function () { return x("Custom height calculation function not defined"), document.documentElement.offsetHeight }, width: function () { return x("Custom width calculation function not defined"), document.body.scrollWidth } }, ee = {}, te = !1; try { var ne = Object.create({}, { passive: { get: function () { te = !0 } } }); window.addEventListener("test", ae, ne), window.removeEventListener("test", ae, ne) } catch (e) { } var oe, o, I, ie, N, A, C = { bodyOffset: function () { return document.body.offsetHeight + ye("marginTop") + ye("marginBottom") }, offset: function () { return C.bodyOffset() }, bodyScroll: function () { return document.body.scrollHeight }, custom: function () { return _.height() }, documentElementOffset: function () { return document.documentElement.offsetHeight }, documentElementScroll: function () { return document.documentElement.scrollHeight }, max: function () { return Math.max.apply(null, e(C)) }, min: function () { return Math.min.apply(null, e(C)) }, grow: function () { return C.max() }, lowestElement: function () { return Math.max(C.bodyOffset() || C.documentElementOffset(), we("bottom", Te())) }, taggedElement: function () { return be("bottom", "data-iframe-height") } }, z = { bodyScroll: function () { return document.body.scrollWidth }, bodyOffset: function () { return document.body.offsetWidth }, custom: function () { return _.width() }, documentElementScroll: function () { return document.documentElement.scrollWidth }, documentElementOffset: function () { return document.documentElement.offsetWidth }, scroll: function () { return Math.max(z.bodyScroll(), z.documentElementScroll()) }, max: function () { return Math.max.apply(null, e(z)) }, min: function () { return Math.min.apply(null, e(z)) }, rightMostElement: function () { return we("right", Te()) }, taggedElement: function () { return be("right", "data-iframe-width") } }, re = (oe = Ee, N = null, A = 0, function () { var e = Date.now(), t = O - (e - (A = A || e)); return o = this, I = arguments, t <= 0 || O < t ? (N && (clearTimeout(N), N = null), A = e, ie = oe.apply(o, I), N || (o = I = null)) : N = N || setTimeout(Oe, t), ie }); k(window, "message", function (t) { var n = { init: function () { W = t.data, X = t.source, se(), q = !1, setTimeout(function () { H = !1 }, l) }, reset: function () { H ? R("Page reset ignored by init") : (R("Page size reset by host page"), Me("resetPage")) }, resize: function () { L("resizeParent", "Parent window requested size check") }, moveToAnchor: function () { h.findTarget(i()) }, inPageLink: function () { this.moveToAnchor() }, pageInfo: function () { var e = i(); R("PageInfoFromParent called from parent: " + e), $(JSON.parse(e)), R(" --") }, message: function () { var e = i(); R("onMessage called from parent: " + e), G(JSON.parse(e)), R(" --") } }; function o() { return t.data.split("]")[1].split(":")[0] } function i() { return t.data.slice(t.data.indexOf(":") + 1) } function r() { return t.data.split(":")[2] in { true: 1, false: 1 } } function e() { var e = o(); e in n ? n[e]() : ("undefined" == typeof module || !module.exports) && "iFrameResize" in window || window.jQuery !== a && "iFrameResize" in window.jQuery.prototype || r() || x("Unexpected message (" + t.data + ")") } y === ("" + t.data).slice(0, J) && (!1 === q ? e() : r() ? n.init() : R('Ignored message of type "' + o() + '". Received before initialization.')) }), k(window, "readystatechange", Ne), Ne() } function ae() { } function k(e, t, n, o) { e.addEventListener(t, n, !!te && (o || {})) } function ue(e) { return e.charAt(0).toUpperCase() + e.slice(1) } function ce(e) { return y + "[" + w + "] " + e } function R(e) { p && "object" == typeof window.console && console.log(ce(e)) } function x(e) { "object" == typeof window.console && console.warn(ce(e)) } function se() { function e(e) { return "true" === e } function t(e, t) { return "function" == typeof e && (R("Setup custom " + t + "CalcMethod"), _[t] = e, e = "custom"), e } { var n; n = W.slice(J).split(":"), w = n[0], u = a === n[1] ? u : Number(n[1]), d = a === n[2] ? d : e(n[2]), p = a === n[3] ? p : e(n[3]), g = a === n[4] ? g : Number(n[4]), r = a === n[6] ? r : e(n[6]), c = n[7], m = a === n[8] ? m : n[8], P = n[9], D = n[10], E = a === n[11] ? E : Number(n[11]), h.enable = a !== n[12] && e(n[12]), b = a === n[13] ? b : n[13], M = a === n[14] ? M : n[14], v = a === n[15] ? v : e(n[15]), R("Initialising iFrame (" + window.location.href + ")"), "iFrameResizer" in window && Object === window.iFrameResizer.constructor && (n = window.iFrameResizer, R("Reading data from page: " + JSON.stringify(n)), Object.keys(n).forEach(de, n), G = "onMessage" in n ? n.onMessage : G, Z = "onReady" in n ? n.onReady : Z, T = "targetOrigin" in n ? n.targetOrigin : T, m = "heightCalculationMethod" in n ? n.heightCalculationMethod : m, M = "widthCalculationMethod" in n ? n.widthCalculationMethod : M, m = t(m, "height"), M = t(M, "width")) } function o(e) { F(0, 0, e.type, e.screenY + ":" + e.screenX) } function i(e, t) { R("Add event listener: " + t), k(window.document, e, o) } R("TargetOrigin for parent set to: " + T), le("margin", function (e, t) { -1 !== t.indexOf("-") && (x("Negative CSS value ignored for " + e), t = ""); return t }("margin", c = a === c ? u + "px" : c)), le("background", P), le("padding", D), (n = document.createElement("div")).style.clear = "both", n.style.display = "block", n.style.height = "0", document.body.appendChild(n), he(), ge(), document.documentElement.style.height = "", document.body.style.height = "", R('HTML & body height set to "auto"'), R("Enable public methods"), Q.parentIFrame = { autoResize: function (e) { return !0 === e && !1 === r ? (r = !0, pe()) : !1 === e && !0 === r && (r = !1, fe("remove"), null !== s && s.disconnect(), clearInterval(B)), F(0, 0, "autoResize", JSON.stringify(r)), r }, close: function () { F(0, 0, "close") }, getId: function () { return w }, getPageInfo: function (e) { "function" == typeof e ? ($ = e, F(0, 0, "pageInfo")) : ($ = function () { }, F(0, 0, "pageInfoStop")) }, moveToAnchor: function (e) { h.findTarget(e) }, reset: function () { Ie("parentIFrame.reset") }, scrollTo: function (e, t) { F(t, e, "scrollTo") }, scrollToOffset: function (e, t) { F(t, e, "scrollToOffset") }, sendMessage: function (e, t) { F(0, 0, "message", JSON.stringify(e), t) }, setHeightCalculationMethod: function (e) { m = e, he() }, setWidthCalculationMethod: function (e) { M = e, ge() }, setTargetOrigin: function (e) { R("Set targetOrigin: " + e), T = e }, size: function (e, t) { L("size", "parentIFrame.size(" + ((e || "") + (t ? "," + t : "")) + ")", e, t) } }, !0 === v && (i("mouseenter", "Mouse Enter"), i("mouseleave", "Mouse Leave")), pe(), h = function () { function n(e) { var e = e.getBoundingClientRect(), t = { x: window.pageXOffset === a ? document.documentElement.scrollLeft : window.pageXOffset, y: window.pageYOffset === a ? document.documentElement.scrollTop : window.pageYOffset }; return { x: parseInt(e.left, 10) + parseInt(t.x, 10), y: parseInt(e.top, 10) + parseInt(t.y, 10) } } function o(e) { var e = e.split("#")[1] || e, t = decodeURIComponent(e), t = document.getElementById(t) || document.getElementsByName(t)[0]; a === t ? (R("In page link (#" + e + ") not found in iFrame, so sending to parent"), F(0, 0, "inPageLink", "#" + e)) : (t = n(t = t), R("Moving to in page link (#" + e + ") at x: " + t.x + " y: " + t.y), F(t.y, t.x, "scrollToOffset")) } function e() { var e = window.location.hash, t = window.location.href; "" !== e && "#" !== e && o(t) } function t() { Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'), function (e) { "#" !== e.getAttribute("href") && k(e, "click", function (e) { e.preventDefault(), o(this.getAttribute("href")) }) }) } function i() { Array.prototype.forEach && document.querySelectorAll ? (R("Setting up location.hash handlers"), t(), k(window, "hashchange", e), setTimeout(e, l)) : x("In page linking not fully supported in this browser! (See README.md for IE8 workaround)") } h.enable ? i() : R("In page linking not enabled"); return { findTarget: o } }(), L("init", "Init message from host page"), Z() } function de(e) { var t = e.split("Callback"); 2 === t.length && (this[t = "on" + t[0].charAt(0).toUpperCase() + t[0].slice(1)] = this[e], delete this[e], x("Deprecated: '" + e + "' has been renamed '" + t + "'. The old method will be removed in the next major version.")) } function le(e, t) { a !== t && "" !== t && "null" !== t && R("Body " + e + ' set to "' + (document.body.style[e] = t) + '"') } function t(n) { var e = { add: function (e) { function t() { L(n.eventName, n.eventType) } ee[e] = t, k(window, e, t, { passive: !0 }) }, remove: function (e) { var t = ee[e]; delete ee[e], window.removeEventListener(e, t, !1) } }; n.eventNames && Array.prototype.map ? (n.eventName = n.eventNames[0], n.eventNames.map(e[n.method])) : e[n.method](n.eventName), R(ue(n.method) + " event listener: " + n.eventType) } function fe(e) { t({ method: e, eventType: "Animation Start", eventNames: ["animationstart", "webkitAnimationStart"] }), t({ method: e, eventType: "Animation Iteration", eventNames: ["animationiteration", "webkitAnimationIteration"] }), t({ method: e, eventType: "Animation End", eventNames: ["animationend", "webkitAnimationEnd"] }), t({ method: e, eventType: "Input", eventName: "input" }), t({ method: e, eventType: "Mouse Up", eventName: "mouseup" }), t({ method: e, eventType: "Mouse Down", eventName: "mousedown" }), t({ method: e, eventType: "Orientation Change", eventName: "orientationchange" }), t({ method: e, eventType: "Print", eventNames: ["afterprint", "beforeprint"] }), t({ method: e, eventType: "Ready State Change", eventName: "readystatechange" }), t({ method: e, eventType: "Touch Start", eventName: "touchstart" }), t({ method: e, eventType: "Touch End", eventName: "touchend" }), t({ method: e, eventType: "Touch Cancel", eventName: "touchcancel" }), t({ method: e, eventType: "Transition Start", eventNames: ["transitionstart", "webkitTransitionStart", "MSTransitionStart", "oTransitionStart", "otransitionstart"] }), t({ method: e, eventType: "Transition Iteration", eventNames: ["transitioniteration", "webkitTransitionIteration", "MSTransitionIteration", "oTransitionIteration", "otransitioniteration"] }), t({ method: e, eventType: "Transition End", eventNames: ["transitionend", "webkitTransitionEnd", "MSTransitionEnd", "oTransitionEnd", "otransitionend"] }), "child" === b && t({ method: e, eventType: "IFrame Resized", eventName: "resize" }) } function me(e, t, n, o) { return t !== e && (e in n || (x(e + " is not a valid option for " + o + "CalculationMethod."), e = t), R(o + ' calculation method set to "' + e + '"')), e } function he() { m = me(m, n, C, "height") } function ge() { M = me(M, K, z, "width") } function pe() { var e; !0 === r ? (fe("add"), e = g < 0, window.MutationObserver || window.WebKitMutationObserver ? e ? ve() : s = function () { function t(e) { function t(e) { !1 === e.complete && (R("Attach listeners to " + e.src), e.addEventListener("load", i, !1), e.addEventListener("error", r, !1), u.push(e)) } "attributes" === e.type && "src" === e.attributeName ? t(e.target) : "childList" === e.type && Array.prototype.forEach.call(e.target.querySelectorAll("img"), t) } function o(e) { R("Remove listeners from " + e.src), e.removeEventListener("load", i, !1), e.removeEventListener("error", r, !1), u.splice(u.indexOf(e), 1) } function n(e, t, n) { o(e.target), L(t, n + ": " + e.target.src) } function i(e) { n(e, "imageLoad", "Image loaded") } function r(e) { n(e, "imageLoadFailed", "Image load failed") } function a(e) { L("mutationObserver", "mutationObserver: " + e[0].target + " " + e[0].type), e.forEach(t) } var u = [], c = window.MutationObserver || window.WebKitMutationObserver, s = function () { var e = document.querySelector("body"); return s = new c(a), R("Create body MutationObserver"), s.observe(e, { attributes: !0, attributeOldValue: !1, characterData: !0, characterDataOldValue: !1, childList: !0, subtree: !0 }), s }(); return { disconnect: function () { "disconnect" in s && (R("Disconnect body MutationObserver"), s.disconnect(), u.forEach(o)) } } }() : (R("MutationObserver not supported in this browser!"), ve())) : R("Auto Resize disabled") } function ve() { 0 !== g && (R("setInterval: " + g + "ms"), B = setInterval(function () { L("interval", "setInterval: " + g) }, Math.abs(g))) } function ye(e, t) { return t = t || document.body, t = null === (t = document.defaultView.getComputedStyle(t, null)) ? 0 : t[e], parseInt(t, 10) } function we(e, t) { for (var n, o = t.length, i = 0, r = ue(e), a = Date.now(), u = 0; u < o; u++)i < (n = t[u].getBoundingClientRect()[e] + ye("margin" + r, t[u])) && (i = n); return a = Date.now() - a, R("Parsed " + o + " HTML elements"), R("Element position calculated in " + a + "ms"), O / 2 < (a = a) && R("Event throttle increased to " + (O = 2 * a) + "ms"), i } function e(e) { return [e.bodyOffset(), e.bodyScroll(), e.documentElementOffset(), e.documentElementScroll()] } function be(e, t) { var n = document.querySelectorAll("[" + t + "]"); return 0 === n.length && (x("No tagged elements (" + t + ") found on page"), document.querySelectorAll("body *")), we(e, n) } function Te() { return document.querySelectorAll("body *") } function Ee(e, t, n, o) { function i() { e in { init: 1, interval: 1, size: 1 } || !(m in U || d && M in U) ? e in { interval: 1 } || R("No change in size detected") : Ie(t) } function r(e, t) { return !(Math.abs(e - t) <= E) } n = a === n ? C[m]() : n, o = a === o ? z[M]() : o, r(f, n) || d && r(S, o) || "init" === e ? (Se(), F(f = n, S = o, e)) : i() } function Oe() { A = Date.now(), N = null, ie = oe.apply(o, I), N || (o = I = null) } function L(e, t, n, o) { i && e in j ? R("Trigger event cancelled: " + e) : (e in { reset: 1, resetPage: 1, init: 1 } || R("Trigger event: " + t), ("init" === e ? Ee : re)(e, t, n, o)) } function Se() { i || (i = !0, R("Trigger event lock on")), clearTimeout(Y), Y = setTimeout(function () { i = !1, R("Trigger event lock off"), R("--") }, l) } function Me(e) { f = C[m](), S = z[M](), F(f, S, e) } function Ie(e) { var t = m; m = n, R("Reset trigger event: " + e), Se(), Me("reset"), m = t } function F(e, t, n, o, i) { !0 === V && (a === i ? i = T : R("Message targetOrigin: " + i), R("Sending message to host page (" + (e = w + ":" + (e + ":" + t) + ":" + n + (a === o ? "" : ":" + o)) + ")"), X.postMessage(y + e, i)) } function Ne() { "loading" !== document.readyState && window.parent.postMessage("[iFrameResizerChild]Ready", "*") } }();

// 2.29.1
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):e.moment=t()}(this,function(){"use strict";var e,i;function f(){return e.apply(null,arguments)}function o(e){return e instanceof Array||"[object Array]"===Object.prototype.toString.call(e)}function u(e){return null!=e&&"[object Object]"===Object.prototype.toString.call(e)}function m(e,t){return Object.prototype.hasOwnProperty.call(e,t)}function l(e){if(Object.getOwnPropertyNames)return 0===Object.getOwnPropertyNames(e).length;for(var t in e)if(m(e,t))return;return 1}function r(e){return void 0===e}function h(e){return"number"==typeof e||"[object Number]"===Object.prototype.toString.call(e)}function a(e){return e instanceof Date||"[object Date]"===Object.prototype.toString.call(e)}function d(e,t){for(var n=[],s=0;s<e.length;++s)n.push(t(e[s],s));return n}function c(e,t){for(var n in t)m(t,n)&&(e[n]=t[n]);return m(t,"toString")&&(e.toString=t.toString),m(t,"valueOf")&&(e.valueOf=t.valueOf),e}function _(e,t,n,s){return xt(e,t,n,s,!0).utc()}function y(e){return null==e._pf&&(e._pf={empty:!1,unusedTokens:[],unusedInput:[],overflow:-2,charsLeftOver:0,nullInput:!1,invalidEra:null,invalidMonth:null,invalidFormat:!1,userInvalidated:!1,iso:!1,parsedDateParts:[],era:null,meridiem:null,rfc2822:!1,weekdayMismatch:!1}),e._pf}function g(e){if(null==e._isValid){var t=y(e),n=i.call(t.parsedDateParts,function(e){return null!=e}),s=!isNaN(e._d.getTime())&&t.overflow<0&&!t.empty&&!t.invalidEra&&!t.invalidMonth&&!t.invalidWeekday&&!t.weekdayMismatch&&!t.nullInput&&!t.invalidFormat&&!t.userInvalidated&&(!t.meridiem||t.meridiem&&n);if(e._strict&&(s=s&&0===t.charsLeftOver&&0===t.unusedTokens.length&&void 0===t.bigHour),null!=Object.isFrozen&&Object.isFrozen(e))return s;e._isValid=s}return e._isValid}function w(e){var t=_(NaN);return null!=e?c(y(t),e):y(t).userInvalidated=!0,t}i=Array.prototype.some?Array.prototype.some:function(e){for(var t=Object(this),n=t.length>>>0,s=0;s<n;s++)if(s in t&&e.call(this,t[s],s,t))return!0;return!1};var p=f.momentProperties=[],t=!1;function v(e,t){var n,s,i;if(r(t._isAMomentObject)||(e._isAMomentObject=t._isAMomentObject),r(t._i)||(e._i=t._i),r(t._f)||(e._f=t._f),r(t._l)||(e._l=t._l),r(t._strict)||(e._strict=t._strict),r(t._tzm)||(e._tzm=t._tzm),r(t._isUTC)||(e._isUTC=t._isUTC),r(t._offset)||(e._offset=t._offset),r(t._pf)||(e._pf=y(t)),r(t._locale)||(e._locale=t._locale),0<p.length)for(n=0;n<p.length;n++)r(i=t[s=p[n]])||(e[s]=i);return e}function k(e){v(this,e),this._d=new Date(null!=e._d?e._d.getTime():NaN),this.isValid()||(this._d=new Date(NaN)),!1===t&&(t=!0,f.updateOffset(this),t=!1)}function M(e){return e instanceof k||null!=e&&null!=e._isAMomentObject}function D(e){!1===f.suppressDeprecationWarnings&&"undefined"!=typeof console&&console.warn&&console.warn("Deprecation warning: "+e)}function n(i,r){var a=!0;return c(function(){if(null!=f.deprecationHandler&&f.deprecationHandler(null,i),a){for(var e,t,n=[],s=0;s<arguments.length;s++){if(e="","object"==typeof arguments[s]){for(t in e+="\n["+s+"] ",arguments[0])m(arguments[0],t)&&(e+=t+": "+arguments[0][t]+", ");e=e.slice(0,-2)}else e=arguments[s];n.push(e)}D(i+"\nArguments: "+Array.prototype.slice.call(n).join("")+"\n"+(new Error).stack),a=!1}return r.apply(this,arguments)},r)}var s,S={};function Y(e,t){null!=f.deprecationHandler&&f.deprecationHandler(e,t),S[e]||(D(t),S[e]=!0)}function O(e){return"undefined"!=typeof Function&&e instanceof Function||"[object Function]"===Object.prototype.toString.call(e)}function b(e,t){var n,s=c({},e);for(n in t)m(t,n)&&(u(e[n])&&u(t[n])?(s[n]={},c(s[n],e[n]),c(s[n],t[n])):null!=t[n]?s[n]=t[n]:delete s[n]);for(n in e)m(e,n)&&!m(t,n)&&u(e[n])&&(s[n]=c({},s[n]));return s}function x(e){null!=e&&this.set(e)}f.suppressDeprecationWarnings=!1,f.deprecationHandler=null,s=Object.keys?Object.keys:function(e){var t,n=[];for(t in e)m(e,t)&&n.push(t);return n};function T(e,t,n){var s=""+Math.abs(e),i=t-s.length;return(0<=e?n?"+":"":"-")+Math.pow(10,Math.max(0,i)).toString().substr(1)+s}var N=/(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|N{1,5}|YYYYYY|YYYYY|YYYY|YY|y{2,4}|yo?|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g,P=/(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,R={},W={};function C(e,t,n,s){var i="string"==typeof s?function(){return this[s]()}:s;e&&(W[e]=i),t&&(W[t[0]]=function(){return T(i.apply(this,arguments),t[1],t[2])}),n&&(W[n]=function(){return this.localeData().ordinal(i.apply(this,arguments),e)})}function U(e,t){return e.isValid()?(t=H(t,e.localeData()),R[t]=R[t]||function(s){for(var e,i=s.match(N),t=0,r=i.length;t<r;t++)W[i[t]]?i[t]=W[i[t]]:i[t]=(e=i[t]).match(/\[[\s\S]/)?e.replace(/^\[|\]$/g,""):e.replace(/\\/g,"");return function(e){for(var t="",n=0;n<r;n++)t+=O(i[n])?i[n].call(e,s):i[n];return t}}(t),R[t](e)):e.localeData().invalidDate()}function H(e,t){var n=5;function s(e){return t.longDateFormat(e)||e}for(P.lastIndex=0;0<=n&&P.test(e);)e=e.replace(P,s),P.lastIndex=0,--n;return e}var F={};function L(e,t){var n=e.toLowerCase();F[n]=F[n+"s"]=F[t]=e}function V(e){return"string"==typeof e?F[e]||F[e.toLowerCase()]:void 0}function G(e){var t,n,s={};for(n in e)m(e,n)&&(t=V(n))&&(s[t]=e[n]);return s}var E={};function A(e,t){E[e]=t}function j(e){return e%4==0&&e%100!=0||e%400==0}function I(e){return e<0?Math.ceil(e)||0:Math.floor(e)}function Z(e){var t=+e,n=0;return 0!=t&&isFinite(t)&&(n=I(t)),n}function z(t,n){return function(e){return null!=e?(q(this,t,e),f.updateOffset(this,n),this):$(this,t)}}function $(e,t){return e.isValid()?e._d["get"+(e._isUTC?"UTC":"")+t]():NaN}function q(e,t,n){e.isValid()&&!isNaN(n)&&("FullYear"===t&&j(e.year())&&1===e.month()&&29===e.date()?(n=Z(n),e._d["set"+(e._isUTC?"UTC":"")+t](n,e.month(),xe(n,e.month()))):e._d["set"+(e._isUTC?"UTC":"")+t](n))}var B,J=/\d/,Q=/\d\d/,X=/\d{3}/,K=/\d{4}/,ee=/[+-]?\d{6}/,te=/\d\d?/,ne=/\d\d\d\d?/,se=/\d\d\d\d\d\d?/,ie=/\d{1,3}/,re=/\d{1,4}/,ae=/[+-]?\d{1,6}/,oe=/\d+/,ue=/[+-]?\d+/,le=/Z|[+-]\d\d:?\d\d/gi,he=/Z|[+-]\d\d(?::?\d\d)?/gi,de=/[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i;function ce(e,n,s){B[e]=O(n)?n:function(e,t){return e&&s?s:n}}function fe(e,t){return m(B,e)?B[e](t._strict,t._locale):new RegExp(me(e.replace("\\","").replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g,function(e,t,n,s,i){return t||n||s||i})))}function me(e){return e.replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&")}B={};var _e={};function ye(e,n){var t,s=n;for("string"==typeof e&&(e=[e]),h(n)&&(s=function(e,t){t[n]=Z(e)}),t=0;t<e.length;t++)_e[e[t]]=s}function ge(e,i){ye(e,function(e,t,n,s){n._w=n._w||{},i(e,n._w,n,s)})}var we,pe=0,ve=1,ke=2,Me=3,De=4,Se=5,Ye=6,Oe=7,be=8;function xe(e,t){if(isNaN(e)||isNaN(t))return NaN;var n,s=(t%(n=12)+n)%n;return e+=(t-s)/12,1==s?j(e)?29:28:31-s%7%2}we=Array.prototype.indexOf?Array.prototype.indexOf:function(e){for(var t=0;t<this.length;++t)if(this[t]===e)return t;return-1},C("M",["MM",2],"Mo",function(){return this.month()+1}),C("MMM",0,0,function(e){return this.localeData().monthsShort(this,e)}),C("MMMM",0,0,function(e){return this.localeData().months(this,e)}),L("month","M"),A("month",8),ce("M",te),ce("MM",te,Q),ce("MMM",function(e,t){return t.monthsShortRegex(e)}),ce("MMMM",function(e,t){return t.monthsRegex(e)}),ye(["M","MM"],function(e,t){t[ve]=Z(e)-1}),ye(["MMM","MMMM"],function(e,t,n,s){var i=n._locale.monthsParse(e,s,n._strict);null!=i?t[ve]=i:y(n).invalidMonth=e});var Te="January_February_March_April_May_June_July_August_September_October_November_December".split("_"),Ne="Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),Pe=/D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/,Re=de,We=de;function Ce(e,t){var n;if(!e.isValid())return e;if("string"==typeof t)if(/^\d+$/.test(t))t=Z(t);else if(!h(t=e.localeData().monthsParse(t)))return e;return n=Math.min(e.date(),xe(e.year(),t)),e._d["set"+(e._isUTC?"UTC":"")+"Month"](t,n),e}function Ue(e){return null!=e?(Ce(this,e),f.updateOffset(this,!0),this):$(this,"Month")}function He(){function e(e,t){return t.length-e.length}for(var t,n=[],s=[],i=[],r=0;r<12;r++)t=_([2e3,r]),n.push(this.monthsShort(t,"")),s.push(this.months(t,"")),i.push(this.months(t,"")),i.push(this.monthsShort(t,""));for(n.sort(e),s.sort(e),i.sort(e),r=0;r<12;r++)n[r]=me(n[r]),s[r]=me(s[r]);for(r=0;r<24;r++)i[r]=me(i[r]);this._monthsRegex=new RegExp("^("+i.join("|")+")","i"),this._monthsShortRegex=this._monthsRegex,this._monthsStrictRegex=new RegExp("^("+s.join("|")+")","i"),this._monthsShortStrictRegex=new RegExp("^("+n.join("|")+")","i")}function Fe(e){return j(e)?366:365}C("Y",0,0,function(){var e=this.year();return e<=9999?T(e,4):"+"+e}),C(0,["YY",2],0,function(){return this.year()%100}),C(0,["YYYY",4],0,"year"),C(0,["YYYYY",5],0,"year"),C(0,["YYYYYY",6,!0],0,"year"),L("year","y"),A("year",1),ce("Y",ue),ce("YY",te,Q),ce("YYYY",re,K),ce("YYYYY",ae,ee),ce("YYYYYY",ae,ee),ye(["YYYYY","YYYYYY"],pe),ye("YYYY",function(e,t){t[pe]=2===e.length?f.parseTwoDigitYear(e):Z(e)}),ye("YY",function(e,t){t[pe]=f.parseTwoDigitYear(e)}),ye("Y",function(e,t){t[pe]=parseInt(e,10)}),f.parseTwoDigitYear=function(e){return Z(e)+(68<Z(e)?1900:2e3)};var Le=z("FullYear",!0);function Ve(e){var t,n;return e<100&&0<=e?((n=Array.prototype.slice.call(arguments))[0]=e+400,t=new Date(Date.UTC.apply(null,n)),isFinite(t.getUTCFullYear())&&t.setUTCFullYear(e)):t=new Date(Date.UTC.apply(null,arguments)),t}function Ge(e,t,n){var s=7+t-n;return s-(7+Ve(e,0,s).getUTCDay()-t)%7-1}function Ee(e,t,n,s,i){var r,a=1+7*(t-1)+(7+n-s)%7+Ge(e,s,i),o=a<=0?Fe(r=e-1)+a:a>Fe(e)?(r=e+1,a-Fe(e)):(r=e,a);return{year:r,dayOfYear:o}}function Ae(e,t,n){var s,i,r=Ge(e.year(),t,n),a=Math.floor((e.dayOfYear()-r-1)/7)+1;return a<1?s=a+je(i=e.year()-1,t,n):a>je(e.year(),t,n)?(s=a-je(e.year(),t,n),i=e.year()+1):(i=e.year(),s=a),{week:s,year:i}}function je(e,t,n){var s=Ge(e,t,n),i=Ge(e+1,t,n);return(Fe(e)-s+i)/7}C("w",["ww",2],"wo","week"),C("W",["WW",2],"Wo","isoWeek"),L("week","w"),L("isoWeek","W"),A("week",5),A("isoWeek",5),ce("w",te),ce("ww",te,Q),ce("W",te),ce("WW",te,Q),ge(["w","ww","W","WW"],function(e,t,n,s){t[s.substr(0,1)]=Z(e)});function Ie(e,t){return e.slice(t,7).concat(e.slice(0,t))}C("d",0,"do","day"),C("dd",0,0,function(e){return this.localeData().weekdaysMin(this,e)}),C("ddd",0,0,function(e){return this.localeData().weekdaysShort(this,e)}),C("dddd",0,0,function(e){return this.localeData().weekdays(this,e)}),C("e",0,0,"weekday"),C("E",0,0,"isoWeekday"),L("day","d"),L("weekday","e"),L("isoWeekday","E"),A("day",11),A("weekday",11),A("isoWeekday",11),ce("d",te),ce("e",te),ce("E",te),ce("dd",function(e,t){return t.weekdaysMinRegex(e)}),ce("ddd",function(e,t){return t.weekdaysShortRegex(e)}),ce("dddd",function(e,t){return t.weekdaysRegex(e)}),ge(["dd","ddd","dddd"],function(e,t,n,s){var i=n._locale.weekdaysParse(e,s,n._strict);null!=i?t.d=i:y(n).invalidWeekday=e}),ge(["d","e","E"],function(e,t,n,s){t[s]=Z(e)});var Ze="Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),ze="Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),$e="Su_Mo_Tu_We_Th_Fr_Sa".split("_"),qe=de,Be=de,Je=de;function Qe(){function e(e,t){return t.length-e.length}for(var t,n,s,i,r=[],a=[],o=[],u=[],l=0;l<7;l++)t=_([2e3,1]).day(l),n=me(this.weekdaysMin(t,"")),s=me(this.weekdaysShort(t,"")),i=me(this.weekdays(t,"")),r.push(n),a.push(s),o.push(i),u.push(n),u.push(s),u.push(i);r.sort(e),a.sort(e),o.sort(e),u.sort(e),this._weekdaysRegex=new RegExp("^("+u.join("|")+")","i"),this._weekdaysShortRegex=this._weekdaysRegex,this._weekdaysMinRegex=this._weekdaysRegex,this._weekdaysStrictRegex=new RegExp("^("+o.join("|")+")","i"),this._weekdaysShortStrictRegex=new RegExp("^("+a.join("|")+")","i"),this._weekdaysMinStrictRegex=new RegExp("^("+r.join("|")+")","i")}function Xe(){return this.hours()%12||12}function Ke(e,t){C(e,0,0,function(){return this.localeData().meridiem(this.hours(),this.minutes(),t)})}function et(e,t){return t._meridiemParse}C("H",["HH",2],0,"hour"),C("h",["hh",2],0,Xe),C("k",["kk",2],0,function(){return this.hours()||24}),C("hmm",0,0,function(){return""+Xe.apply(this)+T(this.minutes(),2)}),C("hmmss",0,0,function(){return""+Xe.apply(this)+T(this.minutes(),2)+T(this.seconds(),2)}),C("Hmm",0,0,function(){return""+this.hours()+T(this.minutes(),2)}),C("Hmmss",0,0,function(){return""+this.hours()+T(this.minutes(),2)+T(this.seconds(),2)}),Ke("a",!0),Ke("A",!1),L("hour","h"),A("hour",13),ce("a",et),ce("A",et),ce("H",te),ce("h",te),ce("k",te),ce("HH",te,Q),ce("hh",te,Q),ce("kk",te,Q),ce("hmm",ne),ce("hmmss",se),ce("Hmm",ne),ce("Hmmss",se),ye(["H","HH"],Me),ye(["k","kk"],function(e,t,n){var s=Z(e);t[Me]=24===s?0:s}),ye(["a","A"],function(e,t,n){n._isPm=n._locale.isPM(e),n._meridiem=e}),ye(["h","hh"],function(e,t,n){t[Me]=Z(e),y(n).bigHour=!0}),ye("hmm",function(e,t,n){var s=e.length-2;t[Me]=Z(e.substr(0,s)),t[De]=Z(e.substr(s)),y(n).bigHour=!0}),ye("hmmss",function(e,t,n){var s=e.length-4,i=e.length-2;t[Me]=Z(e.substr(0,s)),t[De]=Z(e.substr(s,2)),t[Se]=Z(e.substr(i)),y(n).bigHour=!0}),ye("Hmm",function(e,t,n){var s=e.length-2;t[Me]=Z(e.substr(0,s)),t[De]=Z(e.substr(s))}),ye("Hmmss",function(e,t,n){var s=e.length-4,i=e.length-2;t[Me]=Z(e.substr(0,s)),t[De]=Z(e.substr(s,2)),t[Se]=Z(e.substr(i))});var tt=z("Hours",!0);var nt,st={calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},longDateFormat:{LTS:"h:mm:ss A",LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D, YYYY",LLL:"MMMM D, YYYY h:mm A",LLLL:"dddd, MMMM D, YYYY h:mm A"},invalidDate:"Invalid date",ordinal:"%d",dayOfMonthOrdinalParse:/\d{1,2}/,relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",ss:"%d seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",w:"a week",ww:"%d weeks",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},months:Te,monthsShort:Ne,week:{dow:0,doy:6},weekdays:Ze,weekdaysMin:$e,weekdaysShort:ze,meridiemParse:/[ap]\.?m?\.?/i},it={},rt={};function at(e){return e?e.toLowerCase().replace("_","-"):e}function ot(e){for(var t,n,s,i,r=0;r<e.length;){for(t=(i=at(e[r]).split("-")).length,n=(n=at(e[r+1]))?n.split("-"):null;0<t;){if(s=ut(i.slice(0,t).join("-")))return s;if(n&&n.length>=t&&function(e,t){for(var n=Math.min(e.length,t.length),s=0;s<n;s+=1)if(e[s]!==t[s])return s;return n}(i,n)>=t-1)break;t--}r++}return nt}function ut(t){var e;if(void 0===it[t]&&"undefined"!=typeof module&&module&&module.exports)try{e=nt._abbr,require("./locale/"+t),lt(e)}catch(e){it[t]=null}return it[t]}function lt(e,t){var n;return e&&((n=r(t)?dt(e):ht(e,t))?nt=n:"undefined"!=typeof console&&console.warn&&console.warn("Locale "+e+" not found. Did you forget to load it?")),nt._abbr}function ht(e,t){if(null===t)return delete it[e],null;var n,s=st;if(t.abbr=e,null!=it[e])Y("defineLocaleOverride","use moment.updateLocale(localeName, config) to change an existing locale. moment.defineLocale(localeName, config) should only be used for creating a new locale See http://momentjs.com/guides/#/warnings/define-locale/ for more info."),s=it[e]._config;else if(null!=t.parentLocale)if(null!=it[t.parentLocale])s=it[t.parentLocale]._config;else{if(null==(n=ut(t.parentLocale)))return rt[t.parentLocale]||(rt[t.parentLocale]=[]),rt[t.parentLocale].push({name:e,config:t}),null;s=n._config}return it[e]=new x(b(s,t)),rt[e]&&rt[e].forEach(function(e){ht(e.name,e.config)}),lt(e),it[e]}function dt(e){var t;if(e&&e._locale&&e._locale._abbr&&(e=e._locale._abbr),!e)return nt;if(!o(e)){if(t=ut(e))return t;e=[e]}return ot(e)}function ct(e){var t,n=e._a;return n&&-2===y(e).overflow&&(t=n[ve]<0||11<n[ve]?ve:n[ke]<1||n[ke]>xe(n[pe],n[ve])?ke:n[Me]<0||24<n[Me]||24===n[Me]&&(0!==n[De]||0!==n[Se]||0!==n[Ye])?Me:n[De]<0||59<n[De]?De:n[Se]<0||59<n[Se]?Se:n[Ye]<0||999<n[Ye]?Ye:-1,y(e)._overflowDayOfYear&&(t<pe||ke<t)&&(t=ke),y(e)._overflowWeeks&&-1===t&&(t=Oe),y(e)._overflowWeekday&&-1===t&&(t=be),y(e).overflow=t),e}var ft=/^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/,mt=/^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d|))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/,_t=/Z|[+-]\d\d(?::?\d\d)?/,yt=[["YYYYYY-MM-DD",/[+-]\d{6}-\d\d-\d\d/],["YYYY-MM-DD",/\d{4}-\d\d-\d\d/],["GGGG-[W]WW-E",/\d{4}-W\d\d-\d/],["GGGG-[W]WW",/\d{4}-W\d\d/,!1],["YYYY-DDD",/\d{4}-\d{3}/],["YYYY-MM",/\d{4}-\d\d/,!1],["YYYYYYMMDD",/[+-]\d{10}/],["YYYYMMDD",/\d{8}/],["GGGG[W]WWE",/\d{4}W\d{3}/],["GGGG[W]WW",/\d{4}W\d{2}/,!1],["YYYYDDD",/\d{7}/],["YYYYMM",/\d{6}/,!1],["YYYY",/\d{4}/,!1]],gt=[["HH:mm:ss.SSSS",/\d\d:\d\d:\d\d\.\d+/],["HH:mm:ss,SSSS",/\d\d:\d\d:\d\d,\d+/],["HH:mm:ss",/\d\d:\d\d:\d\d/],["HH:mm",/\d\d:\d\d/],["HHmmss.SSSS",/\d\d\d\d\d\d\.\d+/],["HHmmss,SSSS",/\d\d\d\d\d\d,\d+/],["HHmmss",/\d\d\d\d\d\d/],["HHmm",/\d\d\d\d/],["HH",/\d\d/]],wt=/^\/?Date\((-?\d+)/i,pt=/^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/,vt={UT:0,GMT:0,EDT:-240,EST:-300,CDT:-300,CST:-360,MDT:-360,MST:-420,PDT:-420,PST:-480};function kt(e){var t,n,s,i,r,a,o=e._i,u=ft.exec(o)||mt.exec(o);if(u){for(y(e).iso=!0,t=0,n=yt.length;t<n;t++)if(yt[t][1].exec(u[1])){i=yt[t][0],s=!1!==yt[t][2];break}if(null==i)return void(e._isValid=!1);if(u[3]){for(t=0,n=gt.length;t<n;t++)if(gt[t][1].exec(u[3])){r=(u[2]||" ")+gt[t][0];break}if(null==r)return void(e._isValid=!1)}if(!s&&null!=r)return void(e._isValid=!1);if(u[4]){if(!_t.exec(u[4]))return void(e._isValid=!1);a="Z"}e._f=i+(r||"")+(a||""),Ot(e)}else e._isValid=!1}function Mt(e,t,n,s,i,r){var a=[function(e){var t=parseInt(e,10);{if(t<=49)return 2e3+t;if(t<=999)return 1900+t}return t}(e),Ne.indexOf(t),parseInt(n,10),parseInt(s,10),parseInt(i,10)];return r&&a.push(parseInt(r,10)),a}function Dt(e){var t,n,s,i,r=pt.exec(e._i.replace(/\([^)]*\)|[\n\t]/g," ").replace(/(\s\s+)/g," ").replace(/^\s\s*/,"").replace(/\s\s*$/,""));if(r){if(t=Mt(r[4],r[3],r[2],r[5],r[6],r[7]),n=r[1],s=t,i=e,n&&ze.indexOf(n)!==new Date(s[0],s[1],s[2]).getDay()&&(y(i).weekdayMismatch=!0,!void(i._isValid=!1)))return;e._a=t,e._tzm=function(e,t,n){if(e)return vt[e];if(t)return 0;var s=parseInt(n,10),i=s%100;return 60*((s-i)/100)+i}(r[8],r[9],r[10]),e._d=Ve.apply(null,e._a),e._d.setUTCMinutes(e._d.getUTCMinutes()-e._tzm),y(e).rfc2822=!0}else e._isValid=!1}function St(e,t,n){return null!=e?e:null!=t?t:n}function Yt(e){var t,n,s,i,r,a,o,u=[];if(!e._d){for(a=e,o=new Date(f.now()),s=a._useUTC?[o.getUTCFullYear(),o.getUTCMonth(),o.getUTCDate()]:[o.getFullYear(),o.getMonth(),o.getDate()],e._w&&null==e._a[ke]&&null==e._a[ve]&&function(e){var t,n,s,i,r,a,o,u,l;null!=(t=e._w).GG||null!=t.W||null!=t.E?(r=1,a=4,n=St(t.GG,e._a[pe],Ae(Tt(),1,4).year),s=St(t.W,1),((i=St(t.E,1))<1||7<i)&&(u=!0)):(r=e._locale._week.dow,a=e._locale._week.doy,l=Ae(Tt(),r,a),n=St(t.gg,e._a[pe],l.year),s=St(t.w,l.week),null!=t.d?((i=t.d)<0||6<i)&&(u=!0):null!=t.e?(i=t.e+r,(t.e<0||6<t.e)&&(u=!0)):i=r);s<1||s>je(n,r,a)?y(e)._overflowWeeks=!0:null!=u?y(e)._overflowWeekday=!0:(o=Ee(n,s,i,r,a),e._a[pe]=o.year,e._dayOfYear=o.dayOfYear)}(e),null!=e._dayOfYear&&(r=St(e._a[pe],s[pe]),(e._dayOfYear>Fe(r)||0===e._dayOfYear)&&(y(e)._overflowDayOfYear=!0),n=Ve(r,0,e._dayOfYear),e._a[ve]=n.getUTCMonth(),e._a[ke]=n.getUTCDate()),t=0;t<3&&null==e._a[t];++t)e._a[t]=u[t]=s[t];for(;t<7;t++)e._a[t]=u[t]=null==e._a[t]?2===t?1:0:e._a[t];24===e._a[Me]&&0===e._a[De]&&0===e._a[Se]&&0===e._a[Ye]&&(e._nextDay=!0,e._a[Me]=0),e._d=(e._useUTC?Ve:function(e,t,n,s,i,r,a){var o;return e<100&&0<=e?(o=new Date(e+400,t,n,s,i,r,a),isFinite(o.getFullYear())&&o.setFullYear(e)):o=new Date(e,t,n,s,i,r,a),o}).apply(null,u),i=e._useUTC?e._d.getUTCDay():e._d.getDay(),null!=e._tzm&&e._d.setUTCMinutes(e._d.getUTCMinutes()-e._tzm),e._nextDay&&(e._a[Me]=24),e._w&&void 0!==e._w.d&&e._w.d!==i&&(y(e).weekdayMismatch=!0)}}function Ot(e){if(e._f!==f.ISO_8601)if(e._f!==f.RFC_2822){e._a=[],y(e).empty=!0;for(var t,n,s,i,r,a,o,u=""+e._i,l=u.length,h=0,d=H(e._f,e._locale).match(N)||[],c=0;c<d.length;c++)n=d[c],(t=(u.match(fe(n,e))||[])[0])&&(0<(s=u.substr(0,u.indexOf(t))).length&&y(e).unusedInput.push(s),u=u.slice(u.indexOf(t)+t.length),h+=t.length),W[n]?(t?y(e).empty=!1:y(e).unusedTokens.push(n),r=n,o=e,null!=(a=t)&&m(_e,r)&&_e[r](a,o._a,o,r)):e._strict&&!t&&y(e).unusedTokens.push(n);y(e).charsLeftOver=l-h,0<u.length&&y(e).unusedInput.push(u),e._a[Me]<=12&&!0===y(e).bigHour&&0<e._a[Me]&&(y(e).bigHour=void 0),y(e).parsedDateParts=e._a.slice(0),y(e).meridiem=e._meridiem,e._a[Me]=function(e,t,n){var s;if(null==n)return t;return null!=e.meridiemHour?e.meridiemHour(t,n):(null!=e.isPM&&((s=e.isPM(n))&&t<12&&(t+=12),s||12!==t||(t=0)),t)}(e._locale,e._a[Me],e._meridiem),null!==(i=y(e).era)&&(e._a[pe]=e._locale.erasConvertYear(i,e._a[pe])),Yt(e),ct(e)}else Dt(e);else kt(e)}function bt(e){var t,n,s=e._i,i=e._f;return e._locale=e._locale||dt(e._l),null===s||void 0===i&&""===s?w({nullInput:!0}):("string"==typeof s&&(e._i=s=e._locale.preparse(s)),M(s)?new k(ct(s)):(a(s)?e._d=s:o(i)?function(e){var t,n,s,i,r,a,o=!1;if(0===e._f.length)return y(e).invalidFormat=!0,e._d=new Date(NaN);for(i=0;i<e._f.length;i++)r=0,a=!1,t=v({},e),null!=e._useUTC&&(t._useUTC=e._useUTC),t._f=e._f[i],Ot(t),g(t)&&(a=!0),r+=y(t).charsLeftOver,r+=10*y(t).unusedTokens.length,y(t).score=r,o?r<s&&(s=r,n=t):(null==s||r<s||a)&&(s=r,n=t,a&&(o=!0));c(e,n||t)}(e):i?Ot(e):r(n=(t=e)._i)?t._d=new Date(f.now()):a(n)?t._d=new Date(n.valueOf()):"string"==typeof n?function(e){var t=wt.exec(e._i);null===t?(kt(e),!1===e._isValid&&(delete e._isValid,Dt(e),!1===e._isValid&&(delete e._isValid,e._strict?e._isValid=!1:f.createFromInputFallback(e)))):e._d=new Date(+t[1])}(t):o(n)?(t._a=d(n.slice(0),function(e){return parseInt(e,10)}),Yt(t)):u(n)?function(e){var t,n;e._d||(n=void 0===(t=G(e._i)).day?t.date:t.day,e._a=d([t.year,t.month,n,t.hour,t.minute,t.second,t.millisecond],function(e){return e&&parseInt(e,10)}),Yt(e))}(t):h(n)?t._d=new Date(n):f.createFromInputFallback(t),g(e)||(e._d=null),e))}function xt(e,t,n,s,i){var r,a={};return!0!==t&&!1!==t||(s=t,t=void 0),!0!==n&&!1!==n||(s=n,n=void 0),(u(e)&&l(e)||o(e)&&0===e.length)&&(e=void 0),a._isAMomentObject=!0,a._useUTC=a._isUTC=i,a._l=n,a._i=e,a._f=t,a._strict=s,(r=new k(ct(bt(a))))._nextDay&&(r.add(1,"d"),r._nextDay=void 0),r}function Tt(e,t,n,s){return xt(e,t,n,s,!1)}f.createFromInputFallback=n("value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are discouraged. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.",function(e){e._d=new Date(e._i+(e._useUTC?" UTC":""))}),f.ISO_8601=function(){},f.RFC_2822=function(){};var Nt=n("moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/",function(){var e=Tt.apply(null,arguments);return this.isValid()&&e.isValid()?e<this?this:e:w()}),Pt=n("moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/",function(){var e=Tt.apply(null,arguments);return this.isValid()&&e.isValid()?this<e?this:e:w()});function Rt(e,t){var n,s;if(1===t.length&&o(t[0])&&(t=t[0]),!t.length)return Tt();for(n=t[0],s=1;s<t.length;++s)t[s].isValid()&&!t[s][e](n)||(n=t[s]);return n}var Wt=["year","quarter","month","week","day","hour","minute","second","millisecond"];function Ct(e){var t=G(e),n=t.year||0,s=t.quarter||0,i=t.month||0,r=t.week||t.isoWeek||0,a=t.day||0,o=t.hour||0,u=t.minute||0,l=t.second||0,h=t.millisecond||0;this._isValid=function(e){var t,n,s=!1;for(t in e)if(m(e,t)&&(-1===we.call(Wt,t)||null!=e[t]&&isNaN(e[t])))return!1;for(n=0;n<Wt.length;++n)if(e[Wt[n]]){if(s)return!1;parseFloat(e[Wt[n]])!==Z(e[Wt[n]])&&(s=!0)}return!0}(t),this._milliseconds=+h+1e3*l+6e4*u+1e3*o*60*60,this._days=+a+7*r,this._months=+i+3*s+12*n,this._data={},this._locale=dt(),this._bubble()}function Ut(e){return e instanceof Ct}function Ht(e){return e<0?-1*Math.round(-1*e):Math.round(e)}function Ft(e,n){C(e,0,0,function(){var e=this.utcOffset(),t="+";return e<0&&(e=-e,t="-"),t+T(~~(e/60),2)+n+T(~~e%60,2)})}Ft("Z",":"),Ft("ZZ",""),ce("Z",he),ce("ZZ",he),ye(["Z","ZZ"],function(e,t,n){n._useUTC=!0,n._tzm=Vt(he,e)});var Lt=/([\+\-]|\d\d)/gi;function Vt(e,t){var n,s,i=(t||"").match(e);return null===i?null:0===(s=60*(n=((i[i.length-1]||[])+"").match(Lt)||["-",0,0])[1]+Z(n[2]))?0:"+"===n[0]?s:-s}function Gt(e,t){var n,s;return t._isUTC?(n=t.clone(),s=(M(e)||a(e)?e.valueOf():Tt(e).valueOf())-n.valueOf(),n._d.setTime(n._d.valueOf()+s),f.updateOffset(n,!1),n):Tt(e).local()}function Et(e){return-Math.round(e._d.getTimezoneOffset())}function At(){return!!this.isValid()&&(this._isUTC&&0===this._offset)}f.updateOffset=function(){};var jt=/^(-|\+)?(?:(\d*)[. ])?(\d+):(\d+)(?::(\d+)(\.\d*)?)?$/,It=/^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;function Zt(e,t){var n,s,i,r=e,a=null;return Ut(e)?r={ms:e._milliseconds,d:e._days,M:e._months}:h(e)||!isNaN(+e)?(r={},t?r[t]=+e:r.milliseconds=+e):(a=jt.exec(e))?(n="-"===a[1]?-1:1,r={y:0,d:Z(a[ke])*n,h:Z(a[Me])*n,m:Z(a[De])*n,s:Z(a[Se])*n,ms:Z(Ht(1e3*a[Ye]))*n}):(a=It.exec(e))?(n="-"===a[1]?-1:1,r={y:zt(a[2],n),M:zt(a[3],n),w:zt(a[4],n),d:zt(a[5],n),h:zt(a[6],n),m:zt(a[7],n),s:zt(a[8],n)}):null==r?r={}:"object"==typeof r&&("from"in r||"to"in r)&&(i=function(e,t){var n;if(!e.isValid()||!t.isValid())return{milliseconds:0,months:0};t=Gt(t,e),e.isBefore(t)?n=$t(e,t):((n=$t(t,e)).milliseconds=-n.milliseconds,n.months=-n.months);return n}(Tt(r.from),Tt(r.to)),(r={}).ms=i.milliseconds,r.M=i.months),s=new Ct(r),Ut(e)&&m(e,"_locale")&&(s._locale=e._locale),Ut(e)&&m(e,"_isValid")&&(s._isValid=e._isValid),s}function zt(e,t){var n=e&&parseFloat(e.replace(",","."));return(isNaN(n)?0:n)*t}function $t(e,t){var n={};return n.months=t.month()-e.month()+12*(t.year()-e.year()),e.clone().add(n.months,"M").isAfter(t)&&--n.months,n.milliseconds=t-e.clone().add(n.months,"M"),n}function qt(s,i){return function(e,t){var n;return null===t||isNaN(+t)||(Y(i,"moment()."+i+"(period, number) is deprecated. Please use moment()."+i+"(number, period). See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info."),n=e,e=t,t=n),Bt(this,Zt(e,t),s),this}}function Bt(e,t,n,s){var i=t._milliseconds,r=Ht(t._days),a=Ht(t._months);e.isValid()&&(s=null==s||s,a&&Ce(e,$(e,"Month")+a*n),r&&q(e,"Date",$(e,"Date")+r*n),i&&e._d.setTime(e._d.valueOf()+i*n),s&&f.updateOffset(e,r||a))}Zt.fn=Ct.prototype,Zt.invalid=function(){return Zt(NaN)};var Jt=qt(1,"add"),Qt=qt(-1,"subtract");function Xt(e){return"string"==typeof e||e instanceof String}function Kt(e){return M(e)||a(e)||Xt(e)||h(e)||function(t){var e=o(t),n=!1;e&&(n=0===t.filter(function(e){return!h(e)&&Xt(t)}).length);return e&&n}(e)||function(e){var t,n,s=u(e)&&!l(e),i=!1,r=["years","year","y","months","month","M","days","day","d","dates","date","D","hours","hour","h","minutes","minute","m","seconds","second","s","milliseconds","millisecond","ms"];for(t=0;t<r.length;t+=1)n=r[t],i=i||m(e,n);return s&&i}(e)||null==e}function en(e,t){if(e.date()<t.date())return-en(t,e);var n=12*(t.year()-e.year())+(t.month()-e.month()),s=e.clone().add(n,"months"),i=t-s<0?(t-s)/(s-e.clone().add(n-1,"months")):(t-s)/(e.clone().add(1+n,"months")-s);return-(n+i)||0}function tn(e){var t;return void 0===e?this._locale._abbr:(null!=(t=dt(e))&&(this._locale=t),this)}f.defaultFormat="YYYY-MM-DDTHH:mm:ssZ",f.defaultFormatUtc="YYYY-MM-DDTHH:mm:ss[Z]";var nn=n("moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.",function(e){return void 0===e?this.localeData():this.locale(e)});function sn(){return this._locale}var rn=126227808e5;function an(e,t){return(e%t+t)%t}function on(e,t,n){return e<100&&0<=e?new Date(e+400,t,n)-rn:new Date(e,t,n).valueOf()}function un(e,t,n){return e<100&&0<=e?Date.UTC(e+400,t,n)-rn:Date.UTC(e,t,n)}function ln(e,t){return t.erasAbbrRegex(e)}function hn(){for(var e=[],t=[],n=[],s=[],i=this.eras(),r=0,a=i.length;r<a;++r)t.push(me(i[r].name)),e.push(me(i[r].abbr)),n.push(me(i[r].narrow)),s.push(me(i[r].name)),s.push(me(i[r].abbr)),s.push(me(i[r].narrow));this._erasRegex=new RegExp("^("+s.join("|")+")","i"),this._erasNameRegex=new RegExp("^("+t.join("|")+")","i"),this._erasAbbrRegex=new RegExp("^("+e.join("|")+")","i"),this._erasNarrowRegex=new RegExp("^("+n.join("|")+")","i")}function dn(e,t){C(0,[e,e.length],0,t)}function cn(e,t,n,s,i){var r;return null==e?Ae(this,s,i).year:((r=je(e,s,i))<t&&(t=r),function(e,t,n,s,i){var r=Ee(e,t,n,s,i),a=Ve(r.year,0,r.dayOfYear);return this.year(a.getUTCFullYear()),this.month(a.getUTCMonth()),this.date(a.getUTCDate()),this}.call(this,e,t,n,s,i))}C("N",0,0,"eraAbbr"),C("NN",0,0,"eraAbbr"),C("NNN",0,0,"eraAbbr"),C("NNNN",0,0,"eraName"),C("NNNNN",0,0,"eraNarrow"),C("y",["y",1],"yo","eraYear"),C("y",["yy",2],0,"eraYear"),C("y",["yyy",3],0,"eraYear"),C("y",["yyyy",4],0,"eraYear"),ce("N",ln),ce("NN",ln),ce("NNN",ln),ce("NNNN",function(e,t){return t.erasNameRegex(e)}),ce("NNNNN",function(e,t){return t.erasNarrowRegex(e)}),ye(["N","NN","NNN","NNNN","NNNNN"],function(e,t,n,s){var i=n._locale.erasParse(e,s,n._strict);i?y(n).era=i:y(n).invalidEra=e}),ce("y",oe),ce("yy",oe),ce("yyy",oe),ce("yyyy",oe),ce("yo",function(e,t){return t._eraYearOrdinalRegex||oe}),ye(["y","yy","yyy","yyyy"],pe),ye(["yo"],function(e,t,n,s){var i;n._locale._eraYearOrdinalRegex&&(i=e.match(n._locale._eraYearOrdinalRegex)),n._locale.eraYearOrdinalParse?t[pe]=n._locale.eraYearOrdinalParse(e,i):t[pe]=parseInt(e,10)}),C(0,["gg",2],0,function(){return this.weekYear()%100}),C(0,["GG",2],0,function(){return this.isoWeekYear()%100}),dn("gggg","weekYear"),dn("ggggg","weekYear"),dn("GGGG","isoWeekYear"),dn("GGGGG","isoWeekYear"),L("weekYear","gg"),L("isoWeekYear","GG"),A("weekYear",1),A("isoWeekYear",1),ce("G",ue),ce("g",ue),ce("GG",te,Q),ce("gg",te,Q),ce("GGGG",re,K),ce("gggg",re,K),ce("GGGGG",ae,ee),ce("ggggg",ae,ee),ge(["gggg","ggggg","GGGG","GGGGG"],function(e,t,n,s){t[s.substr(0,2)]=Z(e)}),ge(["gg","GG"],function(e,t,n,s){t[s]=f.parseTwoDigitYear(e)}),C("Q",0,"Qo","quarter"),L("quarter","Q"),A("quarter",7),ce("Q",J),ye("Q",function(e,t){t[ve]=3*(Z(e)-1)}),C("D",["DD",2],"Do","date"),L("date","D"),A("date",9),ce("D",te),ce("DD",te,Q),ce("Do",function(e,t){return e?t._dayOfMonthOrdinalParse||t._ordinalParse:t._dayOfMonthOrdinalParseLenient}),ye(["D","DD"],ke),ye("Do",function(e,t){t[ke]=Z(e.match(te)[0])});var fn=z("Date",!0);C("DDD",["DDDD",3],"DDDo","dayOfYear"),L("dayOfYear","DDD"),A("dayOfYear",4),ce("DDD",ie),ce("DDDD",X),ye(["DDD","DDDD"],function(e,t,n){n._dayOfYear=Z(e)}),C("m",["mm",2],0,"minute"),L("minute","m"),A("minute",14),ce("m",te),ce("mm",te,Q),ye(["m","mm"],De);var mn=z("Minutes",!1);C("s",["ss",2],0,"second"),L("second","s"),A("second",15),ce("s",te),ce("ss",te,Q),ye(["s","ss"],Se);var _n,yn,gn=z("Seconds",!1);for(C("S",0,0,function(){return~~(this.millisecond()/100)}),C(0,["SS",2],0,function(){return~~(this.millisecond()/10)}),C(0,["SSS",3],0,"millisecond"),C(0,["SSSS",4],0,function(){return 10*this.millisecond()}),C(0,["SSSSS",5],0,function(){return 100*this.millisecond()}),C(0,["SSSSSS",6],0,function(){return 1e3*this.millisecond()}),C(0,["SSSSSSS",7],0,function(){return 1e4*this.millisecond()}),C(0,["SSSSSSSS",8],0,function(){return 1e5*this.millisecond()}),C(0,["SSSSSSSSS",9],0,function(){return 1e6*this.millisecond()}),L("millisecond","ms"),A("millisecond",16),ce("S",ie,J),ce("SS",ie,Q),ce("SSS",ie,X),_n="SSSS";_n.length<=9;_n+="S")ce(_n,oe);function wn(e,t){t[Ye]=Z(1e3*("0."+e))}for(_n="S";_n.length<=9;_n+="S")ye(_n,wn);yn=z("Milliseconds",!1),C("z",0,0,"zoneAbbr"),C("zz",0,0,"zoneName");var pn=k.prototype;function vn(e){return e}pn.add=Jt,pn.calendar=function(e,t){1===arguments.length&&(arguments[0]?Kt(arguments[0])?(e=arguments[0],t=void 0):function(e){for(var t=u(e)&&!l(e),n=!1,s=["sameDay","nextDay","lastDay","nextWeek","lastWeek","sameElse"],i=0;i<s.length;i+=1)n=n||m(e,s[i]);return t&&n}(arguments[0])&&(t=arguments[0],e=void 0):t=e=void 0);var n=e||Tt(),s=Gt(n,this).startOf("day"),i=f.calendarFormat(this,s)||"sameElse",r=t&&(O(t[i])?t[i].call(this,n):t[i]);return this.format(r||this.localeData().calendar(i,this,Tt(n)))},pn.clone=function(){return new k(this)},pn.diff=function(e,t,n){var s,i,r;if(!this.isValid())return NaN;if(!(s=Gt(e,this)).isValid())return NaN;switch(i=6e4*(s.utcOffset()-this.utcOffset()),t=V(t)){case"year":r=en(this,s)/12;break;case"month":r=en(this,s);break;case"quarter":r=en(this,s)/3;break;case"second":r=(this-s)/1e3;break;case"minute":r=(this-s)/6e4;break;case"hour":r=(this-s)/36e5;break;case"day":r=(this-s-i)/864e5;break;case"week":r=(this-s-i)/6048e5;break;default:r=this-s}return n?r:I(r)},pn.endOf=function(e){var t,n;if(void 0===(e=V(e))||"millisecond"===e||!this.isValid())return this;switch(n=this._isUTC?un:on,e){case"year":t=n(this.year()+1,0,1)-1;break;case"quarter":t=n(this.year(),this.month()-this.month()%3+3,1)-1;break;case"month":t=n(this.year(),this.month()+1,1)-1;break;case"week":t=n(this.year(),this.month(),this.date()-this.weekday()+7)-1;break;case"isoWeek":t=n(this.year(),this.month(),this.date()-(this.isoWeekday()-1)+7)-1;break;case"day":case"date":t=n(this.year(),this.month(),this.date()+1)-1;break;case"hour":t=this._d.valueOf(),t+=36e5-an(t+(this._isUTC?0:6e4*this.utcOffset()),36e5)-1;break;case"minute":t=this._d.valueOf(),t+=6e4-an(t,6e4)-1;break;case"second":t=this._d.valueOf(),t+=1e3-an(t,1e3)-1;break}return this._d.setTime(t),f.updateOffset(this,!0),this},pn.format=function(e){e=e||(this.isUtc()?f.defaultFormatUtc:f.defaultFormat);var t=U(this,e);return this.localeData().postformat(t)},pn.from=function(e,t){return this.isValid()&&(M(e)&&e.isValid()||Tt(e).isValid())?Zt({to:this,from:e}).locale(this.locale()).humanize(!t):this.localeData().invalidDate()},pn.fromNow=function(e){return this.from(Tt(),e)},pn.to=function(e,t){return this.isValid()&&(M(e)&&e.isValid()||Tt(e).isValid())?Zt({from:this,to:e}).locale(this.locale()).humanize(!t):this.localeData().invalidDate()},pn.toNow=function(e){return this.to(Tt(),e)},pn.get=function(e){return O(this[e=V(e)])?this[e]():this},pn.invalidAt=function(){return y(this).overflow},pn.isAfter=function(e,t){var n=M(e)?e:Tt(e);return!(!this.isValid()||!n.isValid())&&("millisecond"===(t=V(t)||"millisecond")?this.valueOf()>n.valueOf():n.valueOf()<this.clone().startOf(t).valueOf())},pn.isBefore=function(e,t){var n=M(e)?e:Tt(e);return!(!this.isValid()||!n.isValid())&&("millisecond"===(t=V(t)||"millisecond")?this.valueOf()<n.valueOf():this.clone().endOf(t).valueOf()<n.valueOf())},pn.isBetween=function(e,t,n,s){var i=M(e)?e:Tt(e),r=M(t)?t:Tt(t);return!!(this.isValid()&&i.isValid()&&r.isValid())&&(("("===(s=s||"()")[0]?this.isAfter(i,n):!this.isBefore(i,n))&&(")"===s[1]?this.isBefore(r,n):!this.isAfter(r,n)))},pn.isSame=function(e,t){var n,s=M(e)?e:Tt(e);return!(!this.isValid()||!s.isValid())&&("millisecond"===(t=V(t)||"millisecond")?this.valueOf()===s.valueOf():(n=s.valueOf(),this.clone().startOf(t).valueOf()<=n&&n<=this.clone().endOf(t).valueOf()))},pn.isSameOrAfter=function(e,t){return this.isSame(e,t)||this.isAfter(e,t)},pn.isSameOrBefore=function(e,t){return this.isSame(e,t)||this.isBefore(e,t)},pn.isValid=function(){return g(this)},pn.lang=nn,pn.locale=tn,pn.localeData=sn,pn.max=Pt,pn.min=Nt,pn.parsingFlags=function(){return c({},y(this))},pn.set=function(e,t){if("object"==typeof e)for(var n=function(e){var t,n=[];for(t in e)m(e,t)&&n.push({unit:t,priority:E[t]});return n.sort(function(e,t){return e.priority-t.priority}),n}(e=G(e)),s=0;s<n.length;s++)this[n[s].unit](e[n[s].unit]);else if(O(this[e=V(e)]))return this[e](t);return this},pn.startOf=function(e){var t,n;if(void 0===(e=V(e))||"millisecond"===e||!this.isValid())return this;switch(n=this._isUTC?un:on,e){case"year":t=n(this.year(),0,1);break;case"quarter":t=n(this.year(),this.month()-this.month()%3,1);break;case"month":t=n(this.year(),this.month(),1);break;case"week":t=n(this.year(),this.month(),this.date()-this.weekday());break;case"isoWeek":t=n(this.year(),this.month(),this.date()-(this.isoWeekday()-1));break;case"day":case"date":t=n(this.year(),this.month(),this.date());break;case"hour":t=this._d.valueOf(),t-=an(t+(this._isUTC?0:6e4*this.utcOffset()),36e5);break;case"minute":t=this._d.valueOf(),t-=an(t,6e4);break;case"second":t=this._d.valueOf(),t-=an(t,1e3);break}return this._d.setTime(t),f.updateOffset(this,!0),this},pn.subtract=Qt,pn.toArray=function(){var e=this;return[e.year(),e.month(),e.date(),e.hour(),e.minute(),e.second(),e.millisecond()]},pn.toObject=function(){var e=this;return{years:e.year(),months:e.month(),date:e.date(),hours:e.hours(),minutes:e.minutes(),seconds:e.seconds(),milliseconds:e.milliseconds()}},pn.toDate=function(){return new Date(this.valueOf())},pn.toISOString=function(e){if(!this.isValid())return null;var t=!0!==e,n=t?this.clone().utc():this;return n.year()<0||9999<n.year()?U(n,t?"YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]":"YYYYYY-MM-DD[T]HH:mm:ss.SSSZ"):O(Date.prototype.toISOString)?t?this.toDate().toISOString():new Date(this.valueOf()+60*this.utcOffset()*1e3).toISOString().replace("Z",U(n,"Z")):U(n,t?"YYYY-MM-DD[T]HH:mm:ss.SSS[Z]":"YYYY-MM-DD[T]HH:mm:ss.SSSZ")},pn.inspect=function(){if(!this.isValid())return"moment.invalid(/* "+this._i+" */)";var e,t,n,s="moment",i="";return this.isLocal()||(s=0===this.utcOffset()?"moment.utc":"moment.parseZone",i="Z"),e="["+s+'("]',t=0<=this.year()&&this.year()<=9999?"YYYY":"YYYYYY",n=i+'[")]',this.format(e+t+"-MM-DD[T]HH:mm:ss.SSS"+n)},"undefined"!=typeof Symbol&&null!=Symbol.for&&(pn[Symbol.for("nodejs.util.inspect.custom")]=function(){return"Moment<"+this.format()+">"}),pn.toJSON=function(){return this.isValid()?this.toISOString():null},pn.toString=function(){return this.clone().locale("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ")},pn.unix=function(){return Math.floor(this.valueOf()/1e3)},pn.valueOf=function(){return this._d.valueOf()-6e4*(this._offset||0)},pn.creationData=function(){return{input:this._i,format:this._f,locale:this._locale,isUTC:this._isUTC,strict:this._strict}},pn.eraName=function(){for(var e,t=this.localeData().eras(),n=0,s=t.length;n<s;++n){if(e=this.clone().startOf("day").valueOf(),t[n].since<=e&&e<=t[n].until)return t[n].name;if(t[n].until<=e&&e<=t[n].since)return t[n].name}return""},pn.eraNarrow=function(){for(var e,t=this.localeData().eras(),n=0,s=t.length;n<s;++n){if(e=this.clone().startOf("day").valueOf(),t[n].since<=e&&e<=t[n].until)return t[n].narrow;if(t[n].until<=e&&e<=t[n].since)return t[n].narrow}return""},pn.eraAbbr=function(){for(var e,t=this.localeData().eras(),n=0,s=t.length;n<s;++n){if(e=this.clone().startOf("day").valueOf(),t[n].since<=e&&e<=t[n].until)return t[n].abbr;if(t[n].until<=e&&e<=t[n].since)return t[n].abbr}return""},pn.eraYear=function(){for(var e,t,n=this.localeData().eras(),s=0,i=n.length;s<i;++s)if(e=n[s].since<=n[s].until?1:-1,t=this.clone().startOf("day").valueOf(),n[s].since<=t&&t<=n[s].until||n[s].until<=t&&t<=n[s].since)return(this.year()-f(n[s].since).year())*e+n[s].offset;return this.year()},pn.year=Le,pn.isLeapYear=function(){return j(this.year())},pn.weekYear=function(e){return cn.call(this,e,this.week(),this.weekday(),this.localeData()._week.dow,this.localeData()._week.doy)},pn.isoWeekYear=function(e){return cn.call(this,e,this.isoWeek(),this.isoWeekday(),1,4)},pn.quarter=pn.quarters=function(e){return null==e?Math.ceil((this.month()+1)/3):this.month(3*(e-1)+this.month()%3)},pn.month=Ue,pn.daysInMonth=function(){return xe(this.year(),this.month())},pn.week=pn.weeks=function(e){var t=this.localeData().week(this);return null==e?t:this.add(7*(e-t),"d")},pn.isoWeek=pn.isoWeeks=function(e){var t=Ae(this,1,4).week;return null==e?t:this.add(7*(e-t),"d")},pn.weeksInYear=function(){var e=this.localeData()._week;return je(this.year(),e.dow,e.doy)},pn.weeksInWeekYear=function(){var e=this.localeData()._week;return je(this.weekYear(),e.dow,e.doy)},pn.isoWeeksInYear=function(){return je(this.year(),1,4)},pn.isoWeeksInISOWeekYear=function(){return je(this.isoWeekYear(),1,4)},pn.date=fn,pn.day=pn.days=function(e){if(!this.isValid())return null!=e?this:NaN;var t,n,s=this._isUTC?this._d.getUTCDay():this._d.getDay();return null!=e?(t=e,n=this.localeData(),e="string"!=typeof t?t:isNaN(t)?"number"==typeof(t=n.weekdaysParse(t))?t:null:parseInt(t,10),this.add(e-s,"d")):s},pn.weekday=function(e){if(!this.isValid())return null!=e?this:NaN;var t=(this.day()+7-this.localeData()._week.dow)%7;return null==e?t:this.add(e-t,"d")},pn.isoWeekday=function(e){if(!this.isValid())return null!=e?this:NaN;if(null==e)return this.day()||7;var t,n,s=(t=e,n=this.localeData(),"string"==typeof t?n.weekdaysParse(t)%7||7:isNaN(t)?null:t);return this.day(this.day()%7?s:s-7)},pn.dayOfYear=function(e){var t=Math.round((this.clone().startOf("day")-this.clone().startOf("year"))/864e5)+1;return null==e?t:this.add(e-t,"d")},pn.hour=pn.hours=tt,pn.minute=pn.minutes=mn,pn.second=pn.seconds=gn,pn.millisecond=pn.milliseconds=yn,pn.utcOffset=function(e,t,n){var s,i=this._offset||0;if(!this.isValid())return null!=e?this:NaN;if(null==e)return this._isUTC?i:Et(this);if("string"==typeof e){if(null===(e=Vt(he,e)))return this}else Math.abs(e)<16&&!n&&(e*=60);return!this._isUTC&&t&&(s=Et(this)),this._offset=e,this._isUTC=!0,null!=s&&this.add(s,"m"),i!==e&&(!t||this._changeInProgress?Bt(this,Zt(e-i,"m"),1,!1):this._changeInProgress||(this._changeInProgress=!0,f.updateOffset(this,!0),this._changeInProgress=null)),this},pn.utc=function(e){return this.utcOffset(0,e)},pn.local=function(e){return this._isUTC&&(this.utcOffset(0,e),this._isUTC=!1,e&&this.subtract(Et(this),"m")),this},pn.parseZone=function(){var e;return null!=this._tzm?this.utcOffset(this._tzm,!1,!0):"string"==typeof this._i&&(null!=(e=Vt(le,this._i))?this.utcOffset(e):this.utcOffset(0,!0)),this},pn.hasAlignedHourOffset=function(e){return!!this.isValid()&&(e=e?Tt(e).utcOffset():0,(this.utcOffset()-e)%60==0)},pn.isDST=function(){return this.utcOffset()>this.clone().month(0).utcOffset()||this.utcOffset()>this.clone().month(5).utcOffset()},pn.isLocal=function(){return!!this.isValid()&&!this._isUTC},pn.isUtcOffset=function(){return!!this.isValid()&&this._isUTC},pn.isUtc=At,pn.isUTC=At,pn.zoneAbbr=function(){return this._isUTC?"UTC":""},pn.zoneName=function(){return this._isUTC?"Coordinated Universal Time":""},pn.dates=n("dates accessor is deprecated. Use date instead.",fn),pn.months=n("months accessor is deprecated. Use month instead",Ue),pn.years=n("years accessor is deprecated. Use year instead",Le),pn.zone=n("moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/",function(e,t){return null!=e?("string"!=typeof e&&(e=-e),this.utcOffset(e,t),this):-this.utcOffset()}),pn.isDSTShifted=n("isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information",function(){if(!r(this._isDSTShifted))return this._isDSTShifted;var e,t={};return v(t,this),(t=bt(t))._a?(e=(t._isUTC?_:Tt)(t._a),this._isDSTShifted=this.isValid()&&0<function(e,t,n){for(var s=Math.min(e.length,t.length),i=Math.abs(e.length-t.length),r=0,a=0;a<s;a++)(n&&e[a]!==t[a]||!n&&Z(e[a])!==Z(t[a]))&&r++;return r+i}(t._a,e.toArray())):this._isDSTShifted=!1,this._isDSTShifted});var kn=x.prototype;function Mn(e,t,n,s){var i=dt(),r=_().set(s,t);return i[n](r,e)}function Dn(e,t,n){if(h(e)&&(t=e,e=void 0),e=e||"",null!=t)return Mn(e,t,n,"month");for(var s=[],i=0;i<12;i++)s[i]=Mn(e,i,n,"month");return s}function Sn(e,t,n,s){t=("boolean"==typeof e?h(t)&&(n=t,t=void 0):(t=e,e=!1,h(n=t)&&(n=t,t=void 0)),t||"");var i,r=dt(),a=e?r._week.dow:0,o=[];if(null!=n)return Mn(t,(n+a)%7,s,"day");for(i=0;i<7;i++)o[i]=Mn(t,(i+a)%7,s,"day");return o}kn.calendar=function(e,t,n){var s=this._calendar[e]||this._calendar.sameElse;return O(s)?s.call(t,n):s},kn.longDateFormat=function(e){var t=this._longDateFormat[e],n=this._longDateFormat[e.toUpperCase()];return t||!n?t:(this._longDateFormat[e]=n.match(N).map(function(e){return"MMMM"===e||"MM"===e||"DD"===e||"dddd"===e?e.slice(1):e}).join(""),this._longDateFormat[e])},kn.invalidDate=function(){return this._invalidDate},kn.ordinal=function(e){return this._ordinal.replace("%d",e)},kn.preparse=vn,kn.postformat=vn,kn.relativeTime=function(e,t,n,s){var i=this._relativeTime[n];return O(i)?i(e,t,n,s):i.replace(/%d/i,e)},kn.pastFuture=function(e,t){var n=this._relativeTime[0<e?"future":"past"];return O(n)?n(t):n.replace(/%s/i,t)},kn.set=function(e){var t,n;for(n in e)m(e,n)&&(O(t=e[n])?this[n]=t:this["_"+n]=t);this._config=e,this._dayOfMonthOrdinalParseLenient=new RegExp((this._dayOfMonthOrdinalParse.source||this._ordinalParse.source)+"|"+/\d{1,2}/.source)},kn.eras=function(e,t){for(var n,s=this._eras||dt("en")._eras,i=0,r=s.length;i<r;++i){switch(typeof s[i].since){case"string":n=f(s[i].since).startOf("day"),s[i].since=n.valueOf();break}switch(typeof s[i].until){case"undefined":s[i].until=1/0;break;case"string":n=f(s[i].until).startOf("day").valueOf(),s[i].until=n.valueOf();break}}return s},kn.erasParse=function(e,t,n){var s,i,r,a,o,u=this.eras();for(e=e.toUpperCase(),s=0,i=u.length;s<i;++s)if(r=u[s].name.toUpperCase(),a=u[s].abbr.toUpperCase(),o=u[s].narrow.toUpperCase(),n)switch(t){case"N":case"NN":case"NNN":if(a===e)return u[s];break;case"NNNN":if(r===e)return u[s];break;case"NNNNN":if(o===e)return u[s];break}else if(0<=[r,a,o].indexOf(e))return u[s]},kn.erasConvertYear=function(e,t){var n=e.since<=e.until?1:-1;return void 0===t?f(e.since).year():f(e.since).year()+(t-e.offset)*n},kn.erasAbbrRegex=function(e){return m(this,"_erasAbbrRegex")||hn.call(this),e?this._erasAbbrRegex:this._erasRegex},kn.erasNameRegex=function(e){return m(this,"_erasNameRegex")||hn.call(this),e?this._erasNameRegex:this._erasRegex},kn.erasNarrowRegex=function(e){return m(this,"_erasNarrowRegex")||hn.call(this),e?this._erasNarrowRegex:this._erasRegex},kn.months=function(e,t){return e?o(this._months)?this._months[e.month()]:this._months[(this._months.isFormat||Pe).test(t)?"format":"standalone"][e.month()]:o(this._months)?this._months:this._months.standalone},kn.monthsShort=function(e,t){return e?o(this._monthsShort)?this._monthsShort[e.month()]:this._monthsShort[Pe.test(t)?"format":"standalone"][e.month()]:o(this._monthsShort)?this._monthsShort:this._monthsShort.standalone},kn.monthsParse=function(e,t,n){var s,i,r;if(this._monthsParseExact)return function(e,t,n){var s,i,r,a=e.toLocaleLowerCase();if(!this._monthsParse)for(this._monthsParse=[],this._longMonthsParse=[],this._shortMonthsParse=[],s=0;s<12;++s)r=_([2e3,s]),this._shortMonthsParse[s]=this.monthsShort(r,"").toLocaleLowerCase(),this._longMonthsParse[s]=this.months(r,"").toLocaleLowerCase();return n?"MMM"===t?-1!==(i=we.call(this._shortMonthsParse,a))?i:null:-1!==(i=we.call(this._longMonthsParse,a))?i:null:"MMM"===t?-1!==(i=we.call(this._shortMonthsParse,a))||-1!==(i=we.call(this._longMonthsParse,a))?i:null:-1!==(i=we.call(this._longMonthsParse,a))||-1!==(i=we.call(this._shortMonthsParse,a))?i:null}.call(this,e,t,n);for(this._monthsParse||(this._monthsParse=[],this._longMonthsParse=[],this._shortMonthsParse=[]),s=0;s<12;s++){if(i=_([2e3,s]),n&&!this._longMonthsParse[s]&&(this._longMonthsParse[s]=new RegExp("^"+this.months(i,"").replace(".","")+"$","i"),this._shortMonthsParse[s]=new RegExp("^"+this.monthsShort(i,"").replace(".","")+"$","i")),n||this._monthsParse[s]||(r="^"+this.months(i,"")+"|^"+this.monthsShort(i,""),this._monthsParse[s]=new RegExp(r.replace(".",""),"i")),n&&"MMMM"===t&&this._longMonthsParse[s].test(e))return s;if(n&&"MMM"===t&&this._shortMonthsParse[s].test(e))return s;if(!n&&this._monthsParse[s].test(e))return s}},kn.monthsRegex=function(e){return this._monthsParseExact?(m(this,"_monthsRegex")||He.call(this),e?this._monthsStrictRegex:this._monthsRegex):(m(this,"_monthsRegex")||(this._monthsRegex=We),this._monthsStrictRegex&&e?this._monthsStrictRegex:this._monthsRegex)},kn.monthsShortRegex=function(e){return this._monthsParseExact?(m(this,"_monthsRegex")||He.call(this),e?this._monthsShortStrictRegex:this._monthsShortRegex):(m(this,"_monthsShortRegex")||(this._monthsShortRegex=Re),this._monthsShortStrictRegex&&e?this._monthsShortStrictRegex:this._monthsShortRegex)},kn.week=function(e){return Ae(e,this._week.dow,this._week.doy).week},kn.firstDayOfYear=function(){return this._week.doy},kn.firstDayOfWeek=function(){return this._week.dow},kn.weekdays=function(e,t){var n=o(this._weekdays)?this._weekdays:this._weekdays[e&&!0!==e&&this._weekdays.isFormat.test(t)?"format":"standalone"];return!0===e?Ie(n,this._week.dow):e?n[e.day()]:n},kn.weekdaysMin=function(e){return!0===e?Ie(this._weekdaysMin,this._week.dow):e?this._weekdaysMin[e.day()]:this._weekdaysMin},kn.weekdaysShort=function(e){return!0===e?Ie(this._weekdaysShort,this._week.dow):e?this._weekdaysShort[e.day()]:this._weekdaysShort},kn.weekdaysParse=function(e,t,n){var s,i,r;if(this._weekdaysParseExact)return function(e,t,n){var s,i,r,a=e.toLocaleLowerCase();if(!this._weekdaysParse)for(this._weekdaysParse=[],this._shortWeekdaysParse=[],this._minWeekdaysParse=[],s=0;s<7;++s)r=_([2e3,1]).day(s),this._minWeekdaysParse[s]=this.weekdaysMin(r,"").toLocaleLowerCase(),this._shortWeekdaysParse[s]=this.weekdaysShort(r,"").toLocaleLowerCase(),this._weekdaysParse[s]=this.weekdays(r,"").toLocaleLowerCase();return n?"dddd"===t?-1!==(i=we.call(this._weekdaysParse,a))?i:null:"ddd"===t?-1!==(i=we.call(this._shortWeekdaysParse,a))?i:null:-1!==(i=we.call(this._minWeekdaysParse,a))?i:null:"dddd"===t?-1!==(i=we.call(this._weekdaysParse,a))||-1!==(i=we.call(this._shortWeekdaysParse,a))||-1!==(i=we.call(this._minWeekdaysParse,a))?i:null:"ddd"===t?-1!==(i=we.call(this._shortWeekdaysParse,a))||-1!==(i=we.call(this._weekdaysParse,a))||-1!==(i=we.call(this._minWeekdaysParse,a))?i:null:-1!==(i=we.call(this._minWeekdaysParse,a))||-1!==(i=we.call(this._weekdaysParse,a))||-1!==(i=we.call(this._shortWeekdaysParse,a))?i:null}.call(this,e,t,n);for(this._weekdaysParse||(this._weekdaysParse=[],this._minWeekdaysParse=[],this._shortWeekdaysParse=[],this._fullWeekdaysParse=[]),s=0;s<7;s++){if(i=_([2e3,1]).day(s),n&&!this._fullWeekdaysParse[s]&&(this._fullWeekdaysParse[s]=new RegExp("^"+this.weekdays(i,"").replace(".","\\.?")+"$","i"),this._shortWeekdaysParse[s]=new RegExp("^"+this.weekdaysShort(i,"").replace(".","\\.?")+"$","i"),this._minWeekdaysParse[s]=new RegExp("^"+this.weekdaysMin(i,"").replace(".","\\.?")+"$","i")),this._weekdaysParse[s]||(r="^"+this.weekdays(i,"")+"|^"+this.weekdaysShort(i,"")+"|^"+this.weekdaysMin(i,""),this._weekdaysParse[s]=new RegExp(r.replace(".",""),"i")),n&&"dddd"===t&&this._fullWeekdaysParse[s].test(e))return s;if(n&&"ddd"===t&&this._shortWeekdaysParse[s].test(e))return s;if(n&&"dd"===t&&this._minWeekdaysParse[s].test(e))return s;if(!n&&this._weekdaysParse[s].test(e))return s}},kn.weekdaysRegex=function(e){return this._weekdaysParseExact?(m(this,"_weekdaysRegex")||Qe.call(this),e?this._weekdaysStrictRegex:this._weekdaysRegex):(m(this,"_weekdaysRegex")||(this._weekdaysRegex=qe),this._weekdaysStrictRegex&&e?this._weekdaysStrictRegex:this._weekdaysRegex)},kn.weekdaysShortRegex=function(e){return this._weekdaysParseExact?(m(this,"_weekdaysRegex")||Qe.call(this),e?this._weekdaysShortStrictRegex:this._weekdaysShortRegex):(m(this,"_weekdaysShortRegex")||(this._weekdaysShortRegex=Be),this._weekdaysShortStrictRegex&&e?this._weekdaysShortStrictRegex:this._weekdaysShortRegex)},kn.weekdaysMinRegex=function(e){return this._weekdaysParseExact?(m(this,"_weekdaysRegex")||Qe.call(this),e?this._weekdaysMinStrictRegex:this._weekdaysMinRegex):(m(this,"_weekdaysMinRegex")||(this._weekdaysMinRegex=Je),this._weekdaysMinStrictRegex&&e?this._weekdaysMinStrictRegex:this._weekdaysMinRegex)},kn.isPM=function(e){return"p"===(e+"").toLowerCase().charAt(0)},kn.meridiem=function(e,t,n){return 11<e?n?"pm":"PM":n?"am":"AM"},lt("en",{eras:[{since:"0001-01-01",until:1/0,offset:1,name:"Anno Domini",narrow:"AD",abbr:"AD"},{since:"0000-12-31",until:-1/0,offset:1,name:"Before Christ",narrow:"BC",abbr:"BC"}],dayOfMonthOrdinalParse:/\d{1,2}(th|st|nd|rd)/,ordinal:function(e){var t=e%10;return e+(1===Z(e%100/10)?"th":1==t?"st":2==t?"nd":3==t?"rd":"th")}}),f.lang=n("moment.lang is deprecated. Use moment.locale instead.",lt),f.langData=n("moment.langData is deprecated. Use moment.localeData instead.",dt);var Yn=Math.abs;function On(e,t,n,s){var i=Zt(t,n);return e._milliseconds+=s*i._milliseconds,e._days+=s*i._days,e._months+=s*i._months,e._bubble()}function bn(e){return e<0?Math.floor(e):Math.ceil(e)}function xn(e){return 4800*e/146097}function Tn(e){return 146097*e/4800}function Nn(e){return function(){return this.as(e)}}var Pn=Nn("ms"),Rn=Nn("s"),Wn=Nn("m"),Cn=Nn("h"),Un=Nn("d"),Hn=Nn("w"),Fn=Nn("M"),Ln=Nn("Q"),Vn=Nn("y");function Gn(e){return function(){return this.isValid()?this._data[e]:NaN}}var En=Gn("milliseconds"),An=Gn("seconds"),jn=Gn("minutes"),In=Gn("hours"),Zn=Gn("days"),zn=Gn("months"),$n=Gn("years");var qn=Math.round,Bn={ss:44,s:45,m:45,h:22,d:26,w:null,M:11};function Jn(e,t,n,s){var i=Zt(e).abs(),r=qn(i.as("s")),a=qn(i.as("m")),o=qn(i.as("h")),u=qn(i.as("d")),l=qn(i.as("M")),h=qn(i.as("w")),d=qn(i.as("y")),c=(r<=n.ss?["s",r]:r<n.s&&["ss",r])||a<=1&&["m"]||a<n.m&&["mm",a]||o<=1&&["h"]||o<n.h&&["hh",o]||u<=1&&["d"]||u<n.d&&["dd",u];return null!=n.w&&(c=c||h<=1&&["w"]||h<n.w&&["ww",h]),(c=c||l<=1&&["M"]||l<n.M&&["MM",l]||d<=1&&["y"]||["yy",d])[2]=t,c[3]=0<+e,c[4]=s,function(e,t,n,s,i){return i.relativeTime(t||1,!!n,e,s)}.apply(null,c)}var Qn=Math.abs;function Xn(e){return(0<e)-(e<0)||+e}function Kn(){if(!this.isValid())return this.localeData().invalidDate();var e,t,n,s,i,r,a,o,u=Qn(this._milliseconds)/1e3,l=Qn(this._days),h=Qn(this._months),d=this.asSeconds();return d?(e=I(u/60),t=I(e/60),u%=60,e%=60,n=I(h/12),h%=12,s=u?u.toFixed(3).replace(/\.?0+$/,""):"",i=d<0?"-":"",r=Xn(this._months)!==Xn(d)?"-":"",a=Xn(this._days)!==Xn(d)?"-":"",o=Xn(this._milliseconds)!==Xn(d)?"-":"",i+"P"+(n?r+n+"Y":"")+(h?r+h+"M":"")+(l?a+l+"D":"")+(t||e||u?"T":"")+(t?o+t+"H":"")+(e?o+e+"M":"")+(u?o+s+"S":"")):"P0D"}var es=Ct.prototype;return es.isValid=function(){return this._isValid},es.abs=function(){var e=this._data;return this._milliseconds=Yn(this._milliseconds),this._days=Yn(this._days),this._months=Yn(this._months),e.milliseconds=Yn(e.milliseconds),e.seconds=Yn(e.seconds),e.minutes=Yn(e.minutes),e.hours=Yn(e.hours),e.months=Yn(e.months),e.years=Yn(e.years),this},es.add=function(e,t){return On(this,e,t,1)},es.subtract=function(e,t){return On(this,e,t,-1)},es.as=function(e){if(!this.isValid())return NaN;var t,n,s=this._milliseconds;if("month"===(e=V(e))||"quarter"===e||"year"===e)switch(t=this._days+s/864e5,n=this._months+xn(t),e){case"month":return n;case"quarter":return n/3;case"year":return n/12}else switch(t=this._days+Math.round(Tn(this._months)),e){case"week":return t/7+s/6048e5;case"day":return t+s/864e5;case"hour":return 24*t+s/36e5;case"minute":return 1440*t+s/6e4;case"second":return 86400*t+s/1e3;case"millisecond":return Math.floor(864e5*t)+s;default:throw new Error("Unknown unit "+e)}},es.asMilliseconds=Pn,es.asSeconds=Rn,es.asMinutes=Wn,es.asHours=Cn,es.asDays=Un,es.asWeeks=Hn,es.asMonths=Fn,es.asQuarters=Ln,es.asYears=Vn,es.valueOf=function(){return this.isValid()?this._milliseconds+864e5*this._days+this._months%12*2592e6+31536e6*Z(this._months/12):NaN},es._bubble=function(){var e,t,n,s,i,r=this._milliseconds,a=this._days,o=this._months,u=this._data;return 0<=r&&0<=a&&0<=o||r<=0&&a<=0&&o<=0||(r+=864e5*bn(Tn(o)+a),o=a=0),u.milliseconds=r%1e3,e=I(r/1e3),u.seconds=e%60,t=I(e/60),u.minutes=t%60,n=I(t/60),u.hours=n%24,a+=I(n/24),o+=i=I(xn(a)),a-=bn(Tn(i)),s=I(o/12),o%=12,u.days=a,u.months=o,u.years=s,this},es.clone=function(){return Zt(this)},es.get=function(e){return e=V(e),this.isValid()?this[e+"s"]():NaN},es.milliseconds=En,es.seconds=An,es.minutes=jn,es.hours=In,es.days=Zn,es.weeks=function(){return I(this.days()/7)},es.months=zn,es.years=$n,es.humanize=function(e,t){if(!this.isValid())return this.localeData().invalidDate();var n,s,i=!1,r=Bn;return"object"==typeof e&&(t=e,e=!1),"boolean"==typeof e&&(i=e),"object"==typeof t&&(r=Object.assign({},Bn,t),null!=t.s&&null==t.ss&&(r.ss=t.s-1)),n=this.localeData(),s=Jn(this,!i,r,n),i&&(s=n.pastFuture(+this,s)),n.postformat(s)},es.toISOString=Kn,es.toString=Kn,es.toJSON=Kn,es.locale=tn,es.localeData=sn,es.toIsoString=n("toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)",Kn),es.lang=nn,C("X",0,0,"unix"),C("x",0,0,"valueOf"),ce("x",ue),ce("X",/[+-]?\d+(\.\d{1,3})?/),ye("X",function(e,t,n){n._d=new Date(1e3*parseFloat(e))}),ye("x",function(e,t,n){n._d=new Date(Z(e))}),f.version="2.29.1",e=Tt,f.fn=pn,f.min=function(){return Rt("isBefore",[].slice.call(arguments,0))},f.max=function(){return Rt("isAfter",[].slice.call(arguments,0))},f.now=function(){return Date.now?Date.now():+new Date},f.utc=_,f.unix=function(e){return Tt(1e3*e)},f.months=function(e,t){return Dn(e,t,"months")},f.isDate=a,f.locale=lt,f.invalid=w,f.duration=Zt,f.isMoment=M,f.weekdays=function(e,t,n){return Sn(e,t,n,"weekdays")},f.parseZone=function(){return Tt.apply(null,arguments).parseZone()},f.localeData=dt,f.isDuration=Ut,f.monthsShort=function(e,t){return Dn(e,t,"monthsShort")},f.weekdaysMin=function(e,t,n){return Sn(e,t,n,"weekdaysMin")},f.defineLocale=ht,f.updateLocale=function(e,t){var n,s,i;return null!=t?(i=st,null!=it[e]&&null!=it[e].parentLocale?it[e].set(b(it[e]._config,t)):(null!=(s=ut(e))&&(i=s._config),t=b(i,t),null==s&&(t.abbr=e),(n=new x(t)).parentLocale=it[e],it[e]=n),lt(e)):null!=it[e]&&(null!=it[e].parentLocale?(it[e]=it[e].parentLocale,e===lt()&&lt(e)):null!=it[e]&&delete it[e]),it[e]},f.locales=function(){return s(it)},f.weekdaysShort=function(e,t,n){return Sn(e,t,n,"weekdaysShort")},f.normalizeUnits=V,f.relativeTimeRounding=function(e){return void 0===e?qn:"function"==typeof e&&(qn=e,!0)},f.relativeTimeThreshold=function(e,t){return void 0!==Bn[e]&&(void 0===t?Bn[e]:(Bn[e]=t,"s"===e&&(Bn.ss=t-1),!0))},f.calendarFormat=function(e,t){var n=e.diff(t,"days",!0);return n<-6?"sameElse":n<-1?"lastWeek":n<0?"lastDay":n<1?"sameDay":n<2?"nextDay":n<7?"nextWeek":"sameElse"},f.prototype=pn,f.HTML5_FMT={DATETIME_LOCAL:"YYYY-MM-DDTHH:mm",DATETIME_LOCAL_SECONDS:"YYYY-MM-DDTHH:mm:ss",DATETIME_LOCAL_MS:"YYYY-MM-DDTHH:mm:ss.SSS",DATE:"YYYY-MM-DD",TIME:"HH:mm",TIME_SECONDS:"HH:mm:ss",TIME_MS:"HH:mm:ss.SSS",WEEK:"GGGG-[W]WW",MONTH:"YYYY-MM"},f});

/*
 Highcharts JS v9.3.1 (2021-11-05)

 (c) 2009-2021 Torstein Honsi

 License: www.highcharts.com/license
*/

'use strict';(function(Z,L){"object"===typeof module&&module.exports?(L["default"]=L,module.exports=Z.document?L(Z):L):"function"===typeof define&&define.amd?define("highcharts/highcharts",function(){return L(Z)}):(Z.Highcharts&&Z.Highcharts.error(16,!0),Z.Highcharts=L(Z))})("undefined"!==typeof window?window:this,function(Z){function L(u,a,A,G){u.hasOwnProperty(a)||(u[a]=G.apply(null,A))}var a={};L(a,"Core/Globals.js",[],function(){var u="undefined"!==typeof Z?Z:"undefined"!==typeof window?window:
{},a;(function(a){a.SVG_NS="http://www.w3.org/2000/svg";a.product="Highcharts";a.version="9.3.1";a.win=u;a.doc=a.win.document;a.svg=a.doc&&a.doc.createElementNS&&!!a.doc.createElementNS(a.SVG_NS,"svg").createSVGRect;a.userAgent=a.win.navigator&&a.win.navigator.userAgent||"";a.isChrome=-1!==a.userAgent.indexOf("Chrome");a.isFirefox=-1!==a.userAgent.indexOf("Firefox");a.isMS=/(edge|msie|trident)/i.test(a.userAgent)&&!a.win.opera;a.isSafari=!a.isChrome&&-1!==a.userAgent.indexOf("Safari");a.isTouchDevice=
/(Mobile|Android|Windows Phone)/.test(a.userAgent);a.isWebKit=-1!==a.userAgent.indexOf("AppleWebKit");a.deg2rad=2*Math.PI/360;a.hasBidiBug=a.isFirefox&&4>parseInt(a.userAgent.split("Firefox/")[1],10);a.hasTouch=!!a.win.TouchEvent;a.marginNames=["plotTop","marginRight","marginBottom","plotLeft"];a.noop=function(){};a.supportsPassiveEvents=function(){var u=!1;if(!a.isMS){var t=Object.defineProperty({},"passive",{get:function(){u=!0}});a.win.addEventListener&&a.win.removeEventListener&&(a.win.addEventListener("testPassive",
a.noop,t),a.win.removeEventListener("testPassive",a.noop,t))}return u}();a.charts=[];a.dateFormats={};a.seriesTypes={};a.symbolSizes={};a.chartCount=0})(a||(a={}));"";return a});L(a,"Core/Utilities.js",[a["Core/Globals.js"]],function(a){function u(e,g,c,k){var v=g?"Highcharts error":"Highcharts warning";32===e&&(e=v+": Deprecated member");var d=m(e),E=d?v+" #"+e+": www.highcharts.com/errors/"+e+"/":e.toString();if("undefined"!==typeof k){var J="";d&&(E+="?");r(k,function(b,e){J+="\n - "+e+": "+b;
d&&(E+=encodeURI(e)+"="+encodeURI(b))});E+=J}B(a,"displayError",{chart:c,code:e,message:E,params:k},function(){if(g)throw Error(E);b.console&&-1===u.messages.indexOf(E)&&console.warn(E)});u.messages.push(E)}function A(b,e){var v={};r(b,function(g,c){if(I(b[c],!0)&&!b.nodeType&&e[c])g=A(b[c],e[c]),Object.keys(g).length&&(v[c]=g);else if(I(b[c])||b[c]!==e[c])v[c]=b[c]});return v}function G(b,e){return parseInt(b,e||10)}function x(b){return"string"===typeof b}function C(b){b=Object.prototype.toString.call(b);
return"[object Array]"===b||"[object Array Iterator]"===b}function I(b,e){return!!b&&"object"===typeof b&&(!e||!C(b))}function z(b){return I(b)&&"number"===typeof b.nodeType}function q(b){var e=b&&b.constructor;return!(!I(b,!0)||z(b)||!e||!e.name||"Object"===e.name)}function m(b){return"number"===typeof b&&!isNaN(b)&&Infinity>b&&-Infinity<b}function h(b){return"undefined"!==typeof b&&null!==b}function d(b,e,g){var v;x(e)?h(g)?b.setAttribute(e,g):b&&b.getAttribute&&((v=b.getAttribute(e))||"class"!==
e||(v=b.getAttribute(e+"Name"))):r(e,function(e,v){h(e)?b.setAttribute(v,e):b.removeAttribute(v)});return v}function c(b,e){var v;b||(b={});for(v in e)b[v]=e[v];return b}function l(){for(var b=arguments,e=b.length,g=0;g<e;g++){var c=b[g];if("undefined"!==typeof c&&null!==c)return c}}function f(b,e){a.isMS&&!a.svg&&e&&"undefined"!==typeof e.opacity&&(e.filter="alpha(opacity="+100*e.opacity+")");c(b.style,e)}function w(b,e,g,d,n){b=k.createElement(b);e&&c(b,e);n&&f(b,{padding:"0",border:"none",margin:"0"});
g&&f(b,g);d&&d.appendChild(b);return b}function p(b,e){return 1E14<b?b:parseFloat(b.toPrecision(e||14))}function K(e,g,c){var v=a.getStyle||K;if("width"===g)return g=Math.min(e.offsetWidth,e.scrollWidth),c=e.getBoundingClientRect&&e.getBoundingClientRect().width,c<g&&c>=g-1&&(g=Math.floor(c)),Math.max(0,g-(v(e,"padding-left",!0)||0)-(v(e,"padding-right",!0)||0));if("height"===g)return Math.max(0,Math.min(e.offsetHeight,e.scrollHeight)-(v(e,"padding-top",!0)||0)-(v(e,"padding-bottom",!0)||0));b.getComputedStyle||
u(27,!0);if(e=b.getComputedStyle(e,void 0)){var k=e.getPropertyValue(g);l(c,"opacity"!==g)&&(k=G(k))}return k}function r(b,e,g){for(var v in b)Object.hasOwnProperty.call(b,v)&&e.call(g||b[v],b[v],v,b)}function y(b,e,g){function v(e,M){var J=b.removeEventListener||a.removeEventListenerPolyfill;J&&J.call(b,e,M,!1)}function c(J){var M;if(b.nodeName){if(e){var g={};g[e]=!0}else g=J;r(g,function(b,e){if(J[e])for(M=J[e].length;M--;)v(e,J[e][M].fn)})}}var k="function"===typeof b&&b.prototype||b;if(Object.hasOwnProperty.call(k,
"hcEvents")){var d=k.hcEvents;e?(k=d[e]||[],g?(d[e]=k.filter(function(b){return g!==b.fn}),v(e,g)):(c(d),d[e]=[])):(c(d),delete k.hcEvents)}}function B(b,e,g,d){g=g||{};if(k.createEvent&&(b.dispatchEvent||b.fireEvent&&b!==a)){var v=k.createEvent("Events");v.initEvent(e,!0,!0);g=c(v,g);b.dispatchEvent?b.dispatchEvent(g):b.fireEvent(e,g)}else if(b.hcEvents){g.target||c(g,{preventDefault:function(){g.defaultPrevented=!0},target:b,type:e});v=[];for(var n=b,p=!1;n.hcEvents;)Object.hasOwnProperty.call(n,
"hcEvents")&&n.hcEvents[e]&&(v.length&&(p=!0),v.unshift.apply(v,n.hcEvents[e])),n=Object.getPrototypeOf(n);p&&v.sort(function(b,e){return b.order-e.order});v.forEach(function(e){!1===e.fn.call(b,g)&&g.preventDefault()})}d&&!g.defaultPrevented&&d.call(b,g)}var n=a.charts,k=a.doc,b=a.win;(u||(u={})).messages=[];var g;Math.easeInOutSine=function(b){return-.5*(Math.cos(Math.PI*b)-1)};var e=Array.prototype.find?function(b,e){return b.find(e)}:function(b,e){var g,v=b.length;for(g=0;g<v;g++)if(e(b[g],g))return b[g]};
r({map:"map",each:"forEach",grep:"filter",reduce:"reduce",some:"some"},function(b,e){a[e]=function(g){var v;u(32,!1,void 0,(v={},v["Highcharts."+e]="use Array."+b,v));return Array.prototype[b].apply(g,[].slice.call(arguments,1))}});var D,H=function(){var b=Math.random().toString(36).substring(2,9)+"-",e=0;return function(){return"highcharts-"+(D?"":b)+e++}}();b.jQuery&&(b.jQuery.fn.highcharts=function(){var b=[].slice.call(arguments);if(this[0])return b[0]?(new (a[x(b[0])?b.shift():"Chart"])(this[0],
b[0],b[1]),this):n[d(this[0],"data-highcharts-chart")]});e={addEvent:function(b,e,g,c){void 0===c&&(c={});var v="function"===typeof b&&b.prototype||b;Object.hasOwnProperty.call(v,"hcEvents")||(v.hcEvents={});v=v.hcEvents;a.Point&&b instanceof a.Point&&b.series&&b.series.chart&&(b.series.chart.runTrackerClick=!0);var k=b.addEventListener||a.addEventListenerPolyfill;k&&k.call(b,e,g,a.supportsPassiveEvents?{passive:void 0===c.passive?-1!==e.indexOf("touch"):c.passive,capture:!1}:!1);v[e]||(v[e]=[]);
v[e].push({fn:g,order:"number"===typeof c.order?c.order:Infinity});v[e].sort(function(b,e){return b.order-e.order});return function(){y(b,e,g)}},arrayMax:function(b){for(var e=b.length,g=b[0];e--;)b[e]>g&&(g=b[e]);return g},arrayMin:function(b){for(var e=b.length,g=b[0];e--;)b[e]<g&&(g=b[e]);return g},attr:d,clamp:function(b,e,g){return b>e?b<g?b:g:e},cleanRecursively:A,clearTimeout:function(b){h(b)&&clearTimeout(b)},correctFloat:p,createElement:w,css:f,defined:h,destroyObjectProperties:function(b,
e){r(b,function(g,c){g&&g!==e&&g.destroy&&g.destroy();delete b[c]})},discardElement:function(b){g||(g=w("div"));b&&g.appendChild(b);g.innerHTML=""},erase:function(b,e){for(var g=b.length;g--;)if(b[g]===e){b.splice(g,1);break}},error:u,extend:c,extendClass:function(b,e){var g=function(){};g.prototype=new b;c(g.prototype,e);return g},find:e,fireEvent:B,getMagnitude:function(b){return Math.pow(10,Math.floor(Math.log(b)/Math.LN10))},getNestedProperty:function(e,g){for(e=e.split(".");e.length&&h(g);){var c=
e.shift();if("undefined"===typeof c||"__proto__"===c)return;g=g[c];if(!h(g)||"function"===typeof g||"number"===typeof g.nodeType||g===b)return}return g},getStyle:K,inArray:function(b,e,g){u(32,!1,void 0,{"Highcharts.inArray":"use Array.indexOf"});return e.indexOf(b,g)},isArray:C,isClass:q,isDOMElement:z,isFunction:function(b){return"function"===typeof b},isNumber:m,isObject:I,isString:x,keys:function(b){u(32,!1,void 0,{"Highcharts.keys":"use Object.keys"});return Object.keys(b)},merge:function(){var b,
e=arguments,g={},c=function(b,e){"object"!==typeof b&&(b={});r(e,function(J,g){"__proto__"!==g&&"constructor"!==g&&(!I(J,!0)||q(J)||z(J)?b[g]=e[g]:b[g]=c(b[g]||{},J))});return b};!0===e[0]&&(g=e[1],e=Array.prototype.slice.call(e,2));var k=e.length;for(b=0;b<k;b++)g=c(g,e[b]);return g},normalizeTickInterval:function(b,e,g,c,k){var d=b;g=l(g,1);var v=b/g;e||(e=k?[1,1.2,1.5,2,2.5,3,4,5,6,8,10]:[1,2,2.5,5,10],!1===c&&(1===g?e=e.filter(function(b){return 0===b%1}):.1>=g&&(e=[1/g])));for(c=0;c<e.length&&
!(d=e[c],k&&d*g>=b||!k&&v<=(e[c]+(e[c+1]||e[c]))/2);c++);return d=p(d*g,-Math.round(Math.log(.001)/Math.LN10))},objectEach:r,offset:function(e){var g=k.documentElement;e=e.parentElement||e.parentNode?e.getBoundingClientRect():{top:0,left:0,width:0,height:0};return{top:e.top+(b.pageYOffset||g.scrollTop)-(g.clientTop||0),left:e.left+(b.pageXOffset||g.scrollLeft)-(g.clientLeft||0),width:e.width,height:e.height}},pad:function(b,e,g){return Array((e||2)+1-String(b).replace("-","").length).join(g||"0")+
b},pick:l,pInt:G,relativeLength:function(b,e,g){return/%$/.test(b)?e*parseFloat(b)/100+(g||0):parseFloat(b)},removeEvent:y,splat:function(b){return C(b)?b:[b]},stableSort:function(b,e){var g=b.length,c,k;for(k=0;k<g;k++)b[k].safeI=k;b.sort(function(b,g){c=e(b,g);return 0===c?b.safeI-g.safeI:c});for(k=0;k<g;k++)delete b[k].safeI},syncTimeout:function(b,e,g){if(0<e)return setTimeout(b,e,g);b.call(0,g);return-1},timeUnits:{millisecond:1,second:1E3,minute:6E4,hour:36E5,day:864E5,week:6048E5,month:24192E5,
year:314496E5},uniqueKey:H,useSerialIds:function(b){return D=l(b,D)},wrap:function(b,e,g){var c=b[e];b[e]=function(){var b=Array.prototype.slice.call(arguments),e=arguments,k=this;k.proceed=function(){c.apply(k,arguments.length?arguments:e)};b.unshift(c);b=g.apply(this,b);k.proceed=null;return b}}};"";return e});L(a,"Core/Chart/ChartDefaults.js",[],function(){return{panning:{enabled:!1,type:"x"},styledMode:!1,borderRadius:0,colorCount:10,defaultSeriesType:"line",ignoreHiddenSeries:!0,spacing:[10,
10,15,10],resetZoomButton:{theme:{zIndex:6},position:{align:"right",x:-10,y:10}},zoomBySingleTouch:!1,width:null,height:null,borderColor:"#335cad",backgroundColor:"#ffffff",plotBorderColor:"#cccccc"}});L(a,"Core/Color/Color.js",[a["Core/Globals.js"],a["Core/Utilities.js"]],function(a,t){var u=t.isNumber,G=t.merge,x=t.pInt;t=function(){function t(u){this.rgba=[NaN,NaN,NaN,NaN];this.input=u;var z=a.Color;if(z&&z!==t)return new z(u);if(!(this instanceof t))return new t(u);this.init(u)}t.parse=function(a){return a?
new t(a):t.None};t.prototype.init=function(a){var z;if("object"===typeof a&&"undefined"!==typeof a.stops)this.stops=a.stops.map(function(d){return new t(d[1])});else if("string"===typeof a){this.input=a=t.names[a.toLowerCase()]||a;if("#"===a.charAt(0)){var q=a.length;var m=parseInt(a.substr(1),16);7===q?z=[(m&16711680)>>16,(m&65280)>>8,m&255,1]:4===q&&(z=[(m&3840)>>4|(m&3840)>>8,(m&240)>>4|m&240,(m&15)<<4|m&15,1])}if(!z)for(m=t.parsers.length;m--&&!z;){var h=t.parsers[m];(q=h.regex.exec(a))&&(z=h.parse(q))}}z&&
(this.rgba=z)};t.prototype.get=function(a){var z=this.input,q=this.rgba;if("object"===typeof z&&"undefined"!==typeof this.stops){var m=G(z);m.stops=[].slice.call(m.stops);this.stops.forEach(function(h,d){m.stops[d]=[m.stops[d][0],h.get(a)]});return m}return q&&u(q[0])?"rgb"===a||!a&&1===q[3]?"rgb("+q[0]+","+q[1]+","+q[2]+")":"a"===a?""+q[3]:"rgba("+q.join(",")+")":z};t.prototype.brighten=function(a){var z=this.rgba;if(this.stops)this.stops.forEach(function(m){m.brighten(a)});else if(u(a)&&0!==a)for(var q=
0;3>q;q++)z[q]+=x(255*a),0>z[q]&&(z[q]=0),255<z[q]&&(z[q]=255);return this};t.prototype.setOpacity=function(a){this.rgba[3]=a;return this};t.prototype.tweenTo=function(a,z){var q=this.rgba,m=a.rgba;if(!u(q[0])||!u(m[0]))return a.input||"none";a=1!==m[3]||1!==q[3];return(a?"rgba(":"rgb(")+Math.round(m[0]+(q[0]-m[0])*(1-z))+","+Math.round(m[1]+(q[1]-m[1])*(1-z))+","+Math.round(m[2]+(q[2]-m[2])*(1-z))+(a?","+(m[3]+(q[3]-m[3])*(1-z)):"")+")"};t.names={white:"#ffffff",black:"#000000"};t.parsers=[{regex:/rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]?(?:\.[0-9]+)?)\s*\)/,
parse:function(a){return[x(a[1]),x(a[2]),x(a[3]),parseFloat(a[4],10)]}},{regex:/rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/,parse:function(a){return[x(a[1]),x(a[2]),x(a[3]),1]}}];t.None=new t("");return t}();"";return t});L(a,"Core/Color/Palettes.js",[],function(){return{colors:"#7cb5ec #434348 #90ed7d #f7a35c #8085e9 #f15c80 #e4d354 #2b908f #f45b5b #91e8e1".split(" ")}});L(a,"Core/Time.js",[a["Core/Globals.js"],a["Core/Utilities.js"]],function(a,t){var u=a.win,G=t.defined,x=
t.error,C=t.extend,I=t.isObject,z=t.merge,q=t.objectEach,m=t.pad,h=t.pick,d=t.splat,c=t.timeUnits,l=a.isSafari&&u.Intl&&u.Intl.DateTimeFormat.prototype.formatRange,f=a.isSafari&&u.Intl&&!u.Intl.DateTimeFormat.prototype.formatRange;t=function(){function w(c){this.options={};this.variableTimezone=this.useUTC=!1;this.Date=u.Date;this.getTimezoneOffset=this.timezoneOffsetFunction();this.update(c)}w.prototype.get=function(c,d){if(this.variableTimezone||this.timezoneOffset){var p=d.getTime(),l=p-this.getTimezoneOffset(d);
d.setTime(l);c=d["getUTC"+c]();d.setTime(p);return c}return this.useUTC?d["getUTC"+c]():d["get"+c]()};w.prototype.set=function(c,d,r){if(this.variableTimezone||this.timezoneOffset){if("Milliseconds"===c||"Seconds"===c||"Minutes"===c&&0===this.getTimezoneOffset(d)%36E5)return d["setUTC"+c](r);var p=this.getTimezoneOffset(d);p=d.getTime()-p;d.setTime(p);d["setUTC"+c](r);c=this.getTimezoneOffset(d);p=d.getTime()+c;return d.setTime(p)}return this.useUTC||l&&"FullYear"===c?d["setUTC"+c](r):d["set"+c](r)};
w.prototype.update=function(c){var d=h(c&&c.useUTC,!0);this.options=c=z(!0,this.options||{},c);this.Date=c.Date||u.Date||Date;this.timezoneOffset=(this.useUTC=d)&&c.timezoneOffset;this.getTimezoneOffset=this.timezoneOffsetFunction();this.variableTimezone=d&&!(!c.getTimezoneOffset&&!c.timezone)};w.prototype.makeTime=function(c,d,r,l,B,n){if(this.useUTC){var k=this.Date.UTC.apply(0,arguments);var b=this.getTimezoneOffset(k);k+=b;var g=this.getTimezoneOffset(k);b!==g?k+=g-b:b-36E5!==this.getTimezoneOffset(k-
36E5)||f||(k-=36E5)}else k=(new this.Date(c,d,h(r,1),h(l,0),h(B,0),h(n,0))).getTime();return k};w.prototype.timezoneOffsetFunction=function(){var c=this,d=this.options,r=d.moment||u.moment;if(!this.useUTC)return function(c){return 6E4*(new Date(c.toString())).getTimezoneOffset()};if(d.timezone){if(r)return function(c){return 6E4*-r.tz(c,d.timezone).utcOffset()};x(25)}return this.useUTC&&d.getTimezoneOffset?function(c){return 6E4*d.getTimezoneOffset(c.valueOf())}:function(){return 6E4*(c.timezoneOffset||
0)}};w.prototype.dateFormat=function(c,d,r){if(!G(d)||isNaN(d))return a.defaultOptions.lang&&a.defaultOptions.lang.invalidDate||"";c=h(c,"%Y-%m-%d %H:%M:%S");var p=this,l=new this.Date(d),n=this.get("Hours",l),k=this.get("Day",l),b=this.get("Date",l),g=this.get("Month",l),e=this.get("FullYear",l),D=a.defaultOptions.lang,f=D&&D.weekdays,v=D&&D.shortWeekdays;l=C({a:v?v[k]:f[k].substr(0,3),A:f[k],d:m(b),e:m(b,2," "),w:k,b:D.shortMonths[g],B:D.months[g],m:m(g+1),o:g+1,y:e.toString().substr(2,2),Y:e,H:m(n),
k:n,I:m(n%12||12),l:n%12||12,M:m(this.get("Minutes",l)),p:12>n?"AM":"PM",P:12>n?"am":"pm",S:m(l.getSeconds()),L:m(Math.floor(d%1E3),3)},a.dateFormats);q(l,function(b,e){for(;-1!==c.indexOf("%"+e);)c=c.replace("%"+e,"function"===typeof b?b.call(p,d):b)});return r?c.substr(0,1).toUpperCase()+c.substr(1):c};w.prototype.resolveDTLFormat=function(c){return I(c,!0)?c:(c=d(c),{main:c[0],from:c[1],to:c[2]})};w.prototype.getTimeTicks=function(d,l,r,f){var p=this,n=[],k={},b=new p.Date(l),g=d.unitRange,e=d.count||
1,D;f=h(f,1);if(G(l)){p.set("Milliseconds",b,g>=c.second?0:e*Math.floor(p.get("Milliseconds",b)/e));g>=c.second&&p.set("Seconds",b,g>=c.minute?0:e*Math.floor(p.get("Seconds",b)/e));g>=c.minute&&p.set("Minutes",b,g>=c.hour?0:e*Math.floor(p.get("Minutes",b)/e));g>=c.hour&&p.set("Hours",b,g>=c.day?0:e*Math.floor(p.get("Hours",b)/e));g>=c.day&&p.set("Date",b,g>=c.month?1:Math.max(1,e*Math.floor(p.get("Date",b)/e)));if(g>=c.month){p.set("Month",b,g>=c.year?0:e*Math.floor(p.get("Month",b)/e));var H=p.get("FullYear",
b)}g>=c.year&&p.set("FullYear",b,H-H%e);g===c.week&&(H=p.get("Day",b),p.set("Date",b,p.get("Date",b)-H+f+(H<f?-7:0)));H=p.get("FullYear",b);f=p.get("Month",b);var v=p.get("Date",b),w=p.get("Hours",b);l=b.getTime();!p.variableTimezone&&p.useUTC||!G(r)||(D=r-l>4*c.month||p.getTimezoneOffset(l)!==p.getTimezoneOffset(r));l=b.getTime();for(b=1;l<r;)n.push(l),l=g===c.year?p.makeTime(H+b*e,0):g===c.month?p.makeTime(H,f+b*e):!D||g!==c.day&&g!==c.week?D&&g===c.hour&&1<e?p.makeTime(H,f,v,w+b*e):l+g*e:p.makeTime(H,
f,v+b*e*(g===c.day?1:7)),b++;n.push(l);g<=c.hour&&1E4>n.length&&n.forEach(function(b){0===b%18E5&&"000000000"===p.dateFormat("%H%M%S%L",b)&&(k[b]="day")})}n.info=C(d,{higherRanks:k,totalRange:g*e});return n};w.prototype.getDateFormat=function(d,l,f,h){var p=this.dateFormat("%m-%d %H:%M:%S.%L",l),n={millisecond:15,second:12,minute:9,hour:6,day:3},k="millisecond";for(b in c){if(d===c.week&&+this.dateFormat("%w",l)===f&&"00:00:00.000"===p.substr(6)){var b="week";break}if(c[b]>d){b=k;break}if(n[b]&&p.substr(n[b])!==
"01-01 00:00:00.000".substr(n[b]))break;"week"!==b&&(k=b)}if(b)var g=this.resolveDTLFormat(h[b]).main;return g};return w}();"";return t});L(a,"Core/DefaultOptions.js",[a["Core/Chart/ChartDefaults.js"],a["Core/Color/Color.js"],a["Core/Globals.js"],a["Core/Color/Palettes.js"],a["Core/Time.js"],a["Core/Utilities.js"]],function(a,t,A,G,x,C){t=t.parse;var u=C.merge,z={colors:G.colors,symbols:["circle","diamond","square","triangle","triangle-down"],lang:{loading:"Loading...",months:"January February March April May June July August September October November December".split(" "),
shortMonths:"Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" "),weekdays:"Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),decimalPoint:".",numericSymbols:"kMGTPE".split(""),resetZoom:"Reset zoom",resetZoomTitle:"Reset zoom level 1:1",thousandsSep:" "},global:{},time:{Date:void 0,getTimezoneOffset:void 0,timezone:void 0,timezoneOffset:0,useUTC:!0},chart:a,title:{text:"Chart title",align:"center",margin:15,widthAdjust:-44},subtitle:{text:"",align:"center",widthAdjust:-44},
caption:{margin:15,text:"",align:"left",verticalAlign:"bottom"},plotOptions:{},labels:{style:{position:"absolute",color:"#333333"}},legend:{enabled:!0,align:"center",alignColumns:!0,className:"highcharts-no-tooltip",layout:"horizontal",labelFormatter:function(){return this.name},borderColor:"#999999",borderRadius:0,navigation:{activeColor:"#003399",inactiveColor:"#cccccc"},itemStyle:{color:"#333333",cursor:"pointer",fontSize:"12px",fontWeight:"bold",textOverflow:"ellipsis"},itemHoverStyle:{color:"#000000"},
itemHiddenStyle:{color:"#cccccc"},shadow:!1,itemCheckboxStyle:{position:"absolute",width:"13px",height:"13px"},squareSymbol:!0,symbolPadding:5,verticalAlign:"bottom",x:0,y:0,title:{style:{fontWeight:"bold"}}},loading:{labelStyle:{fontWeight:"bold",position:"relative",top:"45%"},style:{position:"absolute",backgroundColor:"#ffffff",opacity:.5,textAlign:"center"}},tooltip:{enabled:!0,animation:A.svg,borderRadius:3,dateTimeLabelFormats:{millisecond:"%A, %b %e, %H:%M:%S.%L",second:"%A, %b %e, %H:%M:%S",
minute:"%A, %b %e, %H:%M",hour:"%A, %b %e, %H:%M",day:"%A, %b %e, %Y",week:"Week from %A, %b %e, %Y",month:"%B %Y",year:"%Y"},footerFormat:"",headerShape:"callout",hideDelay:500,padding:8,shape:"callout",shared:!1,snap:A.isTouchDevice?25:10,headerFormat:'<span style="font-size: 10px">{point.key}</span><br/>',pointFormat:'<span style="color:{point.color}">\u25cf</span> {series.name}: <b>{point.y}</b><br/>',backgroundColor:t("#f7f7f7").setOpacity(.85).get(),borderWidth:1,shadow:!0,stickOnContact:!1,
style:{color:"#333333",cursor:"default",fontSize:"12px",whiteSpace:"nowrap"},useHTML:!1},credits:{enabled:!0,href:"https://www.highcharts.com?credits",position:{align:"right",x:-10,verticalAlign:"bottom",y:-5},style:{cursor:"pointer",color:"#999999",fontSize:"9px"},text:"Highcharts.com"}};z.chart.styledMode=!1;"";var q=new x(u(z.global,z.time));a={defaultOptions:z,defaultTime:q,getOptions:function(){return z},setOptions:function(m){u(!0,z,m);if(m.time||m.global)A.time?A.time.update(u(z.global,z.time,
m.global,m.time)):A.time=q;return z}};"";return a});L(a,"Core/Animation/Fx.js",[a["Core/Color/Color.js"],a["Core/Globals.js"],a["Core/Utilities.js"]],function(a,t,A){var u=a.parse,x=t.win,C=A.isNumber,I=A.objectEach;return function(){function a(a,m,h){this.pos=NaN;this.options=m;this.elem=a;this.prop=h}a.prototype.dSetter=function(){var a=this.paths,m=a&&a[0];a=a&&a[1];var h=this.now||0,d=[];if(1!==h&&m&&a)if(m.length===a.length&&1>h)for(var c=0;c<a.length;c++){for(var l=m[c],f=a[c],w=[],p=0;p<f.length;p++){var K=
l[p],r=f[p];C(K)&&C(r)&&("A"!==f[0]||4!==p&&5!==p)?w[p]=K+h*(r-K):w[p]=r}d.push(w)}else d=a;else d=this.toD||[];this.elem.attr("d",d,void 0,!0)};a.prototype.update=function(){var a=this.elem,m=this.prop,h=this.now,d=this.options.step;if(this[m+"Setter"])this[m+"Setter"]();else a.attr?a.element&&a.attr(m,h,null,!0):a.style[m]=h+this.unit;d&&d.call(a,h,this)};a.prototype.run=function(q,m,h){var d=this,c=d.options,l=function(c){return l.stopped?!1:d.step(c)},f=x.requestAnimationFrame||function(c){setTimeout(c,
13)},w=function(){for(var c=0;c<a.timers.length;c++)a.timers[c]()||a.timers.splice(c--,1);a.timers.length&&f(w)};q!==m||this.elem["forceAnimate:"+this.prop]?(this.startTime=+new Date,this.start=q,this.end=m,this.unit=h,this.now=this.start,this.pos=0,l.elem=this.elem,l.prop=this.prop,l()&&1===a.timers.push(l)&&f(w)):(delete c.curAnim[this.prop],c.complete&&0===Object.keys(c.curAnim).length&&c.complete.call(this.elem))};a.prototype.step=function(a){var m=+new Date,h=this.options,d=this.elem,c=h.complete,
l=h.duration,f=h.curAnim;if(d.attr&&!d.element)a=!1;else if(a||m>=l+this.startTime){this.now=this.end;this.pos=1;this.update();var w=f[this.prop]=!0;I(f,function(c){!0!==c&&(w=!1)});w&&c&&c.call(d);a=!1}else this.pos=h.easing((m-this.startTime)/l),this.now=this.start+(this.end-this.start)*this.pos,this.update(),a=!0;return a};a.prototype.initPath=function(a,m,h){function d(c,d){for(;c.length<y;){var k=c[0],b=d[y-c.length];b&&"M"===k[0]&&(c[0]="C"===b[0]?["C",k[1],k[2],k[1],k[2],k[1],k[2]]:["L",k[1],
k[2]]);c.unshift(k);w&&(k=c.pop(),c.push(c[c.length-1],k))}}function c(c,d){for(;c.length<y;)if(d=c[Math.floor(c.length/p)-1].slice(),"C"===d[0]&&(d[1]=d[5],d[2]=d[6]),w){var k=c[Math.floor(c.length/p)].slice();c.splice(c.length/2,0,d,k)}else c.push(d)}var l=a.startX,f=a.endX;h=h.slice();var w=a.isArea,p=w?2:1;m=m&&m.slice();if(!m)return[h,h];if(l&&f&&f.length){for(a=0;a<l.length;a++)if(l[a]===f[0]){var K=a;break}else if(l[0]===f[f.length-l.length+a]){K=a;var r=!0;break}else if(l[l.length-1]===f[f.length-
l.length+a]){K=l.length-a;break}"undefined"===typeof K&&(m=[])}if(m.length&&C(K)){var y=h.length+K*p;r?(d(m,h),c(h,m)):(d(h,m),c(m,h))}return[m,h]};a.prototype.fillSetter=function(){a.prototype.strokeSetter.apply(this,arguments)};a.prototype.strokeSetter=function(){this.elem.attr(this.prop,u(this.start).tweenTo(u(this.end),this.pos),null,!0)};a.timers=[];return a}()});L(a,"Core/Animation/AnimationUtilities.js",[a["Core/Animation/Fx.js"],a["Core/Utilities.js"]],function(a,t){function u(c){return q(c)?
m({duration:500,defer:0},c):{duration:c?500:0,defer:0}}function G(c,d){for(var l=a.timers.length;l--;)a.timers[l].elem!==c||d&&d!==a.timers[l].prop||(a.timers[l].stopped=!0)}var x=t.defined,C=t.getStyle,I=t.isArray,z=t.isNumber,q=t.isObject,m=t.merge,h=t.objectEach,d=t.pick;return{animate:function(c,d,f){var l,p="",K,r;if(!q(f)){var y=arguments;f={duration:y[2],easing:y[3],complete:y[4]}}z(f.duration)||(f.duration=400);f.easing="function"===typeof f.easing?f.easing:Math[f.easing]||Math.easeInOutSine;
f.curAnim=m(d);h(d,function(h,n){G(c,n);r=new a(c,f,n);K=void 0;"d"===n&&I(d.d)?(r.paths=r.initPath(c,c.pathArray,d.d),r.toD=d.d,l=0,K=1):c.attr?l=c.attr(n):(l=parseFloat(C(c,n))||0,"opacity"!==n&&(p="px"));K||(K=h);"string"===typeof K&&K.match("px")&&(K=K.replace(/px/g,""));r.run(l,K,p)})},animObject:u,getDeferredAnimation:function(c,d,f){var l=u(d),p=0,a=0;(f?[f]:c.series).forEach(function(c){c=u(c.options.animation);p=d&&x(d.defer)?l.defer:Math.max(p,c.duration+c.defer);a=Math.min(l.duration,c.duration)});
c.renderer.forExport&&(p=0);return{defer:Math.max(0,p-a),duration:Math.min(p,a)}},setAnimation:function(c,l){l.renderer.globalAnimation=d(c,l.options.chart.animation,!0)},stop:G}});L(a,"Core/Renderer/HTML/AST.js",[a["Core/Globals.js"],a["Core/Utilities.js"]],function(a,t){var u=a.SVG_NS,G=t.attr,x=t.createElement,C=t.discardElement,I=t.error,z=t.isString,q=t.objectEach,m=t.splat;try{var h=!!(new DOMParser).parseFromString("","text/html")}catch(d){h=!1}t=function(){function d(c){this.nodes="string"===
typeof c?this.parseMarkup(c):c}d.filterUserAttributes=function(c){q(c,function(l,f){var a=!0;-1===d.allowedAttributes.indexOf(f)&&(a=!1);-1!==["background","dynsrc","href","lowsrc","src"].indexOf(f)&&(a=z(l)&&d.allowedReferences.some(function(c){return 0===l.indexOf(c)}));a||(I("Highcharts warning: Invalid attribute '"+f+"' in config"),delete c[f])});return c};d.setElementHTML=function(c,l){c.innerHTML="";l&&(new d(l)).addToDOM(c)};d.prototype.addToDOM=function(c){function l(c,h){var p;m(c).forEach(function(c){var f=
c.tagName,w=c.textContent?a.doc.createTextNode(c.textContent):void 0;if(f)if("#text"===f)var m=w;else if(-1!==d.allowedTags.indexOf(f)){f=a.doc.createElementNS("svg"===f?u:h.namespaceURI||u,f);var n=c.attributes||{};q(c,function(c,b){"tagName"!==b&&"attributes"!==b&&"children"!==b&&"textContent"!==b&&(n[b]=c)});G(f,d.filterUserAttributes(n));w&&f.appendChild(w);l(c.children||[],f);m=f}else I("Highcharts warning: Invalid tagName '"+f+"' in config");m&&h.appendChild(m);p=m});return p}return l(this.nodes,
c)};d.prototype.parseMarkup=function(c){var d=[];c=c.trim();if(h)c=(new DOMParser).parseFromString(c,"text/html");else{var f=x("div");f.innerHTML=c;c={body:f}}var a=function(c,d){var l=c.nodeName.toLowerCase(),p={tagName:l};"#text"===l&&(p.textContent=c.textContent||"");if(l=c.attributes){var f={};[].forEach.call(l,function(c){f[c.name]=c.value});p.attributes=f}if(c.childNodes.length){var n=[];[].forEach.call(c.childNodes,function(c){a(c,n)});n.length&&(p.children=n)}d.push(p)};[].forEach.call(c.body.childNodes,
function(c){return a(c,d)});f&&C(f);return d};d.allowedAttributes="aria-controls aria-describedby aria-expanded aria-haspopup aria-hidden aria-label aria-labelledby aria-live aria-pressed aria-readonly aria-roledescription aria-selected class clip-path color colspan cx cy d dx dy disabled fill height href id in markerHeight markerWidth offset opacity orient padding paddingLeft paddingRight patternUnits r refX refY role scope slope src startOffset stdDeviation stroke stroke-linecap stroke-width style tableValues result rowspan summary target tabindex text-align textAnchor textLength title type valign width x x1 x2 y y1 y2 zIndex".split(" ");
d.allowedReferences="https:// http:// mailto: / ../ ./ #".split(" ");d.allowedTags="a abbr b br button caption circle clipPath code dd defs div dl dt em feComponentTransfer feFuncA feFuncB feFuncG feFuncR feGaussianBlur feOffset feMerge feMergeNode filter h1 h2 h3 h4 h5 h6 hr i img li linearGradient marker ol p path pattern pre rect small span stop strong style sub sup svg table text thead tbody tspan td th tr u ul #text".split(" ");return d}();"";return t});L(a,"Core/FormatUtilities.js",[a["Core/DefaultOptions.js"],
a["Core/Utilities.js"]],function(a,t){function u(a,h,d,c){a=+a||0;h=+h;var l=G.lang,f=(a.toString().split(".")[1]||"").split("e")[0].length,w=a.toString().split("e"),p=h;if(-1===h)h=Math.min(f,20);else if(!I(h))h=2;else if(h&&w[1]&&0>w[1]){var m=h+ +w[1];0<=m?(w[0]=(+w[0]).toExponential(m).split("e")[0],h=m):(w[0]=w[0].split(".")[0]||0,a=20>h?(w[0]*Math.pow(10,w[1])).toFixed(h):0,w[1]=0)}m=(Math.abs(w[1]?w[0]:a)+Math.pow(10,-Math.max(h,f)-1)).toFixed(h);f=String(q(m));var r=3<f.length?f.length%3:
0;d=z(d,l.decimalPoint);c=z(c,l.thousandsSep);a=(0>a?"-":"")+(r?f.substr(0,r)+c:"");a=0>+w[1]&&!p?"0":a+f.substr(r).replace(/(\d{3})(?=\d)/g,"$1"+c);h&&(a+=d+m.slice(-h));w[1]&&0!==+a&&(a+="e"+w[1]);return a}var G=a.defaultOptions,x=a.defaultTime,C=t.getNestedProperty,I=t.isNumber,z=t.pick,q=t.pInt;return{dateFormat:function(a,h,d){return x.dateFormat(a,h,d)},format:function(a,h,d){var c="{",l=!1,f=/f$/,w=/\.([0-9])/,p=G.lang,m=d&&d.time||x;d=d&&d.numberFormatter||u;for(var r=[];a;){var y=a.indexOf(c);
if(-1===y)break;var B=a.slice(0,y);if(l){B=B.split(":");c=C(B.shift()||"",h);if(B.length&&"number"===typeof c)if(B=B.join(":"),f.test(B)){var n=parseInt((B.match(w)||["","-1"])[1],10);null!==c&&(c=d(c,n,p.decimalPoint,-1<B.indexOf(",")?p.thousandsSep:""))}else c=m.dateFormat(B,c);r.push(c)}else r.push(B);a=a.slice(y+1);c=(l=!l)?"}":"{"}r.push(a);return r.join("")},numberFormat:u}});L(a,"Core/Renderer/RendererUtilities.js",[a["Core/Utilities.js"]],function(a){var u=a.clamp,A=a.pick,G=a.stableSort,
x;(function(a){function t(a,q,m){var h=a,d=h.reducedLen||q,c=function(c,d){return(d.rank||0)-(c.rank||0)},l=function(c,d){return c.target-d.target},f,w=!0,p=[],K=0;for(f=a.length;f--;)K+=a[f].size;if(K>d){G(a,c);for(K=f=0;K<=d;)K+=a[f].size,f++;p=a.splice(f-1,a.length)}G(a,l);for(a=a.map(function(c){return{size:c.size,targets:[c.target],align:A(c.align,.5)}});w;){for(f=a.length;f--;)d=a[f],c=(Math.min.apply(0,d.targets)+Math.max.apply(0,d.targets))/2,d.pos=u(c-d.size*d.align,0,q-d.size);f=a.length;
for(w=!1;f--;)0<f&&a[f-1].pos+a[f-1].size>a[f].pos&&(a[f-1].size+=a[f].size,a[f-1].targets=a[f-1].targets.concat(a[f].targets),a[f-1].align=.5,a[f-1].pos+a[f-1].size>q&&(a[f-1].pos=q-a[f-1].size),a.splice(f,1),w=!0)}h.push.apply(h,p);f=0;a.some(function(c){var d=0;return(c.targets||[]).some(function(){h[f].pos=c.pos+d;if("undefined"!==typeof m&&Math.abs(h[f].pos-h[f].target)>m)return h.slice(0,f+1).forEach(function(c){return delete c.pos}),h.reducedLen=(h.reducedLen||q)-.1*q,h.reducedLen>.1*q&&t(h,
q,m),!0;d+=h[f].size;f++;return!1})});G(h,l);return h}a.distribute=t})(x||(x={}));return x});L(a,"Core/Renderer/SVG/SVGElement.js",[a["Core/Animation/AnimationUtilities.js"],a["Core/Renderer/HTML/AST.js"],a["Core/Color/Color.js"],a["Core/Globals.js"],a["Core/Utilities.js"]],function(a,t,A,G,x){var u=a.animate,I=a.animObject,z=a.stop,q=G.deg2rad,m=G.doc,h=G.noop,d=G.svg,c=G.SVG_NS,l=G.win,f=x.addEvent,w=x.attr,p=x.createElement,K=x.css,r=x.defined,y=x.erase,B=x.extend,n=x.fireEvent,k=x.isArray,b=x.isFunction,
g=x.isNumber,e=x.isString,D=x.merge,H=x.objectEach,v=x.pick,E=x.pInt,O=x.syncTimeout,S=x.uniqueKey;a=function(){function a(){this.element=void 0;this.onEvents={};this.opacity=1;this.renderer=void 0;this.SVG_NS=c;this.symbolCustomAttribs="x y width height r start end innerR anchorX anchorY rounded".split(" ")}a.prototype._defaultGetter=function(b){b=v(this[b+"Value"],this[b],this.element?this.element.getAttribute(b):null,0);/^[\-0-9\.]+$/.test(b)&&(b=parseFloat(b));return b};a.prototype._defaultSetter=
function(b,e,c){c.setAttribute(e,b)};a.prototype.add=function(b){var e=this.renderer,c=this.element;b&&(this.parentGroup=b);this.parentInverted=b&&b.inverted;"undefined"!==typeof this.textStr&&"text"===this.element.nodeName&&e.buildText(this);this.added=!0;if(!b||b.handleZ||this.zIndex)var g=this.zIndexSetter();g||(b?b.element:e.box).appendChild(c);if(this.onAdd)this.onAdd();return this};a.prototype.addClass=function(b,e){var c=e?"":this.attr("class")||"";b=(b||"").split(/ /g).reduce(function(b,e){-1===
c.indexOf(e)&&b.push(e);return b},c?[c]:[]).join(" ");b!==c&&this.attr("class",b);return this};a.prototype.afterSetters=function(){this.doTransform&&(this.updateTransform(),this.doTransform=!1)};a.prototype.align=function(b,c,g){var J={},d=this.renderer,a=d.alignedObjects,k,n,F;if(b){if(this.alignOptions=b,this.alignByTranslate=c,!g||e(g))this.alignTo=k=g||"renderer",y(a,this),a.push(this),g=void 0}else b=this.alignOptions,c=this.alignByTranslate,k=this.alignTo;g=v(g,d[k],"scrollablePlotBox"===k?
d.plotBox:void 0,d);k=b.align;var D=b.verticalAlign;d=(g.x||0)+(b.x||0);a=(g.y||0)+(b.y||0);"right"===k?n=1:"center"===k&&(n=2);n&&(d+=(g.width-(b.width||0))/n);J[c?"translateX":"x"]=Math.round(d);"bottom"===D?F=1:"middle"===D&&(F=2);F&&(a+=(g.height-(b.height||0))/F);J[c?"translateY":"y"]=Math.round(a);this[this.placed?"animate":"attr"](J);this.placed=!0;this.alignAttr=J;return this};a.prototype.alignSetter=function(b){var e={left:"start",center:"middle",right:"end"};e[b]&&(this.alignValue=b,this.element.setAttribute("text-anchor",
e[b]))};a.prototype.animate=function(b,e,c){var g=this,J=I(v(e,this.renderer.globalAnimation,!0));e=J.defer;v(m.hidden,m.msHidden,m.webkitHidden,!1)&&(J.duration=0);0!==J.duration?(c&&(J.complete=c),O(function(){g.element&&u(g,b,J)},e)):(this.attr(b,void 0,c),H(b,function(b,e){J.step&&J.step.call(this,b,{prop:e,pos:1,elem:this})},this));return this};a.prototype.applyTextOutline=function(b){var e=this.element;-1!==b.indexOf("contrast")&&(b=b.replace(/contrast/g,this.renderer.getContrast(e.style.fill)));
var g=b.split(" ");b=g[g.length-1];if((g=g[0])&&"none"!==g&&G.svg){this.fakeTS=!0;this.ySetter=this.xSetter;g=g.replace(/(^[\d\.]+)(.*?)$/g,function(b,e,c){return 2*Number(e)+c});this.removeTextOutline();var d=m.createElementNS(c,"tspan");w(d,{"class":"highcharts-text-outline",fill:b,stroke:b,"stroke-width":g,"stroke-linejoin":"round"});[].forEach.call(e.childNodes,function(b){var e=b.cloneNode(!0);e.removeAttribute&&["fill","stroke","stroke-width","stroke"].forEach(function(b){return e.removeAttribute(b)});
d.appendChild(e)});var a=m.createElementNS(c,"tspan");a.textContent="\u200b";["x","y"].forEach(function(b){var c=e.getAttribute(b);c&&a.setAttribute(b,c)});d.appendChild(a);e.insertBefore(d,e.firstChild)}};a.prototype.attr=function(b,e,c,g){var d=this.element,J=this.symbolCustomAttribs,a,M=this,F,k;if("string"===typeof b&&"undefined"!==typeof e){var n=b;b={};b[n]=e}"string"===typeof b?M=(this[b+"Getter"]||this._defaultGetter).call(this,b,d):(H(b,function(e,c){F=!1;g||z(this,c);this.symbolName&&-1!==
J.indexOf(c)&&(a||(this.symbolAttr(b),a=!0),F=!0);!this.rotation||"x"!==c&&"y"!==c||(this.doTransform=!0);F||(k=this[c+"Setter"]||this._defaultSetter,k.call(this,e,c,d),!this.styledMode&&this.shadows&&/^(width|height|visibility|x|y|d|transform|cx|cy|r)$/.test(c)&&this.updateShadows(c,e,k))},this),this.afterSetters());c&&c.call(this);return M};a.prototype.clip=function(b){return this.attr("clip-path",b?"url("+this.renderer.url+"#"+b.id+")":"none")};a.prototype.crisp=function(b,e){e=e||b.strokeWidth||
0;var c=Math.round(e)%2/2;b.x=Math.floor(b.x||this.x||0)+c;b.y=Math.floor(b.y||this.y||0)+c;b.width=Math.floor((b.width||this.width||0)-2*c);b.height=Math.floor((b.height||this.height||0)-2*c);r(b.strokeWidth)&&(b.strokeWidth=e);return b};a.prototype.complexColor=function(b,e,c){var g=this.renderer,d,J,a,v,F,l,p,f,h,w,E=[],m;n(this.renderer,"complexColor",{args:arguments},function(){b.radialGradient?J="radialGradient":b.linearGradient&&(J="linearGradient");if(J){a=b[J];F=g.gradients;l=b.stops;h=c.radialReference;
k(a)&&(b[J]=a={x1:a[0],y1:a[1],x2:a[2],y2:a[3],gradientUnits:"userSpaceOnUse"});"radialGradient"===J&&h&&!r(a.gradientUnits)&&(v=a,a=D(a,g.getRadialAttr(h,v),{gradientUnits:"userSpaceOnUse"}));H(a,function(b,e){"id"!==e&&E.push(e,b)});H(l,function(b){E.push(b)});E=E.join(",");if(F[E])w=F[E].attr("id");else{a.id=w=S();var M=F[E]=g.createElement(J).attr(a).add(g.defs);M.radAttr=v;M.stops=[];l.forEach(function(b){0===b[1].indexOf("rgba")?(d=A.parse(b[1]),p=d.get("rgb"),f=d.get("a")):(p=b[1],f=1);b=g.createElement("stop").attr({offset:b[0],
"stop-color":p,"stop-opacity":f}).add(M);M.stops.push(b)})}m="url("+g.url+"#"+w+")";c.setAttribute(e,m);c.gradient=E;b.toString=function(){return m}}})};a.prototype.css=function(b){var e=this.styles,c={},g=this.element,a=["textOutline","textOverflow","width"],k="",n=!e;b&&b.color&&(b.fill=b.color);e&&H(b,function(b,g){e&&e[g]!==b&&(c[g]=b,n=!0)});if(n){e&&(b=B(e,c));if(b)if(null===b.width||"auto"===b.width)delete this.textWidth;else if("text"===g.nodeName.toLowerCase()&&b.width)var v=this.textWidth=
E(b.width);this.styles=b;v&&!d&&this.renderer.forExport&&delete b.width;if(g.namespaceURI===this.SVG_NS){var F=function(b,e){return"-"+e.toLowerCase()};H(b,function(b,e){-1===a.indexOf(e)&&(k+=e.replace(/([A-Z])/g,F)+":"+b+";")});k&&w(g,"style",k)}else K(g,b);this.added&&("text"===this.element.nodeName&&this.renderer.buildText(this),b&&b.textOutline&&this.applyTextOutline(b.textOutline))}return this};a.prototype.dashstyleSetter=function(b){var e=this["stroke-width"];"inherit"===e&&(e=1);if(b=b&&b.toLowerCase()){var c=
b.replace("shortdashdotdot","3,1,1,1,1,1,").replace("shortdashdot","3,1,1,1").replace("shortdot","1,1,").replace("shortdash","3,1,").replace("longdash","8,3,").replace(/dot/g,"1,3,").replace("dash","4,3,").replace(/,$/,"").split(",");for(b=c.length;b--;)c[b]=""+E(c[b])*v(e,NaN);b=c.join(",").replace(/NaN/g,"none");this.element.setAttribute("stroke-dasharray",b)}};a.prototype.destroy=function(){var b=this,e=b.element||{},c=b.renderer,g=e.ownerSVGElement,d=c.isSVG&&"SPAN"===e.nodeName&&b.parentGroup||
void 0;e.onclick=e.onmouseout=e.onmouseover=e.onmousemove=e.point=null;z(b);if(b.clipPath&&g){var a=b.clipPath;[].forEach.call(g.querySelectorAll("[clip-path],[CLIP-PATH]"),function(b){-1<b.getAttribute("clip-path").indexOf(a.element.id)&&b.removeAttribute("clip-path")});b.clipPath=a.destroy()}if(b.stops){for(g=0;g<b.stops.length;g++)b.stops[g].destroy();b.stops.length=0;b.stops=void 0}b.safeRemoveChild(e);for(c.styledMode||b.destroyShadows();d&&d.div&&0===d.div.childNodes.length;)e=d.parentGroup,
b.safeRemoveChild(d.div),delete d.div,d=e;b.alignTo&&y(c.alignedObjects,b);H(b,function(e,c){b[c]&&b[c].parentGroup===b&&b[c].destroy&&b[c].destroy();delete b[c]})};a.prototype.destroyShadows=function(){(this.shadows||[]).forEach(function(b){this.safeRemoveChild(b)},this);this.shadows=void 0};a.prototype.destroyTextPath=function(b,e){var c=b.getElementsByTagName("text")[0];if(c){if(c.removeAttribute("dx"),c.removeAttribute("dy"),e.element.setAttribute("id",""),this.textPathWrapper&&c.getElementsByTagName("textPath").length){for(b=
this.textPathWrapper.element.childNodes;b.length;)c.appendChild(b[0]);c.removeChild(this.textPathWrapper.element)}}else if(b.getAttribute("dx")||b.getAttribute("dy"))b.removeAttribute("dx"),b.removeAttribute("dy");this.textPathWrapper&&(this.textPathWrapper=this.textPathWrapper.destroy())};a.prototype.dSetter=function(b,e,c){k(b)&&("string"===typeof b[0]&&(b=this.renderer.pathToSegments(b)),this.pathArray=b,b=b.reduce(function(b,e,c){return e&&e.join?(c?b+" ":"")+e.join(" "):(e||"").toString()},""));
/(NaN| {2}|^$)/.test(b)&&(b="M 0 0");this[e]!==b&&(c.setAttribute(e,b),this[e]=b)};a.prototype.fadeOut=function(b){var e=this;e.animate({opacity:0},{duration:v(b,150),complete:function(){e.attr({y:-9999}).hide()}})};a.prototype.fillSetter=function(b,e,c){"string"===typeof b?c.setAttribute(e,b):b&&this.complexColor(b,e,c)};a.prototype.getBBox=function(e,c){var g=this.renderer,d=this.element,k=this.styles,n=this.textStr,D=g.cache,l=g.cacheKeys,F=d.namespaceURI===this.SVG_NS;c=v(c,this.rotation,0);var p=
g.styledMode?d&&a.prototype.getStyle.call(d,"font-size"):k&&k.fontSize,f;if(r(n)){var H=n.toString();-1===H.indexOf("<")&&(H=H.replace(/[0-9]/g,"0"));H+=["",c,p,this.textWidth,k&&k.textOverflow,k&&k.fontWeight].join()}H&&!e&&(f=D[H]);if(!f){if(F||g.forExport){try{var h=this.fakeTS&&function(b){var e=d.querySelector(".highcharts-text-outline");e&&K(e,{display:b})};b(h)&&h("none");f=d.getBBox?B({},d.getBBox()):{width:d.offsetWidth,height:d.offsetHeight};b(h)&&h("")}catch(X){""}if(!f||0>f.width)f={width:0,
height:0}}else f=this.htmlGetBBox();g.isSVG&&(e=f.width,g=f.height,F&&(f.height=g={"11px,17":14,"13px,20":16}[k&&k.fontSize+","+Math.round(g)]||g),c&&(k=c*q,f.width=Math.abs(g*Math.sin(k))+Math.abs(e*Math.cos(k)),f.height=Math.abs(g*Math.cos(k))+Math.abs(e*Math.sin(k))));if(H&&(""===n||0<f.height)){for(;250<l.length;)delete D[l.shift()];D[H]||l.push(H);D[H]=f}}return f};a.prototype.getStyle=function(b){return l.getComputedStyle(this.element||this,"").getPropertyValue(b)};a.prototype.hasClass=function(b){return-1!==
(""+this.attr("class")).split(" ").indexOf(b)};a.prototype.hide=function(b){b?this.attr({y:-9999}):this.attr({visibility:"hidden"});return this};a.prototype.htmlGetBBox=function(){return{height:0,width:0,x:0,y:0}};a.prototype.init=function(b,e){this.element="span"===e?p(e):m.createElementNS(this.SVG_NS,e);this.renderer=b;n(this,"afterInit")};a.prototype.invert=function(b){this.inverted=b;this.updateTransform();return this};a.prototype.on=function(b,e){var c=this.onEvents;if(c[b])c[b]();c[b]=f(this.element,
b,e);return this};a.prototype.opacitySetter=function(b,e,c){this.opacity=b=Number(Number(b).toFixed(3));c.setAttribute(e,b)};a.prototype.removeClass=function(b){return this.attr("class",(""+this.attr("class")).replace(e(b)?new RegExp("(^| )"+b+"( |$)"):b," ").replace(/ +/g," ").trim())};a.prototype.removeTextOutline=function(){var b=this.element.querySelector("tspan.highcharts-text-outline");b&&this.safeRemoveChild(b)};a.prototype.safeRemoveChild=function(b){var e=b.parentNode;e&&e.removeChild(b)};
a.prototype.setRadialReference=function(b){var e=this.element.gradient&&this.renderer.gradients[this.element.gradient];this.element.radialReference=b;e&&e.radAttr&&e.animate(this.renderer.getRadialAttr(b,e.radAttr));return this};a.prototype.setTextPath=function(b,e){var c=this.element,d=this.text?this.text.element:c,a={textAnchor:"text-anchor"},k=!1,n=this.textPathWrapper,v=!n;e=D(!0,{enabled:!0,attributes:{dy:-5,startOffset:"50%",textAnchor:"middle"}},e);var F=t.filterUserAttributes(e.attributes);
if(b&&e&&e.enabled){n&&null===n.element.parentNode?(v=!0,n=n.destroy()):n&&this.removeTextOutline.call(n.parentGroup);this.options&&this.options.padding&&(F.dx=-this.options.padding);n||(this.textPathWrapper=n=this.renderer.createElement("textPath"),k=!0);var f=n.element;(e=b.element.getAttribute("id"))||b.element.setAttribute("id",e=S());if(v)for(d.setAttribute("y",0),g(F.dx)&&d.setAttribute("x",-F.dx),b=[].slice.call(d.childNodes),v=0;v<b.length;v++){var p=b[v];p.nodeType!==l.Node.TEXT_NODE&&"tspan"!==
p.nodeName||f.appendChild(p)}k&&n&&n.add({element:d});f.setAttributeNS("http://www.w3.org/1999/xlink","href",this.renderer.url+"#"+e);r(F.dy)&&(f.parentNode.setAttribute("dy",F.dy),delete F.dy);r(F.dx)&&(f.parentNode.setAttribute("dx",F.dx),delete F.dx);H(F,function(b,e){f.setAttribute(a[e]||e,b)});c.removeAttribute("transform");this.removeTextOutline.call(n);this.text&&!this.renderer.styledMode&&this.attr({fill:"none","stroke-width":0});this.applyTextOutline=this.updateTransform=h}else n&&(delete this.updateTransform,
delete this.applyTextOutline,this.destroyTextPath(c,b),this.updateTransform(),this.options&&this.options.rotation&&this.applyTextOutline(this.options.style.textOutline));return this};a.prototype.shadow=function(b,e,c){var g=[],d=this.element,a=this.oldShadowOptions,k={color:"#000000",offsetX:this.parentInverted?-1:1,offsetY:this.parentInverted?-1:1,opacity:.15,width:3},J=!1,F;!0===b?F=k:"object"===typeof b&&(F=B(k,b));F&&(F&&a&&H(F,function(b,e){b!==a[e]&&(J=!0)}),J&&this.destroyShadows(),this.oldShadowOptions=
F);if(!F)this.destroyShadows();else if(!this.shadows){var n=F.opacity/F.width;var v=this.parentInverted?"translate("+F.offsetY+", "+F.offsetX+")":"translate("+F.offsetX+", "+F.offsetY+")";for(k=1;k<=F.width;k++){var f=d.cloneNode(!1);var D=2*F.width+1-2*k;w(f,{stroke:b.color||"#000000","stroke-opacity":n*k,"stroke-width":D,transform:v,fill:"none"});f.setAttribute("class",(f.getAttribute("class")||"")+" highcharts-shadow");c&&(w(f,"height",Math.max(w(f,"height")-D,0)),f.cutHeight=D);e?e.element.appendChild(f):
d.parentNode&&d.parentNode.insertBefore(f,d);g.push(f)}this.shadows=g}return this};a.prototype.show=function(b){return this.attr({visibility:b?"inherit":"visible"})};a.prototype.strokeSetter=function(b,e,c){this[e]=b;this.stroke&&this["stroke-width"]?(a.prototype.fillSetter.call(this,this.stroke,"stroke",c),c.setAttribute("stroke-width",this["stroke-width"]),this.hasStroke=!0):"stroke-width"===e&&0===b&&this.hasStroke?(c.removeAttribute("stroke"),this.hasStroke=!1):this.renderer.styledMode&&this["stroke-width"]&&
(c.setAttribute("stroke-width",this["stroke-width"]),this.hasStroke=!0)};a.prototype.strokeWidth=function(){if(!this.renderer.styledMode)return this["stroke-width"]||0;var b=this.getStyle("stroke-width"),e=0;if(b.indexOf("px")===b.length-2)e=E(b);else if(""!==b){var g=m.createElementNS(c,"rect");w(g,{width:b,"stroke-width":0});this.element.parentNode.appendChild(g);e=g.getBBox().width;g.parentNode.removeChild(g)}return e};a.prototype.symbolAttr=function(b){var e=this;"x y r start end width height innerR anchorX anchorY clockwise".split(" ").forEach(function(c){e[c]=
v(b[c],e[c])});e.attr({d:e.renderer.symbols[e.symbolName](e.x,e.y,e.width,e.height,e)})};a.prototype.textSetter=function(b){b!==this.textStr&&(delete this.textPxLength,this.textStr=b,this.added&&this.renderer.buildText(this))};a.prototype.titleSetter=function(b){var e=this.element,c=e.getElementsByTagName("title")[0]||m.createElementNS(this.SVG_NS,"title");e.insertBefore?e.insertBefore(c,e.firstChild):e.appendChild(c);c.textContent=String(v(b,"")).replace(/<[^>]*>/g,"").replace(/&lt;/g,"<").replace(/&gt;/g,
">")};a.prototype.toFront=function(){var b=this.element;b.parentNode.appendChild(b);return this};a.prototype.translate=function(b,e){return this.attr({translateX:b,translateY:e})};a.prototype.updateShadows=function(b,e,c){var g=this.shadows;if(g)for(var d=g.length;d--;)c.call(g[d],"height"===b?Math.max(e-(g[d].cutHeight||0),0):"d"===b?this.d:e,b,g[d])};a.prototype.updateTransform=function(){var b=this.scaleX,e=this.scaleY,c=this.inverted,g=this.rotation,d=this.matrix,a=this.element,k=this.translateX||
0,n=this.translateY||0;c&&(k+=this.width,n+=this.height);k=["translate("+k+","+n+")"];r(d)&&k.push("matrix("+d.join(",")+")");c?k.push("rotate(90) scale(-1,1)"):g&&k.push("rotate("+g+" "+v(this.rotationOriginX,a.getAttribute("x"),0)+" "+v(this.rotationOriginY,a.getAttribute("y")||0)+")");(r(b)||r(e))&&k.push("scale("+v(b,1)+" "+v(e,1)+")");k.length&&a.setAttribute("transform",k.join(" "))};a.prototype.visibilitySetter=function(b,e,c){"inherit"===b?c.removeAttribute(e):this[e]!==b&&c.setAttribute(e,
b);this[e]=b};a.prototype.xGetter=function(b){"circle"===this.element.nodeName&&("x"===b?b="cx":"y"===b&&(b="cy"));return this._defaultGetter(b)};a.prototype.zIndexSetter=function(b,e){var c=this.renderer,g=this.parentGroup,d=(g||c).element||c.box,a=this.element;c=d===c.box;var k=!1;var n=this.added;var F;r(b)?(a.setAttribute("data-z-index",b),b=+b,this[e]===b&&(n=!1)):r(this[e])&&a.removeAttribute("data-z-index");this[e]=b;if(n){(b=this.zIndex)&&g&&(g.handleZ=!0);e=d.childNodes;for(F=e.length-1;0<=
F&&!k;F--){g=e[F];n=g.getAttribute("data-z-index");var v=!r(n);if(g!==a)if(0>b&&v&&!c&&!F)d.insertBefore(a,e[F]),k=!0;else if(E(n)<=b||v&&(!r(b)||0<=b))d.insertBefore(a,e[F+1]||null),k=!0}k||(d.insertBefore(a,e[c?3:0]||null),k=!0)}return k};return a}();a.prototype["stroke-widthSetter"]=a.prototype.strokeSetter;a.prototype.yGetter=a.prototype.xGetter;a.prototype.matrixSetter=a.prototype.rotationOriginXSetter=a.prototype.rotationOriginYSetter=a.prototype.rotationSetter=a.prototype.scaleXSetter=a.prototype.scaleYSetter=
a.prototype.translateXSetter=a.prototype.translateYSetter=a.prototype.verticalAlignSetter=function(b,e){this[e]=b;this.doTransform=!0};"";return a});L(a,"Core/Renderer/RendererRegistry.js",[a["Core/Globals.js"]],function(a){var u;(function(u){u.rendererTypes={};var t;u.getRendererType=function(a){void 0===a&&(a=t);return u.rendererTypes[a]||u.rendererTypes[t]};u.registerRendererType=function(x,A,I){u.rendererTypes[x]=A;if(!t||I)t=x,a.Renderer=A}})(u||(u={}));return u});L(a,"Core/Renderer/SVG/SVGLabel.js",
[a["Core/Renderer/SVG/SVGElement.js"],a["Core/Utilities.js"]],function(a,t){var u=this&&this.__extends||function(){var a=function(h,d){a=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(c,d){c.__proto__=d}||function(c,d){for(var a in d)d.hasOwnProperty(a)&&(c[a]=d[a])};return a(h,d)};return function(h,d){function c(){this.constructor=h}a(h,d);h.prototype=null===d?Object.create(d):(c.prototype=d.prototype,new c)}}(),G=t.defined,x=t.extend,C=t.isNumber,I=t.merge,z=t.pick,q=t.removeEvent;
return function(m){function h(d,c,a,f,w,p,K,r,y,B){var n=m.call(this)||this;n.paddingLeftSetter=n.paddingSetter;n.paddingRightSetter=n.paddingSetter;n.init(d,"g");n.textStr=c;n.x=a;n.y=f;n.anchorX=p;n.anchorY=K;n.baseline=y;n.className=B;n.addClass("button"===B?"highcharts-no-tooltip":"highcharts-label");B&&n.addClass("highcharts-"+B);n.text=d.text(void 0,0,0,r).attr({zIndex:1});var k;"string"===typeof w&&((k=/^url\((.*?)\)$/.test(w))||n.renderer.symbols[w])&&(n.symbolKey=w);n.bBox=h.emptyBBox;n.padding=
3;n.baselineOffset=0;n.needsBox=d.styledMode||k;n.deferredAttr={};n.alignFactor=0;return n}u(h,m);h.prototype.alignSetter=function(d){d={left:0,center:.5,right:1}[d];d!==this.alignFactor&&(this.alignFactor=d,this.bBox&&C(this.xSetting)&&this.attr({x:this.xSetting}))};h.prototype.anchorXSetter=function(d,c){this.anchorX=d;this.boxAttr(c,Math.round(d)-this.getCrispAdjust()-this.xSetting)};h.prototype.anchorYSetter=function(d,c){this.anchorY=d;this.boxAttr(c,d-this.ySetting)};h.prototype.boxAttr=function(d,
c){this.box?this.box.attr(d,c):this.deferredAttr[d]=c};h.prototype.css=function(d){if(d){var c={};d=I(d);h.textProps.forEach(function(a){"undefined"!==typeof d[a]&&(c[a]=d[a],delete d[a])});this.text.css(c);var l="width"in c;"fontSize"in c||"fontWeight"in c?this.updateTextPadding():l&&this.updateBoxSize()}return a.prototype.css.call(this,d)};h.prototype.destroy=function(){q(this.element,"mouseenter");q(this.element,"mouseleave");this.text&&this.text.destroy();this.box&&(this.box=this.box.destroy());
a.prototype.destroy.call(this)};h.prototype.fillSetter=function(d,c){d&&(this.needsBox=!0);this.fill=d;this.boxAttr(c,d)};h.prototype.getBBox=function(){this.textStr&&0===this.bBox.width&&0===this.bBox.height&&this.updateBoxSize();var d=this.padding,c=z(this.paddingLeft,d);return{width:this.width,height:this.height,x:this.bBox.x-c,y:this.bBox.y-d}};h.prototype.getCrispAdjust=function(){return this.renderer.styledMode&&this.box?this.box.strokeWidth()%2/2:(this["stroke-width"]?parseInt(this["stroke-width"],
10):0)%2/2};h.prototype.heightSetter=function(d){this.heightSetting=d};h.prototype.onAdd=function(){var d=this.textStr;this.text.add(this);this.attr({text:G(d)?d:"",x:this.x,y:this.y});this.box&&G(this.anchorX)&&this.attr({anchorX:this.anchorX,anchorY:this.anchorY})};h.prototype.paddingSetter=function(d,c){C(d)?d!==this[c]&&(this[c]=d,this.updateTextPadding()):this[c]=void 0};h.prototype.rSetter=function(d,c){this.boxAttr(c,d)};h.prototype.shadow=function(d){d&&!this.renderer.styledMode&&(this.updateBoxSize(),
this.box&&this.box.shadow(d));return this};h.prototype.strokeSetter=function(d,c){this.stroke=d;this.boxAttr(c,d)};h.prototype["stroke-widthSetter"]=function(d,c){d&&(this.needsBox=!0);this["stroke-width"]=d;this.boxAttr(c,d)};h.prototype["text-alignSetter"]=function(d){this.textAlign=d};h.prototype.textSetter=function(d){"undefined"!==typeof d&&this.text.attr({text:d});this.updateTextPadding()};h.prototype.updateBoxSize=function(){var d=this.text.element.style,c={},a=this.padding,f=this.bBox=C(this.widthSetting)&&
C(this.heightSetting)&&!this.textAlign||!G(this.text.textStr)?h.emptyBBox:this.text.getBBox();this.width=this.getPaddedWidth();this.height=(this.heightSetting||f.height||0)+2*a;d=this.renderer.fontMetrics(d&&d.fontSize,this.text);this.baselineOffset=a+Math.min((this.text.firstLineMetrics||d).b,f.height||Infinity);this.heightSetting&&(this.baselineOffset+=(this.heightSetting-d.h)/2);this.needsBox&&(this.box||(a=this.box=this.symbolKey?this.renderer.symbol(this.symbolKey):this.renderer.rect(),a.addClass(("button"===
this.className?"":"highcharts-label-box")+(this.className?" highcharts-"+this.className+"-box":"")),a.add(this)),a=this.getCrispAdjust(),c.x=a,c.y=(this.baseline?-this.baselineOffset:0)+a,c.width=Math.round(this.width),c.height=Math.round(this.height),this.box.attr(x(c,this.deferredAttr)),this.deferredAttr={})};h.prototype.updateTextPadding=function(){var d=this.text;this.updateBoxSize();var c=this.baseline?0:this.baselineOffset,a=z(this.paddingLeft,this.padding);G(this.widthSetting)&&this.bBox&&
("center"===this.textAlign||"right"===this.textAlign)&&(a+={center:.5,right:1}[this.textAlign]*(this.widthSetting-this.bBox.width));if(a!==d.x||c!==d.y)d.attr("x",a),d.hasBoxWidthChanged&&(this.bBox=d.getBBox(!0)),"undefined"!==typeof c&&d.attr("y",c);d.x=a;d.y=c};h.prototype.widthSetter=function(d){this.widthSetting=C(d)?d:void 0};h.prototype.getPaddedWidth=function(){var d=this.padding,c=z(this.paddingLeft,d);d=z(this.paddingRight,d);return(this.widthSetting||this.bBox.width||0)+c+d};h.prototype.xSetter=
function(d){this.x=d;this.alignFactor&&(d-=this.alignFactor*this.getPaddedWidth(),this["forceAnimate:x"]=!0);this.xSetting=Math.round(d);this.attr("translateX",this.xSetting)};h.prototype.ySetter=function(d){this.ySetting=this.y=Math.round(d);this.attr("translateY",this.ySetting)};h.emptyBBox={width:0,height:0,x:0,y:0};h.textProps="color direction fontFamily fontSize fontStyle fontWeight lineHeight textAlign textDecoration textOutline textOverflow width".split(" ");return h}(a)});L(a,"Core/Renderer/SVG/Symbols.js",
[a["Core/Utilities.js"]],function(a){function u(a,q,m,h,d){var c=[];if(d){var l=d.start||0,f=I(d.r,m);m=I(d.r,h||m);var w=(d.end||0)-.001;h=d.innerR;var p=I(d.open,.001>Math.abs((d.end||0)-l-2*Math.PI)),K=Math.cos(l),r=Math.sin(l),y=Math.cos(w),B=Math.sin(w);l=I(d.longArc,.001>w-l-Math.PI?0:1);c.push(["M",a+f*K,q+m*r],["A",f,m,0,l,I(d.clockwise,1),a+f*y,q+m*B]);x(h)&&c.push(p?["M",a+h*y,q+h*B]:["L",a+h*y,q+h*B],["A",h,h,0,l,x(d.clockwise)?1-d.clockwise:0,a+h*K,q+h*r]);p||c.push(["Z"])}return c}function A(a,
q,m,h,d){return d&&d.r?G(a,q,m,h,d):[["M",a,q],["L",a+m,q],["L",a+m,q+h],["L",a,q+h],["Z"]]}function G(a,q,m,h,d){d=d&&d.r||0;return[["M",a+d,q],["L",a+m-d,q],["C",a+m,q,a+m,q,a+m,q+d],["L",a+m,q+h-d],["C",a+m,q+h,a+m,q+h,a+m-d,q+h],["L",a+d,q+h],["C",a,q+h,a,q+h,a,q+h-d],["L",a,q+d],["C",a,q,a,q,a+d,q]]}var x=a.defined,C=a.isNumber,I=a.pick;return{arc:u,callout:function(a,q,m,h,d){var c=Math.min(d&&d.r||0,m,h),l=c+6,f=d&&d.anchorX;d=d&&d.anchorY||0;var w=G(a,q,m,h,{r:c});if(!C(f))return w;a+f>=m?
d>q+l&&d<q+h-l?w.splice(3,1,["L",a+m,d-6],["L",a+m+6,d],["L",a+m,d+6],["L",a+m,q+h-c]):w.splice(3,1,["L",a+m,h/2],["L",f,d],["L",a+m,h/2],["L",a+m,q+h-c]):0>=a+f?d>q+l&&d<q+h-l?w.splice(7,1,["L",a,d+6],["L",a-6,d],["L",a,d-6],["L",a,q+c]):w.splice(7,1,["L",a,h/2],["L",f,d],["L",a,h/2],["L",a,q+c]):d&&d>h&&f>a+l&&f<a+m-l?w.splice(5,1,["L",f+6,q+h],["L",f,q+h+6],["L",f-6,q+h],["L",a+c,q+h]):d&&0>d&&f>a+l&&f<a+m-l&&w.splice(1,1,["L",f-6,q],["L",f,q-6],["L",f+6,q],["L",m-c,q]);return w},circle:function(a,
q,m,h){return u(a+m/2,q+h/2,m/2,h/2,{start:.5*Math.PI,end:2.5*Math.PI,open:!1})},diamond:function(a,q,m,h){return[["M",a+m/2,q],["L",a+m,q+h/2],["L",a+m/2,q+h],["L",a,q+h/2],["Z"]]},rect:A,roundedRect:G,square:A,triangle:function(a,q,m,h){return[["M",a+m/2,q],["L",a+m,q+h],["L",a,q+h],["Z"]]},"triangle-down":function(a,q,m,h){return[["M",a,q],["L",a+m,q],["L",a+m/2,q+h],["Z"]]}}});L(a,"Core/Renderer/SVG/TextBuilder.js",[a["Core/Renderer/HTML/AST.js"],a["Core/Globals.js"],a["Core/Utilities.js"]],function(a,
t,A){var u=t.doc,x=t.SVG_NS,C=t.win,I=A.attr,z=A.isString,q=A.objectEach,m=A.pick;return function(){function h(a){var c=a.styles;this.renderer=a.renderer;this.svgElement=a;this.width=a.textWidth;this.textLineHeight=c&&c.lineHeight;this.textOutline=c&&c.textOutline;this.ellipsis=!(!c||"ellipsis"!==c.textOverflow);this.noWrap=!(!c||"nowrap"!==c.whiteSpace);this.fontSize=c&&c.fontSize}h.prototype.buildSVG=function(){var d=this.svgElement,c=d.element,l=d.renderer,f=m(d.textStr,"").toString(),h=-1!==f.indexOf("<"),
p=c.childNodes;l=this.width&&!d.added&&l.box;var K=/<br.*?>/g,r=[f,this.ellipsis,this.noWrap,this.textLineHeight,this.textOutline,this.fontSize,this.width].join();if(r!==d.textCache){d.textCache=r;delete d.actualWidth;for(r=p.length;r--;)c.removeChild(p[r]);h||this.ellipsis||this.width||-1!==f.indexOf(" ")&&(!this.noWrap||K.test(f))?""!==f&&(l&&l.appendChild(c),f=new a(f),this.modifyTree(f.nodes),f.addToDOM(d.element),this.modifyDOM(),this.ellipsis&&-1!==(c.textContent||"").indexOf("\u2026")&&d.attr("title",
this.unescapeEntities(d.textStr||"",["&lt;","&gt;"])),l&&l.removeChild(c)):c.appendChild(u.createTextNode(this.unescapeEntities(f)));z(this.textOutline)&&d.applyTextOutline&&d.applyTextOutline(this.textOutline)}};h.prototype.modifyDOM=function(){var a=this,c=this.svgElement,l=I(c.element,"x");c.firstLineMetrics=void 0;for(var f;f=c.element.firstChild;)if(/^[\s\u200B]*$/.test(f.textContent||" "))c.element.removeChild(f);else break;[].forEach.call(c.element.querySelectorAll("tspan.highcharts-br"),function(d,
f){d.nextSibling&&d.previousSibling&&(0===f&&1===d.previousSibling.nodeType&&(c.firstLineMetrics=c.renderer.fontMetrics(void 0,d.previousSibling)),I(d,{dy:a.getLineHeight(d.nextSibling),x:l}))});var h=this.width||0;if(h){var p=function(d,f){var p=d.textContent||"",n=p.replace(/([^\^])-/g,"$1- ").split(" "),k=!a.noWrap&&(1<n.length||1<c.element.childNodes.length),b=a.getLineHeight(f),g=0,e=c.actualWidth;if(a.ellipsis)p&&a.truncate(d,p,void 0,0,Math.max(0,h-parseInt(a.fontSize||12,10)),function(b,e){return b.substring(0,
e)+"\u2026"});else if(k){p=[];for(k=[];f.firstChild&&f.firstChild!==d;)k.push(f.firstChild),f.removeChild(f.firstChild);for(;n.length;)n.length&&!a.noWrap&&0<g&&(p.push(d.textContent||""),d.textContent=n.join(" ").replace(/- /g,"-")),a.truncate(d,void 0,n,0===g?e||0:0,h,function(b,e){return n.slice(0,e).join(" ").replace(/- /g,"-")}),e=c.actualWidth,g++;k.forEach(function(b){f.insertBefore(b,d)});p.forEach(function(e){f.insertBefore(u.createTextNode(e),d);e=u.createElementNS(x,"tspan");e.textContent=
"\u200b";I(e,{dy:b,x:l});f.insertBefore(e,d)})}},m=function(a){[].slice.call(a.childNodes).forEach(function(d){d.nodeType===C.Node.TEXT_NODE?p(d,a):(-1!==d.className.baseVal.indexOf("highcharts-br")&&(c.actualWidth=0),m(d))})};m(c.element)}};h.prototype.getLineHeight=function(a){var c;a=a.nodeType===C.Node.TEXT_NODE?a.parentElement:a;this.renderer.styledMode||(c=a&&/(px|em)$/.test(a.style.fontSize)?a.style.fontSize:this.fontSize||this.renderer.style.fontSize||12);return this.textLineHeight?parseInt(this.textLineHeight.toString(),
10):this.renderer.fontMetrics(c,a||this.svgElement.element).h};h.prototype.modifyTree=function(a){var c=this,d=function(f,l){var p=f.tagName,h=c.renderer.styledMode,r=f.attributes||{};if("b"===p||"strong"===p)h?r["class"]="highcharts-strong":r.style="font-weight:bold;"+(r.style||"");else if("i"===p||"em"===p)h?r["class"]="highcharts-emphasized":r.style="font-style:italic;"+(r.style||"");z(r.style)&&(r.style=r.style.replace(/(;| |^)color([ :])/,"$1fill$2"));"br"===p&&(r["class"]="highcharts-br",f.textContent=
"\u200b",(l=a[l+1])&&l.textContent&&(l.textContent=l.textContent.replace(/^ +/gm,"")));"#text"!==p&&"a"!==p&&(f.tagName="tspan");f.attributes=r;f.children&&f.children.filter(function(c){return"#text"!==c.tagName}).forEach(d)};a.forEach(d)};h.prototype.truncate=function(a,c,l,f,h,p){var d=this.svgElement,r=d.renderer,m=d.rotation,w=[],n=l?1:0,k=(c||l||"").length,b=k,g,e=function(b,e){e=e||b;var g=a.parentNode;if(g&&"undefined"===typeof w[e])if(g.getSubStringLength)try{w[e]=f+g.getSubStringLength(0,
l?e+1:e)}catch(O){""}else r.getSpanWidth&&(a.textContent=p(c||l,b),w[e]=f+r.getSpanWidth(d,a));return w[e]};d.rotation=0;var D=e(a.textContent.length);if(f+D>h){for(;n<=k;)b=Math.ceil((n+k)/2),l&&(g=p(l,b)),D=e(b,g&&g.length-1),n===k?n=k+1:D>h?k=b-1:n=b;0===k?a.textContent="":c&&k===c.length-1||(a.textContent=g||p(c||l,b))}l&&l.splice(0,b);d.actualWidth=D;d.rotation=m};h.prototype.unescapeEntities=function(a,c){q(this.renderer.escapes,function(d,f){c&&-1!==c.indexOf(d)||(a=a.toString().replace(new RegExp(d,
"g"),f))});return a};return h}()});L(a,"Core/Renderer/SVG/SVGRenderer.js",[a["Core/Renderer/HTML/AST.js"],a["Core/Color/Color.js"],a["Core/Globals.js"],a["Core/Renderer/RendererRegistry.js"],a["Core/Renderer/SVG/SVGElement.js"],a["Core/Renderer/SVG/SVGLabel.js"],a["Core/Renderer/SVG/Symbols.js"],a["Core/Renderer/SVG/TextBuilder.js"],a["Core/Utilities.js"]],function(a,t,A,G,x,C,I,z,q){var m=A.charts,h=A.deg2rad,d=A.doc,c=A.isFirefox,l=A.isMS,f=A.isWebKit,w=A.noop,p=A.SVG_NS,K=A.symbolSizes,r=A.win,
y=q.addEvent,B=q.attr,n=q.createElement,k=q.css,b=q.defined,g=q.destroyObjectProperties,e=q.extend,D=q.isArray,H=q.isNumber,v=q.isObject,E=q.isString,O=q.merge,u=q.pick,P=q.pInt,U=q.uniqueKey,Y;A=function(){function J(b,e,c,a,g,d,k){this.width=this.url=this.style=this.isSVG=this.imgCount=this.height=this.gradients=this.globalAnimation=this.defs=this.chartIndex=this.cacheKeys=this.cache=this.boxWrapper=this.box=this.alignedObjects=void 0;this.init(b,e,c,a,g,d,k)}J.prototype.init=function(b,e,a,g,J,
F,n){var M=this.createElement("svg").attr({version:"1.1","class":"highcharts-root"}),f=M.element;n||M.css(this.getStyle(g));b.appendChild(f);B(b,"dir","ltr");-1===b.innerHTML.indexOf("xmlns")&&B(f,"xmlns",this.SVG_NS);this.isSVG=!0;this.box=f;this.boxWrapper=M;this.alignedObjects=[];this.url=this.getReferenceURL();this.createElement("desc").add().element.appendChild(d.createTextNode("Created with Highcharts 9.3.1"));this.defs=this.createElement("defs").add();this.allowHTML=F;this.forExport=J;this.styledMode=
n;this.gradients={};this.cache={};this.cacheKeys=[];this.imgCount=0;this.setSize(e,a,!1);var v;c&&b.getBoundingClientRect&&(e=function(){k(b,{left:0,top:0});v=b.getBoundingClientRect();k(b,{left:Math.ceil(v.left)-v.left+"px",top:Math.ceil(v.top)-v.top+"px"})},e(),this.unSubPixelFix=y(r,"resize",e))};J.prototype.definition=function(b){return(new a([b])).addToDOM(this.defs.element)};J.prototype.getReferenceURL=function(){if((c||f)&&d.getElementsByTagName("base").length){if(!b(Y)){var e=U();e=(new a([{tagName:"svg",
attributes:{width:8,height:8},children:[{tagName:"defs",children:[{tagName:"clipPath",attributes:{id:e},children:[{tagName:"rect",attributes:{width:4,height:4}}]}]},{tagName:"rect",attributes:{id:"hitme",width:8,height:8,"clip-path":"url(#"+e+")",fill:"rgba(0,0,0,0.001)"}}]}])).addToDOM(d.body);k(e,{position:"fixed",top:0,left:0,zIndex:9E5});var g=d.elementFromPoint(6,6);Y="hitme"===(g&&g.id);d.body.removeChild(e)}if(Y)return r.location.href.split("#")[0].replace(/<[^>]*>/g,"").replace(/([\('\)])/g,
"\\$1").replace(/ /g,"%20")}return""};J.prototype.getStyle=function(b){return this.style=e({fontFamily:'"Lucida Grande", "Lucida Sans Unicode", Arial, Helvetica, sans-serif',fontSize:"12px"},b)};J.prototype.setStyle=function(b){this.boxWrapper.css(this.getStyle(b))};J.prototype.isHidden=function(){return!this.boxWrapper.getBBox().width};J.prototype.destroy=function(){var b=this.defs;this.box=null;this.boxWrapper=this.boxWrapper.destroy();g(this.gradients||{});this.gradients=null;b&&(this.defs=b.destroy());
this.unSubPixelFix&&this.unSubPixelFix();return this.alignedObjects=null};J.prototype.createElement=function(b){var e=new this.Element;e.init(this,b);return e};J.prototype.getRadialAttr=function(b,e){return{cx:b[0]-b[2]/2+(e.cx||0)*b[2],cy:b[1]-b[2]/2+(e.cy||0)*b[2],r:(e.r||0)*b[2]}};J.prototype.buildText=function(b){(new z(b)).buildSVG()};J.prototype.getContrast=function(b){b=t.parse(b).rgba;b[0]*=1;b[1]*=1.2;b[2]*=.5;return 459<b[0]+b[1]+b[2]?"#000000":"#FFFFFF"};J.prototype.button=function(b,c,
g,d,k,F,J,n,v,f){var p=this.label(b,c,g,v,void 0,void 0,f,void 0,"button"),D=this.styledMode,M=0,h=k?O(k):{};b=h&&h.style||{};h=a.filterUserAttributes(h);p.attr(O({padding:8,r:2},h));if(!D){h=O({fill:"#f7f7f7",stroke:"#cccccc","stroke-width":1,style:{color:"#333333",cursor:"pointer",fontWeight:"normal"}},{style:b},h);var H=h.style;delete h.style;F=O(h,{fill:"#e6e6e6"},a.filterUserAttributes(F||{}));var N=F.style;delete F.style;J=O(h,{fill:"#e6ebf5",style:{color:"#000000",fontWeight:"bold"}},a.filterUserAttributes(J||
{}));var r=J.style;delete J.style;n=O(h,{style:{color:"#cccccc"}},a.filterUserAttributes(n||{}));var E=n.style;delete n.style}y(p.element,l?"mouseover":"mouseenter",function(){3!==M&&p.setState(1)});y(p.element,l?"mouseout":"mouseleave",function(){3!==M&&p.setState(M)});p.setState=function(b){1!==b&&(p.state=M=b);p.removeClass(/highcharts-button-(normal|hover|pressed|disabled)/).addClass("highcharts-button-"+["normal","hover","pressed","disabled"][b||0]);D||p.attr([h,F,J,n][b||0]).css([H,N,r,E][b||
0])};D||p.attr(h).css(e({cursor:"default"},H));return p.on("touchstart",function(b){return b.stopPropagation()}).on("click",function(b){3!==M&&d.call(p,b)})};J.prototype.crispLine=function(e,c,a){void 0===a&&(a="round");var g=e[0],d=e[1];b(g[1])&&g[1]===d[1]&&(g[1]=d[1]=Math[a](g[1])-c%2/2);b(g[2])&&g[2]===d[2]&&(g[2]=d[2]=Math[a](g[2])+c%2/2);return e};J.prototype.path=function(b){var c=this.styledMode?{}:{fill:"none"};D(b)?c.d=b:v(b)&&e(c,b);return this.createElement("path").attr(c)};J.prototype.circle=
function(b,e,c){b=v(b)?b:"undefined"===typeof b?{}:{x:b,y:e,r:c};e=this.createElement("circle");e.xSetter=e.ySetter=function(b,e,c){c.setAttribute("c"+e,b)};return e.attr(b)};J.prototype.arc=function(b,e,c,a,g,d){v(b)?(a=b,e=a.y,c=a.r,b=a.x):a={innerR:a,start:g,end:d};b=this.symbol("arc",b,e,c,c,a);b.r=c;return b};J.prototype.rect=function(b,e,c,a,g,d){g=v(b)?b.r:g;var k=this.createElement("rect");b=v(b)?b:"undefined"===typeof b?{}:{x:b,y:e,width:Math.max(c,0),height:Math.max(a,0)};this.styledMode||
("undefined"!==typeof d&&(b["stroke-width"]=d,b=k.crisp(b)),b.fill="none");g&&(b.r=g);k.rSetter=function(b,e,c){k.r=b;B(c,{rx:b,ry:b})};k.rGetter=function(){return k.r||0};return k.attr(b)};J.prototype.setSize=function(b,e,c){this.width=b;this.height=e;this.boxWrapper.animate({width:b,height:e},{step:function(){this.attr({viewBox:"0 0 "+this.attr("width")+" "+this.attr("height")})},duration:u(c,!0)?void 0:0});this.alignElements()};J.prototype.g=function(b){var e=this.createElement("g");return b?e.attr({"class":"highcharts-"+
b}):e};J.prototype.image=function(b,e,c,a,g,d){var k={preserveAspectRatio:"none"},F=function(b,e){b.setAttributeNS?b.setAttributeNS("http://www.w3.org/1999/xlink","href",e):b.setAttribute("hc-svg-href",e)};H(e)&&(k.x=e);H(c)&&(k.y=c);H(a)&&(k.width=a);H(g)&&(k.height=g);var J=this.createElement("image").attr(k);e=function(e){F(J.element,b);d.call(J,e)};d?(F(J.element,"data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="),c=new r.Image,y(c,"load",e),c.src=b,c.complete&&e({})):
F(J.element,b);return J};J.prototype.symbol=function(c,a,g,J,v,F){var f=this,p=/^url\((.*?)\)$/,D=p.test(c),l=!D&&(this.symbols[c]?c:"circle"),h=l&&this.symbols[l],H;if(h){"number"===typeof a&&(H=h.call(this.symbols,Math.round(a||0),Math.round(g||0),J||0,v||0,F));var M=this.path(H);f.styledMode||M.attr("fill","none");e(M,{symbolName:l||void 0,x:a,y:g,width:J,height:v});F&&e(M,F)}else if(D){var r=c.match(p)[1];var E=M=this.image(r);E.imgwidth=u(K[r]&&K[r].width,F&&F.width);E.imgheight=u(K[r]&&K[r].height,
F&&F.height);var w=function(b){return b.attr({width:b.width,height:b.height})};["width","height"].forEach(function(e){E[e+"Setter"]=function(e,c){var a=this["img"+c];this[c]=e;b(a)&&(F&&"within"===F.backgroundSize&&this.width&&this.height&&(a=Math.round(a*Math.min(this.width/this.imgwidth,this.height/this.imgheight))),this.element&&this.element.setAttribute(c,a),this.alignByTranslate||(e=((this[c]||0)-a)/2,this.attr("width"===c?{translateX:e}:{translateY:e})))}});b(a)&&E.attr({x:a,y:g});E.isImg=!0;
b(E.imgwidth)&&b(E.imgheight)?w(E):(E.attr({width:0,height:0}),n("img",{onload:function(){var b=m[f.chartIndex];0===this.width&&(k(this,{position:"absolute",top:"-999em"}),d.body.appendChild(this));K[r]={width:this.width,height:this.height};E.imgwidth=this.width;E.imgheight=this.height;E.element&&w(E);this.parentNode&&this.parentNode.removeChild(this);f.imgCount--;if(!f.imgCount&&b&&!b.hasLoaded)b.onload()},src:r}),this.imgCount++)}return M};J.prototype.clipRect=function(b,e,c,a){var g=U()+"-",d=
this.createElement("clipPath").attr({id:g}).add(this.defs);b=this.rect(b,e,c,a,0).add(d);b.id=g;b.clipPath=d;b.count=0;return b};J.prototype.text=function(e,c,a,g){var d={};if(g&&(this.allowHTML||!this.forExport))return this.html(e,c,a);d.x=Math.round(c||0);a&&(d.y=Math.round(a));b(e)&&(d.text=e);e=this.createElement("text").attr(d);if(!g||this.forExport&&!this.allowHTML)e.xSetter=function(b,e,c){for(var a=c.getElementsByTagName("tspan"),g=c.getAttribute(e),d=0,k;d<a.length;d++)k=a[d],k.getAttribute(e)===
g&&k.setAttribute(e,b);c.setAttribute(e,b)};return e};J.prototype.fontMetrics=function(b,e){b=!this.styledMode&&/px/.test(b)||!r.getComputedStyle?b||e&&e.style&&e.style.fontSize||this.style&&this.style.fontSize:e&&x.prototype.getStyle.call(e,"font-size");b=/px/.test(b)?P(b):12;e=24>b?b+3:Math.round(1.2*b);return{h:e,b:Math.round(.8*e),f:b}};J.prototype.rotCorr=function(b,e,c){var a=b;e&&c&&(a=Math.max(a*Math.cos(e*h),4));return{x:-b/3*Math.sin(e*h),y:a}};J.prototype.pathToSegments=function(b){for(var e=
[],c=[],a={A:8,C:7,H:2,L:3,M:3,Q:5,S:5,T:3,V:2},g=0;g<b.length;g++)E(c[0])&&H(b[g])&&c.length===a[c[0].toUpperCase()]&&b.splice(g,0,c[0].replace("M","L").replace("m","l")),"string"===typeof b[g]&&(c.length&&e.push(c.slice(0)),c.length=0),c.push(b[g]);e.push(c.slice(0));return e};J.prototype.label=function(b,e,c,a,g,d,k,J,n){return new C(this,b,e,c,a,g,d,k,J,n)};J.prototype.alignElements=function(){this.alignedObjects.forEach(function(b){return b.align()})};return J}();e(A.prototype,{Element:x,SVG_NS:p,
escapes:{"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"},symbols:I,draw:w});G.registerRendererType("svg",A,!0);"";return A});L(a,"Core/Renderer/HTML/HTMLElement.js",[a["Core/Globals.js"],a["Core/Renderer/SVG/SVGElement.js"],a["Core/Utilities.js"]],function(a,t,A){var u=this&&this.__extends||function(){var c=function(a,d){c=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(c,a){c.__proto__=a}||function(c,a){for(var d in a)a.hasOwnProperty(d)&&(c[d]=a[d])};return c(a,d)};return function(a,
d){function f(){this.constructor=a}c(a,d);a.prototype=null===d?Object.create(d):(f.prototype=d.prototype,new f)}}(),x=a.isFirefox,C=a.isMS,I=a.isWebKit,z=a.win,q=A.css,m=A.defined,h=A.extend,d=A.pick,c=A.pInt;return function(a){function f(){return null!==a&&a.apply(this,arguments)||this}u(f,a);f.compose=function(c){if(-1===f.composedClasses.indexOf(c)){f.composedClasses.push(c);var a=f.prototype,d=c.prototype;d.getSpanCorrection=a.getSpanCorrection;d.htmlCss=a.htmlCss;d.htmlGetBBox=a.htmlGetBBox;
d.htmlUpdateTransform=a.htmlUpdateTransform;d.setSpanRotation=a.setSpanRotation}return c};f.prototype.getSpanCorrection=function(c,a,d){this.xCorr=-c*d;this.yCorr=-a};f.prototype.htmlCss=function(c){var a="SPAN"===this.element.tagName&&c&&"width"in c,f=d(a&&c.width,void 0);if(a){delete c.width;this.textWidth=f;var l=!0}c&&"ellipsis"===c.textOverflow&&(c.whiteSpace="nowrap",c.overflow="hidden");this.styles=h(this.styles,c);q(this.element,c);l&&this.htmlUpdateTransform();return this};f.prototype.htmlGetBBox=
function(){var c=this.element;return{x:c.offsetLeft,y:c.offsetTop,width:c.offsetWidth,height:c.offsetHeight}};f.prototype.htmlUpdateTransform=function(){if(this.added){var a=this.renderer,d=this.element,f=this.translateX||0,l=this.translateY||0,h=this.x||0,B=this.y||0,n=this.textAlign||"left",k={left:0,center:.5,right:1}[n],b=this.styles;b=b&&b.whiteSpace;q(d,{marginLeft:f,marginTop:l});!a.styledMode&&this.shadows&&this.shadows.forEach(function(b){q(b,{marginLeft:f+1,marginTop:l+1})});this.inverted&&
[].forEach.call(d.childNodes,function(b){a.invertChild(b,d)});if("SPAN"===d.tagName){var g=this.rotation,e=this.textWidth&&c(this.textWidth),D=[g,n,d.innerHTML,this.textWidth,this.textAlign].join(),H=void 0;H=!1;if(e!==this.oldTextWidth){if(this.textPxLength)var v=this.textPxLength;else q(d,{width:"",whiteSpace:b||"nowrap"}),v=d.offsetWidth;(e>this.oldTextWidth||v>e)&&(/[ \-]/.test(d.textContent||d.innerText)||"ellipsis"===d.style.textOverflow)&&(q(d,{width:v>e||g?e+"px":"auto",display:"block",whiteSpace:b||
"normal"}),this.oldTextWidth=e,H=!0)}this.hasBoxWidthChanged=H;D!==this.cTT&&(H=a.fontMetrics(d.style.fontSize,d).b,!m(g)||g===(this.oldRotation||0)&&n===this.oldAlign||this.setSpanRotation(g,k,H),this.getSpanCorrection(!m(g)&&this.textPxLength||d.offsetWidth,H,k,g,n));q(d,{left:h+(this.xCorr||0)+"px",top:B+(this.yCorr||0)+"px"});this.cTT=D;this.oldRotation=g;this.oldAlign=n}}else this.alignOnAdd=!0};f.prototype.setSpanRotation=function(c,a,d){var f={},p=C&&!/Edge/.test(z.navigator.userAgent)?"-ms-transform":
I?"-webkit-transform":x?"MozTransform":z.opera?"-o-transform":void 0;p&&(f[p]=f.transform="rotate("+c+"deg)",f[p+(x?"Origin":"-origin")]=f.transformOrigin=100*a+"% "+d+"px",q(this.element,f))};f.composedClasses=[];return f}(t)});L(a,"Core/Renderer/HTML/HTMLRenderer.js",[a["Core/Renderer/HTML/AST.js"],a["Core/Renderer/SVG/SVGElement.js"],a["Core/Renderer/SVG/SVGRenderer.js"],a["Core/Utilities.js"]],function(a,t,A,G){var u=this&&this.__extends||function(){var a=function(h,d){a=Object.setPrototypeOf||
{__proto__:[]}instanceof Array&&function(c,a){c.__proto__=a}||function(c,a){for(var d in a)a.hasOwnProperty(d)&&(c[d]=a[d])};return a(h,d)};return function(h,d){function c(){this.constructor=h}a(h,d);h.prototype=null===d?Object.create(d):(c.prototype=d.prototype,new c)}}(),C=G.attr,I=G.createElement,z=G.extend,q=G.pick;return function(m){function h(){return null!==m&&m.apply(this,arguments)||this}u(h,m);h.compose=function(a){-1===h.composedClasses.indexOf(a)&&(h.composedClasses.push(a),a.prototype.html=
h.prototype.html);return a};h.prototype.html=function(d,c,l){var f=this.createElement("span"),h=f.element,p=f.renderer,m=p.isSVG,r=function(c,a){["opacity","visibility"].forEach(function(d){c[d+"Setter"]=function(k,b,g){var e=c.div?c.div.style:a;t.prototype[d+"Setter"].call(this,k,b,g);e&&(e[b]=k)}});c.addedSetters=!0};f.textSetter=function(c){c!==this.textStr&&(delete this.bBox,delete this.oldTextWidth,a.setElementHTML(this.element,q(c,"")),this.textStr=c,f.doTransform=!0)};m&&r(f,f.element.style);
f.xSetter=f.ySetter=f.alignSetter=f.rotationSetter=function(c,a){"align"===a?f.alignValue=f.textAlign=c:f[a]=c;f.doTransform=!0};f.afterSetters=function(){this.doTransform&&(this.htmlUpdateTransform(),this.doTransform=!1)};f.attr({text:d,x:Math.round(c),y:Math.round(l)}).css({position:"absolute"});p.styledMode||f.css({fontFamily:this.style.fontFamily,fontSize:this.style.fontSize});h.style.whiteSpace="nowrap";f.css=f.htmlCss;m&&(f.add=function(c){var a=p.box.parentNode,d=[];if(this.parentGroup=c){var k=
c.div;if(!k){for(;c;)d.push(c),c=c.parentGroup;d.reverse().forEach(function(b){function c(e,c){b[c]=e;"translateX"===c?p.left=e+"px":p.top=e+"px";b.doTransform=!0}var e=C(b.element,"class"),n=b.styles||{};k=b.div=b.div||I("div",e?{className:e}:void 0,{position:"absolute",left:(b.translateX||0)+"px",top:(b.translateY||0)+"px",display:b.display,opacity:b.opacity,cursor:n.cursor,pointerEvents:n.pointerEvents,visibility:b.visibility},k||a);var p=k.style;z(b,{classSetter:function(b){return function(e){this.element.setAttribute("class",
e);b.className=e}}(k),on:function(){d[0].div&&f.on.apply({element:d[0].div,onEvents:b.onEvents},arguments);return b},translateXSetter:c,translateYSetter:c});b.addedSetters||r(b)})}}else k=a;k.appendChild(h);f.added=!0;f.alignOnAdd&&f.htmlUpdateTransform();return f});return f};h.composedClasses=[];return h}(A)});L(a,"Core/Axis/AxisDefaults.js",[],function(){var a;(function(a){a.defaultXAxisOptions={alignTicks:!0,allowDecimals:void 0,panningEnabled:!0,zIndex:2,zoomEnabled:!0,dateTimeLabelFormats:{millisecond:{main:"%H:%M:%S.%L",
range:!1},second:{main:"%H:%M:%S",range:!1},minute:{main:"%H:%M",range:!1},hour:{main:"%H:%M",range:!1},day:{main:"%e. %b"},week:{main:"%e. %b"},month:{main:"%b '%y"},year:{main:"%Y"}},endOnTick:!1,gridLineDashStyle:"Solid",gridZIndex:1,labels:{autoRotation:void 0,autoRotationLimit:80,distance:void 0,enabled:!0,indentation:10,overflow:"justify",padding:5,reserveSpace:void 0,rotation:void 0,staggerLines:0,step:0,useHTML:!1,x:0,zIndex:7,style:{color:"#666666",cursor:"default",fontSize:"11px"}},maxPadding:.01,
minorGridLineDashStyle:"Solid",minorTickLength:2,minorTickPosition:"outside",minPadding:.01,offset:void 0,opposite:!1,reversed:void 0,reversedStacks:!1,showEmpty:!0,showFirstLabel:!0,showLastLabel:!0,startOfWeek:1,startOnTick:!1,tickLength:10,tickPixelInterval:100,tickmarkPlacement:"between",tickPosition:"outside",title:{align:"middle",rotation:0,useHTML:!1,x:0,y:0,style:{color:"#666666"}},type:"linear",uniqueNames:!0,visible:!0,minorGridLineColor:"#f2f2f2",minorGridLineWidth:1,minorTickColor:"#999999",
lineColor:"#ccd6eb",lineWidth:1,gridLineColor:"#e6e6e6",gridLineWidth:void 0,tickColor:"#ccd6eb"};a.defaultYAxisOptions={reversedStacks:!0,endOnTick:!0,maxPadding:.05,minPadding:.05,tickPixelInterval:72,showLastLabel:!0,labels:{x:-8},startOnTick:!0,title:{rotation:270,text:"Values"},stackLabels:{animation:{},allowOverlap:!1,enabled:!1,crop:!0,overflow:"justify",formatter:function(){var a=this.axis.chart.numberFormatter;return a(this.total,-1)},style:{color:"#000000",fontSize:"11px",fontWeight:"bold",
textOutline:"1px contrast"}},gridLineWidth:1,lineWidth:0};a.defaultLeftAxisOptions={labels:{x:-15},title:{rotation:270}};a.defaultRightAxisOptions={labels:{x:15},title:{rotation:90}};a.defaultBottomAxisOptions={labels:{autoRotation:[-45],x:0},margin:15,title:{rotation:0}};a.defaultTopAxisOptions={labels:{autoRotation:[-45],x:0},margin:15,title:{rotation:0}}})(a||(a={}));return a});L(a,"Core/Foundation.js",[a["Core/Utilities.js"]],function(a){var u=a.addEvent,A=a.isFunction,G=a.objectEach,x=a.removeEvent,
C;(function(a){a.registerEventOptions=function(a,q){a.eventOptions=a.eventOptions||{};G(q.events,function(m,h){a.eventOptions[h]!==m&&(a.eventOptions[h]&&(x(a,h,a.eventOptions[h]),delete a.eventOptions[h]),A(m)&&(a.eventOptions[h]=m,u(a,h,m)))})}})(C||(C={}));return C});L(a,"Core/Axis/Tick.js",[a["Core/FormatUtilities.js"],a["Core/Globals.js"],a["Core/Utilities.js"]],function(a,t,A){var u=t.deg2rad,x=A.clamp,C=A.correctFloat,I=A.defined,z=A.destroyObjectProperties,q=A.extend,m=A.fireEvent,h=A.isNumber,
d=A.merge,c=A.objectEach,l=A.pick;t=function(){function f(c,a,d,f,h){this.isNewLabel=this.isNew=!0;this.axis=c;this.pos=a;this.type=d||"";this.parameters=h||{};this.tickmarkOffset=this.parameters.tickmarkOffset;this.options=this.parameters.options;m(this,"init");d||f||this.addLabel()}f.prototype.addLabel=function(){var c=this,d=c.axis,f=d.options,r=d.chart,y=d.categories,B=d.logarithmic,n=d.names,k=c.pos,b=l(c.options&&c.options.labels,f.labels),g=d.tickPositions,e=k===g[0],D=k===g[g.length-1],H=
(!b.step||1===b.step)&&1===d.tickInterval;g=g.info;var v=c.label,E;y=this.parameters.category||(y?l(y[k],n[k],k):k);B&&h(y)&&(y=C(B.lin2log(y)));if(d.dateTime)if(g){var O=r.time.resolveDTLFormat(f.dateTimeLabelFormats[!f.grid&&g.higherRanks[k]||g.unitName]);var u=O.main}else h(y)&&(u=d.dateTime.getXDateFormat(y,f.dateTimeLabelFormats||{}));c.isFirst=e;c.isLast=D;var P={axis:d,chart:r,dateTimeLabelFormat:u,isFirst:e,isLast:D,pos:k,tick:c,tickPositionInfo:g,value:y};m(this,"labelFormat",P);var t=function(e){return b.formatter?
b.formatter.call(e,e):b.format?(e.text=d.defaultLabelFormatter.call(e),a.format(b.format,e,r)):d.defaultLabelFormatter.call(e,e)};f=t.call(P,P);var z=O&&O.list;c.shortenLabel=z?function(){for(E=0;E<z.length;E++)if(q(P,{dateTimeLabelFormat:z[E]}),v.attr({text:t.call(P,P)}),v.getBBox().width<d.getSlotWidth(c)-2*b.padding)return;v.attr({text:""})}:void 0;H&&d._addedPlotLB&&c.moveLabel(f,b);I(v)||c.movedLabel?v&&v.textStr!==f&&!H&&(!v.textWidth||b.style.width||v.styles.width||v.css({width:null}),v.attr({text:f}),
v.textPxLength=v.getBBox().width):(c.label=v=c.createLabel({x:0,y:0},f,b),c.rotation=0)};f.prototype.createLabel=function(c,a,f){var h=this.axis,l=h.chart;if(c=I(a)&&f.enabled?l.renderer.text(a,c.x,c.y,f.useHTML).add(h.labelGroup):null)l.styledMode||c.css(d(f.style)),c.textPxLength=c.getBBox().width;return c};f.prototype.destroy=function(){z(this,this.axis)};f.prototype.getPosition=function(c,a,d,f){var h=this.axis,l=h.chart,n=f&&l.oldChartHeight||l.chartHeight;c={x:c?C(h.translate(a+d,null,null,
f)+h.transB):h.left+h.offset+(h.opposite?(f&&l.oldChartWidth||l.chartWidth)-h.right-h.left:0),y:c?n-h.bottom+h.offset-(h.opposite?h.height:0):C(n-h.translate(a+d,null,null,f)-h.transB)};c.y=x(c.y,-1E5,1E5);m(this,"afterGetPosition",{pos:c});return c};f.prototype.getLabelPosition=function(c,a,d,f,h,l,n,k){var b=this.axis,g=b.transA,e=b.isLinked&&b.linkedParent?b.linkedParent.reversed:b.reversed,D=b.staggerLines,p=b.tickRotCorr||{x:0,y:0},v=f||b.reserveSpaceDefault?0:-b.labelOffset*("center"===b.labelAlign?
.5:1),E={},r=h.y;I(r)||(r=0===b.side?d.rotation?-8:-d.getBBox().height:2===b.side?p.y+8:Math.cos(d.rotation*u)*(p.y-d.getBBox(!1,0).height/2));c=c+h.x+v+p.x-(l&&f?l*g*(e?-1:1):0);a=a+r-(l&&!f?l*g*(e?1:-1):0);D&&(d=n/(k||1)%D,b.opposite&&(d=D-d-1),a+=b.labelOffset/D*d);E.x=c;E.y=Math.round(a);m(this,"afterGetLabelPosition",{pos:E,tickmarkOffset:l,index:n});return E};f.prototype.getLabelSize=function(){return this.label?this.label.getBBox()[this.axis.horiz?"height":"width"]:0};f.prototype.getMarkPath=
function(c,a,d,f,h,l){return l.crispLine([["M",c,a],["L",c+(h?0:-d),a+(h?d:0)]],f)};f.prototype.handleOverflow=function(c){var a=this.axis,d=a.options.labels,f=c.x,h=a.chart.chartWidth,m=a.chart.spacing,n=l(a.labelLeft,Math.min(a.pos,m[3]));m=l(a.labelRight,Math.max(a.isRadial?0:a.pos+a.len,h-m[1]));var k=this.label,b=this.rotation,g={left:0,center:.5,right:1}[a.labelAlign||k.attr("align")],e=k.getBBox().width,D=a.getSlotWidth(this),H={},v=D,E=1,w;if(b||"justify"!==d.overflow)0>b&&f-g*e<n?w=Math.round(f/
Math.cos(b*u)-n):0<b&&f+g*e>m&&(w=Math.round((h-f)/Math.cos(b*u)));else if(h=f+(1-g)*e,f-g*e<n?v=c.x+v*(1-g)-n:h>m&&(v=m-c.x+v*g,E=-1),v=Math.min(D,v),v<D&&"center"===a.labelAlign&&(c.x+=E*(D-v-g*(D-Math.min(e,v)))),e>v||a.autoRotation&&(k.styles||{}).width)w=v;w&&(this.shortenLabel?this.shortenLabel():(H.width=Math.floor(w)+"px",(d.style||{}).textOverflow||(H.textOverflow="ellipsis"),k.css(H)))};f.prototype.moveLabel=function(a,d){var f=this,h=f.label,l=f.axis,p=l.reversed,n=!1;h&&h.textStr===a?
(f.movedLabel=h,n=!0,delete f.label):c(l.ticks,function(b){n||b.isNew||b===f||!b.label||b.label.textStr!==a||(f.movedLabel=b.label,n=!0,b.labelPos=f.movedLabel.xy,delete b.label)});if(!n&&(f.labelPos||h)){var k=f.labelPos||h.xy;h=l.horiz?p?0:l.width+l.left:k.x;l=l.horiz?k.y:p?l.width+l.left:0;f.movedLabel=f.createLabel({x:h,y:l},a,d);f.movedLabel&&f.movedLabel.attr({opacity:0})}};f.prototype.render=function(c,a,d){var f=this.axis,h=f.horiz,p=this.pos,n=l(this.tickmarkOffset,f.tickmarkOffset);p=this.getPosition(h,
p,n,a);n=p.x;var k=p.y;f=h&&n===f.pos+f.len||!h&&k===f.pos?-1:1;h=l(d,this.label&&this.label.newOpacity,1);d=l(d,1);this.isActive=!0;this.renderGridLine(a,d,f);this.renderMark(p,d,f);this.renderLabel(p,a,h,c);this.isNew=!1;m(this,"afterRender")};f.prototype.renderGridLine=function(c,a,d){var f=this.axis,h=f.options,p={},n=this.pos,k=this.type,b=l(this.tickmarkOffset,f.tickmarkOffset),g=f.chart.renderer,e=this.gridLine,D=h.gridLineWidth,H=h.gridLineColor,v=h.gridLineDashStyle;"minor"===this.type&&
(D=h.minorGridLineWidth,H=h.minorGridLineColor,v=h.minorGridLineDashStyle);e||(f.chart.styledMode||(p.stroke=H,p["stroke-width"]=D||0,p.dashstyle=v),k||(p.zIndex=1),c&&(a=0),this.gridLine=e=g.path().attr(p).addClass("highcharts-"+(k?k+"-":"")+"grid-line").add(f.gridGroup));if(e&&(d=f.getPlotLinePath({value:n+b,lineWidth:e.strokeWidth()*d,force:"pass",old:c})))e[c||this.isNew?"attr":"animate"]({d:d,opacity:a})};f.prototype.renderMark=function(c,a,d){var f=this.axis,h=f.options,p=f.chart.renderer,n=
this.type,k=f.tickSize(n?n+"Tick":"tick"),b=c.x;c=c.y;var g=l(h["minor"!==n?"tickWidth":"minorTickWidth"],!n&&f.isXAxis?1:0);h=h["minor"!==n?"tickColor":"minorTickColor"];var e=this.mark,D=!e;k&&(f.opposite&&(k[0]=-k[0]),e||(this.mark=e=p.path().addClass("highcharts-"+(n?n+"-":"")+"tick").add(f.axisGroup),f.chart.styledMode||e.attr({stroke:h,"stroke-width":g})),e[D?"attr":"animate"]({d:this.getMarkPath(b,c,k[0],e.strokeWidth()*d,f.horiz,p),opacity:a}))};f.prototype.renderLabel=function(c,a,d,f){var p=
this.axis,m=p.horiz,n=p.options,k=this.label,b=n.labels,g=b.step;p=l(this.tickmarkOffset,p.tickmarkOffset);var e=c.x;c=c.y;var D=!0;k&&h(e)&&(k.xy=c=this.getLabelPosition(e,c,k,m,b,p,f,g),this.isFirst&&!this.isLast&&!n.showFirstLabel||this.isLast&&!this.isFirst&&!n.showLastLabel?D=!1:!m||b.step||b.rotation||a||0===d||this.handleOverflow(c),g&&f%g&&(D=!1),D&&h(c.y)?(c.opacity=d,k[this.isNewLabel?"attr":"animate"](c),this.isNewLabel=!1):(k.attr("y",-9999),this.isNewLabel=!0))};f.prototype.replaceMovedLabel=
function(){var c=this.label,a=this.axis,d=a.reversed;if(c&&!this.isNew){var f=a.horiz?d?a.left:a.width+a.left:c.xy.x;d=a.horiz?c.xy.y:d?a.width+a.top:a.top;c.animate({x:f,y:d,opacity:0},void 0,c.destroy);delete this.label}a.isDirty=!0;this.label=this.movedLabel;delete this.movedLabel};return f}();"";return t});L(a,"Core/Axis/Axis.js",[a["Core/Animation/AnimationUtilities.js"],a["Core/Axis/AxisDefaults.js"],a["Core/Color/Color.js"],a["Core/DefaultOptions.js"],a["Core/Foundation.js"],a["Core/Globals.js"],
a["Core/Axis/Tick.js"],a["Core/Utilities.js"]],function(a,t,A,G,x,C,I,z){var q=a.animObject,m=G.defaultOptions,h=x.registerEventOptions,d=C.deg2rad,c=z.arrayMax,l=z.arrayMin,f=z.clamp,w=z.correctFloat,p=z.defined,K=z.destroyObjectProperties,r=z.erase,y=z.error,B=z.extend,n=z.fireEvent,k=z.getMagnitude,b=z.isArray,g=z.isNumber,e=z.isString,D=z.merge,H=z.normalizeTickInterval,v=z.objectEach,E=z.pick,O=z.relativeLength,u=z.removeEvent,P=z.splat,U=z.syncTimeout;a=function(){function a(b,e){this.zoomEnabled=
this.width=this.visible=this.userOptions=this.translationSlope=this.transB=this.transA=this.top=this.ticks=this.tickRotCorr=this.tickPositions=this.tickmarkOffset=this.tickInterval=this.tickAmount=this.side=this.series=this.right=this.positiveValuesOnly=this.pos=this.pointRangePadding=this.pointRange=this.plotLinesAndBandsGroups=this.plotLinesAndBands=this.paddedTicks=this.overlap=this.options=this.offset=this.names=this.minPixelPadding=this.minorTicks=this.minorTickInterval=this.min=this.maxLabelLength=
this.max=this.len=this.left=this.labelFormatter=this.labelEdge=this.isLinked=this.height=this.hasVisibleSeries=this.hasNames=this.eventOptions=this.coll=this.closestPointRange=this.chart=this.categories=this.bottom=this.alternateBands=void 0;this.init(b,e)}a.prototype.init=function(b,e){var a=e.isX;this.chart=b;this.horiz=b.inverted&&!this.isZAxis?!a:a;this.isXAxis=a;this.coll=this.coll||(a?"xAxis":"yAxis");n(this,"init",{userOptions:e});this.opposite=E(e.opposite,this.opposite);this.side=E(e.side,
this.side,this.horiz?this.opposite?0:2:this.opposite?1:3);this.setOptions(e);var c=this.options,d=c.labels,k=c.type;this.userOptions=e;this.minPixelPadding=0;this.reversed=E(c.reversed,this.reversed);this.visible=c.visible;this.zoomEnabled=c.zoomEnabled;this.hasNames="category"===k||!0===c.categories;this.categories=c.categories||this.hasNames;this.names||(this.names=[],this.names.keys={});this.plotLinesAndBandsGroups={};this.positiveValuesOnly=!!this.logarithmic;this.isLinked=p(c.linkedTo);this.ticks=
{};this.labelEdge=[];this.minorTicks={};this.plotLinesAndBands=[];this.alternateBands={};this.len=0;this.minRange=this.userMinRange=c.minRange||c.maxZoom;this.range=c.range;this.offset=c.offset||0;this.min=this.max=null;e=E(c.crosshair,P(b.options.tooltip.crosshairs)[a?0:1]);this.crosshair=!0===e?{}:e;-1===b.axes.indexOf(this)&&(a?b.axes.splice(b.xAxis.length,0,this):b.axes.push(this),b[this.coll].push(this));this.series=this.series||[];b.inverted&&!this.isZAxis&&a&&"undefined"===typeof this.reversed&&
(this.reversed=!0);this.labelRotation=g(d.rotation)?d.rotation:void 0;h(this,c);n(this,"afterInit")};a.prototype.setOptions=function(b){this.options=D(t.defaultXAxisOptions,"yAxis"===this.coll&&t.defaultYAxisOptions,[t.defaultTopAxisOptions,t.defaultRightAxisOptions,t.defaultBottomAxisOptions,t.defaultLeftAxisOptions][this.side],D(m[this.coll],b));n(this,"afterSetOptions",{userOptions:b})};a.prototype.defaultLabelFormatter=function(b){var e=this.axis;b=this.chart.numberFormatter;var a=g(this.value)?
this.value:NaN,c=e.chart.time,d=this.dateTimeLabelFormat,k=m.lang,f=k.numericSymbols;k=k.numericSymbolMagnitude||1E3;var n=e.logarithmic?Math.abs(a):e.tickInterval,J=f&&f.length;if(e.categories)var h=""+this.value;else if(d)h=c.dateFormat(d,a);else if(J&&1E3<=n)for(;J--&&"undefined"===typeof h;)e=Math.pow(k,J+1),n>=e&&0===10*a%e&&null!==f[J]&&0!==a&&(h=b(a/e,-1)+f[J]);"undefined"===typeof h&&(h=1E4<=Math.abs(a)?b(a,-1):b(a,-1,void 0,""));return h};a.prototype.getSeriesExtremes=function(){var b=this,
e=b.chart,a;n(this,"getSeriesExtremes",null,function(){b.hasVisibleSeries=!1;b.dataMin=b.dataMax=b.threshold=null;b.softThreshold=!b.isXAxis;b.stacking&&b.stacking.buildStacks();b.series.forEach(function(c){if(c.visible||!e.options.chart.ignoreHiddenSeries){var d=c.options,k=d.threshold;b.hasVisibleSeries=!0;b.positiveValuesOnly&&0>=k&&(k=null);if(b.isXAxis){if(d=c.xData,d.length){d=b.logarithmic?d.filter(b.validatePositiveValue):d;a=c.getXExtremes(d);var f=a.min;var n=a.max;g(f)||f instanceof Date||
(d=d.filter(g),a=c.getXExtremes(d),f=a.min,n=a.max);d.length&&(b.dataMin=Math.min(E(b.dataMin,f),f),b.dataMax=Math.max(E(b.dataMax,n),n))}}else if(c=c.applyExtremes(),g(c.dataMin)&&(f=c.dataMin,b.dataMin=Math.min(E(b.dataMin,f),f)),g(c.dataMax)&&(n=c.dataMax,b.dataMax=Math.max(E(b.dataMax,n),n)),p(k)&&(b.threshold=k),!d.softThreshold||b.positiveValuesOnly)b.softThreshold=!1}})});n(this,"afterGetSeriesExtremes")};a.prototype.translate=function(b,e,a,c,d,k){var f=this.linkedParent||this,n=c&&f.old?
f.old.min:f.min,h=f.minPixelPadding;d=(f.isOrdinal||f.brokenAxis&&f.brokenAxis.hasBreaks||f.logarithmic&&d)&&f.lin2val;var v=1,J=0;c=c&&f.old?f.old.transA:f.transA;c||(c=f.transA);a&&(v*=-1,J=f.len);f.reversed&&(v*=-1,J-=v*(f.sector||f.len));e?(b=(b*v+J-h)/c+n,d&&(b=f.lin2val(b))):(d&&(b=f.val2lin(b)),b=g(n)?v*(b-n)*c+J+v*h+(g(k)?c*k:0):void 0);return b};a.prototype.toPixels=function(b,e){return this.translate(b,!1,!this.horiz,null,!0)+(e?0:this.pos)};a.prototype.toValue=function(b,e){return this.translate(b-
(e?0:this.pos),!0,!this.horiz,null,!0)};a.prototype.getPlotLinePath=function(b){function e(b,e,a){if("pass"!==H&&b<e||b>a)H?b=f(b,e,a):O=!0;return b}var a=this,c=a.chart,d=a.left,k=a.top,F=b.old,h=b.value,v=b.lineWidth,J=F&&c.oldChartHeight||c.chartHeight,l=F&&c.oldChartWidth||c.chartWidth,D=a.transB,p=b.translatedValue,H=b.force,m,r,B,q,O;b={value:h,lineWidth:v,old:F,force:H,acrossPanes:b.acrossPanes,translatedValue:p};n(this,"getPlotLinePath",b,function(b){p=E(p,a.translate(h,null,null,F));p=f(p,
-1E5,1E5);m=B=Math.round(p+D);r=q=Math.round(J-p-D);g(p)?a.horiz?(r=k,q=J-a.bottom,m=B=e(m,d,d+a.width)):(m=d,B=l-a.right,r=q=e(r,k,k+a.height)):(O=!0,H=!1);b.path=O&&!H?null:c.renderer.crispLine([["M",m,r],["L",B,q]],v||1)});return b.path};a.prototype.getLinearTickPositions=function(b,e,a){var c=w(Math.floor(e/b)*b);a=w(Math.ceil(a/b)*b);var d=[],g;w(c+b)===c&&(g=20);if(this.single)return[e];for(e=c;e<=a;){d.push(e);e=w(e+b,g);if(e===k)break;var k=e}return d};a.prototype.getMinorTickInterval=function(){var b=
this.options;return!0===b.minorTicks?E(b.minorTickInterval,"auto"):!1===b.minorTicks?null:b.minorTickInterval};a.prototype.getMinorTickPositions=function(){var b=this.options,e=this.tickPositions,a=this.minorTickInterval,c=this.pointRangePadding||0,d=this.min-c;c=this.max+c;var g=c-d,k=[];if(g&&g/a<this.len/3){var f=this.logarithmic;if(f)this.paddedTicks.forEach(function(b,e,c){e&&k.push.apply(k,f.getLogTickPositions(a,c[e-1],c[e],!0))});else if(this.dateTime&&"auto"===this.getMinorTickInterval())k=
k.concat(this.getTimeTicks(this.dateTime.normalizeTimeTickInterval(a),d,c,b.startOfWeek));else for(b=d+(e[0]-d)%a;b<=c&&b!==k[0];b+=a)k.push(b)}0!==k.length&&this.trimTicks(k);return k};a.prototype.adjustForMinRange=function(){var b=this.options,e=this.logarithmic,a=this.min,d=this.max,g=0,k,f,n,h;this.isXAxis&&"undefined"===typeof this.minRange&&!e&&(p(b.min)||p(b.max)||p(b.floor)||p(b.ceiling)?this.minRange=null:(this.series.forEach(function(b){n=b.xData;h=b.xIncrement?1:n.length-1;if(1<n.length)for(k=
h;0<k;k--)if(f=n[k]-n[k-1],!g||f<g)g=f}),this.minRange=Math.min(5*g,this.dataMax-this.dataMin)));if(d-a<this.minRange){var v=this.dataMax-this.dataMin>=this.minRange;var D=this.minRange;var H=(D-d+a)/2;H=[a-H,E(b.min,a-H)];v&&(H[2]=this.logarithmic?this.logarithmic.log2lin(this.dataMin):this.dataMin);a=c(H);d=[a+D,E(b.max,a+D)];v&&(d[2]=e?e.log2lin(this.dataMax):this.dataMax);d=l(d);d-a<D&&(H[0]=d-D,H[1]=E(b.min,d-D),a=c(H))}this.min=a;this.max=d};a.prototype.getClosest=function(){var b;this.categories?
b=1:this.series.forEach(function(e){var a=e.closestPointRange,c=e.visible||!e.chart.options.chart.ignoreHiddenSeries;!e.noSharedTooltip&&p(a)&&c&&(b=p(b)?Math.min(b,a):a)});return b};a.prototype.nameToX=function(e){var a=b(this.categories),c=a?this.categories:this.names,d=e.options.x;e.series.requireSorting=!1;p(d)||(d=this.options.uniqueNames?a?c.indexOf(e.name):E(c.keys[e.name],-1):e.series.autoIncrement());if(-1===d){if(!a)var g=c.length}else g=d;"undefined"!==typeof g&&(this.names[g]=e.name,this.names.keys[e.name]=
g);return g};a.prototype.updateNames=function(){var b=this,e=this.names;0<e.length&&(Object.keys(e.keys).forEach(function(b){delete e.keys[b]}),e.length=0,this.minRange=this.userMinRange,(this.series||[]).forEach(function(e){e.xIncrement=null;if(!e.points||e.isDirtyData)b.max=Math.max(b.max,e.xData.length-1),e.processData(),e.generatePoints();e.data.forEach(function(a,c){if(a&&a.options&&"undefined"!==typeof a.name){var d=b.nameToX(a);"undefined"!==typeof d&&d!==a.x&&(a.x=d,e.xData[c]=d)}})}))};a.prototype.setAxisTranslation=
function(){var b=this,a=b.max-b.min,c=b.linkedParent,d=!!b.categories,g=b.isXAxis,k=b.axisPointRange||0,f=0,h=0,v=b.transA;if(g||d||k){var D=b.getClosest();c?(f=c.minPointOffset,h=c.pointRangePadding):b.series.forEach(function(a){var c=d?1:g?E(a.options.pointRange,D,0):b.axisPointRange||0,n=a.options.pointPlacement;k=Math.max(k,c);if(!b.single||d)a=a.is("xrange")?!g:g,f=Math.max(f,a&&e(n)?0:c/2),h=Math.max(h,a&&"on"===n?0:c)});c=b.ordinal&&b.ordinal.slope&&D?b.ordinal.slope/D:1;b.minPointOffset=f*=
c;b.pointRangePadding=h*=c;b.pointRange=Math.min(k,b.single&&d?1:a);g&&(b.closestPointRange=D)}b.translationSlope=b.transA=v=b.staticScale||b.len/(a+h||1);b.transB=b.horiz?b.left:b.bottom;b.minPixelPadding=v*f;n(this,"afterSetAxisTranslation")};a.prototype.minFromRange=function(){return this.max-this.range};a.prototype.setTickInterval=function(b){var e=this.chart,a=this.logarithmic,c=this.options,d=this.isXAxis,f=this.isLinked,h=c.tickPixelInterval,v=this.categories,D=this.softThreshold,l=c.maxPadding,
J=c.minPadding,m=g(c.tickInterval)&&0<=c.tickInterval?c.tickInterval:void 0,r=g(this.threshold)?this.threshold:null;this.dateTime||v||f||this.getTickAmount();var B=E(this.userMin,c.min);var q=E(this.userMax,c.max);if(f){this.linkedParent=e[this.coll][c.linkedTo];var O=this.linkedParent.getExtremes();this.min=E(O.min,O.dataMin);this.max=E(O.max,O.dataMax);c.type!==this.linkedParent.options.type&&y(11,1,e)}else{if(D&&p(r))if(this.dataMin>=r)O=r,J=0;else if(this.dataMax<=r){var K=r;l=0}this.min=E(B,
O,this.dataMin);this.max=E(q,K,this.dataMax)}a&&(this.positiveValuesOnly&&!b&&0>=Math.min(this.min,E(this.dataMin,this.min))&&y(10,1,e),this.min=w(a.log2lin(this.min),16),this.max=w(a.log2lin(this.max),16));this.range&&p(this.max)&&(this.userMin=this.min=B=Math.max(this.dataMin,this.minFromRange()),this.userMax=q=this.max,this.range=null);n(this,"foundExtremes");this.beforePadding&&this.beforePadding();this.adjustForMinRange();!(v||this.axisPointRange||this.stacking&&this.stacking.usePercentage||
f)&&p(this.min)&&p(this.max)&&(e=this.max-this.min)&&(!p(B)&&J&&(this.min-=e*J),!p(q)&&l&&(this.max+=e*l));g(this.userMin)||(g(c.softMin)&&c.softMin<this.min&&(this.min=B=c.softMin),g(c.floor)&&(this.min=Math.max(this.min,c.floor)));g(this.userMax)||(g(c.softMax)&&c.softMax>this.max&&(this.max=q=c.softMax),g(c.ceiling)&&(this.max=Math.min(this.max,c.ceiling)));D&&p(this.dataMin)&&(r=r||0,!p(B)&&this.min<r&&this.dataMin>=r?this.min=this.options.minRange?Math.min(r,this.max-this.minRange):r:!p(q)&&
this.max>r&&this.dataMax<=r&&(this.max=this.options.minRange?Math.max(r,this.min+this.minRange):r));g(this.min)&&g(this.max)&&!this.chart.polar&&this.min>this.max&&(p(this.options.min)?this.max=this.min:p(this.options.max)&&(this.min=this.max));this.tickInterval=this.min===this.max||"undefined"===typeof this.min||"undefined"===typeof this.max?1:f&&this.linkedParent&&!m&&h===this.linkedParent.options.tickPixelInterval?m=this.linkedParent.tickInterval:E(m,this.tickAmount?(this.max-this.min)/Math.max(this.tickAmount-
1,1):void 0,v?1:(this.max-this.min)*h/Math.max(this.len,h));if(d&&!b){var u=this.min!==(this.old&&this.old.min)||this.max!==(this.old&&this.old.max);this.series.forEach(function(b){b.forceCrop=b.forceCropping&&b.forceCropping();b.processData(u)});n(this,"postProcessData",{hasExtemesChanged:u})}this.setAxisTranslation();n(this,"initialAxisTranslation");this.pointRange&&!m&&(this.tickInterval=Math.max(this.pointRange,this.tickInterval));b=E(c.minTickInterval,this.dateTime&&!this.series.some(function(b){return b.noSharedTooltip})?
this.closestPointRange:0);!m&&this.tickInterval<b&&(this.tickInterval=b);this.dateTime||this.logarithmic||m||(this.tickInterval=H(this.tickInterval,void 0,k(this.tickInterval),E(c.allowDecimals,.5>this.tickInterval||void 0!==this.tickAmount),!!this.tickAmount));this.tickAmount||(this.tickInterval=this.unsquish());this.setTickPositions()};a.prototype.setTickPositions=function(){var b=this.options,e=b.tickPositions,a=this.getMinorTickInterval(),c=this.hasVerticalPanning(),d="colorAxis"===this.coll,
g=(d||!c)&&b.startOnTick;c=(d||!c)&&b.endOnTick;d=b.tickPositioner;this.tickmarkOffset=this.categories&&"between"===b.tickmarkPlacement&&1===this.tickInterval?.5:0;this.minorTickInterval="auto"===a&&this.tickInterval?this.tickInterval/5:a;this.single=this.min===this.max&&p(this.min)&&!this.tickAmount&&(parseInt(this.min,10)===this.min||!1!==b.allowDecimals);this.tickPositions=a=e&&e.slice();!a&&(this.ordinal&&this.ordinal.positions||!((this.max-this.min)/this.tickInterval>Math.max(2*this.len,200))?
a=this.dateTime?this.getTimeTicks(this.dateTime.normalizeTimeTickInterval(this.tickInterval,b.units),this.min,this.max,b.startOfWeek,this.ordinal&&this.ordinal.positions,this.closestPointRange,!0):this.logarithmic?this.logarithmic.getLogTickPositions(this.tickInterval,this.min,this.max):this.getLinearTickPositions(this.tickInterval,this.min,this.max):(a=[this.min,this.max],y(19,!1,this.chart)),a.length>this.len&&(a=[a[0],a.pop()],a[0]===a[1]&&(a.length=1)),this.tickPositions=a,d&&(d=d.apply(this,
[this.min,this.max])))&&(this.tickPositions=a=d);this.paddedTicks=a.slice(0);this.trimTicks(a,g,c);this.isLinked||(this.single&&2>a.length&&!this.categories&&!this.series.some(function(b){return b.is("heatmap")&&"between"===b.options.pointPlacement})&&(this.min-=.5,this.max+=.5),e||d||this.adjustTickAmount());n(this,"afterSetTickPositions")};a.prototype.trimTicks=function(b,e,a){var c=b[0],d=b[b.length-1],g=!this.isOrdinal&&this.minPointOffset||0;n(this,"trimTicks");if(!this.isLinked){if(e&&-Infinity!==
c)this.min=c;else for(;this.min-g>b[0];)b.shift();if(a)this.max=d;else for(;this.max+g<b[b.length-1];)b.pop();0===b.length&&p(c)&&!this.options.tickPositions&&b.push((d+c)/2)}};a.prototype.alignToOthers=function(){var b={},e=this.options,a;!1!==this.chart.options.chart.alignTicks&&e.alignTicks&&!1!==e.startOnTick&&!1!==e.endOnTick&&!this.logarithmic&&this.chart[this.coll].forEach(function(e){var c=e.options;c=[e.horiz?c.left:c.top,c.width,c.height,c.pane].join();e.series.length&&(b[c]?a=!0:b[c]=1)});
return a};a.prototype.getTickAmount=function(){var b=this.options,e=b.tickPixelInterval,a=b.tickAmount;!p(b.tickInterval)&&!a&&this.len<e&&!this.isRadial&&!this.logarithmic&&b.startOnTick&&b.endOnTick&&(a=2);!a&&this.alignToOthers()&&(a=Math.ceil(this.len/e)+1);4>a&&(this.finalTickAmt=a,a=5);this.tickAmount=a};a.prototype.adjustTickAmount=function(){var b=this.options,e=this.tickInterval,a=this.tickPositions,c=this.tickAmount,d=this.finalTickAmt,k=a&&a.length,f=E(this.threshold,this.softThreshold?
0:null);if(this.hasData()&&g(this.min)&&g(this.max)){if(k<c){for(;a.length<c;)a.length%2||this.min===f?a.push(w(a[a.length-1]+e)):a.unshift(w(a[0]-e));this.transA*=(k-1)/(c-1);this.min=b.startOnTick?a[0]:Math.min(this.min,a[0]);this.max=b.endOnTick?a[a.length-1]:Math.max(this.max,a[a.length-1])}else k>c&&(this.tickInterval*=2,this.setTickPositions());if(p(d)){for(e=b=a.length;e--;)(3===d&&1===e%2||2>=d&&0<e&&e<b-1)&&a.splice(e,1);this.finalTickAmt=void 0}}};a.prototype.setScale=function(){var b=!1,
e=!1;this.series.forEach(function(a){b=b||a.isDirtyData||a.isDirty;e=e||a.xAxis&&a.xAxis.isDirty||!1});this.setAxisSize();var a=this.len!==(this.old&&this.old.len);a||b||e||this.isLinked||this.forceRedraw||this.userMin!==(this.old&&this.old.userMin)||this.userMax!==(this.old&&this.old.userMax)||this.alignToOthers()?(this.stacking&&this.stacking.resetStacks(),this.forceRedraw=!1,this.getSeriesExtremes(),this.setTickInterval(),this.isDirty||(this.isDirty=a||this.min!==(this.old&&this.old.min)||this.max!==
(this.old&&this.old.max))):this.stacking&&this.stacking.cleanStacks();b&&this.panningState&&(this.panningState.isDirty=!0);n(this,"afterSetScale")};a.prototype.setExtremes=function(b,e,a,c,d){var g=this,k=g.chart;a=E(a,!0);g.series.forEach(function(b){delete b.kdTree});d=B(d,{min:b,max:e});n(g,"setExtremes",d,function(){g.userMin=b;g.userMax=e;g.eventArgs=d;a&&k.redraw(c)})};a.prototype.zoom=function(b,e){var a=this,c=this.dataMin,d=this.dataMax,g=this.options,k=Math.min(c,E(g.min,c)),f=Math.max(d,
E(g.max,d));b={newMin:b,newMax:e};n(this,"zoom",b,function(b){var e=b.newMin,g=b.newMax;if(e!==a.min||g!==a.max)a.allowZoomOutside||(p(c)&&(e<k&&(e=k),e>f&&(e=f)),p(d)&&(g<k&&(g=k),g>f&&(g=f))),a.displayBtn="undefined"!==typeof e||"undefined"!==typeof g,a.setExtremes(e,g,!1,void 0,{trigger:"zoom"});b.zoomed=!0});return b.zoomed};a.prototype.setAxisSize=function(){var b=this.chart,e=this.options,a=e.offsets||[0,0,0,0],c=this.horiz,d=this.width=Math.round(O(E(e.width,b.plotWidth-a[3]+a[1]),b.plotWidth)),
g=this.height=Math.round(O(E(e.height,b.plotHeight-a[0]+a[2]),b.plotHeight)),k=this.top=Math.round(O(E(e.top,b.plotTop+a[0]),b.plotHeight,b.plotTop));e=this.left=Math.round(O(E(e.left,b.plotLeft+a[3]),b.plotWidth,b.plotLeft));this.bottom=b.chartHeight-g-k;this.right=b.chartWidth-d-e;this.len=Math.max(c?d:g,0);this.pos=c?e:k};a.prototype.getExtremes=function(){var b=this.logarithmic;return{min:b?w(b.lin2log(this.min)):this.min,max:b?w(b.lin2log(this.max)):this.max,dataMin:this.dataMin,dataMax:this.dataMax,
userMin:this.userMin,userMax:this.userMax}};a.prototype.getThreshold=function(b){var e=this.logarithmic,a=e?e.lin2log(this.min):this.min;e=e?e.lin2log(this.max):this.max;null===b||-Infinity===b?b=a:Infinity===b?b=e:a>b?b=a:e<b&&(b=e);return this.translate(b,0,1,0,1)};a.prototype.autoLabelAlign=function(b){var e=(E(b,0)-90*this.side+720)%360;b={align:"center"};n(this,"autoLabelAlign",b,function(b){15<e&&165>e?b.align="right":195<e&&345>e&&(b.align="left")});return b.align};a.prototype.tickSize=function(b){var e=
this.options,a=E(e["tick"===b?"tickWidth":"minorTickWidth"],"tick"===b&&this.isXAxis&&!this.categories?1:0),c=e["tick"===b?"tickLength":"minorTickLength"];if(a&&c){"inside"===e[b+"Position"]&&(c=-c);var d=[c,a]}b={tickSize:d};n(this,"afterTickSize",b);return b.tickSize};a.prototype.labelMetrics=function(){var b=this.tickPositions&&this.tickPositions[0]||0;return this.chart.renderer.fontMetrics(this.options.labels.style.fontSize,this.ticks[b]&&this.ticks[b].label)};a.prototype.unsquish=function(){var b=
this.options.labels,e=this.horiz,a=this.tickInterval,c=this.len/(((this.categories?1:0)+this.max-this.min)/a),k=b.rotation,f=this.labelMetrics(),n=Math.max(this.max-this.min,0),h=function(b){var e=b/(c||1);e=1<e?Math.ceil(e):1;e*a>n&&Infinity!==b&&Infinity!==c&&n&&(e=Math.ceil(n/a));return w(e*a)},v=a,D,l,H=Number.MAX_VALUE;if(e){if(!b.staggerLines&&!b.step)if(g(k))var p=[k];else c<b.autoRotationLimit&&(p=b.autoRotation);p&&p.forEach(function(b){if(b===k||b&&-90<=b&&90>=b){l=h(Math.abs(f.h/Math.sin(d*
b)));var e=l+Math.abs(b/360);e<H&&(H=e,D=b,v=l)}})}else b.step||(v=h(f.h));this.autoRotation=p;this.labelRotation=E(D,g(k)?k:0);return v};a.prototype.getSlotWidth=function(b){var e=this.chart,a=this.horiz,c=this.options.labels,d=Math.max(this.tickPositions.length-(this.categories?0:1),1),k=e.margin[3];if(b&&g(b.slotWidth))return b.slotWidth;if(a&&2>c.step)return c.rotation?0:(this.staggerLines||1)*this.len/d;if(!a){b=c.style.width;if(void 0!==b)return parseInt(String(b),10);if(k)return k-e.spacing[3]}return.33*
e.chartWidth};a.prototype.renderUnsquish=function(){var b=this.chart,a=b.renderer,c=this.tickPositions,d=this.ticks,g=this.options.labels,k=g.style,f=this.horiz,n=this.getSlotWidth(),h=Math.max(1,Math.round(n-2*g.padding)),v={},D=this.labelMetrics(),l=k.textOverflow,H=0;e(g.rotation)||(v.rotation=g.rotation||0);c.forEach(function(b){b=d[b];b.movedLabel&&b.replaceMovedLabel();b&&b.label&&b.label.textPxLength>H&&(H=b.label.textPxLength)});this.maxLabelLength=H;if(this.autoRotation)H>h&&H>D.h?v.rotation=
this.labelRotation:this.labelRotation=0;else if(n){var p=h;if(!l){var m="clip";for(h=c.length;!f&&h--;){var E=c[h];if(E=d[E].label)E.styles&&"ellipsis"===E.styles.textOverflow?E.css({textOverflow:"clip"}):E.textPxLength>n&&E.css({width:n+"px"}),E.getBBox().height>this.len/c.length-(D.h-D.f)&&(E.specificTextOverflow="ellipsis")}}}v.rotation&&(p=H>.5*b.chartHeight?.33*b.chartHeight:H,l||(m="ellipsis"));if(this.labelAlign=g.align||this.autoLabelAlign(this.labelRotation))v.align=this.labelAlign;c.forEach(function(b){var e=
(b=d[b])&&b.label,a=k.width,c={};e&&(e.attr(v),b.shortenLabel?b.shortenLabel():p&&!a&&"nowrap"!==k.whiteSpace&&(p<e.textPxLength||"SPAN"===e.element.tagName)?(c.width=p+"px",l||(c.textOverflow=e.specificTextOverflow||m),e.css(c)):e.styles&&e.styles.width&&!c.width&&!a&&e.css({width:null}),delete e.specificTextOverflow,b.rotation=v.rotation)},this);this.tickRotCorr=a.rotCorr(D.b,this.labelRotation||0,0!==this.side)};a.prototype.hasData=function(){return this.series.some(function(b){return b.hasData()})||
this.options.showEmpty&&p(this.min)&&p(this.max)};a.prototype.addTitle=function(b){var e=this.chart.renderer,a=this.horiz,c=this.opposite,d=this.options.title,g=this.chart.styledMode,k;this.axisTitle||((k=d.textAlign)||(k=(a?{low:"left",middle:"center",high:"right"}:{low:c?"right":"left",middle:"center",high:c?"left":"right"})[d.align]),this.axisTitle=e.text(d.text||"",0,0,d.useHTML).attr({zIndex:7,rotation:d.rotation,align:k}).addClass("highcharts-axis-title"),g||this.axisTitle.css(D(d.style)),this.axisTitle.add(this.axisGroup),
this.axisTitle.isNew=!0);g||d.style.width||this.isRadial||this.axisTitle.css({width:this.len+"px"});this.axisTitle[b?"show":"hide"](b)};a.prototype.generateTick=function(b){var e=this.ticks;e[b]?e[b].addLabel():e[b]=new I(this,b)};a.prototype.getOffset=function(){var b=this,e=this,a=e.chart,c=e.horiz,d=e.options,g=e.side,k=e.ticks,f=e.tickPositions,h=e.coll,D=e.axisParent,l=a.renderer,H=a.inverted&&!e.isZAxis?[1,0,3,2][g]:g,m=e.hasData(),r=d.title,B=d.labels,q=a.axisOffset;a=a.clipOffset;var O=[-1,
1,1,-1][g],w=d.className,y,K=0,ja=0,ca=0;e.showAxis=y=m||d.showEmpty;e.staggerLines=e.horiz&&B.staggerLines||void 0;if(!e.axisGroup){var u=function(e,a,c){return l.g(e).attr({zIndex:c}).addClass("highcharts-"+h.toLowerCase()+a+" "+(b.isRadial?"highcharts-radial-axis"+a+" ":"")+(w||"")).add(D)};e.gridGroup=u("grid","-grid",d.gridZIndex);e.axisGroup=u("axis","",d.zIndex);e.labelGroup=u("axis-labels","-labels",B.zIndex)}m||e.isLinked?(f.forEach(function(b){e.generateTick(b)}),e.renderUnsquish(),e.reserveSpaceDefault=
0===g||2===g||{1:"left",3:"right"}[g]===e.labelAlign,E(B.reserveSpace,"center"===e.labelAlign?!0:null,e.reserveSpaceDefault)&&f.forEach(function(b){ca=Math.max(k[b].getLabelSize(),ca)}),e.staggerLines&&(ca*=e.staggerLines),e.labelOffset=ca*(e.opposite?-1:1)):v(k,function(b,e){b.destroy();delete k[e]});if(r&&r.text&&!1!==r.enabled&&(e.addTitle(y),y&&!1!==r.reserveSpace)){e.titleOffset=K=e.axisTitle.getBBox()[c?"height":"width"];var P=r.offset;ja=p(P)?0:E(r.margin,c?5:10)}e.renderLine();e.offset=O*
E(d.offset,q[g]?q[g]+(d.margin||0):0);e.tickRotCorr=e.tickRotCorr||{x:0,y:0};r=0===g?-e.labelMetrics().h:2===g?e.tickRotCorr.y:0;m=Math.abs(ca)+ja;ca&&(m=m-r+O*(c?E(B.y,e.tickRotCorr.y+8*O):B.x));e.axisTitleMargin=E(P,m);e.getMaxLabelDimensions&&(e.maxLabelDimensions=e.getMaxLabelDimensions(k,f));"colorAxis"!==h&&(c=this.tickSize("tick"),q[g]=Math.max(q[g],(e.axisTitleMargin||0)+K+O*e.offset,m,f&&f.length&&c?c[0]+O*e.offset:0),d=!e.axisLine||d.offset?0:2*Math.floor(e.axisLine.strokeWidth()/2),a[H]=
Math.max(a[H],d));n(this,"afterGetOffset")};a.prototype.getLinePath=function(b){var e=this.chart,a=this.opposite,c=this.offset,d=this.horiz,g=this.left+(a?this.width:0)+c;c=e.chartHeight-this.bottom-(a?this.height:0)+c;a&&(b*=-1);return e.renderer.crispLine([["M",d?this.left:g,d?c:this.top],["L",d?e.chartWidth-this.right:g,d?c:e.chartHeight-this.bottom]],b)};a.prototype.renderLine=function(){this.axisLine||(this.axisLine=this.chart.renderer.path().addClass("highcharts-axis-line").add(this.axisGroup),
this.chart.styledMode||this.axisLine.attr({stroke:this.options.lineColor,"stroke-width":this.options.lineWidth,zIndex:7}))};a.prototype.getTitlePosition=function(){var b=this.horiz,e=this.left,a=this.top,c=this.len,d=this.options.title,g=b?e:a,k=this.opposite,f=this.offset,h=d.x,v=d.y,D=this.axisTitle,l=this.chart.renderer.fontMetrics(d.style.fontSize,D);D=Math.max(D.getBBox(null,0).height-l.h-1,0);c={low:g+(b?0:c),middle:g+c/2,high:g+(b?c:0)}[d.align];e=(b?a+this.height:e)+(b?1:-1)*(k?-1:1)*this.axisTitleMargin+
[-D,D,l.f,-D][this.side];b={x:b?c+h:e+(k?this.width:0)+f+h,y:b?e+v-(k?this.height:0)+f:c+v};n(this,"afterGetTitlePosition",{titlePosition:b});return b};a.prototype.renderMinorTick=function(b,e){var a=this.minorTicks;a[b]||(a[b]=new I(this,b,"minor"));e&&a[b].isNew&&a[b].render(null,!0);a[b].render(null,!1,1)};a.prototype.renderTick=function(b,e,a){var c=this.ticks;if(!this.isLinked||b>=this.min&&b<=this.max||this.grid&&this.grid.isColumn)c[b]||(c[b]=new I(this,b)),a&&c[b].isNew&&c[b].render(e,!0,
-1),c[b].render(e)};a.prototype.render=function(){var b=this,e=b.chart,a=b.logarithmic,c=b.options,d=b.isLinked,k=b.tickPositions,f=b.axisTitle,h=b.ticks,D=b.minorTicks,l=b.alternateBands,H=c.stackLabels,p=c.alternateGridColor,m=b.tickmarkOffset,E=b.axisLine,r=b.showAxis,B=q(e.renderer.globalAnimation),O,w;b.labelEdge.length=0;b.overlap=!1;[h,D,l].forEach(function(b){v(b,function(b){b.isActive=!1})});if(b.hasData()||d){var y=b.chart.hasRendered&&b.old&&g(b.old.min);b.minorTickInterval&&!b.categories&&
b.getMinorTickPositions().forEach(function(e){b.renderMinorTick(e,y)});k.length&&(k.forEach(function(e,a){b.renderTick(e,a,y)}),m&&(0===b.min||b.single)&&(h[-1]||(h[-1]=new I(b,-1,null,!0)),h[-1].render(-1)));p&&k.forEach(function(c,d){w="undefined"!==typeof k[d+1]?k[d+1]+m:b.max-m;0===d%2&&c<b.max&&w<=b.max+(e.polar?-m:m)&&(l[c]||(l[c]=new C.PlotLineOrBand(b)),O=c+m,l[c].options={from:a?a.lin2log(O):O,to:a?a.lin2log(w):w,color:p,className:"highcharts-alternate-grid"},l[c].render(),l[c].isActive=
!0)});b._addedPlotLB||(b._addedPlotLB=!0,(c.plotLines||[]).concat(c.plotBands||[]).forEach(function(e){b.addPlotBandOrLine(e)}))}[h,D,l].forEach(function(b){var a=[],c=B.duration;v(b,function(b,e){b.isActive||(b.render(e,!1,0),b.isActive=!1,a.push(e))});U(function(){for(var e=a.length;e--;)b[a[e]]&&!b[a[e]].isActive&&(b[a[e]].destroy(),delete b[a[e]])},b!==l&&e.hasRendered&&c?c:0)});E&&(E[E.isPlaced?"animate":"attr"]({d:this.getLinePath(E.strokeWidth())}),E.isPlaced=!0,E[r?"show":"hide"](r));f&&r&&
(c=b.getTitlePosition(),g(c.y)?(f[f.isNew?"attr":"animate"](c),f.isNew=!1):(f.attr("y",-9999),f.isNew=!0));H&&H.enabled&&b.stacking&&b.stacking.renderStackTotals();b.old={len:b.len,max:b.max,min:b.min,transA:b.transA,userMax:b.userMax,userMin:b.userMin};b.isDirty=!1;n(this,"afterRender")};a.prototype.redraw=function(){this.visible&&(this.render(),this.plotLinesAndBands.forEach(function(b){b.render()}));this.series.forEach(function(b){b.isDirty=!0})};a.prototype.getKeepProps=function(){return this.keepProps||
a.keepProps};a.prototype.destroy=function(b){var e=this,a=e.plotLinesAndBands,c=this.eventOptions;n(this,"destroy",{keepEvents:b});b||u(e);[e.ticks,e.minorTicks,e.alternateBands].forEach(function(b){K(b)});if(a)for(b=a.length;b--;)a[b].destroy();"axisLine axisTitle axisGroup gridGroup labelGroup cross scrollbar".split(" ").forEach(function(b){e[b]&&(e[b]=e[b].destroy())});for(var d in e.plotLinesAndBandsGroups)e.plotLinesAndBandsGroups[d]=e.plotLinesAndBandsGroups[d].destroy();v(e,function(b,a){-1===
e.getKeepProps().indexOf(a)&&delete e[a]});this.eventOptions=c};a.prototype.drawCrosshair=function(b,e){var a=this.crosshair,c=E(a&&a.snap,!0),d=this.chart,g,k=this.cross;n(this,"drawCrosshair",{e:b,point:e});b||(b=this.cross&&this.cross.e);if(a&&!1!==(p(e)||!c)){c?p(e)&&(g=E("colorAxis"!==this.coll?e.crosshairPos:null,this.isXAxis?e.plotX:this.len-e.plotY)):g=b&&(this.horiz?b.chartX-this.pos:this.len-b.chartY+this.pos);if(p(g)){var f={value:e&&(this.isXAxis?e.x:E(e.stackY,e.y)),translatedValue:g};
d.polar&&B(f,{isCrosshair:!0,chartX:b&&b.chartX,chartY:b&&b.chartY,point:e});f=this.getPlotLinePath(f)||null}if(!p(f)){this.hideCrosshair();return}c=this.categories&&!this.isRadial;k||(this.cross=k=d.renderer.path().addClass("highcharts-crosshair highcharts-crosshair-"+(c?"category ":"thin ")+(a.className||"")).attr({zIndex:E(a.zIndex,2)}).add(),d.styledMode||(k.attr({stroke:a.color||(c?A.parse("#ccd6eb").setOpacity(.25).get():"#cccccc"),"stroke-width":E(a.width,1)}).css({"pointer-events":"none"}),
a.dashStyle&&k.attr({dashstyle:a.dashStyle})));k.show().attr({d:f});c&&!a.width&&k.attr({"stroke-width":this.transA});this.cross.e=b}else this.hideCrosshair();n(this,"afterDrawCrosshair",{e:b,point:e})};a.prototype.hideCrosshair=function(){this.cross&&this.cross.hide();n(this,"afterHideCrosshair")};a.prototype.hasVerticalPanning=function(){var b=this.chart.options.chart.panning;return!!(b&&b.enabled&&/y/.test(b.type))};a.prototype.validatePositiveValue=function(b){return g(b)&&0<b};a.prototype.update=
function(b,e){var a=this.chart;b=D(this.userOptions,b);this.destroy(!0);this.init(a,b);a.isDirtyBox=!0;E(e,!0)&&a.redraw()};a.prototype.remove=function(b){for(var e=this.chart,a=this.coll,c=this.series,d=c.length;d--;)c[d]&&c[d].remove(!1);r(e.axes,this);r(e[a],this);e[a].forEach(function(b,e){b.options.index=b.userOptions.index=e});this.destroy();e.isDirtyBox=!0;E(b,!0)&&e.redraw()};a.prototype.setTitle=function(b,e){this.update({title:b},e)};a.prototype.setCategories=function(b,e){this.update({categories:b},
e)};a.defaultOptions=t.defaultXAxisOptions;a.keepProps="extKey hcEvents names series userMax userMin".split(" ");return a}();"";return a});L(a,"Core/Axis/DateTimeAxis.js",[a["Core/Utilities.js"]],function(a){var u=a.addEvent,A=a.getMagnitude,G=a.normalizeTickInterval,x=a.timeUnits,C;(function(a){function t(){return this.chart.time.getTimeTicks.apply(this.chart.time,arguments)}function q(a){"datetime"!==a.userOptions.type?this.dateTime=void 0:this.dateTime||(this.dateTime=new h(this))}var m=[];a.compose=
function(a){-1===m.indexOf(a)&&(m.push(a),a.keepProps.push("dateTime"),a.prototype.getTimeTicks=t,u(a,"init",q));return a};var h=function(){function a(a){this.axis=a}a.prototype.normalizeTimeTickInterval=function(a,d){var c=d||[["millisecond",[1,2,5,10,20,25,50,100,200,500]],["second",[1,2,5,10,15,30]],["minute",[1,2,5,10,15,30]],["hour",[1,2,3,4,6,8,12]],["day",[1,2]],["week",[1,2]],["month",[1,2,3,4,6]],["year",null]];d=c[c.length-1];var h=x[d[0]],l=d[1],m;for(m=0;m<c.length&&!(d=c[m],h=x[d[0]],
l=d[1],c[m+1]&&a<=(h*l[l.length-1]+x[c[m+1][0]])/2);m++);h===x.year&&a<5*h&&(l=[1,2,5]);a=G(a/h,l,"year"===d[0]?Math.max(A(a/h),1):1);return{unitRange:h,count:a,unitName:d[0]}};a.prototype.getXDateFormat=function(a,d){var c=this.axis;return c.closestPointRange?c.chart.time.getDateFormat(c.closestPointRange,a,c.options.startOfWeek,d)||d.year:d.day};return a}();a.Additions=h})(C||(C={}));return C});L(a,"Core/Axis/LogarithmicAxis.js",[a["Core/Utilities.js"]],function(a){var u=a.addEvent,A=a.getMagnitude,
G=a.normalizeTickInterval,x=a.pick,C;(function(a){function t(a){var c=this.logarithmic;"logarithmic"!==a.userOptions.type?this.logarithmic=void 0:c||(this.logarithmic=new h(this))}function q(){var a=this.logarithmic;a&&(this.lin2val=function(c){return a.lin2log(c)},this.val2lin=function(c){return a.log2lin(c)})}var m=[];a.compose=function(a){-1===m.indexOf(a)&&(m.push(a),a.keepProps.push("logarithmic"),u(a,"init",t),u(a,"afterInit",q));return a};var h=function(){function a(a){this.axis=a}a.prototype.getLogTickPositions=
function(a,d,f,h){var c=this.axis,l=c.len,m=c.options,q=[];h||(this.minorAutoInterval=void 0);if(.5<=a)a=Math.round(a),q=c.getLinearTickPositions(a,d,f);else if(.08<=a){var B=Math.floor(d),n,k=m=void 0;for(l=.3<a?[1,2,4]:.15<a?[1,2,4,6,8]:[1,2,3,4,5,6,7,8,9];B<f+1&&!k;B++){var b=l.length;for(n=0;n<b&&!k;n++){var g=this.log2lin(this.lin2log(B)*l[n]);g>d&&(!h||m<=f)&&"undefined"!==typeof m&&q.push(m);m>f&&(k=!0);m=g}}}else d=this.lin2log(d),f=this.lin2log(f),a=h?c.getMinorTickInterval():m.tickInterval,
a=x("auto"===a?null:a,this.minorAutoInterval,m.tickPixelInterval/(h?5:1)*(f-d)/((h?l/c.tickPositions.length:l)||1)),a=G(a,void 0,A(a)),q=c.getLinearTickPositions(a,d,f).map(this.log2lin),h||(this.minorAutoInterval=a/5);h||(c.tickInterval=a);return q};a.prototype.lin2log=function(a){return Math.pow(10,a)};a.prototype.log2lin=function(a){return Math.log(a)/Math.LN10};return a}();a.Additions=h})(C||(C={}));return C});L(a,"Core/Axis/PlotLineOrBand/PlotLineOrBandAxis.js",[a["Core/Utilities.js"]],function(a){var u=
a.erase,A=a.extend,G=a.isNumber,x;(function(a){var t=[],z;a.compose=function(a,h){z||(z=a);-1===t.indexOf(h)&&(t.push(h),A(h.prototype,q.prototype));return h};var q=function(){function a(){}a.prototype.getPlotBandPath=function(a,d,c){void 0===c&&(c=this.options);var h=this.getPlotLinePath({value:d,force:!0,acrossPanes:c.acrossPanes}),f=[],m=this.horiz;d=!G(this.min)||!G(this.max)||a<this.min&&d<this.min||a>this.max&&d>this.max;a=this.getPlotLinePath({value:a,force:!0,acrossPanes:c.acrossPanes});c=
1;if(a&&h){if(d){var p=a.toString()===h.toString();c=0}for(d=0;d<a.length;d+=2){var q=a[d],r=a[d+1],y=h[d],B=h[d+1];"M"!==q[0]&&"L"!==q[0]||"M"!==r[0]&&"L"!==r[0]||"M"!==y[0]&&"L"!==y[0]||"M"!==B[0]&&"L"!==B[0]||(m&&y[1]===q[1]?(y[1]+=c,B[1]+=c):m||y[2]!==q[2]||(y[2]+=c,B[2]+=c),f.push(["M",q[1],q[2]],["L",r[1],r[2]],["L",B[1],B[2]],["L",y[1],y[2]],["Z"]));f.isFlat=p}}return f};a.prototype.addPlotBand=function(a){return this.addPlotBandOrLine(a,"plotBands")};a.prototype.addPlotLine=function(a){return this.addPlotBandOrLine(a,
"plotLines")};a.prototype.addPlotBandOrLine=function(a,d){var c=this,h=this.userOptions,f=new z(this,a);this.visible&&(f=f.render());if(f){this._addedPlotLB||(this._addedPlotLB=!0,(h.plotLines||[]).concat(h.plotBands||[]).forEach(function(a){c.addPlotBandOrLine(a)}));if(d){var m=h[d]||[];m.push(a);h[d]=m}this.plotLinesAndBands.push(f)}return f};a.prototype.removePlotBandOrLine=function(a){var d=this.plotLinesAndBands,c=this.options,h=this.userOptions;if(d){for(var f=d.length;f--;)d[f].id===a&&d[f].destroy();
[c.plotLines||[],h.plotLines||[],c.plotBands||[],h.plotBands||[]].forEach(function(c){for(f=c.length;f--;)(c[f]||{}).id===a&&u(c,c[f])})}};a.prototype.removePlotBand=function(a){this.removePlotBandOrLine(a)};a.prototype.removePlotLine=function(a){this.removePlotBandOrLine(a)};return a}()})(x||(x={}));return x});L(a,"Core/Axis/PlotLineOrBand/PlotLineOrBand.js",[a["Core/Axis/PlotLineOrBand/PlotLineOrBandAxis.js"],a["Core/Utilities.js"]],function(a,t){var u=t.arrayMax,G=t.arrayMin,x=t.defined,C=t.destroyObjectProperties,
I=t.erase,z=t.fireEvent,q=t.merge,m=t.objectEach,h=t.pick;t=function(){function d(a,d){this.axis=a;d&&(this.options=d,this.id=d.id)}d.compose=function(c){return a.compose(d,c)};d.prototype.render=function(){z(this,"render");var a=this,d=a.axis,f=d.horiz,w=d.logarithmic,p=a.options,u=p.color,r=h(p.zIndex,0),y=p.events,B={},n=d.chart.renderer,k=p.label,b=a.label,g=p.to,e=p.from,D=p.value,H=a.svgElem,v=[],E=x(e)&&x(g);v=x(D);var O=!H,S={"class":"highcharts-plot-"+(E?"band ":"line ")+(p.className||"")},
P=E?"bands":"lines";w&&(e=w.log2lin(e),g=w.log2lin(g),D=w.log2lin(D));d.chart.styledMode||(v?(S.stroke=u||"#999999",S["stroke-width"]=h(p.width,1),p.dashStyle&&(S.dashstyle=p.dashStyle)):E&&(S.fill=u||"#e6ebf5",p.borderWidth&&(S.stroke=p.borderColor,S["stroke-width"]=p.borderWidth)));B.zIndex=r;P+="-"+r;(w=d.plotLinesAndBandsGroups[P])||(d.plotLinesAndBandsGroups[P]=w=n.g("plot-"+P).attr(B).add());O&&(a.svgElem=H=n.path().attr(S).add(w));if(v)v=d.getPlotLinePath({value:D,lineWidth:H.strokeWidth(),
acrossPanes:p.acrossPanes});else if(E)v=d.getPlotBandPath(e,g,p);else return;!a.eventsAdded&&y&&(m(y,function(b,e){H.on(e,function(b){y[e].apply(a,[b])})}),a.eventsAdded=!0);(O||!H.d)&&v&&v.length?H.attr({d:v}):H&&(v?(H.show(!0),H.animate({d:v})):H.d&&(H.hide(),b&&(a.label=b=b.destroy())));k&&(x(k.text)||x(k.formatter))&&v&&v.length&&0<d.width&&0<d.height&&!v.isFlat?(k=q({align:f&&E&&"center",x:f?!E&&4:10,verticalAlign:!f&&E&&"middle",y:f?E?16:10:E?6:-4,rotation:f&&!E&&90},k),this.renderLabel(k,v,
E,r)):b&&b.hide();return a};d.prototype.renderLabel=function(a,d,f,h){var c=this.axis,l=c.chart.renderer,m=this.label;m||(this.label=m=l.text(this.getLabelText(a),0,0,a.useHTML).attr({align:a.textAlign||a.align,rotation:a.rotation,"class":"highcharts-plot-"+(f?"band":"line")+"-label "+(a.className||""),zIndex:h}).add(),c.chart.styledMode||m.css(q({textOverflow:"ellipsis"},a.style)));h=d.xBounds||[d[0][1],d[1][1],f?d[2][1]:d[0][1]];d=d.yBounds||[d[0][2],d[1][2],f?d[2][2]:d[0][2]];f=G(h);l=G(d);m.align(a,
!1,{x:f,y:l,width:u(h)-f,height:u(d)-l});m.alignValue&&"left"!==m.alignValue||m.css({width:(90===m.rotation?c.height-(m.alignAttr.y-c.top):c.width-(m.alignAttr.x-c.left))+"px"});m.show(!0)};d.prototype.getLabelText=function(a){return x(a.formatter)?a.formatter.call(this):a.text};d.prototype.destroy=function(){I(this.axis.plotLinesAndBands,this);delete this.axis;C(this)};return d}();"";"";return t});L(a,"Core/Tooltip.js",[a["Core/FormatUtilities.js"],a["Core/Globals.js"],a["Core/Renderer/RendererUtilities.js"],
a["Core/Renderer/RendererRegistry.js"],a["Core/Utilities.js"]],function(a,t,A,G,x){var u=a.format,I=t.doc,z=A.distribute,q=x.addEvent,m=x.clamp,h=x.css,d=x.defined,c=x.discardElement,l=x.extend,f=x.fireEvent,w=x.isArray,p=x.isNumber,K=x.isString,r=x.merge,y=x.pick,B=x.splat,n=x.syncTimeout;a=function(){function a(b,a){this.allowShared=!0;this.container=void 0;this.crosshairs=[];this.distance=0;this.isHidden=!0;this.isSticky=!1;this.now={};this.options={};this.outside=!1;this.chart=b;this.init(b,a)}
a.prototype.applyFilter=function(){var b=this.chart;b.renderer.definition({tagName:"filter",attributes:{id:"drop-shadow-"+b.index,opacity:.5},children:[{tagName:"feGaussianBlur",attributes:{"in":"SourceAlpha",stdDeviation:1}},{tagName:"feOffset",attributes:{dx:1,dy:1}},{tagName:"feComponentTransfer",children:[{tagName:"feFuncA",attributes:{type:"linear",slope:.3}}]},{tagName:"feMerge",children:[{tagName:"feMergeNode"},{tagName:"feMergeNode",attributes:{"in":"SourceGraphic"}}]}]})};a.prototype.bodyFormatter=
function(b){return b.map(function(b){var e=b.series.tooltipOptions;return(e[(b.point.formatPrefix||"point")+"Formatter"]||b.point.tooltipFormatter).call(b.point,e[(b.point.formatPrefix||"point")+"Format"]||"")})};a.prototype.cleanSplit=function(b){this.chart.series.forEach(function(a){var e=a&&a.tt;e&&(!e.isActive||b?a.tt=e.destroy():e.isActive=!1)})};a.prototype.defaultFormatter=function(b){var a=this.points||B(this);var e=[b.tooltipFooterHeaderFormatter(a[0])];e=e.concat(b.bodyFormatter(a));e.push(b.tooltipFooterHeaderFormatter(a[0],
!0));return e};a.prototype.destroy=function(){this.label&&(this.label=this.label.destroy());this.split&&this.tt&&(this.cleanSplit(!0),this.tt=this.tt.destroy());this.renderer&&(this.renderer=this.renderer.destroy(),c(this.container));x.clearTimeout(this.hideTimer);x.clearTimeout(this.tooltipTimeout)};a.prototype.getAnchor=function(b,a){var e=this.chart,c=e.pointer,d=e.inverted,g=e.plotTop,k=e.plotLeft,f,n,h=0,l=0;b=B(b);this.followPointer&&a?("undefined"===typeof a.chartX&&(a=c.normalize(a)),c=[a.chartX-
k,a.chartY-g]):b[0].tooltipPos?c=b[0].tooltipPos:(b.forEach(function(b){f=b.series.yAxis;n=b.series.xAxis;h+=b.plotX||0;l+=b.plotLow?(b.plotLow+(b.plotHigh||0))/2:b.plotY||0;n&&f&&(d?(h+=g+e.plotHeight-n.len-n.pos,l+=k+e.plotWidth-f.len-f.pos):(h+=n.pos-k,l+=f.pos-g))}),h/=b.length,l/=b.length,c=[d?e.plotWidth-l:h,d?e.plotHeight-h:l],this.shared&&1<b.length&&a&&(d?c[0]=a.chartX-k:c[1]=a.chartY-g));return c.map(Math.round)};a.prototype.getLabel=function(){var b=this,a=this.chart.styledMode,e=this.options,
c=this.split&&this.allowShared,k="tooltip"+(d(e.className)?" "+e.className:""),f=e.style.pointerEvents||(!this.followPointer&&e.stickOnContact?"auto":"none"),n=function(){b.inContact=!0},l=function(a){var e=b.chart.hoverSeries;b.inContact=b.shouldStickOnContact()&&b.chart.pointer.inClass(a.relatedTarget,"highcharts-tooltip");if(!b.inContact&&e&&e.onMouseOut)e.onMouseOut()},m,p=this.chart.renderer;if(b.label){var r=!b.label.hasClass("highcharts-label");(c&&!r||!c&&r)&&b.destroy()}if(!this.label){if(this.outside){r=
this.chart.options.chart.style;var B=G.getRendererType();this.container=m=t.doc.createElement("div");m.className="highcharts-tooltip-container";h(m,{position:"absolute",top:"1px",pointerEvents:f,zIndex:Math.max(this.options.style.zIndex||0,(r&&r.zIndex||0)+3)});q(m,"mouseenter",n);q(m,"mouseleave",l);t.doc.body.appendChild(m);this.renderer=p=new B(m,0,0,r,void 0,void 0,p.styledMode)}c?this.label=p.g(k):(this.label=p.label("",0,0,e.shape,void 0,void 0,e.useHTML,void 0,k).attr({padding:e.padding,r:e.borderRadius}),
a||this.label.attr({fill:e.backgroundColor,"stroke-width":e.borderWidth}).css(e.style).css({pointerEvents:f}).shadow(e.shadow));a&&e.shadow&&(this.applyFilter(),this.label.attr({filter:"url(#drop-shadow-"+this.chart.index+")"}));if(b.outside&&!b.split){var y=this.label,w=y.xSetter,u=y.ySetter;y.xSetter=function(a){w.call(y,b.distance);m.style.left=a+"px"};y.ySetter=function(a){u.call(y,b.distance);m.style.top=a+"px"}}this.label.on("mouseenter",n).on("mouseleave",l).attr({zIndex:8}).add()}return this.label};
a.prototype.getPosition=function(b,a,e){var c=this.chart,d=this.distance,g={},k=c.inverted&&e.h||0,f=this.outside,n=f?I.documentElement.clientWidth-2*d:c.chartWidth,h=f?Math.max(I.body.scrollHeight,I.documentElement.scrollHeight,I.body.offsetHeight,I.documentElement.offsetHeight,I.documentElement.clientHeight):c.chartHeight,l=c.pointer.getChartPosition(),m=function(g){var k="x"===g;return[g,k?n:h,k?b:a].concat(f?[k?b*l.scaleX:a*l.scaleY,k?l.left-d+(e.plotX+c.plotLeft)*l.scaleX:l.top-d+(e.plotY+c.plotTop)*
l.scaleY,0,k?n:h]:[k?b:a,k?e.plotX+c.plotLeft:e.plotY+c.plotTop,k?c.plotLeft:c.plotTop,k?c.plotLeft+c.plotWidth:c.plotTop+c.plotHeight])},p=m("y"),r=m("x"),B;m=!!e.negative;!c.polar&&c.hoverSeries&&c.hoverSeries.yAxis&&c.hoverSeries.yAxis.reversed&&(m=!m);var q=!this.followPointer&&y(e.ttBelow,!c.inverted===m),w=function(b,a,e,c,n,h,v){var D=f?"y"===b?d*l.scaleY:d*l.scaleX:d,m=(e-c)/2,F=c<n-d,H=n+d+c<a,p=n-D-e+m;n=n+D-m;if(q&&H)g[b]=n;else if(!q&&F)g[b]=p;else if(F)g[b]=Math.min(v-c,0>p-k?p:p-k);
else if(H)g[b]=Math.max(h,n+k+e>a?n:n+k);else return!1},u=function(b,a,e,c,k){var f;k<d||k>a-d?f=!1:g[b]=k<e/2?1:k>a-c/2?a-c-2:k-e/2;return f},F=function(b){var a=p;p=r;r=a;B=b},T=function(){!1!==w.apply(0,p)?!1!==u.apply(0,r)||B||(F(!0),T()):B?g.x=g.y=0:(F(!0),T())};(c.inverted||1<this.len)&&F();T();return g};a.prototype.hide=function(b){var a=this;x.clearTimeout(this.hideTimer);b=y(b,this.options.hideDelay);this.isHidden||(this.hideTimer=n(function(){a.getLabel().fadeOut(b?void 0:b);a.isHidden=
!0},b))};a.prototype.init=function(b,a){this.chart=b;this.options=a;this.crosshairs=[];this.now={x:0,y:0};this.isHidden=!0;this.split=a.split&&!b.inverted&&!b.polar;this.shared=a.shared||this.split;this.outside=y(a.outside,!(!b.scrollablePixelsX&&!b.scrollablePixelsY))};a.prototype.shouldStickOnContact=function(){return!(this.followPointer||!this.options.stickOnContact)};a.prototype.isStickyOnContact=function(){return!(!this.shouldStickOnContact()||!this.inContact)};a.prototype.move=function(b,a,
e,c){var d=this,g=d.now,k=!1!==d.options.animation&&!d.isHidden&&(1<Math.abs(b-g.x)||1<Math.abs(a-g.y)),f=d.followPointer||1<d.len;l(g,{x:k?(2*g.x+b)/3:b,y:k?(g.y+a)/2:a,anchorX:f?void 0:k?(2*g.anchorX+e)/3:e,anchorY:f?void 0:k?(g.anchorY+c)/2:c});d.getLabel().attr(g);d.drawTracker();k&&(x.clearTimeout(this.tooltipTimeout),this.tooltipTimeout=setTimeout(function(){d&&d.move(b,a,e,c)},32))};a.prototype.refresh=function(b,a){var e=this.chart,c=this.options,d=B(b),g=d[0],k=[],n=c.formatter||this.defaultFormatter,
h=this.shared,l=e.styledMode,m={};if(c.enabled){x.clearTimeout(this.hideTimer);this.allowShared=!(!w(b)&&b.series&&b.series.noSharedTooltip);this.followPointer=!this.split&&g.series.tooltipOptions.followPointer;b=this.getAnchor(b,a);var p=b[0],r=b[1];h&&this.allowShared?(e.pointer.applyInactiveState(d),d.forEach(function(b){b.setState("hover");k.push(b.getLabelConfig())}),m={x:g.category,y:g.y},m.points=k):m=g.getLabelConfig();this.len=k.length;n=n.call(m,this);h=g.series;this.distance=y(h.tooltipOptions.distance,
16);if(!1===n)this.hide();else{if(this.split&&this.allowShared)this.renderSplit(n,d);else{var q=p,u=r;a&&e.pointer.isDirectTouch&&(q=a.chartX-e.plotLeft,u=a.chartY-e.plotTop);if(e.polar||!1===h.options.clip||d.some(function(b){return b.series.shouldShowTooltip(q,u)}))a=this.getLabel(),c.style.width&&!l||a.css({width:this.chart.spacingBox.width+"px"}),a.attr({text:n&&n.join?n.join(""):n}),a.removeClass(/highcharts-color-[\d]+/g).addClass("highcharts-color-"+y(g.colorIndex,h.colorIndex)),l||a.attr({stroke:c.borderColor||
g.color||h.color||"#666666"}),this.updatePosition({plotX:p,plotY:r,negative:g.negative,ttBelow:g.ttBelow,h:b[2]||0});else{this.hide();return}}this.isHidden&&this.label&&this.label.attr({opacity:1}).show();this.isHidden=!1}f(this,"refresh")}};a.prototype.renderSplit=function(b,a){function e(b,a,e,d,g){void 0===g&&(g=!0);e?(a=X?0:C,b=m(b-d/2,N.left,N.right-d-(c.outside?R:0))):(a-=A,b=g?b-d-x:b+x,b=m(b,g?b:N.left,N.right));return{x:b,y:a}}var c=this,d=c.chart,g=c.chart,k=g.chartWidth,f=g.chartHeight,
n=g.plotHeight,h=g.plotLeft,p=g.plotTop,r=g.pointer,B=g.scrollablePixelsY;B=void 0===B?0:B;var q=g.scrollablePixelsX,w=g.scrollingContainer;w=void 0===w?{scrollLeft:0,scrollTop:0}:w;var u=w.scrollLeft;w=w.scrollTop;var t=g.styledMode,x=c.distance,F=c.options,T=c.options.positioner,N=c.outside&&"number"!==typeof q?I.documentElement.getBoundingClientRect():{left:u,right:u+k,top:w,bottom:w+f},V=c.getLabel(),W=this.renderer||d.renderer,X=!(!d.xAxis[0]||!d.xAxis[0].opposite);d=r.getChartPosition();var R=
d.left;d=d.top;var A=p+w,aa=0,C=n-B;K(b)&&(b=[!1,b]);b=b.slice(0,a.length+1).reduce(function(b,d,g){if(!1!==d&&""!==d){g=a[g-1]||{isHeader:!0,plotX:a[0].plotX,plotY:n,series:{}};var k=g.isHeader,f=k?c:g.series;d=d.toString();var v=f.tt,l=g.isHeader;var D=g.series;var H="highcharts-color-"+y(g.colorIndex,D.colorIndex,"none");v||(v={padding:F.padding,r:F.borderRadius},t||(v.fill=F.backgroundColor,v["stroke-width"]=F.borderWidth),v=W.label("",0,0,F[l?"headerShape":"shape"],void 0,void 0,F.useHTML).addClass((l?
"highcharts-tooltip-header ":"")+"highcharts-tooltip-box "+H).attr(v).add(V));v.isActive=!0;v.attr({text:d});t||v.css(F.style).shadow(F.shadow).attr({stroke:F.borderColor||g.color||D.color||"#333333"});f=f.tt=v;l=f.getBBox();d=l.width+f.strokeWidth();k&&(aa=l.height,C+=aa,X&&(A-=aa));D=g.plotX;D=void 0===D?0:D;H=g.plotY;H=void 0===H?0:H;v=g.series;if(g.isHeader){D=h+D;var E=p+n/2}else{var r=v.xAxis,B=v.yAxis;D=r.pos+m(D,-x,r.len+x);v.shouldShowTooltip(0,B.pos-p+H,{ignoreX:!0})&&(E=B.pos+H)}D=m(D,
N.left-x,N.right+x);"number"===typeof E?(l=l.height+1,H=T?T.call(c,d,l,g):e(D,E,k,d),b.push({align:T?0:void 0,anchorX:D,anchorY:E,boxWidth:d,point:g,rank:y(H.rank,k?1:0),size:l,target:H.y,tt:f,x:H.x})):f.isActive=!1}return b},[]);!T&&b.some(function(b){var a=(c.outside?R:0)+b.anchorX;return a<N.left&&a+b.boxWidth<N.right?!0:a<R-N.left+b.boxWidth&&N.right-a>a})&&(b=b.map(function(b){var a=e(b.anchorX,b.anchorY,b.point.isHeader,b.boxWidth,!1);return l(b,{target:a.y,x:a.x})}));c.cleanSplit();z(b,C);
var G=R,ba=R;b.forEach(function(b){var a=b.x,e=b.boxWidth;b=b.isHeader;b||(c.outside&&R+a<G&&(G=R+a),!b&&c.outside&&G+e>ba&&(ba=R+a))});b.forEach(function(b){var a=b.x,e=b.anchorX,d=b.pos,g=b.point.isHeader;d={visibility:"undefined"===typeof d?"hidden":"inherit",x:a,y:d+A,anchorX:e,anchorY:b.anchorY};if(c.outside&&a<e){var k=R-G;0<k&&(g||(d.x=a+k,d.anchorX=e+k),g&&(d.x=(ba-G)/2,d.anchorX=e+k))}b.tt.attr(d)});b=c.container;B=c.renderer;c.outside&&b&&B&&(g=V.getBBox(),B.setSize(g.width+g.x,g.height+
g.y,!1),b.style.left=G+"px",b.style.top=d+"px")};a.prototype.drawTracker=function(){if(this.followPointer||!this.options.stickOnContact)this.tracker&&this.tracker.destroy();else{var b=this.chart,a=this.label,e=this.shared?b.hoverPoints:b.hoverPoint;if(a&&e){var c={x:0,y:0,width:0,height:0};e=this.getAnchor(e);var d=a.getBBox();e[0]+=b.plotLeft-a.translateX;e[1]+=b.plotTop-a.translateY;c.x=Math.min(0,e[0]);c.y=Math.min(0,e[1]);c.width=0>e[0]?Math.max(Math.abs(e[0]),d.width-e[0]):Math.max(Math.abs(e[0]),
d.width);c.height=0>e[1]?Math.max(Math.abs(e[1]),d.height-Math.abs(e[1])):Math.max(Math.abs(e[1]),d.height);this.tracker?this.tracker.attr(c):(this.tracker=a.renderer.rect(c).addClass("highcharts-tracker").add(a),b.styledMode||this.tracker.attr({fill:"rgba(0,0,0,0)"}))}}};a.prototype.styledModeFormat=function(b){return b.replace('style="font-size: 10px"','class="highcharts-header"').replace(/style="color:{(point|series)\.color}"/g,'class="highcharts-color-{$1.colorIndex}"')};a.prototype.tooltipFooterHeaderFormatter=
function(b,a){var e=b.series,c=e.tooltipOptions,d=e.xAxis,g=d&&d.dateTime;d={isFooter:a,labelConfig:b};var k=c.xDateFormat,n=c[a?"footerFormat":"headerFormat"];f(this,"headerFormatter",d,function(a){g&&!k&&p(b.key)&&(k=g.getXDateFormat(b.key,c.dateTimeLabelFormats));g&&k&&(b.point&&b.point.tooltipDateKeys||["key"]).forEach(function(b){n=n.replace("{point."+b+"}","{point."+b+":"+k+"}")});e.chart.styledMode&&(n=this.styledModeFormat(n));a.text=u(n,{point:b,series:e},this.chart)});return d.text};a.prototype.update=
function(b){this.destroy();r(!0,this.chart.options.tooltip.userOptions,b);this.init(this.chart,r(!0,this.options,b))};a.prototype.updatePosition=function(b){var a=this.chart,e=this.options,c=a.pointer,d=this.getLabel();c=c.getChartPosition();var k=(e.positioner||this.getPosition).call(this,d.width,d.height,b),f=b.plotX+a.plotLeft;b=b.plotY+a.plotTop;if(this.outside){e=e.borderWidth+2*this.distance;this.renderer.setSize(d.width+e,d.height+e,!1);if(1!==c.scaleX||1!==c.scaleY)h(this.container,{transform:"scale("+
c.scaleX+", "+c.scaleY+")"}),f*=c.scaleX,b*=c.scaleY;f+=c.left-k.x;b+=c.top-k.y}this.move(Math.round(k.x),Math.round(k.y||0),f,b)};return a}();"";return a});L(a,"Core/Series/Point.js",[a["Core/Renderer/HTML/AST.js"],a["Core/Animation/AnimationUtilities.js"],a["Core/DefaultOptions.js"],a["Core/FormatUtilities.js"],a["Core/Utilities.js"]],function(a,t,A,G,x){var u=t.animObject,I=A.defaultOptions,z=G.format,q=x.addEvent,m=x.defined,h=x.erase,d=x.extend,c=x.fireEvent,l=x.getNestedProperty,f=x.isArray,
w=x.isFunction,p=x.isNumber,K=x.isObject,r=x.merge,y=x.objectEach,B=x.pick,n=x.syncTimeout,k=x.removeEvent,b=x.uniqueKey;t=function(){function g(){this.colorIndex=this.category=void 0;this.formatPrefix="point";this.id=void 0;this.isNull=!1;this.percentage=this.options=this.name=void 0;this.selected=!1;this.total=this.series=void 0;this.visible=!0;this.x=void 0}g.prototype.animateBeforeDestroy=function(){var b=this,a={x:b.startXPos,opacity:0},c=b.getGraphicalProps();c.singular.forEach(function(e){b[e]=
b[e].animate("dataLabel"===e?{x:b[e].startXPos,y:b[e].startYPos,opacity:0}:a)});c.plural.forEach(function(a){b[a].forEach(function(a){a.element&&a.animate(d({x:b.startXPos},a.startYPos?{x:a.startXPos,y:a.startYPos}:{}))})})};g.prototype.applyOptions=function(b,a){var e=this.series,c=e.options.pointValKey||e.pointValKey;b=g.prototype.optionsToObject.call(this,b);d(this,b);this.options=this.options?d(this.options,b):b;b.group&&delete this.group;b.dataLabels&&delete this.dataLabels;c&&(this.y=g.prototype.getNestedProperty.call(this,
c));this.formatPrefix=(this.isNull=B(this.isValid&&!this.isValid(),null===this.x||!p(this.y)))?"null":"point";this.selected&&(this.state="select");"name"in this&&"undefined"===typeof a&&e.xAxis&&e.xAxis.hasNames&&(this.x=e.xAxis.nameToX(this));"undefined"===typeof this.x&&e?this.x="undefined"===typeof a?e.autoIncrement():a:p(b.x)&&e.options.relativeXValue&&(this.x=e.autoIncrement(b.x));return this};g.prototype.destroy=function(){function b(){if(a.graphic||a.dataLabel||a.dataLabels)k(a),a.destroyElements();
for(l in a)a[l]=null}var a=this,c=a.series,d=c.chart;c=c.options.dataSorting;var g=d.hoverPoints,f=u(a.series.chart.renderer.globalAnimation),l;a.legendItem&&d.legend.destroyItem(a);g&&(a.setState(),h(g,a),g.length||(d.hoverPoints=null));if(a===d.hoverPoint)a.onMouseOut();c&&c.enabled?(this.animateBeforeDestroy(),n(b,f.duration)):b();d.pointCount--};g.prototype.destroyElements=function(b){var a=this;b=a.getGraphicalProps(b);b.singular.forEach(function(b){a[b]=a[b].destroy()});b.plural.forEach(function(b){a[b].forEach(function(b){b.element&&
b.destroy()});delete a[b]})};g.prototype.firePointEvent=function(b,a,d){var e=this,g=this.series.options;(g.point.events[b]||e.options&&e.options.events&&e.options.events[b])&&e.importEvents();"click"===b&&g.allowPointSelect&&(d=function(b){e.select&&e.select(null,b.ctrlKey||b.metaKey||b.shiftKey)});c(e,b,a,d)};g.prototype.getClassName=function(){return"highcharts-point"+(this.selected?" highcharts-point-select":"")+(this.negative?" highcharts-negative":"")+(this.isNull?" highcharts-null-point":"")+
("undefined"!==typeof this.colorIndex?" highcharts-color-"+this.colorIndex:"")+(this.options.className?" "+this.options.className:"")+(this.zone&&this.zone.className?" "+this.zone.className.replace("highcharts-negative",""):"")};g.prototype.getGraphicalProps=function(b){var a=this,e=[],c={singular:[],plural:[]},d;b=b||{graphic:1,dataLabel:1};b.graphic&&e.push("graphic","upperGraphic","shadowGroup");b.dataLabel&&e.push("dataLabel","dataLabelUpper","connector");for(d=e.length;d--;){var g=e[d];a[g]&&
c.singular.push(g)}["dataLabel","connector"].forEach(function(e){var d=e+"s";b[e]&&a[d]&&c.plural.push(d)});return c};g.prototype.getLabelConfig=function(){return{x:this.category,y:this.y,color:this.color,colorIndex:this.colorIndex,key:this.name||this.category,series:this.series,point:this,percentage:this.percentage,total:this.total||this.stackTotal}};g.prototype.getNestedProperty=function(b){if(b)return 0===b.indexOf("custom.")?l(b,this.options):this[b]};g.prototype.getZone=function(){var b=this.series,
a=b.zones;b=b.zoneAxis||"y";var c,d=0;for(c=a[d];this[b]>=c.value;)c=a[++d];this.nonZonedColor||(this.nonZonedColor=this.color);this.color=c&&c.color&&!this.options.color?c.color:this.nonZonedColor;return c};g.prototype.hasNewShapeType=function(){return(this.graphic&&(this.graphic.symbolName||this.graphic.element.nodeName))!==this.shapeType};g.prototype.init=function(a,d,g){this.series=a;this.applyOptions(d,g);this.id=m(this.id)?this.id:b();this.resolveColor();a.chart.pointCount++;c(this,"afterInit");
return this};g.prototype.optionsToObject=function(b){var a=this.series,e=a.options.keys,c=e||a.pointArrayMap||["y"],d=c.length,k={},n=0,h=0;if(p(b)||null===b)k[c[0]]=b;else if(f(b))for(!e&&b.length>d&&(a=typeof b[0],"string"===a?k.name=b[0]:"number"===a&&(k.x=b[0]),n++);h<d;)e&&"undefined"===typeof b[n]||(0<c[h].indexOf(".")?g.prototype.setNestedProperty(k,b[n],c[h]):k[c[h]]=b[n]),n++,h++;else"object"===typeof b&&(k=b,b.dataLabels&&(a._hasPointLabels=!0),b.marker&&(a._hasPointMarkers=!0));return k};
g.prototype.resolveColor=function(){var b=this.series,a=b.chart.styledMode;var c=b.chart.options.chart.colorCount;delete this.nonZonedColor;if(b.options.colorByPoint){if(!a){c=b.options.colors||b.chart.options.colors;var d=c[b.colorCounter];c=c.length}a=b.colorCounter;b.colorCounter++;b.colorCounter===c&&(b.colorCounter=0)}else a||(d=b.color),a=b.colorIndex;this.colorIndex=B(this.options.colorIndex,a);this.color=B(this.options.color,d)};g.prototype.setNestedProperty=function(b,a,c){c.split(".").reduce(function(b,
e,c,d){b[e]=d.length-1===c?a:K(b[e],!0)?b[e]:{};return b[e]},b);return b};g.prototype.tooltipFormatter=function(b){var a=this.series,e=a.tooltipOptions,c=B(e.valueDecimals,""),d=e.valuePrefix||"",g=e.valueSuffix||"";a.chart.styledMode&&(b=a.chart.tooltip.styledModeFormat(b));(a.pointArrayMap||["y"]).forEach(function(a){a="{point."+a;if(d||g)b=b.replace(RegExp(a+"}","g"),d+a+"}"+g);b=b.replace(RegExp(a+"}","g"),a+":,."+c+"f}")});return z(b,{point:this,series:this.series},a.chart)};g.prototype.update=
function(b,a,c,d){function e(){g.applyOptions(b);var e=f&&g.hasDummyGraphic;e=null===g.y?!e:e;f&&e&&(g.graphic=f.destroy(),delete g.hasDummyGraphic);K(b,!0)&&(f&&f.element&&b&&b.marker&&"undefined"!==typeof b.marker.symbol&&(g.graphic=f.destroy()),b&&b.dataLabels&&g.dataLabel&&(g.dataLabel=g.dataLabel.destroy()),g.connector&&(g.connector=g.connector.destroy()));l=g.index;k.updateParallelArrays(g,l);h.data[l]=K(h.data[l],!0)||K(b,!0)?g.options:B(b,h.data[l]);k.isDirty=k.isDirtyData=!0;!k.fixedBox&&
k.hasCartesianSeries&&(n.isDirtyBox=!0);"point"===h.legendType&&(n.isDirtyLegend=!0);a&&n.redraw(c)}var g=this,k=g.series,f=g.graphic,n=k.chart,h=k.options,l;a=B(a,!0);!1===d?e():g.firePointEvent("update",{options:b},e)};g.prototype.remove=function(b,a){this.series.removePoint(this.series.data.indexOf(this),b,a)};g.prototype.select=function(b,a){var e=this,c=e.series,d=c.chart;this.selectedStaging=b=B(b,!e.selected);e.firePointEvent(b?"select":"unselect",{accumulate:a},function(){e.selected=e.options.selected=
b;c.options.data[c.data.indexOf(e)]=e.options;e.setState(b&&"select");a||d.getSelectedPoints().forEach(function(b){var a=b.series;b.selected&&b!==e&&(b.selected=b.options.selected=!1,a.options.data[a.data.indexOf(b)]=b.options,b.setState(d.hoverPoints&&a.options.inactiveOtherPoints?"inactive":""),b.firePointEvent("unselect"))})});delete this.selectedStaging};g.prototype.onMouseOver=function(b){var a=this.series.chart,e=a.pointer;b=b?e.normalize(b):e.getChartCoordinatesFromPoint(this,a.inverted);e.runPointActions(b,
this)};g.prototype.onMouseOut=function(){var b=this.series.chart;this.firePointEvent("mouseOut");this.series.options.inactiveOtherPoints||(b.hoverPoints||[]).forEach(function(b){b.setState()});b.hoverPoints=b.hoverPoint=null};g.prototype.importEvents=function(){if(!this.hasImportedEvents){var b=this,a=r(b.series.options.point,b.options).events;b.events=a;y(a,function(a,e){w(a)&&q(b,e,a)});this.hasImportedEvents=!0}};g.prototype.setState=function(b,g){var e=this.series,k=this.state,f=e.options.states[b||
"normal"]||{},n=I.plotOptions[e.type].marker&&e.options.marker,h=n&&!1===n.enabled,l=n&&n.states&&n.states[b||"normal"]||{},m=!1===l.enabled,D=this.marker||{},r=e.chart,q=n&&e.markerAttribs,w=e.halo,y,u=e.stateMarkerGraphic;b=b||"";if(!(b===this.state&&!g||this.selected&&"select"!==b||!1===f.enabled||b&&(m||h&&!1===l.enabled)||b&&D.states&&D.states[b]&&!1===D.states[b].enabled)){this.state=b;q&&(y=e.markerAttribs(this,b));if(this.graphic&&!this.hasDummyGraphic){k&&this.graphic.removeClass("highcharts-point-"+
k);b&&this.graphic.addClass("highcharts-point-"+b);if(!r.styledMode){var K=e.pointAttribs(this,b);var F=B(r.options.chart.animation,f.animation);e.options.inactiveOtherPoints&&p(K.opacity)&&((this.dataLabels||[]).forEach(function(b){b&&b.animate({opacity:K.opacity},F)}),this.connector&&this.connector.animate({opacity:K.opacity},F));this.graphic.animate(K,F)}y&&this.graphic.animate(y,B(r.options.chart.animation,l.animation,n.animation));u&&u.hide()}else{if(b&&l){k=D.symbol||e.symbol;u&&u.currentSymbol!==
k&&(u=u.destroy());if(y)if(u)u[g?"animate":"attr"]({x:y.x,y:y.y});else k&&(e.stateMarkerGraphic=u=r.renderer.symbol(k,y.x,y.y,y.width,y.height).add(e.markerGroup),u.currentSymbol=k);!r.styledMode&&u&&"inactive"!==this.state&&u.attr(e.pointAttribs(this,b))}u&&(u[b&&this.isInside?"show":"hide"](),u.element.point=this,u.addClass(this.getClassName(),!0))}f=f.halo;y=(u=this.graphic||u)&&u.visibility||"inherit";f&&f.size&&u&&"hidden"!==y&&!this.isCluster?(w||(e.halo=w=r.renderer.path().add(u.parentGroup)),
w.show()[g?"animate":"attr"]({d:this.haloPath(f.size)}),w.attr({"class":"highcharts-halo highcharts-color-"+B(this.colorIndex,e.colorIndex)+(this.className?" "+this.className:""),visibility:y,zIndex:-1}),w.point=this,r.styledMode||w.attr(d({fill:this.color||e.color,"fill-opacity":f.opacity},a.filterUserAttributes(f.attributes||{})))):w&&w.point&&w.point.haloPath&&w.animate({d:w.point.haloPath(0)},null,w.hide);c(this,"afterSetState",{state:b})}};g.prototype.haloPath=function(b){return this.series.chart.renderer.symbols.circle(Math.floor(this.plotX)-
b,this.plotY-b,2*b,2*b)};return g}();"";return t});L(a,"Core/Pointer.js",[a["Core/Color/Color.js"],a["Core/Globals.js"],a["Core/Tooltip.js"],a["Core/Utilities.js"]],function(a,t,A,G){var u=a.parse,C=t.charts,I=t.noop,z=G.addEvent,q=G.attr,m=G.css,h=G.defined,d=G.extend,c=G.find,l=G.fireEvent,f=G.isNumber,w=G.isObject,p=G.objectEach,K=G.offset,r=G.pick,y=G.splat;a=function(){function a(a,c){this.lastValidTouch={};this.pinchDown=[];this.runChartClick=!1;this.eventsToUnbind=[];this.chart=a;this.hasDragged=
!1;this.options=c;this.init(a,c)}a.prototype.applyInactiveState=function(a){var c=[],b;(a||[]).forEach(function(a){b=a.series;c.push(b);b.linkedParent&&c.push(b.linkedParent);b.linkedSeries&&(c=c.concat(b.linkedSeries));b.navigatorSeries&&c.push(b.navigatorSeries)});this.chart.series.forEach(function(b){-1===c.indexOf(b)?b.setState("inactive",!0):b.options.inactiveOtherPoints&&b.setAllPointsToState("inactive")})};a.prototype.destroy=function(){var c=this;this.eventsToUnbind.forEach(function(a){return a()});
this.eventsToUnbind=[];t.chartCount||(a.unbindDocumentMouseUp&&(a.unbindDocumentMouseUp=a.unbindDocumentMouseUp()),a.unbindDocumentTouchEnd&&(a.unbindDocumentTouchEnd=a.unbindDocumentTouchEnd()));clearInterval(c.tooltipTimeout);p(c,function(a,b){c[b]=void 0})};a.prototype.drag=function(a){var c=this.chart,b=c.options.chart,d=this.zoomHor,e=this.zoomVert,f=c.plotLeft,n=c.plotTop,h=c.plotWidth,l=c.plotHeight,m=this.mouseDownX||0,p=this.mouseDownY||0,r=w(b.panning)?b.panning&&b.panning.enabled:b.panning,
q=b.panKey&&a[b.panKey+"Key"],B=a.chartX,y=a.chartY,K=this.selectionMarker;if(!K||!K.touch)if(B<f?B=f:B>f+h&&(B=f+h),y<n?y=n:y>n+l&&(y=n+l),this.hasDragged=Math.sqrt(Math.pow(m-B,2)+Math.pow(p-y,2)),10<this.hasDragged){var t=c.isInsidePlot(m-f,p-n,{visiblePlotOnly:!0});!c.hasCartesianSeries&&!c.mapView||!this.zoomX&&!this.zoomY||!t||q||K||(this.selectionMarker=K=c.renderer.rect(f,n,d?1:h,e?1:l,0).attr({"class":"highcharts-selection-marker",zIndex:7}).add(),c.styledMode||K.attr({fill:b.selectionMarkerFill||
u("#335cad").setOpacity(.25).get()}));K&&d&&(d=B-m,K.attr({width:Math.abs(d),x:(0<d?0:d)+m}));K&&e&&(d=y-p,K.attr({height:Math.abs(d),y:(0<d?0:d)+p}));t&&!K&&r&&c.pan(a,b.panning)}};a.prototype.dragStart=function(a){var c=this.chart;c.mouseIsDown=a.type;c.cancelClick=!1;c.mouseDownX=this.mouseDownX=a.chartX;c.mouseDownY=this.mouseDownY=a.chartY};a.prototype.drop=function(a){var c=this,b=this.chart,g=this.hasPinched;if(this.selectionMarker){var e=this.selectionMarker,n=e.attr?e.attr("x"):e.x,p=e.attr?
e.attr("y"):e.y,v=e.attr?e.attr("width"):e.width,r=e.attr?e.attr("height"):e.height,q={originalEvent:a,xAxis:[],yAxis:[],x:n,y:p,width:v,height:r},B=!!b.mapView;if(this.hasDragged||g)b.axes.forEach(function(b){if(b.zoomEnabled&&h(b.min)&&(g||c[{xAxis:"zoomX",yAxis:"zoomY"}[b.coll]])&&f(n)&&f(p)){var e=b.horiz,d="touchend"===a.type?b.minPixelPadding:0,k=b.toValue((e?n:p)+d);e=b.toValue((e?n+v:p+r)-d);q[b.coll].push({axis:b,min:Math.min(k,e),max:Math.max(k,e)});B=!0}}),B&&l(b,"selection",q,function(a){b.zoom(d(a,
g?{animation:!1}:null))});f(b.index)&&(this.selectionMarker=this.selectionMarker.destroy());g&&this.scaleGroups()}b&&f(b.index)&&(m(b.container,{cursor:b._cursor}),b.cancelClick=10<this.hasDragged,b.mouseIsDown=this.hasDragged=this.hasPinched=!1,this.pinchDown=[])};a.prototype.findNearestKDPoint=function(a,c,b){var d=this.chart,e=d.hoverPoint;d=d.tooltip;if(e&&d&&d.isStickyOnContact())return e;var k;a.forEach(function(a){var e=!(a.noSharedTooltip&&c)&&0>a.options.findNearestPointBy.indexOf("y");a=
a.searchPoint(b,e);if((e=w(a,!0)&&a.series)&&!(e=!w(k,!0))){e=k.distX-a.distX;var d=k.dist-a.dist,g=(a.series.group&&a.series.group.zIndex)-(k.series.group&&k.series.group.zIndex);e=0<(0!==e&&c?e:0!==d?d:0!==g?g:k.series.index>a.series.index?-1:1)}e&&(k=a)});return k};a.prototype.getChartCoordinatesFromPoint=function(a,c){var b=a.series,d=b.xAxis;b=b.yAxis;var e=a.shapeArgs;if(d&&b){var k=r(a.clientX,a.plotX),n=a.plotY||0;a.isNode&&e&&f(e.x)&&f(e.y)&&(k=e.x,n=e.y);return c?{chartX:b.len+b.pos-n,chartY:d.len+
d.pos-k}:{chartX:k+d.pos,chartY:n+b.pos}}if(e&&e.x&&e.y)return{chartX:e.x,chartY:e.y}};a.prototype.getChartPosition=function(){if(this.chartPosition)return this.chartPosition;var a=this.chart.container,c=K(a);this.chartPosition={left:c.left,top:c.top,scaleX:1,scaleY:1};var b=a.offsetWidth;a=a.offsetHeight;2<b&&2<a&&(this.chartPosition.scaleX=c.width/b,this.chartPosition.scaleY=c.height/a);return this.chartPosition};a.prototype.getCoordinates=function(a){var c={xAxis:[],yAxis:[]};this.chart.axes.forEach(function(b){c[b.isXAxis?
"xAxis":"yAxis"].push({axis:b,value:b.toValue(a[b.horiz?"chartX":"chartY"])})});return c};a.prototype.getHoverData=function(a,d,b,g,e,f){var k=[];g=!(!g||!a);var h={chartX:f?f.chartX:void 0,chartY:f?f.chartY:void 0,shared:e};l(this,"beforeGetHoverData",h);var n=d&&!d.stickyTracking?[d]:b.filter(function(b){return h.filter?h.filter(b):b.visible&&!(!e&&b.directTouch)&&r(b.options.enableMouseTracking,!0)&&b.stickyTracking});var m=g||!f?a:this.findNearestKDPoint(n,e,f);d=m&&m.series;m&&(e&&!d.noSharedTooltip?
(n=b.filter(function(b){return h.filter?h.filter(b):b.visible&&!(!e&&b.directTouch)&&r(b.options.enableMouseTracking,!0)&&!b.noSharedTooltip}),n.forEach(function(b){var a=c(b.points,function(b){return b.x===m.x&&!b.isNull});w(a)&&(b.chart.isBoosting&&(a=b.getPoint(a)),k.push(a))})):k.push(m));h={hoverPoint:m};l(this,"afterGetHoverData",h);return{hoverPoint:h.hoverPoint,hoverSeries:d,hoverPoints:k}};a.prototype.getPointFromEvent=function(a){a=a.target;for(var c;a&&!c;)c=a.point,a=a.parentNode;return c};
a.prototype.onTrackerMouseOut=function(a){a=a.relatedTarget||a.toElement;var c=this.chart.hoverSeries;this.isDirectTouch=!1;if(!(!c||!a||c.stickyTracking||this.inClass(a,"highcharts-tooltip")||this.inClass(a,"highcharts-series-"+c.index)&&this.inClass(a,"highcharts-tracker")))c.onMouseOut()};a.prototype.inClass=function(a,c){for(var b;a;){if(b=q(a,"class")){if(-1!==b.indexOf(c))return!0;if(-1!==b.indexOf("highcharts-container"))return!1}a=a.parentNode}};a.prototype.init=function(a,c){this.options=
c;this.chart=a;this.runChartClick=!(!c.chart.events||!c.chart.events.click);this.pinchDown=[];this.lastValidTouch={};A&&(a.tooltip=new A(a,c.tooltip),this.followTouchMove=r(c.tooltip.followTouchMove,!0));this.setDOMEvents()};a.prototype.normalize=function(a,c){var b=a.touches,g=b?b.length?b.item(0):r(b.changedTouches,a.changedTouches)[0]:a;c||(c=this.getChartPosition());b=g.pageX-c.left;g=g.pageY-c.top;b/=c.scaleX;g/=c.scaleY;return d(a,{chartX:Math.round(b),chartY:Math.round(g)})};a.prototype.onContainerClick=
function(a){var c=this.chart,b=c.hoverPoint;a=this.normalize(a);var g=c.plotLeft,e=c.plotTop;c.cancelClick||(b&&this.inClass(a.target,"highcharts-tracker")?(l(b.series,"click",d(a,{point:b})),c.hoverPoint&&b.firePointEvent("click",a)):(d(a,this.getCoordinates(a)),c.isInsidePlot(a.chartX-g,a.chartY-e,{visiblePlotOnly:!0})&&l(c,"click",a)))};a.prototype.onContainerMouseDown=function(a){var c=1===((a.buttons||a.button)&1);a=this.normalize(a);if(t.isFirefox&&0!==a.button)this.onContainerMouseMove(a);
if("undefined"===typeof a.button||c)this.zoomOption(a),c&&a.preventDefault&&a.preventDefault(),this.dragStart(a)};a.prototype.onContainerMouseLeave=function(c){var d=C[r(a.hoverChartIndex,-1)],b=this.chart.tooltip;b&&b.shouldStickOnContact()&&this.inClass(c.relatedTarget,"highcharts-tooltip-container")||(c=this.normalize(c),d&&(c.relatedTarget||c.toElement)&&(d.pointer.reset(),d.pointer.chartPosition=void 0),b&&!b.isHidden&&this.reset())};a.prototype.onContainerMouseEnter=function(a){delete this.chartPosition};
a.prototype.onContainerMouseMove=function(a){var c=this.chart;a=this.normalize(a);this.setHoverChartIndex();a.preventDefault||(a.returnValue=!1);("mousedown"===c.mouseIsDown||this.touchSelect(a))&&this.drag(a);c.openMenu||!this.inClass(a.target,"highcharts-tracker")&&!c.isInsidePlot(a.chartX-c.plotLeft,a.chartY-c.plotTop,{visiblePlotOnly:!0})||(this.inClass(a.target,"highcharts-no-tooltip")?this.reset(!1,0):this.runPointActions(a))};a.prototype.onDocumentTouchEnd=function(c){var d=C[r(a.hoverChartIndex,
-1)];d&&d.pointer.drop(c)};a.prototype.onContainerTouchMove=function(a){if(this.touchSelect(a))this.onContainerMouseMove(a);else this.touch(a)};a.prototype.onContainerTouchStart=function(a){if(this.touchSelect(a))this.onContainerMouseDown(a);else this.zoomOption(a),this.touch(a,!0)};a.prototype.onDocumentMouseMove=function(a){var c=this.chart,b=this.chartPosition;a=this.normalize(a,b);var d=c.tooltip;!b||d&&d.isStickyOnContact()||c.isInsidePlot(a.chartX-c.plotLeft,a.chartY-c.plotTop,{visiblePlotOnly:!0})||
this.inClass(a.target,"highcharts-tracker")||this.reset()};a.prototype.onDocumentMouseUp=function(c){var d=C[r(a.hoverChartIndex,-1)];d&&d.pointer.drop(c)};a.prototype.pinch=function(a){var c=this,b=c.chart,g=c.pinchDown,e=a.touches||[],f=e.length,h=c.lastValidTouch,n=c.hasZoom,m={},p=1===f&&(c.inClass(a.target,"highcharts-tracker")&&b.runTrackerClick||c.runChartClick),q={},B=c.selectionMarker;1<f?c.initiated=!0:1===f&&this.followTouchMove&&(c.initiated=!1);n&&c.initiated&&!p&&!1!==a.cancelable&&
a.preventDefault();[].map.call(e,function(b){return c.normalize(b)});"touchstart"===a.type?([].forEach.call(e,function(b,a){g[a]={chartX:b.chartX,chartY:b.chartY}}),h.x=[g[0].chartX,g[1]&&g[1].chartX],h.y=[g[0].chartY,g[1]&&g[1].chartY],b.axes.forEach(function(a){if(a.zoomEnabled){var c=b.bounds[a.horiz?"h":"v"],e=a.minPixelPadding,d=a.toPixels(Math.min(r(a.options.min,a.dataMin),a.dataMin)),g=a.toPixels(Math.max(r(a.options.max,a.dataMax),a.dataMax)),f=Math.max(d,g);c.min=Math.min(a.pos,Math.min(d,
g)-e);c.max=Math.max(a.pos+a.len,f+e)}}),c.res=!0):c.followTouchMove&&1===f?this.runPointActions(c.normalize(a)):g.length&&(l(b,"touchpan",{originalEvent:a},function(){B||(c.selectionMarker=B=d({destroy:I,touch:!0},b.plotBox));c.pinchTranslate(g,e,m,B,q,h);c.hasPinched=n;c.scaleGroups(m,q)}),c.res&&(c.res=!1,this.reset(!1,0)))};a.prototype.pinchTranslate=function(a,c,b,d,e,f){this.zoomHor&&this.pinchTranslateDirection(!0,a,c,b,d,e,f);this.zoomVert&&this.pinchTranslateDirection(!1,a,c,b,d,e,f)};a.prototype.pinchTranslateDirection=
function(a,c,b,d,e,f,h,l){var g=this.chart,k=a?"x":"y",n=a?"X":"Y",m="chart"+n,p=a?"width":"height",v=g["plot"+(a?"Left":"Top")],r=g.inverted,D=g.bounds[a?"h":"v"],q=1===c.length,B=c[0][m],y=!q&&c[1][m];c=function(){"number"===typeof u&&20<Math.abs(B-y)&&(w=l||Math.abs(N-u)/Math.abs(B-y));F=(v-N)/w+B;H=g["plot"+(a?"Width":"Height")]/w};var H,F,w=l||1,N=b[0][m],u=!q&&b[1][m];c();b=F;if(b<D.min){b=D.min;var K=!0}else b+H>D.max&&(b=D.max-H,K=!0);K?(N-=.8*(N-h[k][0]),"number"===typeof u&&(u-=.8*(u-h[k][1])),
c()):h[k]=[N,u];r||(f[k]=F-v,f[p]=H);f=r?1/w:w;e[p]=H;e[k]=b;d[r?a?"scaleY":"scaleX":"scale"+n]=w;d["translate"+n]=f*v+(N-f*B)};a.prototype.reset=function(a,c){var b=this.chart,d=b.hoverSeries,e=b.hoverPoint,f=b.hoverPoints,k=b.tooltip,h=k&&k.shared?f:e;a&&h&&y(h).forEach(function(b){b.series.isCartesian&&"undefined"===typeof b.plotX&&(a=!1)});if(a)k&&h&&y(h).length&&(k.refresh(h),k.shared&&f?f.forEach(function(b){b.setState(b.state,!0);b.series.isCartesian&&(b.series.xAxis.crosshair&&b.series.xAxis.drawCrosshair(null,
b),b.series.yAxis.crosshair&&b.series.yAxis.drawCrosshair(null,b))}):e&&(e.setState(e.state,!0),b.axes.forEach(function(b){b.crosshair&&e.series[b.coll]===b&&b.drawCrosshair(null,e)})));else{if(e)e.onMouseOut();f&&f.forEach(function(b){b.setState()});if(d)d.onMouseOut();k&&k.hide(c);this.unDocMouseMove&&(this.unDocMouseMove=this.unDocMouseMove());b.axes.forEach(function(b){b.hideCrosshair()});this.hoverX=b.hoverPoints=b.hoverPoint=null}};a.prototype.runPointActions=function(d,f){var b=this.chart,
g=b.tooltip&&b.tooltip.options.enabled?b.tooltip:void 0,e=g?g.shared:!1,k=f||b.hoverPoint,h=k&&k.series||b.hoverSeries;f=this.getHoverData(k,h,b.series,(!d||"touchmove"!==d.type)&&(!!f||h&&h.directTouch&&this.isDirectTouch),e,d);k=f.hoverPoint;h=f.hoverSeries;var l=f.hoverPoints;f=h&&h.tooltipOptions.followPointer&&!h.tooltipOptions.split;e=e&&h&&!h.noSharedTooltip;if(k&&(k!==b.hoverPoint||g&&g.isHidden)){(b.hoverPoints||[]).forEach(function(b){-1===l.indexOf(b)&&b.setState()});if(b.hoverSeries!==
h)h.onMouseOver();this.applyInactiveState(l);(l||[]).forEach(function(b){b.setState("hover")});b.hoverPoint&&b.hoverPoint.firePointEvent("mouseOut");if(!k.series)return;b.hoverPoints=l;b.hoverPoint=k;k.firePointEvent("mouseOver");g&&g.refresh(e?l:k,d)}else f&&g&&!g.isHidden&&(k=g.getAnchor([{}],d),b.isInsidePlot(k[0],k[1],{visiblePlotOnly:!0})&&g.updatePosition({plotX:k[0],plotY:k[1]}));this.unDocMouseMove||(this.unDocMouseMove=z(b.container.ownerDocument,"mousemove",function(b){var c=C[a.hoverChartIndex];
if(c)c.pointer.onDocumentMouseMove(b)}),this.eventsToUnbind.push(this.unDocMouseMove));b.axes.forEach(function(a){var e=r((a.crosshair||{}).snap,!0),g;e&&((g=b.hoverPoint)&&g.series[a.coll]===a||(g=c(l,function(b){return b.series[a.coll]===a})));g||!e?a.drawCrosshair(d,g):a.hideCrosshair()})};a.prototype.scaleGroups=function(a,c){var b=this.chart;b.series.forEach(function(d){var e=a||d.getPlotBox();d.group&&(d.xAxis&&d.xAxis.zoomEnabled||b.mapView)&&(d.group.attr(e),d.markerGroup&&(d.markerGroup.attr(e),
d.markerGroup.clip(c?b.clipRect:null)),d.dataLabelsGroup&&d.dataLabelsGroup.attr(e))});b.clipRect.attr(c||b.clipBox)};a.prototype.setDOMEvents=function(){var c=this,d=this.chart.container,b=d.ownerDocument;d.onmousedown=this.onContainerMouseDown.bind(this);d.onmousemove=this.onContainerMouseMove.bind(this);d.onclick=this.onContainerClick.bind(this);this.eventsToUnbind.push(z(d,"mouseenter",this.onContainerMouseEnter.bind(this)));this.eventsToUnbind.push(z(d,"mouseleave",this.onContainerMouseLeave.bind(this)));
a.unbindDocumentMouseUp||(a.unbindDocumentMouseUp=z(b,"mouseup",this.onDocumentMouseUp.bind(this)));for(var g=this.chart.renderTo.parentElement;g&&"BODY"!==g.tagName;)this.eventsToUnbind.push(z(g,"scroll",function(){delete c.chartPosition})),g=g.parentElement;t.hasTouch&&(this.eventsToUnbind.push(z(d,"touchstart",this.onContainerTouchStart.bind(this),{passive:!1})),this.eventsToUnbind.push(z(d,"touchmove",this.onContainerTouchMove.bind(this),{passive:!1})),a.unbindDocumentTouchEnd||(a.unbindDocumentTouchEnd=
z(b,"touchend",this.onDocumentTouchEnd.bind(this),{passive:!1})))};a.prototype.setHoverChartIndex=function(){var c=this.chart,d=t.charts[r(a.hoverChartIndex,-1)];if(d&&d!==c)d.pointer.onContainerMouseLeave({relatedTarget:!0});d&&d.mouseIsDown||(a.hoverChartIndex=c.index)};a.prototype.touch=function(a,c){var b=this.chart,d;this.setHoverChartIndex();if(1===a.touches.length)if(a=this.normalize(a),(d=b.isInsidePlot(a.chartX-b.plotLeft,a.chartY-b.plotTop,{visiblePlotOnly:!0}))&&!b.openMenu){c&&this.runPointActions(a);
if("touchmove"===a.type){c=this.pinchDown;var e=c[0]?4<=Math.sqrt(Math.pow(c[0].chartX-a.chartX,2)+Math.pow(c[0].chartY-a.chartY,2)):!1}r(e,!0)&&this.pinch(a)}else c&&this.reset();else 2===a.touches.length&&this.pinch(a)};a.prototype.touchSelect=function(a){return!(!this.chart.options.chart.zoomBySingleTouch||!a.touches||1!==a.touches.length)};a.prototype.zoomOption=function(a){var c=this.chart,b=c.options.chart;c=c.inverted;var d=b.zoomType||"";/touch/.test(a.type)&&(d=r(b.pinchType,d));this.zoomX=
a=/x/.test(d);this.zoomY=b=/y/.test(d);this.zoomHor=a&&!c||b&&c;this.zoomVert=b&&!c||a&&c;this.hasZoom=a||b};return a}();"";return a});L(a,"Core/MSPointer.js",[a["Core/Globals.js"],a["Core/Pointer.js"],a["Core/Utilities.js"]],function(a,t,A){function u(){var a=[];a.item=function(a){return this[a]};c(f,function(c){a.push({pageX:c.pageX,pageY:c.pageY,target:c.target})});return a}function x(a,c,d,f){var h=I[t.hoverChartIndex||NaN];"touch"!==a.pointerType&&a.pointerType!==a.MSPOINTER_TYPE_TOUCH||!h||
(h=h.pointer,f(a),h[c]({type:d,target:a.currentTarget,preventDefault:q,touches:u()}))}var C=this&&this.__extends||function(){var a=function(c,d){a=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(a,c){a.__proto__=c}||function(a,c){for(var d in c)c.hasOwnProperty(d)&&(a[d]=c[d])};return a(c,d)};return function(c,d){function f(){this.constructor=c}a(c,d);c.prototype=null===d?Object.create(d):(f.prototype=d.prototype,new f)}}(),I=a.charts,z=a.doc,q=a.noop,m=a.win,h=A.addEvent,d=A.css,
c=A.objectEach,l=A.removeEvent,f={},w=!!m.PointerEvent;return function(c){function p(){return null!==c&&c.apply(this,arguments)||this}C(p,c);p.isRequired=function(){return!(a.hasTouch||!m.PointerEvent&&!m.MSPointerEvent)};p.prototype.batchMSEvents=function(a){a(this.chart.container,w?"pointerdown":"MSPointerDown",this.onContainerPointerDown);a(this.chart.container,w?"pointermove":"MSPointerMove",this.onContainerPointerMove);a(z,w?"pointerup":"MSPointerUp",this.onDocumentPointerUp)};p.prototype.destroy=
function(){this.batchMSEvents(l);c.prototype.destroy.call(this)};p.prototype.init=function(a,f){c.prototype.init.call(this,a,f);this.hasZoom&&d(a.container,{"-ms-touch-action":"none","touch-action":"none"})};p.prototype.onContainerPointerDown=function(a){x(a,"onContainerTouchStart","touchstart",function(a){f[a.pointerId]={pageX:a.pageX,pageY:a.pageY,target:a.currentTarget}})};p.prototype.onContainerPointerMove=function(a){x(a,"onContainerTouchMove","touchmove",function(a){f[a.pointerId]={pageX:a.pageX,
pageY:a.pageY};f[a.pointerId].target||(f[a.pointerId].target=a.currentTarget)})};p.prototype.onDocumentPointerUp=function(a){x(a,"onDocumentTouchEnd","touchend",function(a){delete f[a.pointerId]})};p.prototype.setDOMEvents=function(){c.prototype.setDOMEvents.call(this);(this.hasZoom||this.followTouchMove)&&this.batchMSEvents(h)};return p}(t)});L(a,"Core/Legend/Legend.js",[a["Core/Animation/AnimationUtilities.js"],a["Core/FormatUtilities.js"],a["Core/Globals.js"],a["Core/Series/Point.js"],a["Core/Renderer/RendererUtilities.js"],
a["Core/Utilities.js"]],function(a,t,A,G,x,C){var u=a.animObject,z=a.setAnimation,q=t.format;a=A.isFirefox;var m=A.marginNames;A=A.win;var h=x.distribute,d=C.addEvent,c=C.createElement,l=C.css,f=C.defined,w=C.discardElement,p=C.find,K=C.fireEvent,r=C.isNumber,y=C.merge,B=C.pick,n=C.relativeLength,k=C.stableSort,b=C.syncTimeout;x=C.wrap;C=function(){function a(b,a){this.allItems=[];this.contentGroup=this.box=void 0;this.display=!1;this.group=void 0;this.offsetWidth=this.maxLegendWidth=this.maxItemWidth=
this.legendWidth=this.legendHeight=this.lastLineHeight=this.lastItemY=this.itemY=this.itemX=this.itemMarginTop=this.itemMarginBottom=this.itemHeight=this.initialItemY=0;this.options={};this.padding=0;this.pages=[];this.proximate=!1;this.scrollGroup=void 0;this.widthOption=this.totalItemWidth=this.titleHeight=this.symbolWidth=this.symbolHeight=0;this.chart=b;this.init(b,a)}a.prototype.init=function(b,a){this.chart=b;this.setOptions(a);a.enabled&&(this.render(),d(this.chart,"endResize",function(){this.legend.positionCheckboxes()}),
this.proximate?this.unchartrender=d(this.chart,"render",function(){this.legend.proximatePositions();this.legend.positionItems()}):this.unchartrender&&this.unchartrender())};a.prototype.setOptions=function(b){var a=B(b.padding,8);this.options=b;this.chart.styledMode||(this.itemStyle=b.itemStyle,this.itemHiddenStyle=y(this.itemStyle,b.itemHiddenStyle));this.itemMarginTop=b.itemMarginTop||0;this.itemMarginBottom=b.itemMarginBottom||0;this.padding=a;this.initialItemY=a-5;this.symbolWidth=B(b.symbolWidth,
16);this.pages=[];this.proximate="proximate"===b.layout&&!this.chart.inverted;this.baseline=void 0};a.prototype.update=function(b,a){var c=this.chart;this.setOptions(y(!0,this.options,b));this.destroy();c.isDirtyLegend=c.isDirtyBox=!0;B(a,!0)&&c.redraw();K(this,"afterUpdate")};a.prototype.colorizeItem=function(b,a){b.legendGroup[a?"removeClass":"addClass"]("highcharts-legend-item-hidden");if(!this.chart.styledMode){var c=this.options,e=b.legendItem,d=b.legendLine,g=b.legendSymbol,f=this.itemHiddenStyle.color;
c=a?c.itemStyle.color:f;var k=a?b.color||f:f,h=b.options&&b.options.marker,l={fill:k};e&&e.css({fill:c,color:c});d&&d.attr({stroke:k});g&&(h&&g.isMarker&&(l=b.pointAttribs(),a||(l.stroke=l.fill=f)),g.attr(l))}K(this,"afterColorizeItem",{item:b,visible:a})};a.prototype.positionItems=function(){this.allItems.forEach(this.positionItem,this);this.chart.isResizing||this.positionCheckboxes()};a.prototype.positionItem=function(b){var a=this,c=this.options,e=c.symbolPadding,d=!c.rtl,g=b._legendItemPos;c=
g[0];g=g[1];var k=b.checkbox,h=b.legendGroup;h&&h.element&&(e={translateX:d?c:this.legendWidth-c-2*e-4,translateY:g},d=function(){K(a,"afterPositionItem",{item:b})},f(h.translateY)?h.animate(e,void 0,d):(h.attr(e),d()));k&&(k.x=c,k.y=g)};a.prototype.destroyItem=function(b){var a=b.checkbox;["legendItem","legendLine","legendSymbol","legendGroup"].forEach(function(a){b[a]&&(b[a]=b[a].destroy())});a&&w(b.checkbox)};a.prototype.destroy=function(){function b(b){this[b]&&(this[b]=this[b].destroy())}this.getAllItems().forEach(function(a){["legendItem",
"legendGroup"].forEach(b,a)});"clipRect up down pager nav box title group".split(" ").forEach(b,this);this.display=null};a.prototype.positionCheckboxes=function(){var b=this.group&&this.group.alignAttr,a=this.clipHeight||this.legendHeight,c=this.titleHeight;if(b){var d=b.translateY;this.allItems.forEach(function(e){var g=e.checkbox;if(g){var f=d+c+g.y+(this.scrollOffset||0)+3;l(g,{left:b.translateX+e.checkboxOffset+g.x-20+"px",top:f+"px",display:this.proximate||f>d-6&&f<d+a-6?"":"none"})}},this)}};
a.prototype.renderTitle=function(){var b=this.options,a=this.padding,c=b.title,d=0;c.text&&(this.title||(this.title=this.chart.renderer.label(c.text,a-3,a-4,null,null,null,b.useHTML,null,"legend-title").attr({zIndex:1}),this.chart.styledMode||this.title.css(c.style),this.title.add(this.group)),c.width||this.title.css({width:this.maxLegendWidth+"px"}),b=this.title.getBBox(),d=b.height,this.offsetWidth=b.width,this.contentGroup.attr({translateY:d}));this.titleHeight=d};a.prototype.setText=function(b){var a=
this.options;b.legendItem.attr({text:a.labelFormat?q(a.labelFormat,b,this.chart):a.labelFormatter.call(b)})};a.prototype.renderItem=function(b){var a=this.chart,c=a.renderer,e=this.options,d=this.symbolWidth,g=e.symbolPadding||0,f=this.itemStyle,k=this.itemHiddenStyle,h="horizontal"===e.layout?B(e.itemDistance,20):0,l=!e.rtl,m=!b.series,n=!m&&b.series.drawLegendSymbol?b.series:b,p=n.options,r=this.createCheckboxForItem&&p&&p.showCheckbox,q=e.useHTML,w=b.options.className,F=b.legendItem;p=d+g+h+(r?
20:0);F||(b.legendGroup=c.g("legend-item").addClass("highcharts-"+n.type+"-series highcharts-color-"+b.colorIndex+(w?" "+w:"")+(m?" highcharts-series-"+b.index:"")).attr({zIndex:1}).add(this.scrollGroup),b.legendItem=F=c.text("",l?d+g:-g,this.baseline||0,q),a.styledMode||F.css(y(b.visible?f:k)),F.attr({align:l?"left":"right",zIndex:2}).add(b.legendGroup),this.baseline||(this.fontMetrics=c.fontMetrics(a.styledMode?12:f.fontSize,F),this.baseline=this.fontMetrics.f+3+this.itemMarginTop,F.attr("y",this.baseline),
this.symbolHeight=e.symbolHeight||this.fontMetrics.f,e.squareSymbol&&(this.symbolWidth=B(e.symbolWidth,Math.max(this.symbolHeight,16)),p=this.symbolWidth+g+h+(r?20:0),l&&F.attr("x",this.symbolWidth+g))),n.drawLegendSymbol(this,b),this.setItemEvents&&this.setItemEvents(b,F,q));r&&!b.checkbox&&this.createCheckboxForItem&&this.createCheckboxForItem(b);this.colorizeItem(b,b.visible);!a.styledMode&&f.width||F.css({width:(e.itemWidth||this.widthOption||a.spacingBox.width)-p+"px"});this.setText(b);a=F.getBBox();
b.itemWidth=b.checkboxOffset=e.itemWidth||b.legendItemWidth||a.width+p;this.maxItemWidth=Math.max(this.maxItemWidth,b.itemWidth);this.totalItemWidth+=b.itemWidth;this.itemHeight=b.itemHeight=Math.round(b.legendItemHeight||a.height||this.symbolHeight)};a.prototype.layoutItem=function(b){var a=this.options,c=this.padding,e="horizontal"===a.layout,d=b.itemHeight,g=this.itemMarginBottom,f=this.itemMarginTop,k=e?B(a.itemDistance,20):0,h=this.maxLegendWidth;a=a.alignColumns&&this.totalItemWidth>h?this.maxItemWidth:
b.itemWidth;e&&this.itemX-c+a>h&&(this.itemX=c,this.lastLineHeight&&(this.itemY+=f+this.lastLineHeight+g),this.lastLineHeight=0);this.lastItemY=f+this.itemY+g;this.lastLineHeight=Math.max(d,this.lastLineHeight);b._legendItemPos=[this.itemX,this.itemY];e?this.itemX+=a:(this.itemY+=f+d+g,this.lastLineHeight=d);this.offsetWidth=this.widthOption||Math.max((e?this.itemX-c-(b.checkbox?0:k):a)+c,this.offsetWidth)};a.prototype.getAllItems=function(){var b=[];this.chart.series.forEach(function(a){var c=a&&
a.options;a&&B(c.showInLegend,f(c.linkedTo)?!1:void 0,!0)&&(b=b.concat(a.legendItems||("point"===c.legendType?a.data:a)))});K(this,"afterGetAllItems",{allItems:b});return b};a.prototype.getAlignment=function(){var b=this.options;return this.proximate?b.align.charAt(0)+"tv":b.floating?"":b.align.charAt(0)+b.verticalAlign.charAt(0)+b.layout.charAt(0)};a.prototype.adjustMargins=function(b,a){var c=this.chart,e=this.options,d=this.getAlignment();d&&[/(lth|ct|rth)/,/(rtv|rm|rbv)/,/(rbh|cb|lbh)/,/(lbv|lm|ltv)/].forEach(function(g,
k){g.test(d)&&!f(b[k])&&(c[m[k]]=Math.max(c[m[k]],c.legend[(k+1)%2?"legendHeight":"legendWidth"]+[1,-1,-1,1][k]*e[k%2?"x":"y"]+B(e.margin,12)+a[k]+(c.titleOffset[k]||0)))})};a.prototype.proximatePositions=function(){var b=this.chart,a=[],c="left"===this.options.align;this.allItems.forEach(function(e){var d;var g=c;if(e.yAxis){e.xAxis.options.reversed&&(g=!g);e.points&&(d=p(g?e.points:e.points.slice(0).reverse(),function(b){return r(b.plotY)}));g=this.itemMarginTop+e.legendItem.getBBox().height+this.itemMarginBottom;
var f=e.yAxis.top-b.plotTop;e.visible?(d=d?d.plotY:e.yAxis.height,d+=f-.3*g):d=f+e.yAxis.height;a.push({target:d,size:g,item:e})}},this);h(a,b.plotHeight).forEach(function(a){a.item._legendItemPos&&(a.item._legendItemPos[1]=b.plotTop-b.spacing[0]+a.pos)})};a.prototype.render=function(){var b=this.chart,a=b.renderer,c=this.options,d=this.padding,g=this.getAllItems(),f=this.group,h=this.box;this.itemX=d;this.itemY=this.initialItemY;this.lastItemY=this.offsetWidth=0;this.widthOption=n(c.width,b.spacingBox.width-
d);var l=b.spacingBox.width-2*d-c.x;-1<["rm","lm"].indexOf(this.getAlignment().substring(0,2))&&(l/=2);this.maxLegendWidth=this.widthOption||l;f||(this.group=f=a.g("legend").addClass(c.className||"").attr({zIndex:7}).add(),this.contentGroup=a.g().attr({zIndex:1}).add(f),this.scrollGroup=a.g().add(this.contentGroup));this.renderTitle();k(g,function(b,a){return(b.options&&b.options.legendIndex||0)-(a.options&&a.options.legendIndex||0)});c.reversed&&g.reverse();this.allItems=g;this.display=l=!!g.length;
this.itemHeight=this.totalItemWidth=this.maxItemWidth=this.lastLineHeight=0;g.forEach(this.renderItem,this);g.forEach(this.layoutItem,this);g=(this.widthOption||this.offsetWidth)+d;var m=this.lastItemY+this.lastLineHeight+this.titleHeight;m=this.handleOverflow(m);m+=d;h||(this.box=h=a.rect().addClass("highcharts-legend-box").attr({r:c.borderRadius}).add(f),h.isNew=!0);b.styledMode||h.attr({stroke:c.borderColor,"stroke-width":c.borderWidth||0,fill:c.backgroundColor||"none"}).shadow(c.shadow);0<g&&
0<m&&(h[h.isNew?"attr":"animate"](h.crisp.call({},{x:0,y:0,width:g,height:m},h.strokeWidth())),h.isNew=!1);h[l?"show":"hide"]();b.styledMode&&"none"===f.getStyle("display")&&(g=m=0);this.legendWidth=g;this.legendHeight=m;l&&this.align();this.proximate||this.positionItems();K(this,"afterRender")};a.prototype.align=function(b){void 0===b&&(b=this.chart.spacingBox);var a=this.chart,c=this.options,e=b.y;/(lth|ct|rth)/.test(this.getAlignment())&&0<a.titleOffset[0]?e+=a.titleOffset[0]:/(lbh|cb|rbh)/.test(this.getAlignment())&&
0<a.titleOffset[2]&&(e-=a.titleOffset[2]);e!==b.y&&(b=y(b,{y:e}));this.group.align(y(c,{width:this.legendWidth,height:this.legendHeight,verticalAlign:this.proximate?"top":c.verticalAlign}),!0,b)};a.prototype.handleOverflow=function(b){var a=this,c=this.chart,e=c.renderer,d=this.options,g=d.y,f="top"===d.verticalAlign,k=this.padding,h=d.maxHeight,l=d.navigation,m=B(l.animation,!0),n=l.arrowSize||12,p=this.pages,r=this.allItems,q=function(b){"number"===typeof b?y.attr({height:b}):y&&(a.clipRect=y.destroy(),
a.contentGroup.clip());a.contentGroup.div&&(a.contentGroup.div.style.clip=b?"rect("+k+"px,9999px,"+(k+b)+"px,0)":"auto")},w=function(b){a[b]=e.circle(0,0,1.3*n).translate(n/2,n/2).add(N);c.styledMode||a[b].attr("fill","rgba(0,0,0,0.0001)");return a[b]},F,u;g=c.spacingBox.height+(f?-g:g)-k;var N=this.nav,y=this.clipRect;"horizontal"!==d.layout||"middle"===d.verticalAlign||d.floating||(g/=2);h&&(g=Math.min(g,h));p.length=0;b&&0<g&&b>g&&!1!==l.enabled?(this.clipHeight=F=Math.max(g-20-this.titleHeight-
k,0),this.currentPage=B(this.currentPage,1),this.fullHeight=b,r.forEach(function(b,a){var c=b._legendItemPos[1],e=Math.round(b.legendItem.getBBox().height),d=p.length;if(!d||c-p[d-1]>F&&(u||c)!==p[d-1])p.push(u||c),d++;b.pageIx=d-1;u&&(r[a-1].pageIx=d-1);a===r.length-1&&c+e-p[d-1]>F&&e<=F&&(p.push(c),b.pageIx=d);c!==u&&(u=c)}),y||(y=a.clipRect=e.clipRect(0,k,9999,0),a.contentGroup.clip(y)),q(F),N||(this.nav=N=e.g().attr({zIndex:1}).add(this.group),this.up=e.symbol("triangle",0,0,n,n).add(N),w("upTracker").on("click",
function(){a.scroll(-1,m)}),this.pager=e.text("",15,10).addClass("highcharts-legend-navigation"),c.styledMode||this.pager.css(l.style),this.pager.add(N),this.down=e.symbol("triangle-down",0,0,n,n).add(N),w("downTracker").on("click",function(){a.scroll(1,m)})),a.scroll(0),b=g):N&&(q(),this.nav=N.destroy(),this.scrollGroup.attr({translateY:1}),this.clipHeight=0);return b};a.prototype.scroll=function(a,c){var e=this,d=this.chart,g=this.pages,f=g.length,k=this.clipHeight,h=this.options.navigation,l=this.pager,
m=this.padding,n=this.currentPage+a;n>f&&(n=f);0<n&&("undefined"!==typeof c&&z(c,d),this.nav.attr({translateX:m,translateY:k+this.padding+7+this.titleHeight,visibility:"visible"}),[this.up,this.upTracker].forEach(function(b){b.attr({"class":1===n?"highcharts-legend-nav-inactive":"highcharts-legend-nav-active"})}),l.attr({text:n+"/"+f}),[this.down,this.downTracker].forEach(function(b){b.attr({x:18+this.pager.getBBox().width,"class":n===f?"highcharts-legend-nav-inactive":"highcharts-legend-nav-active"})},
this),d.styledMode||(this.up.attr({fill:1===n?h.inactiveColor:h.activeColor}),this.upTracker.css({cursor:1===n?"default":"pointer"}),this.down.attr({fill:n===f?h.inactiveColor:h.activeColor}),this.downTracker.css({cursor:n===f?"default":"pointer"})),this.scrollOffset=-g[n-1]+this.initialItemY,this.scrollGroup.animate({translateY:this.scrollOffset}),this.currentPage=n,this.positionCheckboxes(),a=u(B(c,d.renderer.globalAnimation,!0)),b(function(){K(e,"afterScroll",{currentPage:n})},a.duration))};a.prototype.setItemEvents=
function(b,a,c){var e=this,d=e.chart.renderer.boxWrapper,g=b instanceof G,f="highcharts-legend-"+(g?"point":"series")+"-active",k=e.chart.styledMode,h=function(a){e.allItems.forEach(function(c){b!==c&&[c].concat(c.linkedSeries||[]).forEach(function(b){b.setState(a,!g)})})};(c?[a,b.legendSymbol]:[b.legendGroup]).forEach(function(c){if(c)c.on("mouseover",function(){b.visible&&h("inactive");b.setState("hover");b.visible&&d.addClass(f);k||a.css(e.options.itemHoverStyle)}).on("mouseout",function(){e.chart.styledMode||
a.css(y(b.visible?e.itemStyle:e.itemHiddenStyle));h("");d.removeClass(f);b.setState()}).on("click",function(a){var c=function(){b.setVisible&&b.setVisible();h(b.visible?"inactive":"")};d.removeClass(f);a={browserEvent:a};b.firePointEvent?b.firePointEvent("legendItemClick",a,c):K(b,"legendItemClick",a,c)})})};a.prototype.createCheckboxForItem=function(b){b.checkbox=c("input",{type:"checkbox",className:"highcharts-legend-checkbox",checked:b.selected,defaultChecked:b.selected},this.options.itemCheckboxStyle,
this.chart.container);d(b.checkbox,"click",function(a){K(b.series||b,"checkboxClick",{checked:a.target.checked,item:b},function(){b.select()})})};return a}();(/Trident\/7\.0/.test(A.navigator&&A.navigator.userAgent)||a)&&x(C.prototype,"positionItem",function(b,a){var c=this,e=function(){a._legendItemPos&&b.call(c,a)};e();c.bubbleLegend||setTimeout(e)});"";return C});L(a,"Core/Series/SeriesRegistry.js",[a["Core/Globals.js"],a["Core/DefaultOptions.js"],a["Core/Series/Point.js"],a["Core/Utilities.js"]],
function(a,t,A,G){var u=t.defaultOptions,C=G.error,I=G.extendClass,z=G.merge,q;(function(m){function h(a,c){var d=u.plotOptions||{},f=c.defaultOptions;c.prototype.pointClass||(c.prototype.pointClass=A);c.prototype.type=a;f&&(d[a]=f);m.seriesTypes[a]=c}m.seriesTypes=a.seriesTypes;m.getSeries=function(a,c){void 0===c&&(c={});var d=a.options.chart;d=c.type||d.type||d.defaultSeriesType||"";var f=m.seriesTypes[d];m||C(17,!0,a,{missingModuleFor:d});d=new f;"function"===typeof d.init&&d.init(a,c);return d};
m.registerSeriesType=h;m.seriesType=function(a,c,l,f,q){var d=u.plotOptions||{};c=c||"";d[a]=z(d[c],l);h(a,I(m.seriesTypes[c]||function(){},f));m.seriesTypes[a].prototype.type=a;q&&(m.seriesTypes[a].prototype.pointClass=I(A,q));return m.seriesTypes[a]}})(q||(q={}));return q});L(a,"Core/Chart/Chart.js",[a["Core/Animation/AnimationUtilities.js"],a["Core/Axis/Axis.js"],a["Core/FormatUtilities.js"],a["Core/Foundation.js"],a["Core/Globals.js"],a["Core/Legend/Legend.js"],a["Core/MSPointer.js"],a["Core/DefaultOptions.js"],
a["Core/Pointer.js"],a["Core/Renderer/RendererRegistry.js"],a["Core/Series/SeriesRegistry.js"],a["Core/Renderer/SVG/SVGRenderer.js"],a["Core/Time.js"],a["Core/Utilities.js"],a["Core/Renderer/HTML/AST.js"]],function(a,t,A,G,x,C,I,z,q,m,h,d,c,l,f){var w=a.animate,p=a.animObject,u=a.setAnimation,r=A.numberFormat,y=G.registerEventOptions,B=x.charts,n=x.doc,k=x.marginNames,b=x.svg,g=x.win,e=z.defaultOptions,D=z.defaultTime,H=h.seriesTypes,v=l.addEvent,E=l.attr,O=l.cleanRecursively,S=l.createElement,P=
l.css,U=l.defined,Y=l.discardElement,J=l.erase,M=l.error,L=l.extend,da=l.find,Q=l.fireEvent,ea=l.getStyle,F=l.isArray,T=l.isNumber,N=l.isObject,V=l.isString,W=l.merge,X=l.objectEach,R=l.pick,fa=l.pInt,aa=l.relativeLength,ia=l.removeEvent,ha=l.splat,ba=l.syncTimeout,ka=l.uniqueKey;a=function(){function a(b,a,c){this.series=this.renderTo=this.renderer=this.pointer=this.pointCount=this.plotWidth=this.plotTop=this.plotLeft=this.plotHeight=this.plotBox=this.options=this.numberFormatter=this.margin=this.legend=
this.labelCollectors=this.isResizing=this.index=this.eventOptions=this.container=this.colorCounter=this.clipBox=this.chartWidth=this.chartHeight=this.bounds=this.axisOffset=this.axes=void 0;this.sharedClips={};this.yAxis=this.xAxis=this.userOptions=this.titleOffset=this.time=this.symbolCounter=this.spacingBox=this.spacing=void 0;this.getArgs(b,a,c)}a.chart=function(b,c,e){return new a(b,c,e)};a.prototype.getArgs=function(b,a,c){V(b)||b.nodeName?(this.renderTo=b,this.init(a,c)):this.init(b,a)};a.prototype.init=
function(b,a){var d=b.plotOptions||{};Q(this,"init",{args:arguments},function(){var g=W(e,b),f=g.chart;X(g.plotOptions,function(b,a){N(b)&&(b.tooltip=d[a]&&W(d[a].tooltip)||void 0)});g.tooltip.userOptions=b.chart&&b.chart.forExport&&b.tooltip.userOptions||b.tooltip;this.userOptions=b;this.margin=[];this.spacing=[];this.bounds={h:{},v:{}};this.labelCollectors=[];this.callback=a;this.isResizing=0;this.options=g;this.axes=[];this.series=[];this.time=b.time&&Object.keys(b.time).length?new c(b.time):x.time;
this.numberFormatter=f.numberFormatter||r;this.styledMode=f.styledMode;this.hasCartesianSeries=f.showAxes;this.index=B.length;B.push(this);x.chartCount++;y(this,f);this.xAxis=[];this.yAxis=[];this.pointCount=this.colorCounter=this.symbolCounter=0;Q(this,"afterInit");this.firstRender()})};a.prototype.initSeries=function(b){var a=this.options.chart;a=b.type||a.type||a.defaultSeriesType;var c=H[a];c||M(17,!0,this,{missingModuleFor:a});a=new c;"function"===typeof a.init&&a.init(this,b);return a};a.prototype.setSeriesData=
function(){this.getSeriesOrderByLinks().forEach(function(b){b.points||b.data||!b.enabledDataSorting||b.setData(b.options.data,!1)})};a.prototype.getSeriesOrderByLinks=function(){return this.series.concat().sort(function(b,a){return b.linkedSeries.length||a.linkedSeries.length?a.linkedSeries.length-b.linkedSeries.length:0})};a.prototype.orderSeries=function(b){var a=this.series;b=b||0;for(var c=a.length;b<c;++b)a[b]&&(a[b].index=b,a[b].name=a[b].getName())};a.prototype.isInsidePlot=function(b,a,c){void 0===
c&&(c={});var e=this.inverted,d=this.plotBox,g=this.plotLeft,f=this.plotTop,k=this.scrollablePlotBox,h=0;var l=0;c.visiblePlotOnly&&this.scrollingContainer&&(l=this.scrollingContainer,h=l.scrollLeft,l=l.scrollTop);var m=c.series;d=c.visiblePlotOnly&&k||d;k=c.inverted?a:b;a=c.inverted?b:a;b={x:k,y:a,isInsidePlot:!0};if(!c.ignoreX){var n=m&&(e?m.yAxis:m.xAxis)||{pos:g,len:Infinity};k=c.paneCoordinates?n.pos+k:g+k;k>=Math.max(h+g,n.pos)&&k<=Math.min(h+g+d.width,n.pos+n.len)||(b.isInsidePlot=!1)}!c.ignoreY&&
b.isInsidePlot&&(e=m&&(e?m.xAxis:m.yAxis)||{pos:f,len:Infinity},c=c.paneCoordinates?e.pos+a:f+a,c>=Math.max(l+f,e.pos)&&c<=Math.min(l+f+d.height,e.pos+e.len)||(b.isInsidePlot=!1));Q(this,"afterIsInsidePlot",b);return b.isInsidePlot};a.prototype.redraw=function(b){Q(this,"beforeRedraw");var a=this.hasCartesianSeries?this.axes:this.colorAxis||[],c=this.series,e=this.pointer,d=this.legend,g=this.userOptions.legend,f=this.renderer,k=f.isHidden(),h=[],l=this.isDirtyBox,m=this.isDirtyLegend;this.setResponsive&&
this.setResponsive(!1);u(this.hasRendered?b:!1,this);k&&this.temporaryDisplay();this.layOutTitles();for(b=c.length;b--;){var n=c[b];if(n.options.stacking||n.options.centerInCategory){var p=!0;if(n.isDirty){var F=!0;break}}}if(F)for(b=c.length;b--;)n=c[b],n.options.stacking&&(n.isDirty=!0);c.forEach(function(b){b.isDirty&&("point"===b.options.legendType?("function"===typeof b.updateTotals&&b.updateTotals(),m=!0):g&&(g.labelFormatter||g.labelFormat)&&(m=!0));b.isDirtyData&&Q(b,"updatedData")});m&&d&&
d.options.enabled&&(d.render(),this.isDirtyLegend=!1);p&&this.getStacks();a.forEach(function(b){b.updateNames();b.setScale()});this.getMargins();a.forEach(function(b){b.isDirty&&(l=!0)});a.forEach(function(b){var a=b.min+","+b.max;b.extKey!==a&&(b.extKey=a,h.push(function(){Q(b,"afterSetExtremes",L(b.eventArgs,b.getExtremes()));delete b.eventArgs}));(l||p)&&b.redraw()});l&&this.drawChartBox();Q(this,"predraw");c.forEach(function(b){(l||b.isDirty)&&b.visible&&b.redraw();b.isDirtyData=!1});e&&e.reset(!0);
f.draw();Q(this,"redraw");Q(this,"render");k&&this.temporaryDisplay(!0);h.forEach(function(b){b.call()})};a.prototype.get=function(b){function a(a){return a.id===b||a.options&&a.options.id===b}for(var c=this.series,e=da(this.axes,a)||da(this.series,a),d=0;!e&&d<c.length;d++)e=da(c[d].points||[],a);return e};a.prototype.getAxes=function(){var b=this,a=this.options,c=a.xAxis=ha(a.xAxis||{});a=a.yAxis=ha(a.yAxis||{});Q(this,"getAxes");c.forEach(function(b,a){b.index=a;b.isX=!0});a.forEach(function(b,
a){b.index=a});c.concat(a).forEach(function(a){new t(b,a)});Q(this,"afterGetAxes")};a.prototype.getSelectedPoints=function(){return this.series.reduce(function(b,a){a.getPointsCollection().forEach(function(a){R(a.selectedStaging,a.selected)&&b.push(a)});return b},[])};a.prototype.getSelectedSeries=function(){return this.series.filter(function(b){return b.selected})};a.prototype.setTitle=function(b,a,c){this.applyDescription("title",b);this.applyDescription("subtitle",a);this.applyDescription("caption",
void 0);this.layOutTitles(c)};a.prototype.applyDescription=function(b,a){var c=this,e="title"===b?{color:"#333333",fontSize:this.options.isStock?"16px":"18px"}:{color:"#666666"};e=this.options[b]=W(!this.styledMode&&{style:e},this.options[b],a);var d=this[b];d&&a&&(this[b]=d=d.destroy());e&&!d&&(d=this.renderer.text(e.text,0,0,e.useHTML).attr({align:e.align,"class":"highcharts-"+b,zIndex:e.zIndex||4}).add(),d.update=function(a){c[{title:"setTitle",subtitle:"setSubtitle",caption:"setCaption"}[b]](a)},
this.styledMode||d.css(e.style),this[b]=d)};a.prototype.layOutTitles=function(b){var a=[0,0,0],c=this.renderer,e=this.spacingBox;["title","subtitle","caption"].forEach(function(b){var d=this[b],g=this.options[b],f=g.verticalAlign||"top";b="title"===b?"top"===f?-3:0:"top"===f?a[0]+2:0;var k;if(d){this.styledMode||(k=g.style&&g.style.fontSize);k=c.fontMetrics(k,d).b;d.css({width:(g.width||e.width+(g.widthAdjust||0))+"px"});var h=Math.round(d.getBBox(g.useHTML).height);d.align(L({y:"bottom"===f?k:b+
k,height:h},g),!1,"spacingBox");g.floating||("top"===f?a[0]=Math.ceil(a[0]+h):"bottom"===f&&(a[2]=Math.ceil(a[2]+h)))}},this);a[0]&&"top"===(this.options.title.verticalAlign||"top")&&(a[0]+=this.options.title.margin);a[2]&&"bottom"===this.options.caption.verticalAlign&&(a[2]+=this.options.caption.margin);var d=!this.titleOffset||this.titleOffset.join(",")!==a.join(",");this.titleOffset=a;Q(this,"afterLayOutTitles");!this.isDirtyBox&&d&&(this.isDirtyBox=this.isDirtyLegend=d,this.hasRendered&&R(b,!0)&&
this.isDirtyBox&&this.redraw())};a.prototype.getChartSize=function(){var b=this.options.chart,a=b.width;b=b.height;var c=this.renderTo;U(a)||(this.containerWidth=ea(c,"width"));U(b)||(this.containerHeight=ea(c,"height"));this.chartWidth=Math.max(0,a||this.containerWidth||600);this.chartHeight=Math.max(0,aa(b,this.chartWidth)||(1<this.containerHeight?this.containerHeight:400))};a.prototype.temporaryDisplay=function(b){var a=this.renderTo;if(b)for(;a&&a.style;)a.hcOrigStyle&&(P(a,a.hcOrigStyle),delete a.hcOrigStyle),
a.hcOrigDetached&&(n.body.removeChild(a),a.hcOrigDetached=!1),a=a.parentNode;else for(;a&&a.style;){n.body.contains(a)||a.parentNode||(a.hcOrigDetached=!0,n.body.appendChild(a));if("none"===ea(a,"display",!1)||a.hcOricDetached)a.hcOrigStyle={display:a.style.display,height:a.style.height,overflow:a.style.overflow},b={display:"block",overflow:"hidden"},a!==this.renderTo&&(b.height=0),P(a,b),a.offsetWidth||a.style.setProperty("display","block","important");a=a.parentNode;if(a===n.body)break}};a.prototype.setClassName=
function(b){this.container.className="highcharts-container "+(b||"")};a.prototype.getContainer=function(){var a=this.options,c=a.chart,e=ka(),g,f=this.renderTo;f||(this.renderTo=f=c.renderTo);V(f)&&(this.renderTo=f=n.getElementById(f));f||M(13,!0,this);var k=fa(E(f,"data-highcharts-chart"));T(k)&&B[k]&&B[k].hasRendered&&B[k].destroy();E(f,"data-highcharts-chart",this.index);f.innerHTML="";c.skipClone||f.offsetWidth||this.temporaryDisplay();this.getChartSize();k=this.chartWidth;var h=this.chartHeight;
P(f,{overflow:"hidden"});this.styledMode||(g=L({position:"relative",overflow:"hidden",width:k+"px",height:h+"px",textAlign:"left",lineHeight:"normal",zIndex:0,"-webkit-tap-highlight-color":"rgba(0,0,0,0)",userSelect:"none","touch-action":"manipulation",outline:"none"},c.style||{}));this.container=e=S("div",{id:e},g,f);this._cursor=e.style.cursor;this.renderer=new (c.renderer||!b?m.getRendererType(c.renderer):d)(e,k,h,void 0,c.forExport,a.exporting&&a.exporting.allowHTML,this.styledMode);u(void 0,
this);this.setClassName(c.className);if(this.styledMode)for(var l in a.defs)this.renderer.definition(a.defs[l]);else this.renderer.setStyle(c.style);this.renderer.chartIndex=this.index;Q(this,"afterGetContainer")};a.prototype.getMargins=function(b){var a=this.spacing,c=this.margin,e=this.titleOffset;this.resetMargins();e[0]&&!U(c[0])&&(this.plotTop=Math.max(this.plotTop,e[0]+a[0]));e[2]&&!U(c[2])&&(this.marginBottom=Math.max(this.marginBottom,e[2]+a[2]));this.legend&&this.legend.display&&this.legend.adjustMargins(c,
a);Q(this,"getMargins");b||this.getAxisMargins()};a.prototype.getAxisMargins=function(){var b=this,a=b.axisOffset=[0,0,0,0],c=b.colorAxis,e=b.margin,d=function(b){b.forEach(function(b){b.visible&&b.getOffset()})};b.hasCartesianSeries?d(b.axes):c&&c.length&&d(c);k.forEach(function(c,d){U(e[d])||(b[c]+=a[d])});b.setChartSize()};a.prototype.reflow=function(b){var a=this,c=a.options.chart,e=a.renderTo,d=U(c.width)&&U(c.height),f=c.width||ea(e,"width");c=c.height||ea(e,"height");e=b?b.target:g;delete a.pointer.chartPosition;
if(!d&&!a.isPrinting&&f&&c&&(e===g||e===n)){if(f!==a.containerWidth||c!==a.containerHeight)l.clearTimeout(a.reflowTimeout),a.reflowTimeout=ba(function(){a.container&&a.setSize(void 0,void 0,!1)},b?100:0);a.containerWidth=f;a.containerHeight=c}};a.prototype.setReflow=function(b){var a=this;!1===b||this.unbindReflow?!1===b&&this.unbindReflow&&(this.unbindReflow=this.unbindReflow()):(this.unbindReflow=v(g,"resize",function(b){a.options&&a.reflow(b)}),v(this,"destroy",this.unbindReflow))};a.prototype.setSize=
function(b,a,c){var e=this,d=e.renderer;e.isResizing+=1;u(c,e);c=d.globalAnimation;e.oldChartHeight=e.chartHeight;e.oldChartWidth=e.chartWidth;"undefined"!==typeof b&&(e.options.chart.width=b);"undefined"!==typeof a&&(e.options.chart.height=a);e.getChartSize();e.styledMode||(c?w:P)(e.container,{width:e.chartWidth+"px",height:e.chartHeight+"px"},c);e.setChartSize(!0);d.setSize(e.chartWidth,e.chartHeight,c);e.axes.forEach(function(b){b.isDirty=!0;b.setScale()});e.isDirtyLegend=!0;e.isDirtyBox=!0;e.layOutTitles();
e.getMargins();e.redraw(c);e.oldChartHeight=null;Q(e,"resize");ba(function(){e&&Q(e,"endResize",null,function(){--e.isResizing})},p(c).duration)};a.prototype.setChartSize=function(b){var a=this.inverted,c=this.renderer,e=this.chartWidth,d=this.chartHeight,g=this.options.chart,f=this.spacing,k=this.clipOffset,h,l,m,n;this.plotLeft=h=Math.round(this.plotLeft);this.plotTop=l=Math.round(this.plotTop);this.plotWidth=m=Math.max(0,Math.round(e-h-this.marginRight));this.plotHeight=n=Math.max(0,Math.round(d-
l-this.marginBottom));this.plotSizeX=a?n:m;this.plotSizeY=a?m:n;this.plotBorderWidth=g.plotBorderWidth||0;this.spacingBox=c.spacingBox={x:f[3],y:f[0],width:e-f[3]-f[1],height:d-f[0]-f[2]};this.plotBox=c.plotBox={x:h,y:l,width:m,height:n};a=2*Math.floor(this.plotBorderWidth/2);e=Math.ceil(Math.max(a,k[3])/2);d=Math.ceil(Math.max(a,k[0])/2);this.clipBox={x:e,y:d,width:Math.floor(this.plotSizeX-Math.max(a,k[1])/2-e),height:Math.max(0,Math.floor(this.plotSizeY-Math.max(a,k[2])/2-d))};b||(this.axes.forEach(function(b){b.setAxisSize();
b.setAxisTranslation()}),c.alignElements());Q(this,"afterSetChartSize",{skipAxes:b})};a.prototype.resetMargins=function(){Q(this,"resetMargins");var b=this,a=b.options.chart;["margin","spacing"].forEach(function(c){var e=a[c],d=N(e)?e:[e,e,e,e];["Top","Right","Bottom","Left"].forEach(function(e,g){b[c][g]=R(a[c+e],d[g])})});k.forEach(function(a,c){b[a]=R(b.margin[c],b.spacing[c])});b.axisOffset=[0,0,0,0];b.clipOffset=[0,0,0,0]};a.prototype.drawChartBox=function(){var b=this.options.chart,a=this.renderer,
c=this.chartWidth,e=this.chartHeight,d=this.styledMode,g=this.plotBGImage,f=b.backgroundColor,k=b.plotBackgroundColor,h=b.plotBackgroundImage,l=this.plotLeft,m=this.plotTop,n=this.plotWidth,p=this.plotHeight,F=this.plotBox,r=this.clipRect,N=this.clipBox,q=this.chartBackground,v=this.plotBackground,B=this.plotBorder,w,u="animate";q||(this.chartBackground=q=a.rect().addClass("highcharts-background").add(),u="attr");if(d)var y=w=q.strokeWidth();else{y=b.borderWidth||0;w=y+(b.shadow?8:0);f={fill:f||"none"};
if(y||q["stroke-width"])f.stroke=b.borderColor,f["stroke-width"]=y;q.attr(f).shadow(b.shadow)}q[u]({x:w/2,y:w/2,width:c-w-y%2,height:e-w-y%2,r:b.borderRadius});u="animate";v||(u="attr",this.plotBackground=v=a.rect().addClass("highcharts-plot-background").add());v[u](F);d||(v.attr({fill:k||"none"}).shadow(b.plotShadow),h&&(g?(h!==g.attr("href")&&g.attr("href",h),g.animate(F)):this.plotBGImage=a.image(h,l,m,n,p).add()));r?r.animate({width:N.width,height:N.height}):this.clipRect=a.clipRect(N);u="animate";
B||(u="attr",this.plotBorder=B=a.rect().addClass("highcharts-plot-border").attr({zIndex:1}).add());d||B.attr({stroke:b.plotBorderColor,"stroke-width":b.plotBorderWidth||0,fill:"none"});B[u](B.crisp({x:l,y:m,width:n,height:p},-B.strokeWidth()));this.isDirtyBox=!1;Q(this,"afterDrawChartBox")};a.prototype.propFromSeries=function(){var b=this,a=b.options.chart,c=b.options.series,e,d,g;["inverted","angular","polar"].forEach(function(f){d=H[a.type||a.defaultSeriesType];g=a[f]||d&&d.prototype[f];for(e=c&&
c.length;!g&&e--;)(d=H[c[e].type])&&d.prototype[f]&&(g=!0);b[f]=g})};a.prototype.linkSeries=function(){var b=this,a=b.series;a.forEach(function(b){b.linkedSeries.length=0});a.forEach(function(a){var c=a.options.linkedTo;V(c)&&(c=":previous"===c?b.series[a.index-1]:b.get(c))&&c.linkedParent!==a&&(c.linkedSeries.push(a),a.linkedParent=c,c.enabledDataSorting&&a.setDataSortingOptions(),a.visible=R(a.options.visible,c.options.visible,a.visible))});Q(this,"afterLinkSeries")};a.prototype.renderSeries=function(){this.series.forEach(function(b){b.translate();
b.render()})};a.prototype.renderLabels=function(){var b=this,a=b.options.labels;a.items&&a.items.forEach(function(c){var e=L(a.style,c.style),d=fa(e.left)+b.plotLeft,g=fa(e.top)+b.plotTop+12;delete e.left;delete e.top;b.renderer.text(c.html,d,g).attr({zIndex:2}).css(e).add()})};a.prototype.render=function(){var b=this.axes,a=this.colorAxis,c=this.renderer,e=this.options,d=function(b){b.forEach(function(b){b.visible&&b.render()})},g=0;this.setTitle();this.legend=new C(this,e.legend);this.getStacks&&
this.getStacks();this.getMargins(!0);this.setChartSize();e=this.plotWidth;b.some(function(b){if(b.horiz&&b.visible&&b.options.labels.enabled&&b.series.length)return g=21,!0});var f=this.plotHeight=Math.max(this.plotHeight-g,0);b.forEach(function(b){b.setScale()});this.getAxisMargins();var k=1.1<e/this.plotWidth,h=1.05<f/this.plotHeight;if(k||h)b.forEach(function(b){(b.horiz&&k||!b.horiz&&h)&&b.setTickInterval(!0)}),this.getMargins();this.drawChartBox();this.hasCartesianSeries?d(b):a&&a.length&&d(a);
this.seriesGroup||(this.seriesGroup=c.g("series-group").attr({zIndex:3}).add());this.renderSeries();this.renderLabels();this.addCredits();this.setResponsive&&this.setResponsive();this.hasRendered=!0};a.prototype.addCredits=function(b){var a=this,c=W(!0,this.options.credits,b);c.enabled&&!this.credits&&(this.credits=this.renderer.text(c.text+(this.mapCredits||""),0,0).addClass("highcharts-credits").on("click",function(){c.href&&(g.location.href=c.href)}).attr({align:c.position.align,zIndex:8}),a.styledMode||
this.credits.css(c.style),this.credits.add().align(c.position),this.credits.update=function(b){a.credits=a.credits.destroy();a.addCredits(b)})};a.prototype.destroy=function(){var b=this,a=b.axes,c=b.series,e=b.container,d=e&&e.parentNode,g;Q(b,"destroy");b.renderer.forExport?J(B,b):B[b.index]=void 0;x.chartCount--;b.renderTo.removeAttribute("data-highcharts-chart");ia(b);for(g=a.length;g--;)a[g]=a[g].destroy();this.scroller&&this.scroller.destroy&&this.scroller.destroy();for(g=c.length;g--;)c[g]=
c[g].destroy();"title subtitle chartBackground plotBackground plotBGImage plotBorder seriesGroup clipRect credits pointer rangeSelector legend resetZoomButton tooltip renderer".split(" ").forEach(function(a){var c=b[a];c&&c.destroy&&(b[a]=c.destroy())});e&&(e.innerHTML="",ia(e),d&&Y(e));X(b,function(a,c){delete b[c]})};a.prototype.firstRender=function(){var b=this,a=b.options;if(!b.isReadyToRender||b.isReadyToRender()){b.getContainer();b.resetMargins();b.setChartSize();b.propFromSeries();b.getAxes();
(F(a.series)?a.series:[]).forEach(function(a){b.initSeries(a)});b.linkSeries();b.setSeriesData();Q(b,"beforeRender");q&&(I.isRequired()?b.pointer=new I(b,a):b.pointer=new q(b,a));b.render();b.pointer.getChartPosition();if(!b.renderer.imgCount&&!b.hasLoaded)b.onload();b.temporaryDisplay(!0)}};a.prototype.onload=function(){this.callbacks.concat([this.callback]).forEach(function(b){b&&"undefined"!==typeof this.index&&b.apply(this,[this])},this);Q(this,"load");Q(this,"render");U(this.index)&&this.setReflow(this.options.chart.reflow);
this.hasLoaded=!0};a.prototype.addSeries=function(b,a,c){var e=this,d;b&&(a=R(a,!0),Q(e,"addSeries",{options:b},function(){d=e.initSeries(b);e.isDirtyLegend=!0;e.linkSeries();d.enabledDataSorting&&d.setData(b.data,!1);Q(e,"afterAddSeries",{series:d});a&&e.redraw(c)}));return d};a.prototype.addAxis=function(b,a,c,e){return this.createAxis(a?"xAxis":"yAxis",{axis:b,redraw:c,animation:e})};a.prototype.addColorAxis=function(b,a,c){return this.createAxis("colorAxis",{axis:b,redraw:a,animation:c})};a.prototype.createAxis=
function(b,a){b=new t(this,W(a.axis,{index:this[b].length,isX:"xAxis"===b}));R(a.redraw,!0)&&this.redraw(a.animation);return b};a.prototype.showLoading=function(b){var a=this,c=a.options,e=c.loading,d=function(){g&&P(g,{left:a.plotLeft+"px",top:a.plotTop+"px",width:a.plotWidth+"px",height:a.plotHeight+"px"})},g=a.loadingDiv,k=a.loadingSpan;g||(a.loadingDiv=g=S("div",{className:"highcharts-loading highcharts-loading-hidden"},null,a.container));k||(a.loadingSpan=k=S("span",{className:"highcharts-loading-inner"},
null,g),v(a,"redraw",d));g.className="highcharts-loading";f.setElementHTML(k,R(b,c.lang.loading,""));a.styledMode||(P(g,L(e.style,{zIndex:10})),P(k,e.labelStyle),a.loadingShown||(P(g,{opacity:0,display:""}),w(g,{opacity:e.style.opacity||.5},{duration:e.showDuration||0})));a.loadingShown=!0;d()};a.prototype.hideLoading=function(){var b=this.options,a=this.loadingDiv;a&&(a.className="highcharts-loading highcharts-loading-hidden",this.styledMode||w(a,{opacity:0},{duration:b.loading.hideDuration||100,
complete:function(){P(a,{display:"none"})}}));this.loadingShown=!1};a.prototype.update=function(b,a,e,d){var g=this,f={credits:"addCredits",title:"setTitle",subtitle:"setSubtitle",caption:"setCaption"},k=b.isResponsiveOptions,h=[],l,m;Q(g,"update",{options:b});k||g.setResponsive(!1,!0);b=O(b,g.options);g.userOptions=W(g.userOptions,b);var n=b.chart;if(n){W(!0,g.options.chart,n);"className"in n&&g.setClassName(n.className);"reflow"in n&&g.setReflow(n.reflow);if("inverted"in n||"polar"in n||"type"in
n){g.propFromSeries();var p=!0}"alignTicks"in n&&(p=!0);"events"in n&&y(this,n);X(n,function(b,a){-1!==g.propsRequireUpdateSeries.indexOf("chart."+a)&&(l=!0);-1!==g.propsRequireDirtyBox.indexOf(a)&&(g.isDirtyBox=!0);-1!==g.propsRequireReflow.indexOf(a)&&(k?g.isDirtyBox=!0:m=!0)});!g.styledMode&&n.style&&g.renderer.setStyle(g.options.chart.style||{})}!g.styledMode&&b.colors&&(this.options.colors=b.colors);b.time&&(this.time===D&&(this.time=new c(b.time)),W(!0,g.options.time,b.time));X(b,function(a,
c){if(g[c]&&"function"===typeof g[c].update)g[c].update(a,!1);else if("function"===typeof g[f[c]])g[f[c]](a);else"colors"!==c&&-1===g.collectionsWithUpdate.indexOf(c)&&W(!0,g.options[c],b[c]);"chart"!==c&&-1!==g.propsRequireUpdateSeries.indexOf(c)&&(l=!0)});this.collectionsWithUpdate.forEach(function(a){if(b[a]){var c=[];g[a].forEach(function(b,a){b.options.isInternal||c.push(R(b.options.index,a))});ha(b[a]).forEach(function(b,d){var f=U(b.id),k;f&&(k=g.get(b.id));!k&&g[a]&&(k=g[a][c?c[d]:d])&&f&&
U(k.options.id)&&(k=void 0);k&&k.coll===a&&(k.update(b,!1),e&&(k.touched=!0));!k&&e&&g.collectionsWithInit[a]&&(g.collectionsWithInit[a][0].apply(g,[b].concat(g.collectionsWithInit[a][1]||[]).concat([!1])).touched=!0)});e&&g[a].forEach(function(b){b.touched||b.options.isInternal?delete b.touched:h.push(b)})}});h.forEach(function(b){b.chart&&b.remove&&b.remove(!1)});p&&g.axes.forEach(function(b){b.update({},!1)});l&&g.getSeriesOrderByLinks().forEach(function(b){b.chart&&b.update({},!1)},this);p=n&&
n.width;n=n&&(V(n.height)?aa(n.height,p||g.chartWidth):n.height);m||T(p)&&p!==g.chartWidth||T(n)&&n!==g.chartHeight?g.setSize(p,n,d):R(a,!0)&&g.redraw(d);Q(g,"afterUpdate",{options:b,redraw:a,animation:d})};a.prototype.setSubtitle=function(b,a){this.applyDescription("subtitle",b);this.layOutTitles(a)};a.prototype.setCaption=function(b,a){this.applyDescription("caption",b);this.layOutTitles(a)};a.prototype.showResetZoom=function(){function b(){a.zoomOut()}var a=this,c=e.lang,d=a.options.chart.resetZoomButton,
g=d.theme,f=g.states,k="chart"===d.relativeTo||"spacingBox"===d.relativeTo?null:"scrollablePlotBox";Q(this,"beforeShowResetZoom",null,function(){a.resetZoomButton=a.renderer.button(c.resetZoom,null,null,b,g,f&&f.hover).attr({align:d.position.align,title:c.resetZoomTitle}).addClass("highcharts-reset-zoom").add().align(d.position,!1,k)});Q(this,"afterShowResetZoom")};a.prototype.zoomOut=function(){Q(this,"selection",{resetSelection:!0},this.zoom)};a.prototype.zoom=function(b){var a=this,c=a.pointer,
e=a.inverted?c.mouseDownX:c.mouseDownY,d=!1,g;!b||b.resetSelection?(a.axes.forEach(function(b){g=b.zoom()}),c.initiated=!1):b.xAxis.concat(b.yAxis).forEach(function(b){var f=b.axis,k=a.inverted?f.left:f.top,h=a.inverted?k+f.width:k+f.height,l=f.isXAxis,n=!1;if(!l&&e>=k&&e<=h||l||!U(e))n=!0;c[l?"zoomX":"zoomY"]&&n&&(g=f.zoom(b.min,b.max),f.displayBtn&&(d=!0))});var f=a.resetZoomButton;d&&!f?a.showResetZoom():!d&&N(f)&&(a.resetZoomButton=f.destroy());g&&a.redraw(R(a.options.chart.animation,b&&b.animation,
100>a.pointCount))};a.prototype.pan=function(b,a){var c=this,e=c.hoverPoints;a="object"===typeof a?a:{enabled:a,type:"x"};var d=c.options.chart,g=c.options.mapNavigation&&c.options.mapNavigation.enabled;d&&d.panning&&(d.panning=a);var f=a.type,k;Q(this,"pan",{originalEvent:b},function(){e&&e.forEach(function(b){b.setState()});var a=c.xAxis;"xy"===f?a=a.concat(c.yAxis):"y"===f&&(a=c.yAxis);var d={};a.forEach(function(a){if(a.options.panningEnabled&&!a.options.isInternal){var e=a.horiz,h=b[e?"chartX":
"chartY"];e=e?"mouseDownX":"mouseDownY";var l=c[e],n=a.minPointOffset||0,m=a.reversed&&!c.inverted||!a.reversed&&c.inverted?-1:1,p=a.getExtremes(),F=a.toValue(l-h,!0)+n*m,r=a.toValue(l+a.len-h,!0)-(n*m||a.isXAxis&&a.pointRangePadding||0),q=r<F;m=a.hasVerticalPanning();l=q?r:F;F=q?F:r;var N=a.panningState;!m||a.isXAxis||N&&!N.isDirty||a.series.forEach(function(b){var a=b.getProcessedData(!0);a=b.getExtremes(a.yData,!0);N||(N={startMin:Number.MAX_VALUE,startMax:-Number.MAX_VALUE});T(a.dataMin)&&T(a.dataMax)&&
(N.startMin=Math.min(R(b.options.threshold,Infinity),a.dataMin,N.startMin),N.startMax=Math.max(R(b.options.threshold,-Infinity),a.dataMax,N.startMax))});m=Math.min(R(N&&N.startMin,p.dataMin),n?p.min:a.toValue(a.toPixels(p.min)-a.minPixelPadding));r=Math.max(R(N&&N.startMax,p.dataMax),n?p.max:a.toValue(a.toPixels(p.max)+a.minPixelPadding));a.panningState=N;a.isOrdinal||(n=m-l,0<n&&(F+=n,l=m),n=F-r,0<n&&(F=r,l-=n),a.series.length&&l!==p.min&&F!==p.max&&l>=m&&F<=r&&(a.setExtremes(l,F,!1,!1,{trigger:"pan"}),
c.resetZoomButton||g||l===m||F===r||!f.match("y")||(c.showResetZoom(),a.displayBtn=!1),k=!0),d[e]=h)}});X(d,function(b,a){c[a]=b});k&&c.redraw(!1);P(c.container,{cursor:"move"})})};return a}();L(a.prototype,{callbacks:[],collectionsWithInit:{xAxis:[a.prototype.addAxis,[!0]],yAxis:[a.prototype.addAxis,[!1]],series:[a.prototype.addSeries]},collectionsWithUpdate:["xAxis","yAxis","series"],propsRequireDirtyBox:"backgroundColor borderColor borderWidth borderRadius plotBackgroundColor plotBackgroundImage plotBorderColor plotBorderWidth plotShadow shadow".split(" "),
propsRequireReflow:"margin marginTop marginRight marginBottom marginLeft spacing spacingTop spacingRight spacingBottom spacingLeft".split(" "),propsRequireUpdateSeries:"chart.inverted chart.polar chart.ignoreHiddenSeries chart.type colors plotOptions time tooltip".split(" ")});"";return a});L(a,"Core/Legend/LegendSymbol.js",[a["Core/Utilities.js"]],function(a){var u=a.merge,A=a.pick,G;(function(a){a.drawLineMarker=function(a){var t=this.options,z=a.symbolWidth,q=a.symbolHeight,m=q/2,h=this.chart.renderer,
d=this.legendGroup;a=a.baseline-Math.round(.3*a.fontMetrics.b);var c={},l=t.marker;this.chart.styledMode||(c={"stroke-width":t.lineWidth||0},t.dashStyle&&(c.dashstyle=t.dashStyle));this.legendLine=h.path([["M",0,a],["L",z,a]]).addClass("highcharts-graph").attr(c).add(d);l&&!1!==l.enabled&&z&&(t=Math.min(A(l.radius,m),m),0===this.symbol.indexOf("url")&&(l=u(l,{width:q,height:q}),t=0),this.legendSymbol=z=h.symbol(this.symbol,z/2-t,a-t,2*t,2*t,l).addClass("highcharts-point").add(d),z.isMarker=!0)};a.drawRectangle=
function(a,u){var t=a.symbolHeight,q=a.options.squareSymbol;u.legendSymbol=this.chart.renderer.rect(q?(a.symbolWidth-t)/2:0,a.baseline-t+1,q?t:a.symbolWidth,t,A(a.options.symbolRadius,t/2)).addClass("highcharts-point").attr({zIndex:3}).add(u.legendGroup)}})(G||(G={}));return G});L(a,"Core/Series/SeriesDefaults.js",[],function(){return{lineWidth:2,allowPointSelect:!1,crisp:!0,showCheckbox:!1,animation:{duration:1E3},events:{},marker:{enabledThreshold:2,lineColor:"#ffffff",lineWidth:0,radius:4,states:{normal:{animation:!0},
hover:{animation:{duration:50},enabled:!0,radiusPlus:2,lineWidthPlus:1},select:{fillColor:"#cccccc",lineColor:"#000000",lineWidth:2}}},point:{events:{}},dataLabels:{animation:{},align:"center",defer:!0,formatter:function(){var a=this.series.chart.numberFormatter;return"number"!==typeof this.y?"":a(this.y,-1)},padding:5,style:{fontSize:"11px",fontWeight:"bold",color:"contrast",textOutline:"1px contrast"},verticalAlign:"bottom",x:0,y:0},cropThreshold:300,opacity:1,pointRange:0,softThreshold:!0,states:{normal:{animation:!0},
hover:{animation:{duration:50},lineWidthPlus:1,marker:{},halo:{size:10,opacity:.25}},select:{animation:{duration:0}},inactive:{animation:{duration:50},opacity:.2}},stickyTracking:!0,turboThreshold:1E3,findNearestPointBy:"x"}});L(a,"Core/Series/Series.js",[a["Core/Animation/AnimationUtilities.js"],a["Core/DefaultOptions.js"],a["Core/Foundation.js"],a["Core/Globals.js"],a["Core/Legend/LegendSymbol.js"],a["Core/Series/Point.js"],a["Core/Series/SeriesDefaults.js"],a["Core/Series/SeriesRegistry.js"],a["Core/Renderer/SVG/SVGElement.js"],
a["Core/Utilities.js"]],function(a,t,A,G,x,C,I,z,q,m){var h=a.animObject,d=a.setAnimation,c=t.defaultOptions,l=A.registerEventOptions,f=G.hasTouch,w=G.svg,p=G.win,u=z.seriesTypes,r=m.addEvent,y=m.arrayMax,B=m.arrayMin,n=m.clamp,k=m.cleanRecursively,b=m.correctFloat,g=m.defined,e=m.erase,D=m.error,H=m.extend,v=m.find,E=m.fireEvent,O=m.getNestedProperty,S=m.isArray,P=m.isNumber,U=m.isString,Y=m.merge,J=m.objectEach,M=m.pick,L=m.removeEvent,da=m.splat,Q=m.syncTimeout;a=function(){function a(){this.zones=
this.yAxis=this.xAxis=this.userOptions=this.tooltipOptions=this.processedYData=this.processedXData=this.points=this.options=this.linkedSeries=this.index=this.eventsToUnbind=this.eventOptions=this.data=this.chart=this._i=void 0}a.prototype.init=function(b,a){E(this,"init",{options:a});var c=this,e=b.series;this.eventsToUnbind=[];c.chart=b;c.options=c.setOptions(a);a=c.options;c.linkedSeries=[];c.bindAxes();H(c,{name:a.name,state:"",visible:!1!==a.visible,selected:!0===a.selected});l(this,a);var d=
a.events;if(d&&d.click||a.point&&a.point.events&&a.point.events.click||a.allowPointSelect)b.runTrackerClick=!0;c.getColor();c.getSymbol();c.parallelArrays.forEach(function(b){c[b+"Data"]||(c[b+"Data"]=[])});c.isCartesian&&(b.hasCartesianSeries=!0);var g;e.length&&(g=e[e.length-1]);c._i=M(g&&g._i,-1)+1;c.opacity=c.options.opacity;b.orderSeries(this.insert(e));a.dataSorting&&a.dataSorting.enabled?c.setDataSortingOptions():c.points||c.data||c.setData(a.data,!1);E(this,"afterInit")};a.prototype.is=function(b){return u[b]&&
this instanceof u[b]};a.prototype.insert=function(b){var a=this.options.index,c;if(P(a)){for(c=b.length;c--;)if(a>=M(b[c].options.index,b[c]._i)){b.splice(c+1,0,this);break}-1===c&&b.unshift(this);c+=1}else b.push(this);return M(c,b.length-1)};a.prototype.bindAxes=function(){var b=this,a=b.options,c=b.chart,e;E(this,"bindAxes",null,function(){(b.axisTypes||[]).forEach(function(d){var g=0;c[d].forEach(function(c){e=c.options;if(a[d]===g&&!e.isInternal||"undefined"!==typeof a[d]&&a[d]===e.id||"undefined"===
typeof a[d]&&0===e.index)b.insert(c.series),b[d]=c,c.isDirty=!0;e.isInternal||g++});b[d]||b.optionalAxis===d||D(18,!0,c)})});E(this,"afterBindAxes")};a.prototype.updateParallelArrays=function(b,a){var c=b.series,e=arguments,d=P(a)?function(e){var d="y"===e&&c.toYData?c.toYData(b):b[e];c[e+"Data"][a]=d}:function(b){Array.prototype[a].apply(c[b+"Data"],Array.prototype.slice.call(e,2))};c.parallelArrays.forEach(d)};a.prototype.hasData=function(){return this.visible&&"undefined"!==typeof this.dataMax&&
"undefined"!==typeof this.dataMin||this.visible&&this.yData&&0<this.yData.length};a.prototype.autoIncrement=function(b){var a=this.options,c=a.pointIntervalUnit,e=a.relativeXValue,d=this.chart.time,g=this.xIncrement,f;g=M(g,a.pointStart,0);this.pointInterval=f=M(this.pointInterval,a.pointInterval,1);e&&P(b)&&(f*=b);c&&(a=new d.Date(g),"day"===c?d.set("Date",a,d.get("Date",a)+f):"month"===c?d.set("Month",a,d.get("Month",a)+f):"year"===c&&d.set("FullYear",a,d.get("FullYear",a)+f),f=a.getTime()-g);if(e&&
P(b))return g+f;this.xIncrement=g+f;return g};a.prototype.setDataSortingOptions=function(){var b=this.options;H(this,{requireSorting:!1,sorted:!1,enabledDataSorting:!0,allowDG:!1});g(b.pointRange)||(b.pointRange=1)};a.prototype.setOptions=function(b){var a=this.chart,e=a.options,d=e.plotOptions,f=a.userOptions||{};b=Y(b);a=a.styledMode;var k={plotOptions:d,userOptions:b};E(this,"setOptions",k);var h=k.plotOptions[this.type],l=f.plotOptions||{};this.userOptions=k.userOptions;f=Y(h,d.series,f.plotOptions&&
f.plotOptions[this.type],b);this.tooltipOptions=Y(c.tooltip,c.plotOptions.series&&c.plotOptions.series.tooltip,c.plotOptions[this.type].tooltip,e.tooltip.userOptions,d.series&&d.series.tooltip,d[this.type].tooltip,b.tooltip);this.stickyTracking=M(b.stickyTracking,l[this.type]&&l[this.type].stickyTracking,l.series&&l.series.stickyTracking,this.tooltipOptions.shared&&!this.noSharedTooltip?!0:f.stickyTracking);null===h.marker&&delete f.marker;this.zoneAxis=f.zoneAxis;d=this.zones=(f.zones||[]).slice();
!f.negativeColor&&!f.negativeFillColor||f.zones||(e={value:f[this.zoneAxis+"Threshold"]||f.threshold||0,className:"highcharts-negative"},a||(e.color=f.negativeColor,e.fillColor=f.negativeFillColor),d.push(e));d.length&&g(d[d.length-1].value)&&d.push(a?{}:{color:this.color,fillColor:this.fillColor});E(this,"afterSetOptions",{options:f});return f};a.prototype.getName=function(){return M(this.options.name,"Series "+(this.index+1))};a.prototype.getCyclic=function(b,a,c){var e=this.chart,d=this.userOptions,
f=b+"Index",k=b+"Counter",h=c?c.length:M(e.options.chart[b+"Count"],e[b+"Count"]);if(!a){var l=M(d[f],d["_"+f]);g(l)||(e.series.length||(e[k]=0),d["_"+f]=l=e[k]%h,e[k]+=1);c&&(a=c[l])}"undefined"!==typeof l&&(this[f]=l);this[b]=a};a.prototype.getColor=function(){this.chart.styledMode?this.getCyclic("color"):this.options.colorByPoint?this.color="#cccccc":this.getCyclic("color",this.options.color||c.plotOptions[this.type].color,this.chart.options.colors)};a.prototype.getPointsCollection=function(){return(this.hasGroupedData?
this.points:this.data)||[]};a.prototype.getSymbol=function(){this.getCyclic("symbol",this.options.marker.symbol,this.chart.options.symbols)};a.prototype.findPointIndex=function(b,a){var c=b.id,e=b.x,d=this.points,g=this.options.dataSorting,f,k;if(c)g=this.chart.get(c),g instanceof C&&(f=g);else if(this.linkedParent||this.enabledDataSorting||this.options.relativeXValue)if(f=function(a){return!a.touched&&a.index===b.index},g&&g.matchByName?f=function(a){return!a.touched&&a.name===b.name}:this.options.relativeXValue&&
(f=function(a){return!a.touched&&a.options.x===b.x}),f=v(d,f),!f)return;if(f){var h=f&&f.index;"undefined"!==typeof h&&(k=!0)}"undefined"===typeof h&&P(e)&&(h=this.xData.indexOf(e,a));-1!==h&&"undefined"!==typeof h&&this.cropped&&(h=h>=this.cropStart?h-this.cropStart:h);!k&&P(h)&&d[h]&&d[h].touched&&(h=void 0);return h};a.prototype.updateData=function(b,a){var c=this.options,e=c.dataSorting,d=this.points,f=[],k=this.requireSorting,h=b.length===d.length,l,n,m,p=!0;this.xIncrement=null;b.forEach(function(b,
a){var n=g(b)&&this.pointClass.prototype.optionsToObject.call({series:this},b)||{},p=n.x;if(n.id||P(p)){if(n=this.findPointIndex(n,m),-1===n||"undefined"===typeof n?f.push(b):d[n]&&b!==c.data[n]?(d[n].update(b,!1,null,!1),d[n].touched=!0,k&&(m=n+1)):d[n]&&(d[n].touched=!0),!h||a!==n||e&&e.enabled||this.hasDerivedData)l=!0}else f.push(b)},this);if(l)for(b=d.length;b--;)(n=d[b])&&!n.touched&&n.remove&&n.remove(!1,a);else!h||e&&e.enabled?p=!1:(b.forEach(function(b,a){b!==d[a].y&&d[a].update&&d[a].update(b,
!1,null,!1)}),f.length=0);d.forEach(function(b){b&&(b.touched=!1)});if(!p)return!1;f.forEach(function(b){this.addPoint(b,!1,null,null,!1)},this);null===this.xIncrement&&this.xData&&this.xData.length&&(this.xIncrement=y(this.xData),this.autoIncrement());return!0};a.prototype.setData=function(b,a,c,e){var d=this,g=d.points,f=g&&g.length||0,k=d.options,h=d.chart,l=k.dataSorting,n=d.xAxis,m=k.turboThreshold,p=this.xData,F=this.yData,r=d.pointArrayMap;r=r&&r.length;var q=k.keys,v,B=0,w=1,u=null;b=b||[];
var y=b.length;a=M(a,!0);l&&l.enabled&&(b=this.sortData(b));!1!==e&&y&&f&&!d.cropped&&!d.hasGroupedData&&d.visible&&!d.isSeriesBoosting&&(v=this.updateData(b,c));if(!v){d.xIncrement=null;d.colorCounter=0;this.parallelArrays.forEach(function(b){d[b+"Data"].length=0});if(m&&y>m)if(u=d.getFirstValidPoint(b),P(u))for(c=0;c<y;c++)p[c]=this.autoIncrement(),F[c]=b[c];else if(S(u))if(r)if(u.length===r)for(c=0;c<y;c++)p[c]=this.autoIncrement(),F[c]=b[c];else for(c=0;c<y;c++)e=b[c],p[c]=e[0],F[c]=e.slice(1,
r+1);else if(q&&(B=q.indexOf("x"),w=q.indexOf("y"),B=0<=B?B:0,w=0<=w?w:1),1===u.length&&(w=0),B===w)for(c=0;c<y;c++)p[c]=this.autoIncrement(),F[c]=b[c][w];else for(c=0;c<y;c++)e=b[c],p[c]=e[B],F[c]=e[w];else D(12,!1,h);else for(c=0;c<y;c++)"undefined"!==typeof b[c]&&(e={series:d},d.pointClass.prototype.applyOptions.apply(e,[b[c]]),d.updateParallelArrays(e,c));F&&U(F[0])&&D(14,!0,h);d.data=[];d.options.data=d.userOptions.data=b;for(c=f;c--;)g[c]&&g[c].destroy&&g[c].destroy();n&&(n.minRange=n.userMinRange);
d.isDirty=h.isDirtyBox=!0;d.isDirtyData=!!g;c=!1}"point"===k.legendType&&(this.processData(),this.generatePoints());a&&h.redraw(c)};a.prototype.sortData=function(b){var a=this,c=a.options.dataSorting.sortKey||"y",e=function(b,a){return g(a)&&b.pointClass.prototype.optionsToObject.call({series:b},a)||{}};b.forEach(function(c,d){b[d]=e(a,c);b[d].index=d},this);b.concat().sort(function(b,a){b=O(c,b);a=O(c,a);return a<b?-1:a>b?1:0}).forEach(function(b,a){b.x=a},this);a.linkedSeries&&a.linkedSeries.forEach(function(a){var c=
a.options,d=c.data;c.dataSorting&&c.dataSorting.enabled||!d||(d.forEach(function(c,g){d[g]=e(a,c);b[g]&&(d[g].x=b[g].x,d[g].index=g)}),a.setData(d,!1))});return b};a.prototype.getProcessedData=function(b){var a=this.xAxis,c=this.options,e=c.cropThreshold,d=b||this.getExtremesFromAll||c.getExtremesFromAll,g=this.isCartesian;b=a&&a.val2lin;c=!(!a||!a.logarithmic);var f=0,k=this.xData,h=this.yData,l=this.requireSorting;var n=!1;var m=k.length;if(a){n=a.getExtremes();var p=n.min;var r=n.max;n=a.categories&&
!a.names.length}if(g&&this.sorted&&!d&&(!e||m>e||this.forceCrop))if(k[m-1]<p||k[0]>r)k=[],h=[];else if(this.yData&&(k[0]<p||k[m-1]>r)){var F=this.cropData(this.xData,this.yData,p,r);k=F.xData;h=F.yData;f=F.start;F=!0}for(e=k.length||1;--e;)if(a=c?b(k[e])-b(k[e-1]):k[e]-k[e-1],0<a&&("undefined"===typeof q||a<q))var q=a;else 0>a&&l&&!n&&(D(15,!1,this.chart),l=!1);return{xData:k,yData:h,cropped:F,cropStart:f,closestPointRange:q}};a.prototype.processData=function(b){var a=this.xAxis;if(this.isCartesian&&
!this.isDirty&&!a.isDirty&&!this.yAxis.isDirty&&!b)return!1;b=this.getProcessedData();this.cropped=b.cropped;this.cropStart=b.cropStart;this.processedXData=b.xData;this.processedYData=b.yData;this.closestPointRange=this.basePointRange=b.closestPointRange;E(this,"afterProcessData")};a.prototype.cropData=function(b,a,c,e,d){var g=b.length,f,k=0,h=g;d=M(d,this.cropShoulder);for(f=0;f<g;f++)if(b[f]>=c){k=Math.max(0,f-d);break}for(c=f;c<g;c++)if(b[c]>e){h=c+d;break}return{xData:b.slice(k,h),yData:a.slice(k,
h),start:k,end:h}};a.prototype.generatePoints=function(){var b=this.options,a=b.data,c=this.processedXData,e=this.processedYData,d=this.pointClass,g=c.length,f=this.cropStart||0,k=this.hasGroupedData,h=b.keys,l=[];b=b.dataGrouping&&b.dataGrouping.groupAll?f:0;var n,m,p=this.data;if(!p&&!k){var r=[];r.length=a.length;p=this.data=r}h&&k&&(this.options.keys=!1);for(m=0;m<g;m++){r=f+m;if(k){var q=(new d).init(this,[c[m]].concat(da(e[m])));q.dataGroup=this.groupMap[b+m];q.dataGroup.options&&(q.options=
q.dataGroup.options,H(q,q.dataGroup.options),delete q.dataLabels)}else(q=p[r])||"undefined"===typeof a[r]||(p[r]=q=(new d).init(this,a[r],c[m]));q&&(q.index=k?b+m:r,l[m]=q)}this.options.keys=h;if(p&&(g!==(n=p.length)||k))for(m=0;m<n;m++)m!==f||k||(m+=g),p[m]&&(p[m].destroyElements(),p[m].plotX=void 0);this.data=p;this.points=l;E(this,"afterGeneratePoints")};a.prototype.getXExtremes=function(b){return{min:B(b),max:y(b)}};a.prototype.getExtremes=function(b,a){var c=this.xAxis,e=this.yAxis,d=this.processedXData||
this.xData,g=[],f=this.requireSorting?this.cropShoulder:0;e=e?e.positiveValuesOnly:!1;var k,h=0,l=0,n=0;b=b||this.stackedYData||this.processedYData||[];var m=b.length;if(c){var p=c.getExtremes();h=p.min;l=p.max}for(k=0;k<m;k++){var r=d[k];p=b[k];var q=(P(p)||S(p))&&(p.length||0<p||!e);r=a||this.getExtremesFromAll||this.options.getExtremesFromAll||this.cropped||!c||(d[k+f]||r)>=h&&(d[k-f]||r)<=l;if(q&&r)if(q=p.length)for(;q--;)P(p[q])&&(g[n++]=p[q]);else g[n++]=p}b={activeYData:g,dataMin:B(g),dataMax:y(g)};
E(this,"afterGetExtremes",{dataExtremes:b});return b};a.prototype.applyExtremes=function(){var b=this.getExtremes();this.dataMin=b.dataMin;this.dataMax=b.dataMax;return b};a.prototype.getFirstValidPoint=function(b){for(var a=b.length,c=0,e=null;null===e&&c<a;)e=b[c],c++;return e};a.prototype.translate=function(){this.processedXData||this.processData();this.generatePoints();var a=this.options,c=a.stacking,e=this.xAxis,d=e.categories,f=this.enabledDataSorting,k=this.yAxis,h=this.points,l=h.length,m=
this.pointPlacementToXValue(),p=!!m,r=a.threshold,q=a.startFromThreshold?r:0,v=this.zoneAxis||"y",B,w,u=Number.MAX_VALUE;for(B=0;B<l;B++){var y=h[B],t=y.x,D=void 0,K=void 0,H=y.y,z=y.low,x=c&&k.stacking&&k.stacking.stacks[(this.negStacks&&H<(q?0:r)?"-":"")+this.stackKey];if(k.positiveValuesOnly&&!k.validatePositiveValue(H)||e.positiveValuesOnly&&!e.validatePositiveValue(t))y.isNull=!0;y.plotX=w=b(n(e.translate(t,0,0,0,1,m,"flags"===this.type),-1E5,1E5));if(c&&this.visible&&x&&x[t]){var A=this.getStackIndicator(A,
t,this.index);y.isNull||(D=x[t],K=D.points[A.key])}S(K)&&(z=K[0],H=K[1],z===q&&A.key===x[t].base&&(z=M(P(r)&&r,k.min)),k.positiveValuesOnly&&0>=z&&(z=null),y.total=y.stackTotal=D.total,y.percentage=D.total&&y.y/D.total*100,y.stackY=H,this.irregularWidths||D.setOffset(this.pointXOffset||0,this.barW||0));y.yBottom=g(z)?n(k.translate(z,0,1,0,1),-1E5,1E5):null;this.dataModify&&(H=this.dataModify.modifyValue(H,B));y.plotY=void 0;P(H)&&(D=k.translate(H,!1,!0,!1,!0),"undefined"!==typeof D&&(y.plotY=n(D,
-1E5,1E5)));y.isInside=this.isPointInside(y);y.clientX=p?b(e.translate(t,0,0,0,1,m)):w;y.negative=y[v]<(a[v+"Threshold"]||r||0);y.category=d&&"undefined"!==typeof d[y.x]?d[y.x]:y.x;if(!y.isNull&&!1!==y.visible){"undefined"!==typeof G&&(u=Math.min(u,Math.abs(w-G)));var G=w}y.zone=this.zones.length?y.getZone():void 0;!y.graphic&&this.group&&f&&(y.isNew=!0)}this.closestPointRangePx=u;E(this,"afterTranslate")};a.prototype.getValidPoints=function(b,a,c){var e=this.chart;return(b||this.points||[]).filter(function(b){return a&&
!e.isInsidePlot(b.plotX,b.plotY,{inverted:e.inverted})?!1:!1!==b.visible&&(c||!b.isNull)})};a.prototype.getClipBox=function(){var b=this.chart,a=this.xAxis,c=this.yAxis,e=Y(b.clipBox);a&&a.len!==b.plotSizeX&&(e.width=a.len);c&&c.len!==b.plotSizeY&&(e.height=c.len);return e};a.prototype.getSharedClipKey=function(){return this.sharedClipKey=(this.options.xAxis||0)+","+(this.options.yAxis||0)};a.prototype.setClip=function(){var b=this.chart,a=this.group,c=this.markerGroup,e=b.sharedClips;b=b.renderer;
var d=this.getClipBox(),g=this.getSharedClipKey(),f=e[g];f?f.animate(d):e[g]=f=b.clipRect(d);a&&a.clip(!1===this.options.clip?void 0:f);c&&c.clip()};a.prototype.animate=function(b){var a=this.chart,c=this.group,e=this.markerGroup,d=a.inverted,g=h(this.options.animation),f=[this.getSharedClipKey(),g.duration,g.easing,g.defer].join(),k=a.sharedClips[f],l=a.sharedClips[f+"m"];if(b&&c)g=this.getClipBox(),k?k.attr("height",g.height):(g.width=0,d&&(g.x=a.plotHeight),k=a.renderer.clipRect(g),a.sharedClips[f]=
k,l=a.renderer.clipRect({x:d?(a.plotSizeX||0)+99:-99,y:d?-a.plotLeft:-a.plotTop,width:99,height:d?a.chartWidth:a.chartHeight}),a.sharedClips[f+"m"]=l),c.clip(k),e&&e.clip(l);else if(k&&!k.hasClass("highcharts-animating")){a=this.getClipBox();var n=g.step;e&&e.element.childNodes.length&&(g.step=function(b,a){n&&n.apply(a,arguments);l&&l.element&&l.attr(a.prop,"width"===a.prop?b+99:b)});k.addClass("highcharts-animating").animate(a,g)}};a.prototype.afterAnimate=function(){var b=this;this.setClip();J(this.chart.sharedClips,
function(a,c,e){a&&!b.chart.container.querySelector('[clip-path="url(#'+a.id+')"]')&&(a.destroy(),delete e[c])});this.finishedAnimating=!0;E(this,"afterAnimate")};a.prototype.drawPoints=function(){var b=this.points,a=this.chart,c=this.options.marker,e=this[this.specialGroup]||this.markerGroup,d=this.xAxis,g=M(c.enabled,!d||d.isRadial?!0:null,this.closestPointRangePx>=c.enabledThreshold*c.radius),f,k;if(!1!==c.enabled||this._hasPointMarkers)for(f=0;f<b.length;f++){var h=b[f];var l=(k=h.graphic)?"animate":
"attr";var n=h.marker||{};var m=!!h.marker;if((g&&"undefined"===typeof n.enabled||n.enabled)&&!h.isNull&&!1!==h.visible){var p=M(n.symbol,this.symbol,"rect");var r=this.markerAttribs(h,h.selected&&"select");this.enabledDataSorting&&(h.startXPos=d.reversed?-(r.width||0):d.width);var q=!1!==h.isInside;k?k[q?"show":"hide"](q).animate(r):q&&(0<(r.width||0)||h.hasImage)&&(h.graphic=k=a.renderer.symbol(p,r.x,r.y,r.width,r.height,m?n:c).add(e),this.enabledDataSorting&&a.hasRendered&&(k.attr({x:h.startXPos}),
l="animate"));k&&"animate"===l&&k[q?"show":"hide"](q).animate(r);if(k&&!a.styledMode)k[l](this.pointAttribs(h,h.selected&&"select"));k&&k.addClass(h.getClassName(),!0)}else k&&(h.graphic=k.destroy())}};a.prototype.markerAttribs=function(b,a){var c=this.options,e=c.marker,d=b.marker||{},g=d.symbol||e.symbol,f=M(d.radius,e.radius);a&&(e=e.states[a],a=d.states&&d.states[a],f=M(a&&a.radius,e&&e.radius,f+(e&&e.radiusPlus||0)));b.hasImage=g&&0===g.indexOf("url");b.hasImage&&(f=0);b={x:c.crisp?Math.floor(b.plotX-
f):b.plotX-f,y:b.plotY-f};f&&(b.width=b.height=2*f);return b};a.prototype.pointAttribs=function(b,a){var c=this.options.marker,e=b&&b.options,d=e&&e.marker||{},g=e&&e.color,f=b&&b.color,k=b&&b.zone&&b.zone.color,h=this.color;b=M(d.lineWidth,c.lineWidth);e=1;h=g||k||f||h;g=d.fillColor||c.fillColor||h;f=d.lineColor||c.lineColor||h;a=a||"normal";c=c.states[a]||{};a=d.states&&d.states[a]||{};b=M(a.lineWidth,c.lineWidth,b+M(a.lineWidthPlus,c.lineWidthPlus,0));g=a.fillColor||c.fillColor||g;f=a.lineColor||
c.lineColor||f;e=M(a.opacity,c.opacity,e);return{stroke:f,"stroke-width":b,fill:g,opacity:e}};a.prototype.destroy=function(b){var a=this,c=a.chart,d=/AppleWebKit\/533/.test(p.navigator.userAgent),g=a.data||[],f,k,h,l;E(a,"destroy");this.removeEvents(b);(a.axisTypes||[]).forEach(function(b){(l=a[b])&&l.series&&(e(l.series,a),l.isDirty=l.forceRedraw=!0)});a.legendItem&&a.chart.legend.destroyItem(a);for(k=g.length;k--;)(h=g[k])&&h.destroy&&h.destroy();a.clips&&a.clips.forEach(function(b){return b.destroy()});
m.clearTimeout(a.animationTimeout);J(a,function(b,a){b instanceof q&&!b.survive&&(f=d&&"group"===a?"hide":"destroy",b[f]())});c.hoverSeries===a&&(c.hoverSeries=void 0);e(c.series,a);c.orderSeries();J(a,function(c,e){b&&"hcEvents"===e||delete a[e]})};a.prototype.applyZones=function(){var b=this,a=this.chart,c=a.renderer,e=this.zones,d=this.clips||[],g=this.graph,f=this.area,k=Math.max(a.chartWidth,a.chartHeight),h=this[(this.zoneAxis||"y")+"Axis"],l=a.inverted,m,p,r,q,v,y,B,w,u=!1;if(e.length&&(g||
f)&&h&&"undefined"!==typeof h.min){var t=h.reversed;var D=h.horiz;g&&!this.showLine&&g.hide();f&&f.hide();var E=h.getExtremes();e.forEach(function(e,F){m=t?D?a.plotWidth:0:D?0:h.toPixels(E.min)||0;m=n(M(p,m),0,k);p=n(Math.round(h.toPixels(M(e.value,E.max),!0)||0),0,k);u&&(m=p=h.toPixels(E.max));q=Math.abs(m-p);v=Math.min(m,p);y=Math.max(m,p);h.isXAxis?(r={x:l?y:v,y:0,width:q,height:k},D||(r.x=a.plotHeight-r.x)):(r={x:0,y:l?y:v,width:k,height:q},D&&(r.y=a.plotWidth-r.y));l&&c.isVML&&(r=h.isXAxis?{x:0,
y:t?v:y,height:r.width,width:a.chartWidth}:{x:r.y-a.plotLeft-a.spacingBox.x,y:0,width:r.height,height:a.chartHeight});d[F]?d[F].animate(r):d[F]=c.clipRect(r);B=b["zone-area-"+F];w=b["zone-graph-"+F];g&&w&&w.clip(d[F]);f&&B&&B.clip(d[F]);u=e.value>E.max;b.resetZones&&0===p&&(p=void 0)});this.clips=d}else b.visible&&(g&&g.show(!0),f&&f.show(!0))};a.prototype.invertGroups=function(b){function a(){["group","markerGroup"].forEach(function(a){c[a]&&(e.renderer.isVML&&c[a].attr({width:c.yAxis.len,height:c.xAxis.len}),
c[a].width=c.yAxis.len,c[a].height=c.xAxis.len,c[a].invert(c.isRadialSeries?!1:b))})}var c=this,e=c.chart;c.xAxis&&(c.eventsToUnbind.push(r(e,"resize",a)),a(),c.invertGroups=a)};a.prototype.plotGroup=function(b,a,c,e,d){var f=this[b],k=!f;c={visibility:c,zIndex:e||.1};"undefined"===typeof this.opacity||this.chart.styledMode||"inactive"===this.state||(c.opacity=this.opacity);k&&(this[b]=f=this.chart.renderer.g().add(d));f.addClass("highcharts-"+a+" highcharts-series-"+this.index+" highcharts-"+this.type+
"-series "+(g(this.colorIndex)?"highcharts-color-"+this.colorIndex+" ":"")+(this.options.className||"")+(f.hasClass("highcharts-tracker")?" highcharts-tracker":""),!0);f.attr(c)[k?"attr":"animate"](this.getPlotBox());return f};a.prototype.getPlotBox=function(){var b=this.chart,a=this.xAxis,c=this.yAxis;b.inverted&&(a=c,c=this.xAxis);return{translateX:a?a.left:b.plotLeft,translateY:c?c.top:b.plotTop,scaleX:1,scaleY:1}};a.prototype.removeEvents=function(b){b||L(this);this.eventsToUnbind.length&&(this.eventsToUnbind.forEach(function(b){b()}),
this.eventsToUnbind.length=0)};a.prototype.render=function(){var b=this,a=b.chart,c=b.options,e=h(c.animation),d=b.visible?"inherit":"hidden",g=c.zIndex,f=b.hasRendered,k=a.seriesGroup,l=a.inverted;a=!b.finishedAnimating&&a.renderer.isSVG?e.duration:0;E(this,"render");var n=b.plotGroup("group","series",d,g,k);b.markerGroup=b.plotGroup("markerGroup","markers",d,g,k);!1!==c.clip&&b.setClip();b.animate&&a&&b.animate(!0);n.inverted=M(b.invertible,b.isCartesian)?l:!1;b.drawGraph&&(b.drawGraph(),b.applyZones());
b.visible&&b.drawPoints();b.drawDataLabels&&b.drawDataLabels();b.redrawPoints&&b.redrawPoints();b.drawTracker&&!1!==b.options.enableMouseTracking&&b.drawTracker();b.invertGroups(l);b.animate&&a&&b.animate();f||(a&&e.defer&&(a+=e.defer),b.animationTimeout=Q(function(){b.afterAnimate()},a||0));b.isDirty=!1;b.hasRendered=!0;E(b,"afterRender")};a.prototype.redraw=function(){var b=this.chart,a=this.isDirty||this.isDirtyData,c=this.group,e=this.xAxis,d=this.yAxis;c&&(b.inverted&&c.attr({width:b.plotWidth,
height:b.plotHeight}),c.animate({translateX:M(e&&e.left,b.plotLeft),translateY:M(d&&d.top,b.plotTop)}));this.translate();this.render();a&&delete this.kdTree};a.prototype.searchPoint=function(b,a){var c=this.xAxis,e=this.yAxis,d=this.chart.inverted;return this.searchKDTree({clientX:d?c.len-b.chartY+c.pos:b.chartX-c.pos,plotY:d?e.len-b.chartX+e.pos:b.chartY-e.pos},a,b)};a.prototype.buildKDTree=function(b){function a(b,e,d){var g=b&&b.length;if(g){var f=c.kdAxisArray[e%d];b.sort(function(b,a){return b[f]-
a[f]});g=Math.floor(g/2);return{point:b[g],left:a(b.slice(0,g),e+1,d),right:a(b.slice(g+1),e+1,d)}}}this.buildingKdTree=!0;var c=this,e=-1<c.options.findNearestPointBy.indexOf("y")?2:1;delete c.kdTree;Q(function(){c.kdTree=a(c.getValidPoints(null,!c.directTouch),e,e);c.buildingKdTree=!1},c.options.kdNow||b&&"touchstart"===b.type?0:1)};a.prototype.searchKDTree=function(b,a,c){function e(b,a,c,l){var n=a.point,m=d.kdAxisArray[c%l],p=n,r=g(b[f])&&g(n[f])?Math.pow(b[f]-n[f],2):null;var q=g(b[k])&&g(n[k])?
Math.pow(b[k]-n[k],2):null;q=(r||0)+(q||0);n.dist=g(q)?Math.sqrt(q):Number.MAX_VALUE;n.distX=g(r)?Math.sqrt(r):Number.MAX_VALUE;m=b[m]-n[m];q=0>m?"left":"right";r=0>m?"right":"left";a[q]&&(q=e(b,a[q],c+1,l),p=q[h]<p[h]?q:n);a[r]&&Math.sqrt(m*m)<p[h]&&(b=e(b,a[r],c+1,l),p=b[h]<p[h]?b:p);return p}var d=this,f=this.kdAxisArray[0],k=this.kdAxisArray[1],h=a?"distX":"dist";a=-1<d.options.findNearestPointBy.indexOf("y")?2:1;this.kdTree||this.buildingKdTree||this.buildKDTree(c);if(this.kdTree)return e(b,
this.kdTree,a,a)};a.prototype.pointPlacementToXValue=function(){var b=this.options,a=b.pointRange,c=this.xAxis;b=b.pointPlacement;"between"===b&&(b=c.reversed?-.5:.5);return P(b)?b*(a||c.pointRange):0};a.prototype.isPointInside=function(b){var a=this.chart,c=this.xAxis,e=this.yAxis;return"undefined"!==typeof b.plotY&&"undefined"!==typeof b.plotX&&0<=b.plotY&&b.plotY<=(e?e.len:a.plotHeight)&&0<=b.plotX&&b.plotX<=(c?c.len:a.plotWidth)};a.prototype.drawTracker=function(){var b=this,a=b.options,c=a.trackByArea,
e=[].concat(c?b.areaPath:b.graphPath),d=b.chart,g=d.pointer,k=d.renderer,h=d.options.tooltip.snap,l=b.tracker,n=function(a){if(d.hoverSeries!==b)b.onMouseOver()},m="rgba(192,192,192,"+(w?.0001:.002)+")";l?l.attr({d:e}):b.graph&&(b.tracker=k.path(e).attr({visibility:b.visible?"visible":"hidden",zIndex:2}).addClass(c?"highcharts-tracker-area":"highcharts-tracker-line").add(b.group),d.styledMode||b.tracker.attr({"stroke-linecap":"round","stroke-linejoin":"round",stroke:m,fill:c?m:"none","stroke-width":b.graph.strokeWidth()+
(c?0:2*h)}),[b.tracker,b.markerGroup,b.dataLabelsGroup].forEach(function(b){if(b&&(b.addClass("highcharts-tracker").on("mouseover",n).on("mouseout",function(b){g.onTrackerMouseOut(b)}),a.cursor&&!d.styledMode&&b.css({cursor:a.cursor}),f))b.on("touchstart",n)}));E(this,"afterDrawTracker")};a.prototype.addPoint=function(b,a,c,e,d){var g=this.options,f=this.data,k=this.chart,h=this.xAxis;h=h&&h.hasNames&&h.names;var l=g.data,n=this.xData,m;a=M(a,!0);var p={series:this};this.pointClass.prototype.applyOptions.apply(p,
[b]);var r=p.x;var q=n.length;if(this.requireSorting&&r<n[q-1])for(m=!0;q&&n[q-1]>r;)q--;this.updateParallelArrays(p,"splice",q,0,0);this.updateParallelArrays(p,q);h&&p.name&&(h[r]=p.name);l.splice(q,0,b);m&&(this.data.splice(q,0,null),this.processData());"point"===g.legendType&&this.generatePoints();c&&(f[0]&&f[0].remove?f[0].remove(!1):(f.shift(),this.updateParallelArrays(p,"shift"),l.shift()));!1!==d&&E(this,"addPoint",{point:p});this.isDirtyData=this.isDirty=!0;a&&k.redraw(e)};a.prototype.removePoint=
function(b,a,c){var e=this,g=e.data,f=g[b],k=e.points,h=e.chart,l=function(){k&&k.length===g.length&&k.splice(b,1);g.splice(b,1);e.options.data.splice(b,1);e.updateParallelArrays(f||{series:e},"splice",b,1);f&&f.destroy();e.isDirty=!0;e.isDirtyData=!0;a&&h.redraw()};d(c,h);a=M(a,!0);f?f.firePointEvent("remove",null,l):l()};a.prototype.remove=function(b,a,c,e){function d(){g.destroy(e);f.isDirtyLegend=f.isDirtyBox=!0;f.linkSeries();M(b,!0)&&f.redraw(a)}var g=this,f=g.chart;!1!==c?E(g,"remove",null,
d):d()};a.prototype.update=function(b,a){b=k(b,this.userOptions);E(this,"update",{options:b});var c=this,e=c.chart,d=c.userOptions,g=c.initialType||c.type,f=e.options.plotOptions,h=u[g].prototype,l=c.finishedAnimating&&{animation:!1},n={},m,p=["eventOptions","navigatorSeries","baseSeries"],r=b.type||d.type||e.options.chart.type,q=!(this.hasDerivedData||r&&r!==this.type||"undefined"!==typeof b.pointStart||"undefined"!==typeof b.pointInterval||"undefined"!==typeof b.relativeXValue||c.hasOptionChanged("dataGrouping")||
c.hasOptionChanged("pointStart")||c.hasOptionChanged("pointInterval")||c.hasOptionChanged("pointIntervalUnit")||c.hasOptionChanged("keys"));r=r||g;q&&(p.push("data","isDirtyData","points","processedXData","processedYData","xIncrement","cropped","_hasPointMarkers","_hasPointLabels","clips","nodes","layout","mapMap","mapData","minY","maxY","minX","maxX"),!1!==b.visible&&p.push("area","graph"),c.parallelArrays.forEach(function(b){p.push(b+"Data")}),b.data&&(b.dataSorting&&H(c.options.dataSorting,b.dataSorting),
this.setData(b.data,!1)));b=Y(d,l,{index:"undefined"===typeof d.index?c.index:d.index,pointStart:M(f&&f.series&&f.series.pointStart,d.pointStart,c.xData[0])},!q&&{data:c.options.data},b);q&&b.data&&(b.data=c.options.data);p=["group","markerGroup","dataLabelsGroup","transformGroup"].concat(p);p.forEach(function(b){p[b]=c[b];delete c[b]});f=!1;if(u[r]){if(f=r!==c.type,c.remove(!1,!1,!1,!0),f)if(Object.setPrototypeOf)Object.setPrototypeOf(c,u[r].prototype);else{l=Object.hasOwnProperty.call(c,"hcEvents")&&
c.hcEvents;for(m in h)c[m]=void 0;H(c,u[r].prototype);l?c.hcEvents=l:delete c.hcEvents}}else D(17,!0,e,{missingModuleFor:r});p.forEach(function(b){c[b]=p[b]});c.init(e,b);if(q&&this.points){var v=c.options;!1===v.visible?(n.graphic=1,n.dataLabel=1):c._hasPointLabels||(b=v.marker,h=v.dataLabels,!b||!1!==b.enabled&&(d.marker&&d.marker.symbol)===b.symbol||(n.graphic=1),h&&!1===h.enabled&&(n.dataLabel=1));this.points.forEach(function(b){b&&b.series&&(b.resolveColor(),Object.keys(n).length&&b.destroyElements(n),
!1===v.showInLegend&&b.legendItem&&e.legend.destroyItem(b))},this)}c.initialType=g;e.linkSeries();f&&c.linkedSeries.length&&(c.isDirtyData=!0);E(this,"afterUpdate");M(a,!0)&&e.redraw(q?void 0:!1)};a.prototype.setName=function(b){this.name=this.options.name=this.userOptions.name=b;this.chart.isDirtyLegend=!0};a.prototype.hasOptionChanged=function(b){var a=this.options[b],c=this.chart.options.plotOptions,e=this.userOptions[b];return e?a!==e:a!==M(c&&c[this.type]&&c[this.type][b],c&&c.series&&c.series[b],
a)};a.prototype.onMouseOver=function(){var b=this.chart,a=b.hoverSeries;b.pointer.setHoverChartIndex();if(a&&a!==this)a.onMouseOut();this.options.events.mouseOver&&E(this,"mouseOver");this.setState("hover");b.hoverSeries=this};a.prototype.onMouseOut=function(){var b=this.options,a=this.chart,c=a.tooltip,e=a.hoverPoint;a.hoverSeries=null;if(e)e.onMouseOut();this&&b.events.mouseOut&&E(this,"mouseOut");!c||this.stickyTracking||c.shared&&!this.noSharedTooltip||c.hide();a.series.forEach(function(b){b.setState("",
!0)})};a.prototype.setState=function(b,a){var c=this,e=c.options,d=c.graph,g=e.inactiveOtherPoints,f=e.states,k=M(f[b||"normal"]&&f[b||"normal"].animation,c.chart.options.chart.animation),h=e.lineWidth,l=0,n=e.opacity;b=b||"";if(c.state!==b&&([c.group,c.markerGroup,c.dataLabelsGroup].forEach(function(a){a&&(c.state&&a.removeClass("highcharts-series-"+c.state),b&&a.addClass("highcharts-series-"+b))}),c.state=b,!c.chart.styledMode)){if(f[b]&&!1===f[b].enabled)return;b&&(h=f[b].lineWidth||h+(f[b].lineWidthPlus||
0),n=M(f[b].opacity,n));if(d&&!d.dashstyle)for(e={"stroke-width":h},d.animate(e,k);c["zone-graph-"+l];)c["zone-graph-"+l].animate(e,k),l+=1;g||[c.group,c.markerGroup,c.dataLabelsGroup,c.labelBySeries].forEach(function(b){b&&b.animate({opacity:n},k)})}a&&g&&c.points&&c.setAllPointsToState(b||void 0)};a.prototype.setAllPointsToState=function(b){this.points.forEach(function(a){a.setState&&a.setState(b)})};a.prototype.setVisible=function(b,a){var c=this,e=c.chart,d=c.legendItem,g=e.options.chart.ignoreHiddenSeries,
f=c.visible,k=(c.visible=b=c.options.visible=c.userOptions.visible="undefined"===typeof b?!f:b)?"show":"hide";["group","dataLabelsGroup","markerGroup","tracker","tt"].forEach(function(b){if(c[b])c[b][k]()});if(e.hoverSeries===c||(e.hoverPoint&&e.hoverPoint.series)===c)c.onMouseOut();d&&e.legend.colorizeItem(c,b);c.isDirty=!0;c.options.stacking&&e.series.forEach(function(b){b.options.stacking&&b.visible&&(b.isDirty=!0)});c.linkedSeries.forEach(function(a){a.setVisible(b,!1)});g&&(e.isDirtyBox=!0);
E(c,k);!1!==a&&e.redraw()};a.prototype.show=function(){this.setVisible(!0)};a.prototype.hide=function(){this.setVisible(!1)};a.prototype.select=function(b){this.selected=b=this.options.selected="undefined"===typeof b?!this.selected:b;this.checkbox&&(this.checkbox.checked=b);E(this,b?"select":"unselect")};a.prototype.shouldShowTooltip=function(b,a,c){void 0===c&&(c={});c.series=this;c.visiblePlotOnly=!0;return this.chart.isInsidePlot(b,a,c)};a.defaultOptions=I;return a}();H(a.prototype,{axisTypes:["xAxis",
"yAxis"],coll:"series",colorCounter:0,cropShoulder:1,directTouch:!1,drawLegendSymbol:x.drawLineMarker,isCartesian:!0,kdAxisArray:["clientX","plotY"],parallelArrays:["x","y"],pointClass:C,requireSorting:!0,sorted:!0});z.series=a;"";"";return a});L(a,"Extensions/ScrollablePlotArea.js",[a["Core/Animation/AnimationUtilities.js"],a["Core/Axis/Axis.js"],a["Core/Chart/Chart.js"],a["Core/Series/Series.js"],a["Core/Renderer/RendererRegistry.js"],a["Core/Utilities.js"]],function(a,t,A,G,x,C){var u=a.stop,z=
C.addEvent,q=C.createElement,m=C.merge,h=C.pick;z(A,"afterSetChartSize",function(a){var c=this.options.chart.scrollablePlotArea,d=c&&c.minWidth;c=c&&c.minHeight;if(!this.renderer.forExport){if(d){if(this.scrollablePixelsX=d=Math.max(0,d-this.chartWidth)){this.scrollablePlotBox=this.renderer.scrollablePlotBox=m(this.plotBox);this.plotBox.width=this.plotWidth+=d;this.inverted?this.clipBox.height+=d:this.clipBox.width+=d;var f={1:{name:"right",value:d}}}}else c&&(this.scrollablePixelsY=d=Math.max(0,
c-this.chartHeight))&&(this.scrollablePlotBox=this.renderer.scrollablePlotBox=m(this.plotBox),this.plotBox.height=this.plotHeight+=d,this.inverted?this.clipBox.width+=d:this.clipBox.height+=d,f={2:{name:"bottom",value:d}});f&&!a.skipAxes&&this.axes.forEach(function(a){f[a.side]?a.getPlotLinePath=function(){var c=f[a.side].name,d=this[c];this[c]=d-f[a.side].value;var h=t.prototype.getPlotLinePath.apply(this,arguments);this[c]=d;return h}:(a.setAxisSize(),a.setAxisTranslation())})}});z(A,"render",function(){this.scrollablePixelsX||
this.scrollablePixelsY?(this.setUpScrolling&&this.setUpScrolling(),this.applyFixed()):this.fixedDiv&&this.applyFixed()});A.prototype.setUpScrolling=function(){var a=this,c={WebkitOverflowScrolling:"touch",overflowX:"hidden",overflowY:"hidden"};this.scrollablePixelsX&&(c.overflowX="auto");this.scrollablePixelsY&&(c.overflowY="auto");this.scrollingParent=q("div",{className:"highcharts-scrolling-parent"},{position:"relative"},this.renderTo);this.scrollingContainer=q("div",{className:"highcharts-scrolling"},
c,this.scrollingParent);z(this.scrollingContainer,"scroll",function(){a.pointer&&delete a.pointer.chartPosition});this.innerContainer=q("div",{className:"highcharts-inner-container"},null,this.scrollingContainer);this.innerContainer.appendChild(this.container);this.setUpScrolling=null};A.prototype.moveFixedElements=function(){var a=this.container,c=this.fixedRenderer,h=".highcharts-contextbutton .highcharts-credits .highcharts-legend .highcharts-legend-checkbox .highcharts-navigator-series .highcharts-navigator-xaxis .highcharts-navigator-yaxis .highcharts-navigator .highcharts-reset-zoom .highcharts-drillup-button .highcharts-scrollbar .highcharts-subtitle .highcharts-title".split(" "),
f;this.scrollablePixelsX&&!this.inverted?f=".highcharts-yaxis":this.scrollablePixelsX&&this.inverted?f=".highcharts-xaxis":this.scrollablePixelsY&&!this.inverted?f=".highcharts-xaxis":this.scrollablePixelsY&&this.inverted&&(f=".highcharts-yaxis");f&&h.push(f+":not(.highcharts-radial-axis)",f+"-labels:not(.highcharts-radial-axis-labels)");h.forEach(function(d){[].forEach.call(a.querySelectorAll(d),function(a){(a.namespaceURI===c.SVG_NS?c.box:c.box.parentNode).appendChild(a);a.style.pointerEvents="auto"})})};
A.prototype.applyFixed=function(){var a=!this.fixedDiv,c=this.options.chart,l=c.scrollablePlotArea,f=x.getRendererType();a?(this.fixedDiv=q("div",{className:"highcharts-fixed"},{position:"absolute",overflow:"hidden",pointerEvents:"none",zIndex:(c.style&&c.style.zIndex||0)+2,top:0},null,!0),this.scrollingContainer&&this.scrollingContainer.parentNode.insertBefore(this.fixedDiv,this.scrollingContainer),this.renderTo.style.overflow="visible",this.fixedRenderer=c=new f(this.fixedDiv,this.chartWidth,this.chartHeight,
this.options.chart.style),this.scrollableMask=c.path().attr({fill:this.options.chart.backgroundColor||"#fff","fill-opacity":h(l.opacity,.85),zIndex:-1}).addClass("highcharts-scrollable-mask").add(),z(this,"afterShowResetZoom",this.moveFixedElements),z(this,"afterDrilldown",this.moveFixedElements),z(this,"afterLayOutTitles",this.moveFixedElements)):this.fixedRenderer.setSize(this.chartWidth,this.chartHeight);if(this.scrollableDirty||a)this.scrollableDirty=!1,this.moveFixedElements();c=this.chartWidth+
(this.scrollablePixelsX||0);f=this.chartHeight+(this.scrollablePixelsY||0);u(this.container);this.container.style.width=c+"px";this.container.style.height=f+"px";this.renderer.boxWrapper.attr({width:c,height:f,viewBox:[0,0,c,f].join(" ")});this.chartBackground.attr({width:c,height:f});this.scrollingContainer.style.height=this.chartHeight+"px";a&&(l.scrollPositionX&&(this.scrollingContainer.scrollLeft=this.scrollablePixelsX*l.scrollPositionX),l.scrollPositionY&&(this.scrollingContainer.scrollTop=this.scrollablePixelsY*
l.scrollPositionY));f=this.axisOffset;a=this.plotTop-f[0]-1;l=this.plotLeft-f[3]-1;c=this.plotTop+this.plotHeight+f[2]+1;f=this.plotLeft+this.plotWidth+f[1]+1;var m=this.plotLeft+this.plotWidth-(this.scrollablePixelsX||0),p=this.plotTop+this.plotHeight-(this.scrollablePixelsY||0);a=this.scrollablePixelsX?[["M",0,a],["L",this.plotLeft-1,a],["L",this.plotLeft-1,c],["L",0,c],["Z"],["M",m,a],["L",this.chartWidth,a],["L",this.chartWidth,c],["L",m,c],["Z"]]:this.scrollablePixelsY?[["M",l,0],["L",l,this.plotTop-
1],["L",f,this.plotTop-1],["L",f,0],["Z"],["M",l,p],["L",l,this.chartHeight],["L",f,this.chartHeight],["L",f,p],["Z"]]:[["M",0,0]];"adjustHeight"!==this.redrawTrigger&&this.scrollableMask.attr({d:a})};z(t,"afterInit",function(){this.chart.scrollableDirty=!0});z(G,"show",function(){this.chart.scrollableDirty=!0});""});L(a,"Core/Axis/StackingAxis.js",[a["Core/Animation/AnimationUtilities.js"],a["Core/Axis/Axis.js"],a["Core/Utilities.js"]],function(a,t,A){var u=a.getDeferredAnimation,x=A.addEvent,C=
A.destroyObjectProperties,I=A.fireEvent,z=A.isNumber,q=A.objectEach,m;(function(a){function d(){var a=this.stacking;if(a){var c=a.stacks;q(c,function(a,d){C(a);c[d]=null});a&&a.stackTotalGroup&&a.stackTotalGroup.destroy()}}function c(){this.stacking||(this.stacking=new f(this))}var h=[];a.compose=function(a){-1===h.indexOf(a)&&(h.push(a),x(a,"init",c),x(a,"destroy",d));return a};var f=function(){function a(a){this.oldStacks={};this.stacks={};this.stacksTouched=0;this.axis=a}a.prototype.buildStacks=
function(){var a=this.axis,c=a.series,d=a.options.reversedStacks,f=c.length,h;if(!a.isXAxis){this.usePercentage=!1;for(h=f;h--;){var l=c[d?h:f-h-1];l.setStackedPoints();l.setGroupedPoints()}for(h=0;h<f;h++)c[h].modifyStacks();I(a,"afterBuildStacks")}};a.prototype.cleanStacks=function(){if(!this.axis.isXAxis){if(this.oldStacks)var a=this.stacks=this.oldStacks;q(a,function(a){q(a,function(a){a.cumulative=a.total})})}};a.prototype.resetStacks=function(){var a=this,c=a.stacks;a.axis.isXAxis||q(c,function(c){q(c,
function(d,f){z(d.touched)&&d.touched<a.stacksTouched?(d.destroy(),delete c[f]):(d.total=null,d.cumulative=null)})})};a.prototype.renderStackTotals=function(){var a=this.axis,c=a.chart,d=c.renderer,f=this.stacks;a=u(c,a.options.stackLabels&&a.options.stackLabels.animation||!1);var h=this.stackTotalGroup=this.stackTotalGroup||d.g("stack-labels").attr({visibility:"visible",zIndex:6,opacity:0}).add();h.translate(c.plotLeft,c.plotTop);q(f,function(a){q(a,function(a){a.render(h)})});h.animate({opacity:1},
a)};return a}();a.Additions=f})(m||(m={}));return m});L(a,"Extensions/Stacking.js",[a["Core/Axis/Axis.js"],a["Core/Chart/Chart.js"],a["Core/FormatUtilities.js"],a["Core/Globals.js"],a["Core/Series/Series.js"],a["Core/Axis/StackingAxis.js"],a["Core/Utilities.js"]],function(a,t,A,G,x,C,I){var u=A.format,q=I.correctFloat,m=I.defined,h=I.destroyObjectProperties,d=I.isArray,c=I.isNumber,l=I.objectEach,f=I.pick,w=function(){function a(a,c,d,f,h){var k=a.chart.inverted;this.axis=a;this.isNegative=d;this.options=
c=c||{};this.x=f;this.total=null;this.points={};this.hasValidPoints=!1;this.stack=h;this.rightCliff=this.leftCliff=0;this.alignOptions={align:c.align||(k?d?"left":"right":"center"),verticalAlign:c.verticalAlign||(k?"middle":d?"bottom":"top"),y:c.y,x:c.x};this.textAlign=c.textAlign||(k?d?"right":"left":"center")}a.prototype.destroy=function(){h(this,this.axis)};a.prototype.render=function(a){var c=this.axis.chart,d=this.options,h=d.format;h=h?u(h,this,c):d.formatter.call(this);this.label?this.label.attr({text:h,
visibility:"hidden"}):(this.label=c.renderer.label(h,null,null,d.shape,null,null,d.useHTML,!1,"stack-labels"),h={r:d.borderRadius||0,text:h,rotation:d.rotation,padding:f(d.padding,5),visibility:"hidden"},c.styledMode||(h.fill=d.backgroundColor,h.stroke=d.borderColor,h["stroke-width"]=d.borderWidth,this.label.css(d.style)),this.label.attr(h),this.label.added||this.label.add(a));this.label.labelrank=c.plotSizeY};a.prototype.setOffset=function(a,d,h,l,n){var k=this.axis,b=k.chart;l=k.translate(k.stacking.usePercentage?
100:l?l:this.total,0,0,0,1);h=k.translate(h?h:0);h=m(l)&&Math.abs(l-h);a=f(n,b.xAxis[0].translate(this.x))+a;k=m(l)&&this.getStackBox(b,this,a,l,d,h,k);d=this.label;h=this.isNegative;a="justify"===f(this.options.overflow,"justify");var g=this.textAlign;d&&k&&(n=d.getBBox(),l=d.padding,g="left"===g?b.inverted?-l:l:"right"===g?n.width:b.inverted&&"center"===g?n.width/2:b.inverted?h?n.width+l:-l:n.width/2,h=b.inverted?n.height/2:h?-l:n.height,this.alignOptions.x=f(this.options.x,0),this.alignOptions.y=
f(this.options.y,0),k.x-=g,k.y-=h,d.align(this.alignOptions,null,k),b.isInsidePlot(d.alignAttr.x+g-this.alignOptions.x,d.alignAttr.y+h-this.alignOptions.y)?d.show():(d.alignAttr.y=-9999,a=!1),a&&x.prototype.justifyDataLabel.call(this.axis,d,this.alignOptions,d.alignAttr,n,k),d.attr({x:d.alignAttr.x,y:d.alignAttr.y}),f(!a&&this.options.crop,!0)&&((b=c(d.x)&&c(d.y)&&b.isInsidePlot(d.x-l+d.width,d.y)&&b.isInsidePlot(d.x+l,d.y))||d.hide()))};a.prototype.getStackBox=function(a,c,d,f,h,k,b){var g=c.axis.reversed,
e=a.inverted,l=b.height+b.pos-(e?a.plotLeft:a.plotTop);c=c.isNegative&&!g||!c.isNegative&&g;return{x:e?c?f-b.right:f-k+b.pos-a.plotLeft:d+a.xAxis[0].transB-a.plotLeft,y:e?b.height-d-h:c?l-f-k:l-f,width:e?k:h,height:e?h:k}};return a}();t.prototype.getStacks=function(){var a=this,c=a.inverted;a.yAxis.forEach(function(a){a.stacking&&a.stacking.stacks&&a.hasVisibleSeries&&(a.stacking.oldStacks=a.stacking.stacks)});a.series.forEach(function(d){var h=d.xAxis&&d.xAxis.options||{};!d.options.stacking||!0!==
d.visible&&!1!==a.options.chart.ignoreHiddenSeries||(d.stackKey=[d.type,f(d.options.stack,""),c?h.top:h.left,c?h.height:h.width].join())})};C.compose(a);x.prototype.setGroupedPoints=function(){var a=this.yAxis.stacking;this.options.centerInCategory&&(this.is("column")||this.is("columnrange"))&&!this.options.stacking&&1<this.chart.series.length?x.prototype.setStackedPoints.call(this,"group"):a&&l(a.stacks,function(c,d){"group"===d.slice(-5)&&(l(c,function(a){return a.destroy()}),delete a.stacks[d])})};
x.prototype.setStackedPoints=function(a){var c=a||this.options.stacking;if(c&&(!0===this.visible||!1===this.chart.options.chart.ignoreHiddenSeries)){var h=this.processedXData,l=this.processedYData,p=[],n=l.length,k=this.options,b=k.threshold,g=f(k.startFromThreshold&&b,0);k=k.stack;a=a?this.type+","+c:this.stackKey;var e="-"+a,u=this.negStacks,t=this.yAxis,v=t.stacking.stacks,E=t.stacking.oldStacks,z,x;t.stacking.stacksTouched+=1;for(x=0;x<n;x++){var A=h[x];var G=l[x];var I=this.getStackIndicator(I,
A,this.index);var J=I.key;var C=(z=u&&G<(g?0:b))?e:a;v[C]||(v[C]={});v[C][A]||(E[C]&&E[C][A]?(v[C][A]=E[C][A],v[C][A].total=null):v[C][A]=new w(t,t.options.stackLabels,z,A,k));C=v[C][A];null!==G?(C.points[J]=C.points[this.index]=[f(C.cumulative,g)],m(C.cumulative)||(C.base=J),C.touched=t.stacking.stacksTouched,0<I.index&&!1===this.singleStacks&&(C.points[J][0]=C.points[this.index+","+A+",0"][0])):C.points[J]=C.points[this.index]=null;"percent"===c?(z=z?a:e,u&&v[z]&&v[z][A]?(z=v[z][A],C.total=z.total=
Math.max(z.total,C.total)+Math.abs(G)||0):C.total=q(C.total+(Math.abs(G)||0))):"group"===c?(d(G)&&(G=G[0]),null!==G&&(C.total=(C.total||0)+1)):C.total=q(C.total+(G||0));C.cumulative="group"===c?(C.total||1)-1:f(C.cumulative,g)+(G||0);null!==G&&(C.points[J].push(C.cumulative),p[x]=C.cumulative,C.hasValidPoints=!0)}"percent"===c&&(t.stacking.usePercentage=!0);"group"!==c&&(this.stackedYData=p);t.stacking.oldStacks={}}};x.prototype.modifyStacks=function(){var a=this,c=a.stackKey,d=a.yAxis.stacking.stacks,
f=a.processedXData,h,l=a.options.stacking;a[l+"Stacker"]&&[c,"-"+c].forEach(function(c){for(var b=f.length,g,e;b--;)if(g=f[b],h=a.getStackIndicator(h,g,a.index,c),e=(g=d[c]&&d[c][g])&&g.points[h.key])a[l+"Stacker"](e,g,b)})};x.prototype.percentStacker=function(a,c,d){c=c.total?100/c.total:0;a[0]=q(a[0]*c);a[1]=q(a[1]*c);this.stackedYData[d]=a[1]};x.prototype.getStackIndicator=function(a,c,d,f){!m(a)||a.x!==c||f&&a.key!==f?a={x:c,index:0,key:f}:a.index++;a.key=[d,c,a.index].join();return a};G.StackItem=
w;"";return G.StackItem});L(a,"Series/Line/LineSeries.js",[a["Core/Series/Series.js"],a["Core/Series/SeriesRegistry.js"],a["Core/Utilities.js"]],function(a,t,A){var u=this&&this.__extends||function(){var a=function(u,q){a=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(a,h){a.__proto__=h}||function(a,h){for(var d in h)h.hasOwnProperty(d)&&(a[d]=h[d])};return a(u,q)};return function(u,q){function m(){this.constructor=u}a(u,q);u.prototype=null===q?Object.create(q):(m.prototype=q.prototype,
new m)}}(),x=A.defined,C=A.merge;A=function(t){function z(){var a=null!==t&&t.apply(this,arguments)||this;a.data=void 0;a.options=void 0;a.points=void 0;return a}u(z,t);z.prototype.drawGraph=function(){var a=this,m=this.options,h=(this.gappedPath||this.getGraphPath).call(this),d=this.chart.styledMode,c=[["graph","highcharts-graph"]];d||c[0].push(m.lineColor||this.color||"#cccccc",m.dashStyle);c=a.getZonesGraphs(c);c.forEach(function(c,f){var l=c[0],p=a[l],q=p?"animate":"attr";p?(p.endX=a.preventGraphAnimation?
null:h.xMap,p.animate({d:h})):h.length&&(a[l]=p=a.chart.renderer.path(h).addClass(c[1]).attr({zIndex:1}).add(a.group));p&&!d&&(l={stroke:c[2],"stroke-width":m.lineWidth,fill:a.fillGraph&&a.color||"none"},c[3]?l.dashstyle=c[3]:"square"!==m.linecap&&(l["stroke-linecap"]=l["stroke-linejoin"]="round"),p[q](l).shadow(2>f&&m.shadow));p&&(p.startX=h.xMap,p.isArea=h.isArea)})};z.prototype.getGraphPath=function(a,m,h){var d=this,c=d.options,l=[],f=[],q,p=c.step;a=a||d.points;var u=a.reversed;u&&a.reverse();
(p={right:1,center:2}[p]||p&&3)&&u&&(p=4-p);a=this.getValidPoints(a,!1,!(c.connectNulls&&!m&&!h));a.forEach(function(r,u){var w=r.plotX,n=r.plotY,k=a[u-1];(r.leftCliff||k&&k.rightCliff)&&!h&&(q=!0);r.isNull&&!x(m)&&0<u?q=!c.connectNulls:r.isNull&&!m?q=!0:(0===u||q?u=[["M",r.plotX,r.plotY]]:d.getPointSpline?u=[d.getPointSpline(a,r,u)]:p?(u=1===p?[["L",k.plotX,n]]:2===p?[["L",(k.plotX+w)/2,k.plotY],["L",(k.plotX+w)/2,n]]:[["L",w,k.plotY]],u.push(["L",w,n])):u=[["L",w,n]],f.push(r.x),p&&(f.push(r.x),
2===p&&f.push(r.x)),l.push.apply(l,u),q=!1)});l.xMap=f;return d.graphPath=l};z.prototype.getZonesGraphs=function(a){this.zones.forEach(function(m,h){h=["zone-graph-"+h,"highcharts-graph highcharts-zone-graph-"+h+" "+(m.className||"")];this.chart.styledMode||h.push(m.color||this.color,m.dashStyle||this.options.dashStyle);a.push(h)},this);return a};z.defaultOptions=C(a.defaultOptions,{});return z}(a);t.registerSeriesType("line",A);"";return A});L(a,"Series/Area/AreaSeries.js",[a["Core/Color/Color.js"],
a["Core/Legend/LegendSymbol.js"],a["Core/Series/SeriesRegistry.js"],a["Core/Utilities.js"]],function(a,t,A,G){var u=this&&this.__extends||function(){var a=function(d,c){a=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(a,c){a.__proto__=c}||function(a,c){for(var d in c)c.hasOwnProperty(d)&&(a[d]=c[d])};return a(d,c)};return function(d,c){function h(){this.constructor=d}a(d,c);d.prototype=null===c?Object.create(c):(h.prototype=c.prototype,new h)}}(),C=a.parse,I=A.seriesTypes.line;a=
G.extend;var z=G.merge,q=G.objectEach,m=G.pick;G=function(a){function d(){var c=null!==a&&a.apply(this,arguments)||this;c.data=void 0;c.options=void 0;c.points=void 0;return c}u(d,a);d.prototype.drawGraph=function(){this.areaPath=[];a.prototype.drawGraph.apply(this);var c=this,d=this.areaPath,f=this.options,h=[["area","highcharts-area",this.color,f.fillColor]];this.zones.forEach(function(a,d){h.push(["zone-area-"+d,"highcharts-area highcharts-zone-area-"+d+" "+a.className,a.color||c.color,a.fillColor||
f.fillColor])});h.forEach(function(a){var h=a[0],l=c[h],p=l?"animate":"attr",q={};l?(l.endX=c.preventGraphAnimation?null:d.xMap,l.animate({d:d})):(q.zIndex=0,l=c[h]=c.chart.renderer.path(d).addClass(a[1]).add(c.group),l.isArea=!0);c.chart.styledMode||(q.fill=m(a[3],C(a[2]).setOpacity(m(f.fillOpacity,.75)).get()));l[p](q);l.startX=d.xMap;l.shiftUnit=f.step?2:1})};d.prototype.getGraphPath=function(a){var c=I.prototype.getGraphPath,d=this.options,h=d.stacking,p=this.yAxis,q,r=[],u=[],t=this.index,n=
p.stacking.stacks[this.stackKey],k=d.threshold,b=Math.round(p.getThreshold(d.threshold));d=m(d.connectNulls,"percent"===h);var g=function(c,e,d){var g=a[c];c=h&&n[g.x].points[t];var f=g[d+"Null"]||0;d=g[d+"Cliff"]||0;g=!0;if(d||f){var l=(f?c[0]:c[1])+d;var m=c[0]+d;g=!!f}else!h&&a[e]&&a[e].isNull&&(l=m=k);"undefined"!==typeof l&&(u.push({plotX:D,plotY:null===l?b:p.getThreshold(l),isNull:g,isCliff:!0}),r.push({plotX:D,plotY:null===m?b:p.getThreshold(m),doCurve:!1}))};a=a||this.points;h&&(a=this.getStackPoints(a));
for(q=0;q<a.length;q++){h||(a[q].leftCliff=a[q].rightCliff=a[q].leftNull=a[q].rightNull=void 0);var e=a[q].isNull;var D=m(a[q].rectPlotX,a[q].plotX);var H=h?m(a[q].yBottom,b):b;if(!e||d)d||g(q,q-1,"left"),e&&!h&&d||(u.push(a[q]),r.push({x:q,plotX:D,plotY:H})),d||g(q,q+1,"right")}q=c.call(this,u,!0,!0);r.reversed=!0;e=c.call(this,r,!0,!0);(H=e[0])&&"M"===H[0]&&(e[0]=["L",H[1],H[2]]);e=q.concat(e);e.length&&e.push(["Z"]);c=c.call(this,u,!1,d);e.xMap=q.xMap;this.areaPath=e;return c};d.prototype.getStackPoints=
function(a){var c=this,d=[],h=[],p=this.xAxis,u=this.yAxis,r=u.stacking.stacks[this.stackKey],t={},B=u.series,n=B.length,k=u.options.reversedStacks?1:-1,b=B.indexOf(c);a=a||this.points;if(this.options.stacking){for(var g=0;g<a.length;g++)a[g].leftNull=a[g].rightNull=void 0,t[a[g].x]=a[g];q(r,function(a,b){null!==a.total&&h.push(b)});h.sort(function(a,b){return a-b});var e=B.map(function(a){return a.visible});h.forEach(function(a,g){var f=0,l,q;if(t[a]&&!t[a].isNull)d.push(t[a]),[-1,1].forEach(function(d){var f=
1===d?"rightNull":"leftNull",m=0,p=r[h[g+d]];if(p)for(var u=b;0<=u&&u<n;){var v=B[u].index;l=p.points[v];l||(v===c.index?t[a][f]=!0:e[u]&&(q=r[a].points[v])&&(m-=q[1]-q[0]));u+=k}t[a][1===d?"rightCliff":"leftCliff"]=m});else{for(var w=b;0<=w&&w<n;){if(l=r[a].points[B[w].index]){f=l[1];break}w+=k}f=m(f,0);f=u.translate(f,0,1,0,1);d.push({isNull:!0,plotX:p.translate(a,0,0,0,1),x:a,plotY:f,yBottom:f})}})}return d};d.defaultOptions=z(I.defaultOptions,{threshold:0});return d}(I);a(G.prototype,{singleStacks:!1,
drawLegendSymbol:t.drawRectangle});A.registerSeriesType("area",G);"";return G});L(a,"Series/Spline/SplineSeries.js",[a["Core/Series/SeriesRegistry.js"],a["Core/Utilities.js"]],function(a,t){var u=this&&this.__extends||function(){var a=function(u,q){a=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(a,h){a.__proto__=h}||function(a,h){for(var d in h)h.hasOwnProperty(d)&&(a[d]=h[d])};return a(u,q)};return function(u,q){function m(){this.constructor=u}a(u,q);u.prototype=null===q?Object.create(q):
(m.prototype=q.prototype,new m)}}(),G=a.seriesTypes.line,x=t.merge,C=t.pick;t=function(a){function t(){var q=null!==a&&a.apply(this,arguments)||this;q.data=void 0;q.options=void 0;q.points=void 0;return q}u(t,a);t.prototype.getPointSpline=function(a,m,h){var d=m.plotX||0,c=m.plotY||0,l=a[h-1];h=a[h+1];if(l&&!l.isNull&&!1!==l.doCurve&&!m.isCliff&&h&&!h.isNull&&!1!==h.doCurve&&!m.isCliff){a=l.plotY||0;var f=h.plotX||0;h=h.plotY||0;var q=0;var p=(1.5*d+(l.plotX||0))/2.5;var u=(1.5*c+a)/2.5;f=(1.5*d+
f)/2.5;var r=(1.5*c+h)/2.5;f!==p&&(q=(r-u)*(f-d)/(f-p)+c-r);u+=q;r+=q;u>a&&u>c?(u=Math.max(a,c),r=2*c-u):u<a&&u<c&&(u=Math.min(a,c),r=2*c-u);r>h&&r>c?(r=Math.max(h,c),u=2*c-r):r<h&&r<c&&(r=Math.min(h,c),u=2*c-r);m.rightContX=f;m.rightContY=r}m=["C",C(l.rightContX,l.plotX,0),C(l.rightContY,l.plotY,0),C(p,d,0),C(u,c,0),d,c];l.rightContX=l.rightContY=void 0;return m};t.defaultOptions=x(G.defaultOptions);return t}(G);a.registerSeriesType("spline",t);"";return t});L(a,"Series/AreaSpline/AreaSplineSeries.js",
[a["Series/Area/AreaSeries.js"],a["Series/Spline/SplineSeries.js"],a["Core/Legend/LegendSymbol.js"],a["Core/Series/SeriesRegistry.js"],a["Core/Utilities.js"]],function(a,t,A,G,x){var u=this&&this.__extends||function(){var a=function(h,d){a=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(a,d){a.__proto__=d}||function(a,d){for(var c in d)d.hasOwnProperty(c)&&(a[c]=d[c])};return a(h,d)};return function(h,d){function c(){this.constructor=h}a(h,d);h.prototype=null===d?Object.create(d):
(c.prototype=d.prototype,new c)}}(),I=a.prototype,z=x.extend,q=x.merge;x=function(m){function h(){var a=null!==m&&m.apply(this,arguments)||this;a.data=void 0;a.points=void 0;a.options=void 0;return a}u(h,m);h.defaultOptions=q(t.defaultOptions,a.defaultOptions);return h}(t);z(x.prototype,{getGraphPath:I.getGraphPath,getStackPoints:I.getStackPoints,drawGraph:I.drawGraph,drawLegendSymbol:A.drawRectangle});G.registerSeriesType("areaspline",x);"";return x});L(a,"Series/Column/ColumnSeries.js",[a["Core/Animation/AnimationUtilities.js"],
a["Core/Color/Color.js"],a["Core/Globals.js"],a["Core/Legend/LegendSymbol.js"],a["Core/Series/Series.js"],a["Core/Series/SeriesRegistry.js"],a["Core/Utilities.js"]],function(a,t,A,G,x,C,I){var u=this&&this.__extends||function(){var a=function(c,b){a=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(a,b){a.__proto__=b}||function(a,b){for(var c in b)b.hasOwnProperty(c)&&(a[c]=b[c])};return a(c,b)};return function(c,b){function d(){this.constructor=c}a(c,b);c.prototype=null===b?Object.create(b):
(d.prototype=b.prototype,new d)}}(),q=a.animObject,m=t.parse,h=A.hasTouch;a=A.noop;var d=I.clamp,c=I.css,l=I.defined,f=I.extend,w=I.fireEvent,p=I.isArray,K=I.isNumber,r=I.merge,y=I.pick,B=I.objectEach;I=function(a){function k(){var b=null!==a&&a.apply(this,arguments)||this;b.borderWidth=void 0;b.data=void 0;b.group=void 0;b.options=void 0;b.points=void 0;return b}u(k,a);k.prototype.animate=function(a){var b=this,c=this.yAxis,h=b.options,k=this.chart.inverted,l={},n=k?"translateX":"translateY";if(a)l.scaleY=
.001,a=d(c.toPixels(h.threshold),c.pos,c.pos+c.len),k?l.translateX=a-c.len:l.translateY=a,b.clipBox&&b.setClip(),b.group.attr(l);else{var m=Number(b.group.attr(n));b.group.animate({scaleY:1},f(q(b.options.animation),{step:function(a,e){b.group&&(l[n]=m+e.pos*(c.pos-m),b.group.attr(l))}}))}};k.prototype.init=function(b,c){a.prototype.init.apply(this,arguments);var e=this;b=e.chart;b.hasRendered&&b.series.forEach(function(a){a.type===e.type&&(a.isDirty=!0)})};k.prototype.getColumnMetrics=function(){var a=
this,c=a.options,e=a.xAxis,d=a.yAxis,f=e.options.reversedStacks;f=e.reversed&&!f||!e.reversed&&f;var h={},k,l=0;!1===c.grouping?l=1:a.chart.series.forEach(function(b){var c=b.yAxis,e=b.options;if(b.type===a.type&&(b.visible||!a.chart.options.chart.ignoreHiddenSeries)&&d.len===c.len&&d.pos===c.pos){if(e.stacking&&"group"!==e.stacking){k=b.stackKey;"undefined"===typeof h[k]&&(h[k]=l++);var g=h[k]}else!1!==e.grouping&&(g=l++);b.columnIndex=g}});var n=Math.min(Math.abs(e.transA)*(e.ordinal&&e.ordinal.slope||
c.pointRange||e.closestPointRange||e.tickInterval||1),e.len),m=n*c.groupPadding,p=(n-2*m)/(l||1);c=Math.min(c.maxPointWidth||e.len,y(c.pointWidth,p*(1-2*c.pointPadding)));a.columnMetrics={width:c,offset:(p-c)/2+(m+((a.columnIndex||0)+(f?1:0))*p-n/2)*(f?-1:1),paddedWidth:p,columnCount:l};return a.columnMetrics};k.prototype.crispCol=function(a,c,e,d){var b=this.chart,g=this.borderWidth,f=-(g%2?.5:0);g=g%2?.5:1;b.inverted&&b.renderer.isVML&&(g+=1);this.options.crisp&&(e=Math.round(a+e)+f,a=Math.round(a)+
f,e-=a);d=Math.round(c+d)+g;f=.5>=Math.abs(c)&&.5<d;c=Math.round(c)+g;d-=c;f&&d&&(--c,d+=1);return{x:a,y:c,width:e,height:d}};k.prototype.adjustForMissingColumns=function(a,c,e,d){var b=this,g=this.options.stacking;if(!e.isNull&&1<d.columnCount){var f=0,h=0;B(this.yAxis.stacking&&this.yAxis.stacking.stacks,function(a){if("number"===typeof e.x&&(a=a[e.x.toString()])){var c=a.points[b.index],d=a.total;g?(c&&(f=h),a.hasValidPoints&&h++):p(c)&&(f=c[1],h=d||0)}});a=(e.plotX||0)+((h-1)*d.paddedWidth+c)/
2-c-f*d.paddedWidth}return a};k.prototype.translate=function(){var a=this,c=a.chart,e=a.options,f=a.dense=2>a.closestPointRange*a.xAxis.transA;f=a.borderWidth=y(e.borderWidth,f?0:1);var h=a.xAxis,k=a.yAxis,n=e.threshold,m=a.translatedThreshold=k.getThreshold(n),p=y(e.minPointLength,5),q=a.getColumnMetrics(),r=q.width,u=a.pointXOffset=q.offset,t=a.dataMin,w=a.dataMax,B=a.barW=Math.max(r,1+2*f);c.inverted&&(m-=.5);e.pointPadding&&(B=Math.ceil(B));x.prototype.translate.apply(a);a.points.forEach(function(b){var g=
y(b.yBottom,m),f=999+Math.abs(g),v=b.plotX||0;f=d(b.plotY,-f,k.len+f);var E=Math.min(f,g),D=Math.max(f,g)-E,x=r,H=v+u,z=B;p&&Math.abs(D)<p&&(D=p,v=!k.reversed&&!b.negative||k.reversed&&b.negative,K(n)&&K(w)&&b.y===n&&w<=n&&(k.min||0)<n&&(t!==w||(k.max||0)<=n)&&(v=!v),E=Math.abs(E-m)>p?g-p:m-(v?p:0));l(b.options.pointWidth)&&(x=z=Math.ceil(b.options.pointWidth),H-=Math.round((x-r)/2));e.centerInCategory&&(H=a.adjustForMissingColumns(H,x,b,q));b.barX=H;b.pointWidth=x;b.tooltipPos=c.inverted?[d(k.len+
k.pos-c.plotLeft-f,k.pos-c.plotLeft,k.len+k.pos-c.plotLeft),h.len+h.pos-c.plotTop-H-z/2,D]:[h.left-c.plotLeft+H+z/2,d(f+k.pos-c.plotTop,k.pos-c.plotTop,k.len+k.pos-c.plotTop),D];b.shapeType=a.pointClass.prototype.shapeType||"rect";b.shapeArgs=a.crispCol.apply(a,b.isNull?[H,m,z,0]:[H,E,z,D])})};k.prototype.drawGraph=function(){this.group[this.dense?"addClass":"removeClass"]("highcharts-dense-data")};k.prototype.pointAttribs=function(a,c){var b=this.options,d=this.pointAttrToOptions||{},g=d.stroke||
"borderColor",f=d["stroke-width"]||"borderWidth",h=a&&a.color||this.color,k=a&&a[g]||b[g]||h;d=a&&a.options.dashStyle||b.dashStyle;var l=a&&a[f]||b[f]||this[f]||0,n=y(a&&a.opacity,b.opacity,1);if(a&&this.zones.length){var p=a.getZone();h=a.options.color||p&&(p.color||a.nonZonedColor)||this.color;p&&(k=p.borderColor||k,d=p.dashStyle||d,l=p.borderWidth||l)}c&&a&&(a=r(b.states[c],a.options.states&&a.options.states[c]||{}),c=a.brightness,h=a.color||"undefined"!==typeof c&&m(h).brighten(a.brightness).get()||
h,k=a[g]||k,l=a[f]||l,d=a.dashStyle||d,n=y(a.opacity,n));g={fill:h,stroke:k,"stroke-width":l,opacity:n};d&&(g.dashstyle=d);return g};k.prototype.drawPoints=function(){var a=this,c=this.chart,e=a.options,d=c.renderer,f=e.animationLimit||250,h;a.points.forEach(function(b){var g=b.graphic,k=!!g,l=g&&c.pointCount<f?"animate":"attr";if(K(b.plotY)&&null!==b.y){h=b.shapeArgs;g&&b.hasNewShapeType()&&(g=g.destroy());a.enabledDataSorting&&(b.startXPos=a.xAxis.reversed?-(h?h.width||0:0):a.xAxis.width);g||(b.graphic=
g=d[b.shapeType](h).add(b.group||a.group))&&a.enabledDataSorting&&c.hasRendered&&c.pointCount<f&&(g.attr({x:b.startXPos}),k=!0,l="animate");if(g&&k)g[l](r(h));if(e.borderRadius)g[l]({r:e.borderRadius});c.styledMode||g[l](a.pointAttribs(b,b.selected&&"select")).shadow(!1!==b.allowShadow&&e.shadow,null,e.stacking&&!e.borderRadius);g&&(g.addClass(b.getClassName(),!0),g.attr({visibility:b.visible?"inherit":"hidden"}))}else g&&(b.graphic=g.destroy())})};k.prototype.drawTracker=function(){var a=this,d=
a.chart,e=d.pointer,f=function(a){var b=e.getPointFromEvent(a);"undefined"!==typeof b&&(e.isDirectTouch=!0,b.onMouseOver(a))},k;a.points.forEach(function(a){k=p(a.dataLabels)?a.dataLabels:a.dataLabel?[a.dataLabel]:[];a.graphic&&(a.graphic.element.point=a);k.forEach(function(b){b.div?b.div.point=a:b.element.point=a})});a._hasTracking||(a.trackerGroups.forEach(function(b){if(a[b]){a[b].addClass("highcharts-tracker").on("mouseover",f).on("mouseout",function(a){e.onTrackerMouseOut(a)});if(h)a[b].on("touchstart",
f);!d.styledMode&&a.options.cursor&&a[b].css(c).css({cursor:a.options.cursor})}}),a._hasTracking=!0);w(this,"afterDrawTracker")};k.prototype.remove=function(){var a=this,c=a.chart;c.hasRendered&&c.series.forEach(function(b){b.type===a.type&&(b.isDirty=!0)});x.prototype.remove.apply(a,arguments)};k.defaultOptions=r(x.defaultOptions,{borderRadius:0,centerInCategory:!1,groupPadding:.2,marker:null,pointPadding:.1,minPointLength:0,cropThreshold:50,pointRange:null,states:{hover:{halo:!1,brightness:.1},
select:{color:"#cccccc",borderColor:"#000000"}},dataLabels:{align:void 0,verticalAlign:void 0,y:void 0},startFromThreshold:!0,stickyTracking:!1,tooltip:{distance:6},threshold:0,borderColor:"#ffffff"});return k}(x);f(I.prototype,{cropShoulder:0,directTouch:!0,drawLegendSymbol:G.drawRectangle,getSymbol:a,negStacks:!0,trackerGroups:["group","dataLabelsGroup"]});C.registerSeriesType("column",I);"";"";return I});L(a,"Core/Series/DataLabel.js",[a["Core/Animation/AnimationUtilities.js"],a["Core/FormatUtilities.js"],
a["Core/Utilities.js"]],function(a,t,A){var u=a.getDeferredAnimation,x=t.format,C=A.defined,I=A.extend,z=A.fireEvent,q=A.isArray,m=A.merge,h=A.objectEach,d=A.pick,c=A.splat,l;(function(a){function f(a,b,c,e,f){var g=this,h=this.chart,k=this.isCartesian&&h.inverted,l=this.enabledDataSorting,n=d(a.dlBox&&a.dlBox.centerX,a.plotX,-9999),m=d(a.plotY,-9999),p=b.getBBox(),q=c.rotation,r=c.align,u=h.isInsidePlot(n,Math.round(m),{inverted:k,paneCoordinates:!0,series:g}),t=function(c){l&&g.xAxis&&!w&&g.setDataLabelStartPos(a,
b,f,u,c)},w="justify"===d(c.overflow,l?"none":"justify"),B=this.visible&&!1!==a.visible&&(a.series.forceDL||l&&!w||u||d(c.inside,!!this.options.stacking)&&e&&h.isInsidePlot(n,k?e.x+1:e.y+e.height-1,{inverted:k,paneCoordinates:!0,series:g}));if(B){var y=h.renderer.fontMetrics(h.styledMode?void 0:c.style.fontSize,b).b;e=I({x:k?this.yAxis.len-m:n,y:Math.round(k?this.xAxis.len-n:m),width:0,height:0},e);I(c,{width:p.width,height:p.height});q?(w=!1,n=h.renderer.rotCorr(y,q),n={x:e.x+(c.x||0)+e.width/2+
n.x,y:e.y+(c.y||0)+{top:0,middle:.5,bottom:1}[c.verticalAlign]*e.height},t(n),b[f?"attr":"animate"](n).attr({align:r}),t=(q+720)%360,t=180<t&&360>t,"left"===r?n.y-=t?p.height:0:"center"===r?(n.x-=p.width/2,n.y-=p.height/2):"right"===r&&(n.x-=p.width,n.y-=t?0:p.height),b.placed=!0,b.alignAttr=n):(t(e),b.align(c,void 0,e),n=b.alignAttr);w&&0<=e.height?this.justifyDataLabel(b,c,n,p,e,f):d(c.crop,!0)&&(B=h.isInsidePlot(n.x,n.y,{paneCoordinates:!0,series:g})&&h.isInsidePlot(n.x+p.width,n.y+p.height,{paneCoordinates:!0,
series:g}));if(c.shape&&!q)b[f?"attr":"animate"]({anchorX:k?h.plotWidth-a.plotY:a.plotX,anchorY:k?h.plotHeight-a.plotX:a.plotY})}f&&l&&(b.placed=!1);B||l&&!w||(b.hide(!0),b.placed=!1)}function l(a,b){var c=b.filter;return c?(b=c.operator,a=a[c.property],c=c.value,">"===b&&a>c||"<"===b&&a<c||">="===b&&a>=c||"<="===b&&a<=c||"=="===b&&a==c||"==="===b&&a===c?!0:!1):!0}function t(){var a=this,b=a.chart,g=a.options,e=a.points,f=a.hasRendered||0,n=b.renderer,m=g.dataLabels,p,r=m.animation;r=m.defer?u(b,
r,a):{defer:0,duration:0};m=y(y(b.options.plotOptions&&b.options.plotOptions.series&&b.options.plotOptions.series.dataLabels,b.options.plotOptions&&b.options.plotOptions[a.type]&&b.options.plotOptions[a.type].dataLabels),m);z(this,"drawDataLabels");if(q(m)||m.enabled||a._hasPointLabels){var t=a.plotGroup("dataLabelsGroup","data-labels",f?"inherit":"hidden",m.zIndex||6);t.attr({opacity:+f});!f&&(f=a.dataLabelsGroup)&&(a.visible&&t.show(!0),f[g.animation?"animate":"attr"]({opacity:1},r));e.forEach(function(e){p=
c(y(m,e.dlOptions||e.options&&e.options.dataLabels));p.forEach(function(c,f){var k=c.enabled&&(!e.isNull||e.dataLabelOnNull)&&l(e,c),m=e.connectors?e.connectors[f]:e.connector,p=e.dataLabels?e.dataLabels[f]:e.dataLabel,q=d(c.distance,e.labelDistance),r=!p;if(k){var u=e.getLabelConfig();var w=d(c[e.formatPrefix+"Format"],c.format);u=C(w)?x(w,u,b):(c[e.formatPrefix+"Formatter"]||c.formatter).call(u,c);w=c.style;var B=c.rotation;b.styledMode||(w.color=d(c.color,w.color,a.color,"#000000"),"contrast"===
w.color?(e.contrastColor=n.getContrast(e.color||a.color),w.color=!C(q)&&c.inside||0>q||g.stacking?e.contrastColor:"#000000"):delete e.contrastColor,g.cursor&&(w.cursor=g.cursor));var v={r:c.borderRadius||0,rotation:B,padding:c.padding,zIndex:1};b.styledMode||(v.fill=c.backgroundColor,v.stroke=c.borderColor,v["stroke-width"]=c.borderWidth);h(v,function(a,b){"undefined"===typeof a&&delete v[b]})}!p||k&&C(u)?k&&C(u)&&(p?v.text=u:(e.dataLabels=e.dataLabels||[],p=e.dataLabels[f]=B?n.text(u,0,-9999,c.useHTML).addClass("highcharts-data-label"):
n.label(u,0,-9999,c.shape,null,null,c.useHTML,null,"data-label"),f||(e.dataLabel=p),p.addClass(" highcharts-data-label-color-"+e.colorIndex+" "+(c.className||"")+(c.useHTML?" highcharts-tracker":""))),p.options=c,p.attr(v),b.styledMode||p.css(w).shadow(c.shadow),p.added||p.add(t),c.textPath&&!c.useHTML&&(p.setTextPath(e.getDataLabelPath&&e.getDataLabelPath(p)||e.graphic,c.textPath),e.dataLabelPath&&!c.textPath.enabled&&(e.dataLabelPath=e.dataLabelPath.destroy())),a.alignDataLabel(e,p,c,null,r)):(e.dataLabel=
e.dataLabel&&e.dataLabel.destroy(),e.dataLabels&&(1===e.dataLabels.length?delete e.dataLabels:delete e.dataLabels[f]),f||delete e.dataLabel,m&&(e.connector=e.connector.destroy(),e.connectors&&(1===e.connectors.length?delete e.connectors:delete e.connectors[f])))})})}z(this,"afterDrawDataLabels")}function r(a,b,c,e,d,f){var g=this.chart,h=b.align,k=b.verticalAlign,l=a.box?0:a.padding||0,n=b.x;n=void 0===n?0:n;var m=b.y;m=void 0===m?0:m;var p=(c.x||0)+l;if(0>p){"right"===h&&0<=n?(b.align="left",b.inside=
!0):n-=p;var q=!0}p=(c.x||0)+e.width-l;p>g.plotWidth&&("left"===h&&0>=n?(b.align="right",b.inside=!0):n+=g.plotWidth-p,q=!0);p=c.y+l;0>p&&("bottom"===k&&0<=m?(b.verticalAlign="top",b.inside=!0):m-=p,q=!0);p=(c.y||0)+e.height-l;p>g.plotHeight&&("top"===k&&0>=m?(b.verticalAlign="bottom",b.inside=!0):m+=g.plotHeight-p,q=!0);q&&(b.x=n,b.y=m,a.placed=!f,a.align(b,void 0,d));return q}function y(a,b){var c=[],e;if(q(a)&&!q(b))c=a.map(function(a){return m(a,b)});else if(q(b)&&!q(a))c=b.map(function(b){return m(a,
b)});else if(q(a)||q(b))for(e=Math.max(a.length,b.length);e--;)c[e]=m(a[e],b[e]);else c=m(a,b);return c}function B(a,b,c,e,d){var f=this.chart,g=f.inverted,h=this.xAxis,k=h.reversed,l=g?b.height/2:b.width/2;a=(a=a.pointWidth)?a/2:0;b.startXPos=g?d.x:k?-l-a:h.width-l+a;b.startYPos=g?k?this.yAxis.height-l+a:-l-a:d.y;e?"hidden"===b.visibility&&(b.show(),b.attr({opacity:0}).animate({opacity:1})):b.attr({opacity:1}).animate({opacity:0},void 0,b.hide);f.hasRendered&&(c&&b.attr({x:b.startXPos,y:b.startYPos}),
b.placed=!0)}var n=[];a.compose=function(a){if(-1===n.indexOf(a)){var b=a.prototype;n.push(a);b.alignDataLabel=f;b.drawDataLabels=t;b.justifyDataLabel=r;b.setDataLabelStartPos=B}}})(l||(l={}));"";return l});L(a,"Series/Column/ColumnDataLabel.js",[a["Core/Series/DataLabel.js"],a["Core/Series/SeriesRegistry.js"],a["Core/Utilities.js"]],function(a,t,A){var u=t.series,x=A.merge,C=A.pick,I;(function(t){function q(a,d,c,l,f){var h=this.chart.inverted,m=a.series,q=(m.xAxis?m.xAxis.len:this.chart.plotSizeX)||
0;m=(m.yAxis?m.yAxis.len:this.chart.plotSizeY)||0;var r=a.dlBox||a.shapeArgs,t=C(a.below,a.plotY>C(this.translatedThreshold,m)),B=C(c.inside,!!this.options.stacking);r&&(l=x(r),0>l.y&&(l.height+=l.y,l.y=0),r=l.y+l.height-m,0<r&&r<l.height&&(l.height-=r),h&&(l={x:m-l.y-l.height,y:q-l.x-l.width,width:l.height,height:l.width}),B||(h?(l.x+=t?0:l.width,l.width=0):(l.y+=t?l.height:0,l.height=0)));c.align=C(c.align,!h||B?"center":t?"right":"left");c.verticalAlign=C(c.verticalAlign,h||B?"middle":t?"top":
"bottom");u.prototype.alignDataLabel.call(this,a,d,c,l,f);c.inside&&a.contrastColor&&d.css({color:a.contrastColor})}var m=[];t.compose=function(h){a.compose(u);-1===m.indexOf(h)&&(m.push(h),h.prototype.alignDataLabel=q)}})(I||(I={}));return I});L(a,"Series/Bar/BarSeries.js",[a["Series/Column/ColumnSeries.js"],a["Core/Series/SeriesRegistry.js"],a["Core/Utilities.js"]],function(a,t,A){var u=this&&this.__extends||function(){var a=function(u,q){a=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&
function(a,h){a.__proto__=h}||function(a,h){for(var d in h)h.hasOwnProperty(d)&&(a[d]=h[d])};return a(u,q)};return function(u,q){function m(){this.constructor=u}a(u,q);u.prototype=null===q?Object.create(q):(m.prototype=q.prototype,new m)}}(),x=A.extend,C=A.merge;A=function(t){function x(){var a=null!==t&&t.apply(this,arguments)||this;a.data=void 0;a.options=void 0;a.points=void 0;return a}u(x,t);x.defaultOptions=C(a.defaultOptions,{});return x}(a);x(A.prototype,{inverted:!0});t.registerSeriesType("bar",
A);"";return A});L(a,"Series/Scatter/ScatterSeries.js",[a["Series/Column/ColumnSeries.js"],a["Series/Line/LineSeries.js"],a["Core/Series/SeriesRegistry.js"],a["Core/Utilities.js"]],function(a,t,A,G){var u=this&&this.__extends||function(){var a=function(m,h){a=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(a,c){a.__proto__=c}||function(a,c){for(var d in c)c.hasOwnProperty(d)&&(a[d]=c[d])};return a(m,h)};return function(m,h){function d(){this.constructor=m}a(m,h);m.prototype=null===
h?Object.create(h):(d.prototype=h.prototype,new d)}}(),C=G.addEvent,I=G.extend,z=G.merge;G=function(a){function m(){var h=null!==a&&a.apply(this,arguments)||this;h.data=void 0;h.options=void 0;h.points=void 0;return h}u(m,a);m.prototype.applyJitter=function(){var a=this,d=this.options.jitter,c=this.points.length;d&&this.points.forEach(function(h,f){["x","y"].forEach(function(l,m){var p="plot"+l.toUpperCase();if(d[l]&&!h.isNull){var q=a[l+"Axis"];var u=d[l]*q.transA;if(q&&!q.isLog){var t=Math.max(0,
h[p]-u);q=Math.min(q.len,h[p]+u);m=1E4*Math.sin(f+m*c);h[p]=t+(q-t)*(m-Math.floor(m));"x"===l&&(h.clientX=h.plotX)}}})})};m.prototype.drawGraph=function(){this.options.lineWidth?a.prototype.drawGraph.call(this):this.graph&&(this.graph=this.graph.destroy())};m.defaultOptions=z(t.defaultOptions,{lineWidth:0,findNearestPointBy:"xy",jitter:{x:0,y:0},marker:{enabled:!0},tooltip:{headerFormat:'<span style="color:{point.color}">\u25cf</span> <span style="font-size: 10px"> {series.name}</span><br/>',pointFormat:"x: <b>{point.x}</b><br/>y: <b>{point.y}</b><br/>"}});
return m}(t);I(G.prototype,{drawTracker:a.prototype.drawTracker,sorted:!1,requireSorting:!1,noSharedTooltip:!0,trackerGroups:["group","markerGroup","dataLabelsGroup"],takeOrdinalPosition:!1});C(G,"afterTranslate",function(){this.applyJitter()});A.registerSeriesType("scatter",G);"";return G});L(a,"Series/CenteredUtilities.js",[a["Core/Globals.js"],a["Core/Series/Series.js"],a["Core/Utilities.js"]],function(a,t,A){var u=a.deg2rad,x=A.isNumber,C=A.pick,I=A.relativeLength,z;(function(a){a.getCenter=function(){var a=
this.options,h=this.chart,d=2*(a.slicedOffset||0),c=h.plotWidth-2*d,l=h.plotHeight-2*d,f=a.center,q=Math.min(c,l),p=a.size,u=a.innerSize||0;"string"===typeof p&&(p=parseFloat(p));"string"===typeof u&&(u=parseFloat(u));a=[C(f[0],"50%"),C(f[1],"50%"),C(p&&0>p?void 0:a.size,"100%"),C(u&&0>u?void 0:a.innerSize||0,"0%")];!h.angular||this instanceof t||(a[3]=0);for(f=0;4>f;++f)p=a[f],h=2>f||2===f&&/%$/.test(p),a[f]=I(p,[c,l,q,a[2]][f])+(h?d:0);a[3]>a[2]&&(a[3]=a[2]);return a};a.getStartAndEndRadians=function(a,
h){a=x(a)?a:0;h=x(h)&&h>a&&360>h-a?h:a+360;return{start:u*(a+-90),end:u*(h+-90)}}})(z||(z={}));"";return z});L(a,"Series/Pie/PiePoint.js",[a["Core/Animation/AnimationUtilities.js"],a["Core/Series/Point.js"],a["Core/Utilities.js"]],function(a,t,A){var u=this&&this.__extends||function(){var a=function(d,c){a=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(a,c){a.__proto__=c}||function(a,c){for(var d in c)c.hasOwnProperty(d)&&(a[d]=c[d])};return a(d,c)};return function(d,c){function h(){this.constructor=
d}a(d,c);d.prototype=null===c?Object.create(c):(h.prototype=c.prototype,new h)}}(),x=a.setAnimation,C=A.addEvent,I=A.defined;a=A.extend;var z=A.isNumber,q=A.pick,m=A.relativeLength;t=function(a){function d(){var c=null!==a&&a.apply(this,arguments)||this;c.labelDistance=void 0;c.options=void 0;c.series=void 0;return c}u(d,a);d.prototype.getConnectorPath=function(){var a=this.labelPosition,d=this.series.options.dataLabels,f=this.connectorShapes,h=d.connectorShape;f[h]&&(h=f[h]);return h.call(this,{x:a.final.x,
y:a.final.y,alignment:a.alignment},a.connectorPosition,d)};d.prototype.getTranslate=function(){return this.sliced?this.slicedTranslation:{translateX:0,translateY:0}};d.prototype.haloPath=function(a){var c=this.shapeArgs;return this.sliced||!this.visible?[]:this.series.chart.renderer.symbols.arc(c.x,c.y,c.r+a,c.r+a,{innerR:c.r-1,start:c.start,end:c.end})};d.prototype.init=function(){var c=this;a.prototype.init.apply(this,arguments);this.name=q(this.name,"Slice");var d=function(a){c.slice("select"===
a.type)};C(this,"select",d);C(this,"unselect",d);return this};d.prototype.isValid=function(){return z(this.y)&&0<=this.y};d.prototype.setVisible=function(a,d){var c=this,h=this.series,l=h.chart,m=h.options.ignoreHiddenPoint;d=q(d,m);a!==this.visible&&(this.visible=this.options.visible=a="undefined"===typeof a?!this.visible:a,h.options.data[h.data.indexOf(this)]=this.options,["graphic","dataLabel","connector","shadowGroup"].forEach(function(d){if(c[d])c[d][a?"show":"hide"](a)}),this.legendItem&&l.legend.colorizeItem(this,
a),a||"hover"!==this.state||this.setState(""),m&&(h.isDirty=!0),d&&l.redraw())};d.prototype.slice=function(a,d,f){var c=this.series;x(f,c.chart);q(d,!0);this.sliced=this.options.sliced=I(a)?a:!this.sliced;c.options.data[c.data.indexOf(this)]=this.options;this.graphic&&this.graphic.animate(this.getTranslate());this.shadowGroup&&this.shadowGroup.animate(this.getTranslate())};return d}(t);a(t.prototype,{connectorShapes:{fixedOffset:function(a,d,c){var h=d.breakAt;d=d.touchingSliceAt;return[["M",a.x,
a.y],c.softConnector?["C",a.x+("left"===a.alignment?-5:5),a.y,2*h.x-d.x,2*h.y-d.y,h.x,h.y]:["L",h.x,h.y],["L",d.x,d.y]]},straight:function(a,d){d=d.touchingSliceAt;return[["M",a.x,a.y],["L",d.x,d.y]]},crookedLine:function(a,d,c){d=d.touchingSliceAt;var h=this.series,f=h.center[0],q=h.chart.plotWidth,p=h.chart.plotLeft;h=a.alignment;var u=this.shapeArgs.r;c=m(c.crookDistance,1);q="left"===h?f+u+(q+p-f-u)*(1-c):p+(f-u)*c;c=["L",q,a.y];f=!0;if("left"===h?q>a.x||q<d.x:q<a.x||q>d.x)f=!1;a=[["M",a.x,a.y]];
f&&a.push(c);a.push(["L",d.x,d.y]);return a}}});return t});L(a,"Series/Pie/PieSeries.js",[a["Series/CenteredUtilities.js"],a["Series/Column/ColumnSeries.js"],a["Core/Globals.js"],a["Core/Legend/LegendSymbol.js"],a["Series/Pie/PiePoint.js"],a["Core/Series/Series.js"],a["Core/Series/SeriesRegistry.js"],a["Core/Renderer/SVG/Symbols.js"],a["Core/Utilities.js"]],function(a,t,A,G,x,C,I,z,q){var m=this&&this.__extends||function(){var a=function(c,d){a=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&
function(a,c){a.__proto__=c}||function(a,c){for(var d in c)c.hasOwnProperty(d)&&(a[d]=c[d])};return a(c,d)};return function(c,d){function f(){this.constructor=c}a(c,d);c.prototype=null===d?Object.create(d):(f.prototype=d.prototype,new f)}}(),h=a.getStartAndEndRadians;A=A.noop;var d=q.clamp,c=q.extend,l=q.fireEvent,f=q.merge,u=q.pick,p=q.relativeLength;q=function(a){function c(){var c=null!==a&&a.apply(this,arguments)||this;c.center=void 0;c.data=void 0;c.maxLabelDistance=void 0;c.options=void 0;c.points=
void 0;return c}m(c,a);c.prototype.animate=function(a){var c=this,d=c.points,f=c.startAngleRad;a||d.forEach(function(a){var b=a.graphic,e=a.shapeArgs;b&&e&&(b.attr({r:u(a.startR,c.center&&c.center[3]/2),start:f,end:f}),b.animate({r:e.r,start:e.start,end:e.end},c.options.animation))})};c.prototype.drawEmpty=function(){var a=this.startAngleRad,c=this.endAngleRad,d=this.options;if(0===this.total&&this.center){var f=this.center[0];var b=this.center[1];this.graph||(this.graph=this.chart.renderer.arc(f,
b,this.center[1]/2,0,a,c).addClass("highcharts-empty-series").add(this.group));this.graph.attr({d:z.arc(f,b,this.center[2]/2,0,{start:a,end:c,innerR:this.center[3]/2})});this.chart.styledMode||this.graph.attr({"stroke-width":d.borderWidth,fill:d.fillColor||"none",stroke:d.color||"#cccccc"})}else this.graph&&(this.graph=this.graph.destroy())};c.prototype.drawPoints=function(){var a=this.chart.renderer;this.points.forEach(function(c){c.graphic&&c.hasNewShapeType()&&(c.graphic=c.graphic.destroy());c.graphic||
(c.graphic=a[c.shapeType](c.shapeArgs).add(c.series.group),c.delayedRendering=!0)})};c.prototype.generatePoints=function(){a.prototype.generatePoints.call(this);this.updateTotals()};c.prototype.getX=function(a,c,f){var h=this.center,b=this.radii?this.radii[f.index]||0:h[2]/2;a=Math.asin(d((a-h[1])/(b+f.labelDistance),-1,1));return h[0]+(c?-1:1)*Math.cos(a)*(b+f.labelDistance)+(0<f.labelDistance?(c?-1:1)*this.options.dataLabels.padding:0)};c.prototype.hasData=function(){return!!this.processedXData.length};
c.prototype.redrawPoints=function(){var a=this,c=a.chart,d=c.renderer,h=a.options.shadow,b,g,e,l;this.drawEmpty();!h||a.shadowGroup||c.styledMode||(a.shadowGroup=d.g("shadow").attr({zIndex:-1}).add(a.group));a.points.forEach(function(k){var n={};g=k.graphic;if(!k.isNull&&g){var m=void 0;l=k.shapeArgs;b=k.getTranslate();c.styledMode||(m=k.shadowGroup,h&&!m&&(m=k.shadowGroup=d.g("shadow").add(a.shadowGroup)),m&&m.attr(b),e=a.pointAttribs(k,k.selected&&"select"));k.delayedRendering?(g.setRadialReference(a.center).attr(l).attr(b),
c.styledMode||g.attr(e).attr({"stroke-linejoin":"round"}).shadow(h,m),k.delayedRendering=!1):(g.setRadialReference(a.center),c.styledMode||f(!0,n,e),f(!0,n,l,b),g.animate(n));g.attr({visibility:k.visible?"inherit":"hidden"});g.addClass(k.getClassName(),!0)}else g&&(k.graphic=g.destroy())})};c.prototype.sortByAngle=function(a,c){a.sort(function(a,d){return"undefined"!==typeof a.angle&&(d.angle-a.angle)*c})};c.prototype.translate=function(a){this.generatePoints();var c=this.options,d=c.slicedOffset,
f=d+(c.borderWidth||0),b=h(c.startAngle,c.endAngle),g=this.startAngleRad=b.start;b=(this.endAngleRad=b.end)-g;var e=this.points,m=c.dataLabels.distance;c=c.ignoreHiddenPoint;var q=e.length,r,t=0;a||(this.center=a=this.getCenter());for(r=0;r<q;r++){var w=e[r];var x=g+t*b;!w.isValid()||c&&!w.visible||(t+=w.percentage/100);var y=g+t*b;var z={x:a[0],y:a[1],r:a[2]/2,innerR:a[3]/2,start:Math.round(1E3*x)/1E3,end:Math.round(1E3*y)/1E3};w.shapeType="arc";w.shapeArgs=z;w.labelDistance=u(w.options.dataLabels&&
w.options.dataLabels.distance,m);w.labelDistance=p(w.labelDistance,z.r);this.maxLabelDistance=Math.max(this.maxLabelDistance||0,w.labelDistance);y=(y+x)/2;y>1.5*Math.PI?y-=2*Math.PI:y<-Math.PI/2&&(y+=2*Math.PI);w.slicedTranslation={translateX:Math.round(Math.cos(y)*d),translateY:Math.round(Math.sin(y)*d)};z=Math.cos(y)*a[2]/2;var A=Math.sin(y)*a[2]/2;w.tooltipPos=[a[0]+.7*z,a[1]+.7*A];w.half=y<-Math.PI/2||y>Math.PI/2?1:0;w.angle=y;x=Math.min(f,w.labelDistance/5);w.labelPosition={natural:{x:a[0]+z+
Math.cos(y)*w.labelDistance,y:a[1]+A+Math.sin(y)*w.labelDistance},"final":{},alignment:0>w.labelDistance?"center":w.half?"right":"left",connectorPosition:{breakAt:{x:a[0]+z+Math.cos(y)*x,y:a[1]+A+Math.sin(y)*x},touchingSliceAt:{x:a[0]+z,y:a[1]+A}}}}l(this,"afterTranslate")};c.prototype.updateTotals=function(){var a=this.points,c=a.length,d=this.options.ignoreHiddenPoint,f,b=0;for(f=0;f<c;f++){var g=a[f];!g.isValid()||d&&!g.visible||(b+=g.y)}this.total=b;for(f=0;f<c;f++)g=a[f],g.percentage=0<b&&(g.visible||
!d)?g.y/b*100:0,g.total=b};c.defaultOptions=f(C.defaultOptions,{center:[null,null],clip:!1,colorByPoint:!0,dataLabels:{allowOverlap:!0,connectorPadding:5,connectorShape:"fixedOffset",crookDistance:"70%",distance:30,enabled:!0,formatter:function(){return this.point.isNull?void 0:this.point.name},softConnector:!0,x:0},fillColor:void 0,ignoreHiddenPoint:!0,inactiveOtherPoints:!0,legendType:"point",marker:null,size:null,showInLegend:!1,slicedOffset:10,stickyTracking:!1,tooltip:{followPointer:!0},borderColor:"#ffffff",
borderWidth:1,lineWidth:void 0,states:{hover:{brightness:.1}}});return c}(C);c(q.prototype,{axisTypes:[],directTouch:!0,drawGraph:void 0,drawLegendSymbol:G.drawRectangle,drawTracker:t.prototype.drawTracker,getCenter:a.getCenter,getSymbol:A,isCartesian:!1,noSharedTooltip:!0,pointAttribs:t.prototype.pointAttribs,pointClass:x,requireSorting:!1,searchPoint:A,trackerGroups:["group","dataLabelsGroup"]});I.registerSeriesType("pie",q);"";return q});L(a,"Series/Pie/PieDataLabel.js",[a["Core/Series/DataLabel.js"],
a["Core/Globals.js"],a["Core/Renderer/RendererUtilities.js"],a["Core/Series/SeriesRegistry.js"],a["Core/Utilities.js"]],function(a,t,A,G,x){var u=t.noop,I=A.distribute,z=G.series,q=x.arrayMax,m=x.clamp,h=x.defined,d=x.merge,c=x.pick,l=x.relativeLength,f;(function(f){function p(){var a=this,f=a.data,b=a.chart,g=a.options.dataLabels||{},e=g.connectorPadding,l=b.plotWidth,m=b.plotHeight,p=b.plotLeft,u=Math.round(b.chartWidth/3),r=a.center,t=r[2]/2,w=r[1],B=[[],[]],x=[0,0,0,0],y=a.dataLabelPositioners,
A,C,G,K,L,F,T,N,V,W,X,R;a.visible&&(g.enabled||a._hasPointLabels)&&(f.forEach(function(a){a.dataLabel&&a.visible&&a.dataLabel.shortened&&(a.dataLabel.attr({width:"auto"}).css({width:"auto",textOverflow:"clip"}),a.dataLabel.shortened=!1)}),z.prototype.drawDataLabels.apply(a),f.forEach(function(a){a.dataLabel&&(a.visible?(B[a.half].push(a),a.dataLabel._pos=null,!h(g.style.width)&&!h(a.options.dataLabels&&a.options.dataLabels.style&&a.options.dataLabels.style.width)&&a.dataLabel.getBBox().width>u&&(a.dataLabel.css({width:Math.round(.7*
u)+"px"}),a.dataLabel.shortened=!0)):(a.dataLabel=a.dataLabel.destroy(),a.dataLabels&&1===a.dataLabels.length&&delete a.dataLabels))}),B.forEach(function(d,f){var k=d.length,n=[],q;if(k){a.sortByAngle(d,f-.5);if(0<a.maxLabelDistance){var u=Math.max(0,w-t-a.maxLabelDistance);var v=Math.min(w+t+a.maxLabelDistance,b.plotHeight);d.forEach(function(a){0<a.labelDistance&&a.dataLabel&&(a.top=Math.max(0,w-t-a.labelDistance),a.bottom=Math.min(w+t+a.labelDistance,b.plotHeight),q=a.dataLabel.getBBox().height||
21,a.distributeBox={target:a.labelPosition.natural.y-a.top+q/2,size:q,rank:a.y},n.push(a.distributeBox))});u=v+q-u;I(n,u,u/5)}for(X=0;X<k;X++){A=d[X];F=A.labelPosition;K=A.dataLabel;W=!1===A.visible?"hidden":"inherit";V=u=F.natural.y;n&&h(A.distributeBox)&&("undefined"===typeof A.distributeBox.pos?W="hidden":(T=A.distributeBox.size,V=y.radialDistributionY(A)));delete A.positionIndex;if(g.justify)N=y.justify(A,t,r);else switch(g.alignTo){case "connectors":N=y.alignToConnectors(d,f,l,p);break;case "plotEdges":N=
y.alignToPlotEdges(K,f,l,p);break;default:N=y.radialDistributionX(a,A,V,u)}K._attr={visibility:W,align:F.alignment};R=A.options.dataLabels||{};K._pos={x:N+c(R.x,g.x)+({left:e,right:-e}[F.alignment]||0),y:V+c(R.y,g.y)-10};F.final.x=N;F.final.y=V;c(g.crop,!0)&&(L=K.getBBox().width,u=null,N-L<e&&1===f?(u=Math.round(L-N+e),x[3]=Math.max(u,x[3])):N+L>l-e&&0===f&&(u=Math.round(N+L-l+e),x[1]=Math.max(u,x[1])),0>V-T/2?x[0]=Math.max(Math.round(-V+T/2),x[0]):V+T/2>m&&(x[2]=Math.max(Math.round(V+T/2-m),x[2])),
K.sideOverflow=u)}}}),0===q(x)||this.verifyDataLabelOverflow(x))&&(this.placeDataLabels(),this.points.forEach(function(e){R=d(g,e.options.dataLabels);if(C=c(R.connectorWidth,1)){var f;G=e.connector;if((K=e.dataLabel)&&K._pos&&e.visible&&0<e.labelDistance){W=K._attr.visibility;if(f=!G)e.connector=G=b.renderer.path().addClass("highcharts-data-label-connector  highcharts-color-"+e.colorIndex+(e.className?" "+e.className:"")).add(a.dataLabelsGroup),b.styledMode||G.attr({"stroke-width":C,stroke:R.connectorColor||
e.color||"#666666"});G[f?"attr":"animate"]({d:e.getConnectorPath()});G.attr("visibility",W)}else G&&(e.connector=G.destroy())}}))}function t(){this.points.forEach(function(a){var c=a.dataLabel,b;c&&a.visible&&((b=c._pos)?(c.sideOverflow&&(c._attr.width=Math.max(c.getBBox().width-c.sideOverflow,0),c.css({width:c._attr.width+"px",textOverflow:(this.options.dataLabels.style||{}).textOverflow||"ellipsis"}),c.shortened=!0),c.attr(c._attr),c[c.moved?"animate":"attr"](b),c.moved=!0):c&&c.attr({y:-9999}));
delete a.distributeBox},this)}function r(a){var c=this.center,b=this.options,d=b.center,e=b.minSize||80,f=null!==b.size;if(!f){if(null!==d[0])var h=Math.max(c[2]-Math.max(a[1],a[3]),e);else h=Math.max(c[2]-a[1]-a[3],e),c[0]+=(a[3]-a[1])/2;null!==d[1]?h=m(h,e,c[2]-Math.max(a[0],a[2])):(h=m(h,e,c[2]-a[0]-a[2]),c[1]+=(a[0]-a[2])/2);h<c[2]?(c[2]=h,c[3]=Math.min(l(b.innerSize||0,h),h),this.translate(c),this.drawDataLabels&&this.drawDataLabels()):f=!0}return f}var w=[],B={radialDistributionY:function(a){return a.top+
a.distributeBox.pos},radialDistributionX:function(a,c,b,d){return a.getX(b<c.top+2||b>c.bottom-2?d:b,c.half,c)},justify:function(a,c,b){return b[0]+(a.half?-1:1)*(c+a.labelDistance)},alignToPlotEdges:function(a,c,b,d){a=a.getBBox().width;return c?a+d:b-a-d},alignToConnectors:function(a,c,b,d){var e=0,f;a.forEach(function(a){f=a.dataLabel.getBBox().width;f>e&&(e=f)});return c?e+d:b-e-d}};f.compose=function(c){a.compose(z);-1===w.indexOf(c)&&(w.push(c),c=c.prototype,c.dataLabelPositioners=B,c.alignDataLabel=
u,c.drawDataLabels=p,c.placeDataLabels=t,c.verifyDataLabelOverflow=r)}})(f||(f={}));return f});L(a,"Extensions/OverlappingDataLabels.js",[a["Core/Chart/Chart.js"],a["Core/Utilities.js"]],function(a,t){function u(a,h){var d=!1;if(a){var c=a.newOpacity;a.oldOpacity!==c&&(a.alignAttr&&a.placed?(a[c?"removeClass":"addClass"]("highcharts-data-label-hidden"),d=!0,a.alignAttr.opacity=c,a[a.isOld?"animate":"attr"](a.alignAttr,null,function(){h.styledMode||a.css({pointerEvents:c?"auto":"none"})}),x(h,"afterHideOverlappingLabel")):
a.attr({opacity:c}));a.isOld=!0}return d}var G=t.addEvent,x=t.fireEvent,C=t.isArray,I=t.isNumber,z=t.objectEach,q=t.pick;G(a,"render",function(){var a=this,h=[];(this.labelCollectors||[]).forEach(function(a){h=h.concat(a())});(this.yAxis||[]).forEach(function(a){a.stacking&&a.options.stackLabels&&!a.options.stackLabels.allowOverlap&&z(a.stacking.stacks,function(a){z(a,function(a){a.label&&"hidden"!==a.label.visibility&&h.push(a.label)})})});(this.series||[]).forEach(function(d){var c=d.options.dataLabels;
d.visible&&(!1!==c.enabled||d._hasPointLabels)&&(c=function(c){return c.forEach(function(c){c.visible&&(C(c.dataLabels)?c.dataLabels:c.dataLabel?[c.dataLabel]:[]).forEach(function(d){var f=d.options;d.labelrank=q(f.labelrank,c.labelrank,c.shapeArgs&&c.shapeArgs.height);f.allowOverlap?(d.oldOpacity=d.opacity,d.newOpacity=1,u(d,a)):h.push(d)})})},c(d.nodes||[]),c(d.points))});this.hideOverlappingLabels(h)});a.prototype.hideOverlappingLabels=function(a){var h=this,d=a.length,c=h.renderer,l,f,m,p=!1;
var q=function(a){var d,f=a.box?0:a.padding||0,b=d=0,g;if(a&&(!a.alignAttr||a.placed)){var e=a.alignAttr||{x:a.attr("x"),y:a.attr("y")};var h=a.parentGroup;a.width||(d=a.getBBox(),a.width=d.width,a.height=d.height,d=c.fontMetrics(null,a.element).h);var l=a.width-2*f;(g={left:"0",center:"0.5",right:"1"}[a.alignValue])?b=+g*l:I(a.x)&&Math.round(a.x)!==a.translateX&&(b=a.x-a.translateX);return{x:e.x+(h.translateX||0)+f-(b||0),y:e.y+(h.translateY||0)+f-d,width:a.width-2*f,height:a.height-2*f}}};for(f=
0;f<d;f++)if(l=a[f])l.oldOpacity=l.opacity,l.newOpacity=1,l.absoluteBox=q(l);a.sort(function(a,c){return(c.labelrank||0)-(a.labelrank||0)});for(f=0;f<d;f++){var r=(q=a[f])&&q.absoluteBox;for(l=f+1;l<d;++l){var t=(m=a[l])&&m.absoluteBox;!r||!t||q===m||0===q.newOpacity||0===m.newOpacity||t.x>=r.x+r.width||t.x+t.width<=r.x||t.y>=r.y+r.height||t.y+t.height<=r.y||((q.labelrank<m.labelrank?q:m).newOpacity=0)}}a.forEach(function(a){u(a,h)&&(p=!0)});p&&x(h,"afterHideAllOverlappingLabels")}});L(a,"Core/Responsive.js",
[a["Core/Utilities.js"]],function(a){var u=a.extend,A=a.find,G=a.isArray,x=a.isObject,C=a.merge,I=a.objectEach,z=a.pick,q=a.splat,m=a.uniqueKey,h;(function(a){var c=[];a.compose=function(a){-1===c.indexOf(a)&&(c.push(a),u(a.prototype,d.prototype));return a};var d=function(){function a(){}a.prototype.currentOptions=function(a){function c(a,f,h,k){var b;I(a,function(a,e){if(!k&&-1<d.collectionsWithUpdate.indexOf(e)&&f[e])for(a=q(a),h[e]=[],b=0;b<Math.max(a.length,f[e].length);b++)f[e][b]&&(void 0===
a[b]?h[e][b]=f[e][b]:(h[e][b]={},c(a[b],f[e][b],h[e][b],k+1)));else x(a)?(h[e]=G(a)?[]:{},c(a,f[e]||{},h[e],k+1)):h[e]="undefined"===typeof f[e]?null:f[e]})}var d=this,f={};c(a,this.options,f,0);return f};a.prototype.matchResponsiveRule=function(a,c){var d=a.condition;(d.callback||function(){return this.chartWidth<=z(d.maxWidth,Number.MAX_VALUE)&&this.chartHeight<=z(d.maxHeight,Number.MAX_VALUE)&&this.chartWidth>=z(d.minWidth,0)&&this.chartHeight>=z(d.minHeight,0)}).call(this)&&c.push(a._id)};a.prototype.setResponsive=
function(a,c){var d=this,f=this.options.responsive,h=this.currentResponsive,l=[];!c&&f&&f.rules&&f.rules.forEach(function(a){"undefined"===typeof a._id&&(a._id=m());d.matchResponsiveRule(a,l)},this);c=C.apply(void 0,l.map(function(a){return A((f||{}).rules||[],function(c){return c._id===a})}).map(function(a){return a&&a.chartOptions}));c.isResponsiveOptions=!0;l=l.toString()||void 0;l!==(h&&h.ruleIds)&&(h&&this.update(h.undoOptions,a,!0),l?(h=this.currentOptions(c),h.isResponsiveOptions=!0,this.currentResponsive=
{ruleIds:l,mergedOptions:c,undoOptions:h},this.update(c,a,!0)):this.currentResponsive=void 0)};return a}()})(h||(h={}));"";"";return h});L(a,"masters/highcharts.src.js",[a["Core/Globals.js"],a["Core/Utilities.js"],a["Core/DefaultOptions.js"],a["Core/Animation/Fx.js"],a["Core/Animation/AnimationUtilities.js"],a["Core/Renderer/HTML/AST.js"],a["Core/FormatUtilities.js"],a["Core/Renderer/RendererUtilities.js"],a["Core/Renderer/SVG/SVGElement.js"],a["Core/Renderer/SVG/SVGRenderer.js"],a["Core/Renderer/HTML/HTMLElement.js"],
a["Core/Renderer/HTML/HTMLRenderer.js"],a["Core/Axis/Axis.js"],a["Core/Axis/DateTimeAxis.js"],a["Core/Axis/LogarithmicAxis.js"],a["Core/Axis/PlotLineOrBand/PlotLineOrBand.js"],a["Core/Axis/Tick.js"],a["Core/Tooltip.js"],a["Core/Series/Point.js"],a["Core/Pointer.js"],a["Core/MSPointer.js"],a["Core/Legend/Legend.js"],a["Core/Chart/Chart.js"],a["Core/Series/Series.js"],a["Core/Series/SeriesRegistry.js"],a["Series/Column/ColumnSeries.js"],a["Series/Column/ColumnDataLabel.js"],a["Series/Pie/PieSeries.js"],
a["Series/Pie/PieDataLabel.js"],a["Core/Series/DataLabel.js"],a["Core/Responsive.js"],a["Core/Color/Color.js"],a["Core/Time.js"]],function(a,t,A,G,x,C,I,z,q,m,h,d,c,l,f,w,p,K,r,y,B,n,k,b,g,e,D,H,v,E,L,S,P){a.animate=x.animate;a.animObject=x.animObject;a.getDeferredAnimation=x.getDeferredAnimation;a.setAnimation=x.setAnimation;a.stop=x.stop;a.timers=G.timers;a.AST=C;a.Axis=c;a.Chart=k;a.chart=k.chart;a.Fx=G;a.Legend=n;a.PlotLineOrBand=w;a.Point=r;a.Pointer=B.isRequired()?B:y;a.Series=b;a.SVGElement=
q;a.SVGRenderer=m;a.Tick=p;a.Time=P;a.Tooltip=K;a.Color=S;a.color=S.parse;d.compose(m);h.compose(q);a.defaultOptions=A.defaultOptions;a.getOptions=A.getOptions;a.time=A.defaultTime;a.setOptions=A.setOptions;a.dateFormat=I.dateFormat;a.format=I.format;a.numberFormat=I.numberFormat;a.addEvent=t.addEvent;a.arrayMax=t.arrayMax;a.arrayMin=t.arrayMin;a.attr=t.attr;a.clearTimeout=t.clearTimeout;a.correctFloat=t.correctFloat;a.createElement=t.createElement;a.css=t.css;a.defined=t.defined;a.destroyObjectProperties=
t.destroyObjectProperties;a.discardElement=t.discardElement;a.distribute=z.distribute;a.erase=t.erase;a.error=t.error;a.extend=t.extend;a.extendClass=t.extendClass;a.find=t.find;a.fireEvent=t.fireEvent;a.getMagnitude=t.getMagnitude;a.getStyle=t.getStyle;a.inArray=t.inArray;a.isArray=t.isArray;a.isClass=t.isClass;a.isDOMElement=t.isDOMElement;a.isFunction=t.isFunction;a.isNumber=t.isNumber;a.isObject=t.isObject;a.isString=t.isString;a.keys=t.keys;a.merge=t.merge;a.normalizeTickInterval=t.normalizeTickInterval;
a.objectEach=t.objectEach;a.offset=t.offset;a.pad=t.pad;a.pick=t.pick;a.pInt=t.pInt;a.relativeLength=t.relativeLength;a.removeEvent=t.removeEvent;a.seriesType=g.seriesType;a.splat=t.splat;a.stableSort=t.stableSort;a.syncTimeout=t.syncTimeout;a.timeUnits=t.timeUnits;a.uniqueKey=t.uniqueKey;a.useSerialIds=t.useSerialIds;a.wrap=t.wrap;D.compose(e);E.compose(b);l.compose(c);f.compose(c);v.compose(H);w.compose(c);L.compose(k);return a});a["masters/highcharts.src.js"]._modules=a;return a["masters/highcharts.src.js"]});

/*!
 * imagesLoaded PACKAGED v3.1.4
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */


/*!
 * EventEmitter v4.2.6 - git.io/ee
 * Oliver Caldwell
 * MIT license
 * @preserve
 */


(function () {
	

	/**
	 * Class for managing events.
	 * Can be extended to provide event functionality in other classes.
	 *
	 * @class EventEmitter Manages event registering and emitting.
	 */
	function EventEmitter() {}

	// Shortcuts to improve speed and size
	var proto = EventEmitter.prototype;
	var exports = this;
	var originalGlobalValue = exports.EventEmitter;

	/**
	 * Finds the index of the listener for the event in it's storage array.
	 *
	 * @param {Function[]} listeners Array of listeners to search through.
	 * @param {Function} listener Method to look for.
	 * @return {Number} Index of the specified listener, -1 if not found
	 * @api private
	 */
	function indexOfListener(listeners, listener) {
		var i = listeners.length;
		while (i--) {
			if (listeners[i].listener === listener) {
				return i;
			}
		}

		return -1;
	}

	/**
	 * Alias a method while keeping the context correct, to allow for overwriting of target method.
	 *
	 * @param {String} name The name of the target method.
	 * @return {Function} The aliased method
	 * @api private
	 */
	function alias(name) {
		return function aliasClosure() {
			return this[name].apply(this, arguments);
		};
	}

	/**
	 * Returns the listener array for the specified event.
	 * Will initialise the event object and listener arrays if required.
	 * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
	 * Each property in the object response is an array of listener functions.
	 *
	 * @param {String|RegExp} evt Name of the event to return the listeners from.
	 * @return {Function[]|Object} All listener functions for the event.
	 */
	proto.getListeners = function getListeners(evt) {
		var events = this._getEvents();
		var response;
		var key;

		// Return a concatenated array of all matching events if
		// the selector is a regular expression.
		if (typeof evt === 'object') {
			response = {};
			for (key in events) {
				if (events.hasOwnProperty(key) && evt.test(key)) {
					response[key] = events[key];
				}
			}
		}
		else {
			response = events[evt] || (events[evt] = []);
		}

		return response;
	};

	/**
	 * Takes a list of listener objects and flattens it into a list of listener functions.
	 *
	 * @param {Object[]} listeners Raw listener objects.
	 * @return {Function[]} Just the listener functions.
	 */
	proto.flattenListeners = function flattenListeners(listeners) {
		var flatListeners = [];
		var i;

		for (i = 0; i < listeners.length; i += 1) {
			flatListeners.push(listeners[i].listener);
		}

		return flatListeners;
	};

	/**
	 * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
	 *
	 * @param {String|RegExp} evt Name of the event to return the listeners from.
	 * @return {Object} All listener functions for an event in an object.
	 */
	proto.getListenersAsObject = function getListenersAsObject(evt) {
		var listeners = this.getListeners(evt);
		var response;

		if (listeners instanceof Array) {
			response = {};
			response[evt] = listeners;
		}

		return response || listeners;
	};

	/**
	 * Adds a listener function to the specified event.
	 * The listener will not be added if it is a duplicate.
	 * If the listener returns true then it will be removed after it is called.
	 * If you pass a regular expression as the event name then the listener will be added to all events that match it.
	 *
	 * @param {String|RegExp} evt Name of the event to attach the listener to.
	 * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.addListener = function addListener(evt, listener) {
		var listeners = this.getListenersAsObject(evt);
		var listenerIsWrapped = typeof listener === 'object';
		var key;

		for (key in listeners) {
			if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
				listeners[key].push(listenerIsWrapped ? listener : {
					listener: listener,
					once: false
				});
			}
		}

		return this;
	};

	/**
	 * Alias of addListener
	 */
	proto.on = alias('addListener');

	/**
	 * Semi-alias of addListener. It will add a listener that will be
	 * automatically removed after it's first execution.
	 *
	 * @param {String|RegExp} evt Name of the event to attach the listener to.
	 * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.addOnceListener = function addOnceListener(evt, listener) {
		return this.addListener(evt, {
			listener: listener,
			once: true
		});
	};

	/**
	 * Alias of addOnceListener.
	 */
	proto.once = alias('addOnceListener');

	/**
	 * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
	 * You need to tell it what event names should be matched by a regex.
	 *
	 * @param {String} evt Name of the event to create.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.defineEvent = function defineEvent(evt) {
		this.getListeners(evt);
		return this;
	};

	/**
	 * Uses defineEvent to define multiple events.
	 *
	 * @param {String[]} evts An array of event names to define.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.defineEvents = function defineEvents(evts) {
		for (var i = 0; i < evts.length; i += 1) {
			this.defineEvent(evts[i]);
		}
		return this;
	};

	/**
	 * Removes a listener function from the specified event.
	 * When passed a regular expression as the event name, it will remove the listener from all events that match it.
	 *
	 * @param {String|RegExp} evt Name of the event to remove the listener from.
	 * @param {Function} listener Method to remove from the event.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.removeListener = function removeListener(evt, listener) {
		var listeners = this.getListenersAsObject(evt);
		var index;
		var key;

		for (key in listeners) {
			if (listeners.hasOwnProperty(key)) {
				index = indexOfListener(listeners[key], listener);

				if (index !== -1) {
					listeners[key].splice(index, 1);
				}
			}
		}

		return this;
	};

	/**
	 * Alias of removeListener
	 */
	proto.off = alias('removeListener');

	/**
	 * Adds listeners in bulk using the manipulateListeners method.
	 * If you pass an object as the second argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
	 * You can also pass it a regular expression to add the array of listeners to all events that match it.
	 * Yeah, this function does quite a bit. That's probably a bad thing.
	 *
	 * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
	 * @param {Function[]} [listeners] An optional array of listener functions to add.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.addListeners = function addListeners(evt, listeners) {
		// Pass through to manipulateListeners
		return this.manipulateListeners(false, evt, listeners);
	};

	/**
	 * Removes listeners in bulk using the manipulateListeners method.
	 * If you pass an object as the second argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
	 * You can also pass it an event name and an array of listeners to be removed.
	 * You can also pass it a regular expression to remove the listeners from all events that match it.
	 *
	 * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
	 * @param {Function[]} [listeners] An optional array of listener functions to remove.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.removeListeners = function removeListeners(evt, listeners) {
		// Pass through to manipulateListeners
		return this.manipulateListeners(true, evt, listeners);
	};

	/**
	 * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
	 * The first argument will determine if the listeners are removed (true) or added (false).
	 * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
	 * You can also pass it an event name and an array of listeners to be added/removed.
	 * You can also pass it a regular expression to manipulate the listeners of all events that match it.
	 *
	 * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
	 * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
	 * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
		var i;
		var value;
		var single = remove ? this.removeListener : this.addListener;
		var multiple = remove ? this.removeListeners : this.addListeners;

		// If evt is an object then pass each of it's properties to this method
		if (typeof evt === 'object' && !(evt instanceof RegExp)) {
			for (i in evt) {
				if (evt.hasOwnProperty(i) && (value = evt[i])) {
					// Pass the single listener straight through to the singular method
					if (typeof value === 'function') {
						single.call(this, i, value);
					}
					else {
						// Otherwise pass back to the multiple function
						multiple.call(this, i, value);
					}
				}
			}
		}
		else {
			// So evt must be a string
			// And listeners must be an array of listeners
			// Loop over it and pass each one to the multiple method
			i = listeners.length;
			while (i--) {
				single.call(this, evt, listeners[i]);
			}
		}

		return this;
	};

	/**
	 * Removes all listeners from a specified event.
	 * If you do not specify an event then all listeners will be removed.
	 * That means every event will be emptied.
	 * You can also pass a regex to remove all events that match it.
	 *
	 * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.removeEvent = function removeEvent(evt) {
		var type = typeof evt;
		var events = this._getEvents();
		var key;

		// Remove different things depending on the state of evt
		if (type === 'string') {
			// Remove all listeners for the specified event
			delete events[evt];
		}
		else if (type === 'object') {
			// Remove all events matching the regex.
			for (key in events) {
				if (events.hasOwnProperty(key) && evt.test(key)) {
					delete events[key];
				}
			}
		}
		else {
			// Remove all listeners in all events
			delete this._events;
		}

		return this;
	};

	/**
	 * Alias of removeEvent.
	 *
	 * Added to mirror the node API.
	 */
	proto.removeAllListeners = alias('removeEvent');

	/**
	 * Emits an event of your choice.
	 * When emitted, every listener attached to that event will be executed.
	 * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
	 * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
	 * So they will not arrive within the array on the other side, they will be separate.
	 * You can also pass a regular expression to emit to all events that match it.
	 *
	 * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
	 * @param {Array} [args] Optional array of arguments to be passed to each listener.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.emitEvent = function emitEvent(evt, args) {
		var listeners = this.getListenersAsObject(evt);
		var listener;
		var i;
		var key;
		var response;

		for (key in listeners) {
			if (listeners.hasOwnProperty(key)) {
				i = listeners[key].length;

				while (i--) {
					// If the listener returns true then it shall be removed from the event
					// The function is executed either with a basic call or an apply if there is an args array
					listener = listeners[key][i];

					if (listener.once === true) {
						this.removeListener(evt, listener.listener);
					}

					response = listener.listener.apply(this, args || []);

					if (response === this._getOnceReturnValue()) {
						this.removeListener(evt, listener.listener);
					}
				}
			}
		}

		return this;
	};

	/**
	 * Alias of emitEvent
	 */
	proto.trigger = alias('emitEvent');

	/**
	 * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
	 * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
	 *
	 * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
	 * @param {...*} Optional additional arguments to be passed to each listener.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.emit = function emit(evt) {
		var args = Array.prototype.slice.call(arguments, 1);
		return this.emitEvent(evt, args);
	};

	/**
	 * Sets the current value to check against when executing listeners. If a
	 * listeners return value matches the one set here then it will be removed
	 * after execution. This value defaults to true.
	 *
	 * @param {*} value The new value to check for when executing listeners.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.setOnceReturnValue = function setOnceReturnValue(value) {
		this._onceReturnValue = value;
		return this;
	};

	/**
	 * Fetches the current value to check against when executing listeners. If
	 * the listeners return value matches this one then it should be removed
	 * automatically. It will return true by default.
	 *
	 * @return {*|Boolean} The current value to check for or the default, true.
	 * @api private
	 */
	proto._getOnceReturnValue = function _getOnceReturnValue() {
		if (this.hasOwnProperty('_onceReturnValue')) {
			return this._onceReturnValue;
		}
		else {
			return true;
		}
	};

	/**
	 * Fetches the events object and creates one if required.
	 *
	 * @return {Object} The events storage object.
	 * @api private
	 */
	proto._getEvents = function _getEvents() {
		return this._events || (this._events = {});
	};

	/**
	 * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
	 *
	 * @return {Function} Non conflicting EventEmitter class.
	 */
	EventEmitter.noConflict = function noConflict() {
		exports.EventEmitter = originalGlobalValue;
		return EventEmitter;
	};

	// Expose the class either via AMD, CommonJS or the global object
	if (typeof define === 'function' && define.amd) {
		define('eventEmitter/EventEmitter',[],function () {
			return EventEmitter;
		});
	}
	else if (typeof module === 'object' && module.exports){
		module.exports = EventEmitter;
	}
	else {
		this.EventEmitter = EventEmitter;
	}
}.call(this));

/*!
 * eventie v1.0.4
 * event binding helper
 *   eventie.bind( elem, 'click', myFn )
 *   eventie.unbind( elem, 'click', myFn )
 */

/*jshint browser: true, undef: true, unused: true */
/*global define: false */

( function( window ) {



var docElem = document.documentElement;

var bind = function() {};

function getIEEvent( obj ) {
  var event = window.event;
  // add event.target
  event.target = event.target || event.srcElement || obj;
  return event;
}

if ( docElem.addEventListener ) {
  bind = function( obj, type, fn ) {
    obj.addEventListener( type, fn, false );
  };
} else if ( docElem.attachEvent ) {
  bind = function( obj, type, fn ) {
    obj[ type + fn ] = fn.handleEvent ?
      function() {
        var event = getIEEvent( obj );
        fn.handleEvent.call( fn, event );
      } :
      function() {
        var event = getIEEvent( obj );
        fn.call( obj, event );
      };
    obj.attachEvent( "on" + type, obj[ type + fn ] );
  };
}

var unbind = function() {};

if ( docElem.removeEventListener ) {
  unbind = function( obj, type, fn ) {
    obj.removeEventListener( type, fn, false );
  };
} else if ( docElem.detachEvent ) {
  unbind = function( obj, type, fn ) {
    obj.detachEvent( "on" + type, obj[ type + fn ] );
    try {
      delete obj[ type + fn ];
    } catch ( err ) {
      // can't delete window object properties
      obj[ type + fn ] = undefined;
    }
  };
}

var eventie = {
  bind: bind,
  unbind: unbind
};

// transport
if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( 'eventie/eventie',eventie );
} else {
  // browser global
  window.eventie = eventie;
}

})( this );

/*!
 * imagesLoaded v3.1.4
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

( function( window, factory ) { 
  // universal module definition

  /*global define: false, module: false, require: false */

  if ( typeof define === 'function' && define.amd ) {
    // AMD
    define( [
      'eventEmitter/EventEmitter',
      'eventie/eventie'
    ], function( EventEmitter, eventie ) {
      return factory( window, EventEmitter, eventie );
    });
  } else if ( typeof exports === 'object' ) {
    // CommonJS
    module.exports = factory(
      window,
      require('eventEmitter'),
      require('eventie')
    );
  } else {
    // browser global
    window.imagesLoaded = factory(
      window,
      window.EventEmitter,
      window.eventie
    );
  }

})( this,

// --------------------------  factory -------------------------- //

function factory( window, EventEmitter, eventie ) {



var $ = window.jQuery;
var console = window.console;
var hasConsole = typeof console !== 'undefined';

// -------------------------- helpers -------------------------- //

// extend objects
function extend( a, b ) {
  for ( var prop in b ) {
    a[ prop ] = b[ prop ];
  }
  return a;
}

var objToString = Object.prototype.toString;
function isArray( obj ) {
  return objToString.call( obj ) === '[object Array]';
}

// turn element or nodeList into an array
function makeArray( obj ) {
  var ary = [];
  if ( isArray( obj ) ) {
    // use object if already an array
    ary = obj;
  } else if ( typeof obj.length === 'number' ) {
    // convert nodeList to array
    for ( var i=0, len = obj.length; i < len; i++ ) {
      ary.push( obj[i] );
    }
  } else {
    // array of single index
    ary.push( obj );
  }
  return ary;
}

  // -------------------------- imagesLoaded -------------------------- //

  /**
   * @param {Array, Element, NodeList, String} elem
   * @param {Object or Function} options - if function, use as callback
   * @param {Function} onAlways - callback function
   */
  function ImagesLoaded( elem, options, onAlways ) {
    // coerce ImagesLoaded() without new, to be new ImagesLoaded()
    if ( !( this instanceof ImagesLoaded ) ) {
      return new ImagesLoaded( elem, options );
    }
    // use elem as selector string
    if ( typeof elem === 'string' ) {
      elem = document.querySelectorAll( elem );
    }

    this.elements = makeArray( elem );
    this.options = extend( {}, this.options );

    if ( typeof options === 'function' ) {
      onAlways = options;
    } else {
      extend( this.options, options );
    }

    if ( onAlways ) {
      this.on( 'always', onAlways );
    }

    this.getImages();

    if ( $ ) {
      // add jQuery Deferred object
      this.jqDeferred = new $.Deferred();
    }

    // HACK check async to allow time to bind listeners
    var _this = this;
    setTimeout( function() {
      _this.check();
    });
  }

  ImagesLoaded.prototype = new EventEmitter();

  ImagesLoaded.prototype.options = {};

  ImagesLoaded.prototype.getImages = function() {
    this.images = [];

    // filter & find items if we have an item selector
    for ( var i=0, len = this.elements.length; i < len; i++ ) {
      var elem = this.elements[i];
      // filter siblings
      if ( elem.nodeName === 'IMG' ) {
        this.addImage( elem );
      }
      // find children
      var childElems = elem.querySelectorAll('img');
      // concat childElems to filterFound array
      for ( var j=0, jLen = childElems.length; j < jLen; j++ ) {
        var img = childElems[j];
        this.addImage( img );
      }
    }
  };

  /**
   * @param {Image} img
   */
  ImagesLoaded.prototype.addImage = function( img ) {
    var loadingImage = new LoadingImage( img );
    this.images.push( loadingImage );
  };

  ImagesLoaded.prototype.check = function() {
    var _this = this;
    var checkedCount = 0;
    var length = this.images.length;
    this.hasAnyBroken = false;
    // complete if no images
    if ( !length ) {
      this.complete();
      return;
    }

    function onConfirm( image, message ) {
      if ( _this.options.debug && hasConsole ) {
        console.log( 'confirm', image, message );
      }

      _this.progress( image );
      checkedCount++;
      if ( checkedCount === length ) {
        _this.complete();
      }
      return true; // bind once
    }

    for ( var i=0; i < length; i++ ) {
      var loadingImage = this.images[i];
      loadingImage.on( 'confirm', onConfirm );
      loadingImage.check();
    }
  };

  ImagesLoaded.prototype.progress = function( image ) {
    this.hasAnyBroken = this.hasAnyBroken || !image.isLoaded;
    // HACK - Chrome triggers event before object properties have changed. #83
    var _this = this;
    setTimeout( function() {
      _this.emit( 'progress', _this, image );
      if ( _this.jqDeferred && _this.jqDeferred.notify ) {
        _this.jqDeferred.notify( _this, image );
      }
    });
  };

  ImagesLoaded.prototype.complete = function() {
    var eventName = this.hasAnyBroken ? 'fail' : 'done';
    this.isComplete = true;
    var _this = this;
    // HACK - another setTimeout so that confirm happens after progress
    setTimeout( function() {
      _this.emit( eventName, _this );
      _this.emit( 'always', _this );
      if ( _this.jqDeferred ) {
        var jqMethod = _this.hasAnyBroken ? 'reject' : 'resolve';
        _this.jqDeferred[ jqMethod ]( _this );
      }
    });
  };

  // -------------------------- jquery -------------------------- //

  if ( $ ) {
    $.fn.imagesLoaded = function( options, callback ) {
      var instance = new ImagesLoaded( this, options, callback );
      return instance.jqDeferred.promise( $(this) );
    };
  }


  // --------------------------  -------------------------- //

  function LoadingImage( img ) {
    this.img = img;
  }

  LoadingImage.prototype = new EventEmitter();

  LoadingImage.prototype.check = function() {
    // first check cached any previous images that have same src
    var resource = cache[ this.img.src ] || new Resource( this.img.src );
    if ( resource.isConfirmed ) {
      this.confirm( resource.isLoaded, 'cached was confirmed' );
      return;
    }

    // If complete is true and browser supports natural sizes,
    // try to check for image status manually.
    if ( this.img.complete && this.img.naturalWidth !== undefined ) {
      // report based on naturalWidth
      this.confirm( this.img.naturalWidth !== 0, 'naturalWidth' );
      return;
    }

    // If none of the checks above matched, simulate loading on detached element.
    var _this = this;
    resource.on( 'confirm', function( resrc, message ) {
      _this.confirm( resrc.isLoaded, message );
      return true;
    });

    resource.check();
  };

  LoadingImage.prototype.confirm = function( isLoaded, message ) {
    this.isLoaded = isLoaded;
    this.emit( 'confirm', this, message );
  };

  // -------------------------- Resource -------------------------- //

  // Resource checks each src, only once
  // separate class from LoadingImage to prevent memory leaks. See #115

  var cache = {};

  function Resource( src ) {
    this.src = src;
    // add to cache
    cache[ src ] = this;
  }

  Resource.prototype = new EventEmitter();

  Resource.prototype.check = function() {
    // only trigger checking once
    if ( this.isChecked ) {
      return;
    }
    // simulate loading on detached element
    var proxyImage = new Image();
    eventie.bind( proxyImage, 'load', this );
    eventie.bind( proxyImage, 'error', this );
    proxyImage.src = this.src;
    // set flag
    this.isChecked = true;
  };

  // ----- events ----- //

  // trigger specified handler for event type
  Resource.prototype.handleEvent = function( event ) {
    var method = 'on' + event.type;
    if ( this[ method ] ) {
      this[ method ]( event );
    }
  };

  Resource.prototype.onload = function( event ) {
    this.confirm( true, 'onload' );
    this.unbindProxyEvents( event );
  };

  Resource.prototype.onerror = function( event ) {
    this.confirm( false, 'onerror' );
    this.unbindProxyEvents( event );
  };

  // ----- confirm ----- //

  Resource.prototype.confirm = function( isLoaded, message ) {
    this.isConfirmed = true;
    this.isLoaded = isLoaded;
    this.emit( 'confirm', this, message );
  };

  Resource.prototype.unbindProxyEvents = function( event ) {
    eventie.unbind( event.target, 'load', this );
    eventie.unbind( event.target, 'error', this );
  };

  // -----  ----- //

  return ImagesLoaded;

});
/*!
 * Masonry PACKAGED v3.1.4
 * Cascading grid layout library
 * http://masonry.desandro.com
 * MIT License
 * by David DeSandro
 */


/**
 * Bridget makes jQuery widgets
 * v1.0.1
 */


( function( window ) {



// -------------------------- utils -------------------------- //

var slice = Array.prototype.slice;

function noop() {}

// -------------------------- definition -------------------------- //

function defineBridget( $ ) {

// bail if no jQuery
if ( !$ ) {
  return;
}

// -------------------------- addOptionMethod -------------------------- //

/**
 * adds option method -> $().plugin('option', {...})
 * @param {Function} PluginClass - constructor class
 */
function addOptionMethod( PluginClass ) {
  // don't overwrite original option method
  if ( PluginClass.prototype.option ) {
    return;
  }

  // option setter
  PluginClass.prototype.option = function( opts ) {
    // bail out if not an object
    if ( !$.isPlainObject( opts ) ){
      return;
    }
    this.options = $.extend( true, this.options, opts );
  };
}


// -------------------------- plugin bridge -------------------------- //

// helper function for logging errors
// $.error breaks jQuery chaining
var logError = typeof console === 'undefined' ? noop :
  function( message ) {
    console.error( message );
  };

/**
 * jQuery plugin bridge, access methods like $elem.plugin('method')
 * @param {String} namespace - plugin name
 * @param {Function} PluginClass - constructor class
 */
function bridge( namespace, PluginClass ) {
  // add to jQuery fn namespace
  $.fn[ namespace ] = function( options ) {
    if ( typeof options === 'string' ) {
      // call plugin method when first argument is a string
      // get arguments for method
      var args = slice.call( arguments, 1 );

      for ( var i=0, len = this.length; i < len; i++ ) {
        var elem = this[i];
        var instance = $.data( elem, namespace );
        if ( !instance ) {
          logError( "cannot call methods on " + namespace + " prior to initialization; " +
            "attempted to call '" + options + "'" );
          continue;
        }
        if ( !$.isFunction( instance[options] ) || options.charAt(0) === '_' ) {
          logError( "no such method '" + options + "' for " + namespace + " instance" );
          continue;
        }

        // trigger method with arguments
        var returnValue = instance[ options ].apply( instance, args );

        // break look and return first value if provided
        if ( returnValue !== undefined ) {
          return returnValue;
        }
      }
      // return this if no return value
      return this;
    } else {
      return this.each( function() {
        var instance = $.data( this, namespace );
        if ( instance ) {
          // apply options & init
          instance.option( options );
          instance._init();
        } else {
          // initialize new instance
          instance = new PluginClass( this, options );
          $.data( this, namespace, instance );
        }
      });
    }
  };

}

// -------------------------- bridget -------------------------- //

/**
 * converts a Prototypical class into a proper jQuery plugin
 *   the class must have a ._init method
 * @param {String} namespace - plugin name, used in $().pluginName
 * @param {Function} PluginClass - constructor class
 */
$.bridget = function( namespace, PluginClass ) {
  addOptionMethod( PluginClass );
  bridge( namespace, PluginClass );
};

return $.bridget;

}

// transport
if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( 'jquery-bridget/jquery.bridget',[ 'jquery' ], defineBridget );
} else {
  // get jquery from browser global
  defineBridget( window.jQuery );
}

})( window );

/*!
 * eventie v1.0.5
 * event binding helper
 *   eventie.bind( elem, 'click', myFn )
 *   eventie.unbind( elem, 'click', myFn )
 * MIT license
 */

/*jshint browser: true, undef: true, unused: true */
/*global define: false, module: false */

( function( window ) {



var docElem = document.documentElement;

var bind = function() {};

function getIEEvent( obj ) {
  var event = window.event;
  // add event.target
  event.target = event.target || event.srcElement || obj;
  return event;
}

if ( docElem.addEventListener ) {
  bind = function( obj, type, fn ) {
    obj.addEventListener( type, fn, false );
  };
} else if ( docElem.attachEvent ) {
  bind = function( obj, type, fn ) {
    obj[ type + fn ] = fn.handleEvent ?
      function() {
        var event = getIEEvent( obj );
        fn.handleEvent.call( fn, event );
      } :
      function() {
        var event = getIEEvent( obj );
        fn.call( obj, event );
      };
    obj.attachEvent( "on" + type, obj[ type + fn ] );
  };
}

var unbind = function() {};

if ( docElem.removeEventListener ) {
  unbind = function( obj, type, fn ) {
    obj.removeEventListener( type, fn, false );
  };
} else if ( docElem.detachEvent ) {
  unbind = function( obj, type, fn ) {
    obj.detachEvent( "on" + type, obj[ type + fn ] );
    try {
      delete obj[ type + fn ];
    } catch ( err ) {
      // can't delete window object properties
      obj[ type + fn ] = undefined;
    }
  };
}

var eventie = {
  bind: bind,
  unbind: unbind
};

// ----- module definition ----- //

if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( 'eventie/eventie',eventie );
} else if ( typeof exports === 'object' ) {
  // CommonJS
  module.exports = eventie;
} else {
  // browser global
  window.eventie = eventie;
}

})( this );

/*!
 * docReady
 * Cross browser DOMContentLoaded event emitter
 */

/*jshint browser: true, strict: true, undef: true, unused: true*/
/*global define: false */

( function( window ) {



var document = window.document;
// collection of functions to be triggered on ready
var queue = [];

function docReady( fn ) {
  // throw out non-functions
  if ( typeof fn !== 'function' ) {
    return;
  }

  if ( docReady.isReady ) {
    // ready now, hit it
    fn();
  } else {
    // queue function when ready
    queue.push( fn );
  }
}

docReady.isReady = false;

// triggered on various doc ready events
function init( event ) {
  // bail if IE8 document is not ready just yet
  var isIE8NotReady = event.type === 'readystatechange' && document.readyState !== 'complete';
  if ( docReady.isReady || isIE8NotReady ) {
    return;
  }
  docReady.isReady = true;

  // process queue
  for ( var i=0, len = queue.length; i < len; i++ ) {
    var fn = queue[i];
    fn();
  }
}

function defineDocReady( eventie ) {
  eventie.bind( document, 'DOMContentLoaded', init );
  eventie.bind( document, 'readystatechange', init );
  eventie.bind( window, 'load', init );

  return docReady;
}

// transport
if ( typeof define === 'function' && define.amd ) {
  // AMD
  // if RequireJS, then doc is already ready
  docReady.isReady = typeof requirejs === 'function';
  define( 'doc-ready/doc-ready',[ 'eventie/eventie' ], defineDocReady );
} else {
  // browser global
  window.docReady = defineDocReady( window.eventie );
}

})( this );

/*!
 * EventEmitter v4.2.7 - git.io/ee
 * Oliver Caldwell
 * MIT license
 * @preserve
 */

(function () {
	

	/**
	 * Class for managing events.
	 * Can be extended to provide event functionality in other classes.
	 *
	 * @class EventEmitter Manages event registering and emitting.
	 */
	function EventEmitter() {}

	// Shortcuts to improve speed and size
	var proto = EventEmitter.prototype;
	var exports = this;
	var originalGlobalValue = exports.EventEmitter;

	/**
	 * Finds the index of the listener for the event in it's storage array.
	 *
	 * @param {Function[]} listeners Array of listeners to search through.
	 * @param {Function} listener Method to look for.
	 * @return {Number} Index of the specified listener, -1 if not found
	 * @api private
	 */
	function indexOfListener(listeners, listener) {
		var i = listeners.length;
		while (i--) {
			if (listeners[i].listener === listener) {
				return i;
			}
		}

		return -1;
	}

	/**
	 * Alias a method while keeping the context correct, to allow for overwriting of target method.
	 *
	 * @param {String} name The name of the target method.
	 * @return {Function} The aliased method
	 * @api private
	 */
	function alias(name) {
		return function aliasClosure() {
			return this[name].apply(this, arguments);
		};
	}

	/**
	 * Returns the listener array for the specified event.
	 * Will initialise the event object and listener arrays if required.
	 * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
	 * Each property in the object response is an array of listener functions.
	 *
	 * @param {String|RegExp} evt Name of the event to return the listeners from.
	 * @return {Function[]|Object} All listener functions for the event.
	 */
	proto.getListeners = function getListeners(evt) {
		var events = this._getEvents();
		var response;
		var key;

		// Return a concatenated array of all matching events if
		// the selector is a regular expression.
		if (evt instanceof RegExp) {
			response = {};
			for (key in events) {
				if (events.hasOwnProperty(key) && evt.test(key)) {
					response[key] = events[key];
				}
			}
		}
		else {
			response = events[evt] || (events[evt] = []);
		}

		return response;
	};

	/**
	 * Takes a list of listener objects and flattens it into a list of listener functions.
	 *
	 * @param {Object[]} listeners Raw listener objects.
	 * @return {Function[]} Just the listener functions.
	 */
	proto.flattenListeners = function flattenListeners(listeners) {
		var flatListeners = [];
		var i;

		for (i = 0; i < listeners.length; i += 1) {
			flatListeners.push(listeners[i].listener);
		}

		return flatListeners;
	};

	/**
	 * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
	 *
	 * @param {String|RegExp} evt Name of the event to return the listeners from.
	 * @return {Object} All listener functions for an event in an object.
	 */
	proto.getListenersAsObject = function getListenersAsObject(evt) {
		var listeners = this.getListeners(evt);
		var response;

		if (listeners instanceof Array) {
			response = {};
			response[evt] = listeners;
		}

		return response || listeners;
	};

	/**
	 * Adds a listener function to the specified event.
	 * The listener will not be added if it is a duplicate.
	 * If the listener returns true then it will be removed after it is called.
	 * If you pass a regular expression as the event name then the listener will be added to all events that match it.
	 *
	 * @param {String|RegExp} evt Name of the event to attach the listener to.
	 * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.addListener = function addListener(evt, listener) {
		var listeners = this.getListenersAsObject(evt);
		var listenerIsWrapped = typeof listener === 'object';
		var key;

		for (key in listeners) {
			if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
				listeners[key].push(listenerIsWrapped ? listener : {
					listener: listener,
					once: false
				});
			}
		}

		return this;
	};

	/**
	 * Alias of addListener
	 */
	proto.on = alias('addListener');

	/**
	 * Semi-alias of addListener. It will add a listener that will be
	 * automatically removed after it's first execution.
	 *
	 * @param {String|RegExp} evt Name of the event to attach the listener to.
	 * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.addOnceListener = function addOnceListener(evt, listener) {
		return this.addListener(evt, {
			listener: listener,
			once: true
		});
	};

	/**
	 * Alias of addOnceListener.
	 */
	proto.once = alias('addOnceListener');

	/**
	 * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
	 * You need to tell it what event names should be matched by a regex.
	 *
	 * @param {String} evt Name of the event to create.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.defineEvent = function defineEvent(evt) {
		this.getListeners(evt);
		return this;
	};

	/**
	 * Uses defineEvent to define multiple events.
	 *
	 * @param {String[]} evts An array of event names to define.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.defineEvents = function defineEvents(evts) {
		for (var i = 0; i < evts.length; i += 1) {
			this.defineEvent(evts[i]);
		}
		return this;
	};

	/**
	 * Removes a listener function from the specified event.
	 * When passed a regular expression as the event name, it will remove the listener from all events that match it.
	 *
	 * @param {String|RegExp} evt Name of the event to remove the listener from.
	 * @param {Function} listener Method to remove from the event.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.removeListener = function removeListener(evt, listener) {
		var listeners = this.getListenersAsObject(evt);
		var index;
		var key;

		for (key in listeners) {
			if (listeners.hasOwnProperty(key)) {
				index = indexOfListener(listeners[key], listener);

				if (index !== -1) {
					listeners[key].splice(index, 1);
				}
			}
		}

		return this;
	};

	/**
	 * Alias of removeListener
	 */
	proto.off = alias('removeListener');

	/**
	 * Adds listeners in bulk using the manipulateListeners method.
	 * If you pass an object as the second argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
	 * You can also pass it a regular expression to add the array of listeners to all events that match it.
	 * Yeah, this function does quite a bit. That's probably a bad thing.
	 *
	 * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
	 * @param {Function[]} [listeners] An optional array of listener functions to add.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.addListeners = function addListeners(evt, listeners) {
		// Pass through to manipulateListeners
		return this.manipulateListeners(false, evt, listeners);
	};

	/**
	 * Removes listeners in bulk using the manipulateListeners method.
	 * If you pass an object as the second argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
	 * You can also pass it an event name and an array of listeners to be removed.
	 * You can also pass it a regular expression to remove the listeners from all events that match it.
	 *
	 * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
	 * @param {Function[]} [listeners] An optional array of listener functions to remove.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.removeListeners = function removeListeners(evt, listeners) {
		// Pass through to manipulateListeners
		return this.manipulateListeners(true, evt, listeners);
	};

	/**
	 * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
	 * The first argument will determine if the listeners are removed (true) or added (false).
	 * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
	 * You can also pass it an event name and an array of listeners to be added/removed.
	 * You can also pass it a regular expression to manipulate the listeners of all events that match it.
	 *
	 * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
	 * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
	 * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
		var i;
		var value;
		var single = remove ? this.removeListener : this.addListener;
		var multiple = remove ? this.removeListeners : this.addListeners;

		// If evt is an object then pass each of it's properties to this method
		if (typeof evt === 'object' && !(evt instanceof RegExp)) {
			for (i in evt) {
				if (evt.hasOwnProperty(i) && (value = evt[i])) {
					// Pass the single listener straight through to the singular method
					if (typeof value === 'function') {
						single.call(this, i, value);
					}
					else {
						// Otherwise pass back to the multiple function
						multiple.call(this, i, value);
					}
				}
			}
		}
		else {
			// So evt must be a string
			// And listeners must be an array of listeners
			// Loop over it and pass each one to the multiple method
			i = listeners.length;
			while (i--) {
				single.call(this, evt, listeners[i]);
			}
		}

		return this;
	};

	/**
	 * Removes all listeners from a specified event.
	 * If you do not specify an event then all listeners will be removed.
	 * That means every event will be emptied.
	 * You can also pass a regex to remove all events that match it.
	 *
	 * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.removeEvent = function removeEvent(evt) {
		var type = typeof evt;
		var events = this._getEvents();
		var key;

		// Remove different things depending on the state of evt
		if (type === 'string') {
			// Remove all listeners for the specified event
			delete events[evt];
		}
		else if (evt instanceof RegExp) {
			// Remove all events matching the regex.
			for (key in events) {
				if (events.hasOwnProperty(key) && evt.test(key)) {
					delete events[key];
				}
			}
		}
		else {
			// Remove all listeners in all events
			delete this._events;
		}

		return this;
	};

	/**
	 * Alias of removeEvent.
	 *
	 * Added to mirror the node API.
	 */
	proto.removeAllListeners = alias('removeEvent');

	/**
	 * Emits an event of your choice.
	 * When emitted, every listener attached to that event will be executed.
	 * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
	 * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
	 * So they will not arrive within the array on the other side, they will be separate.
	 * You can also pass a regular expression to emit to all events that match it.
	 *
	 * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
	 * @param {Array} [args] Optional array of arguments to be passed to each listener.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.emitEvent = function emitEvent(evt, args) {
		var listeners = this.getListenersAsObject(evt);
		var listener;
		var i;
		var key;
		var response;

		for (key in listeners) {
			if (listeners.hasOwnProperty(key)) {
				i = listeners[key].length;

				while (i--) {
					// If the listener returns true then it shall be removed from the event
					// The function is executed either with a basic call or an apply if there is an args array
					listener = listeners[key][i];

					if (listener.once === true) {
						this.removeListener(evt, listener.listener);
					}

					response = listener.listener.apply(this, args || []);

					if (response === this._getOnceReturnValue()) {
						this.removeListener(evt, listener.listener);
					}
				}
			}
		}

		return this;
	};

	/**
	 * Alias of emitEvent
	 */
	proto.trigger = alias('emitEvent');

	/**
	 * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
	 * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
	 *
	 * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
	 * @param {...*} Optional additional arguments to be passed to each listener.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.emit = function emit(evt) {
		var args = Array.prototype.slice.call(arguments, 1);
		return this.emitEvent(evt, args);
	};

	/**
	 * Sets the current value to check against when executing listeners. If a
	 * listeners return value matches the one set here then it will be removed
	 * after execution. This value defaults to true.
	 *
	 * @param {*} value The new value to check for when executing listeners.
	 * @return {Object} Current instance of EventEmitter for chaining.
	 */
	proto.setOnceReturnValue = function setOnceReturnValue(value) {
		this._onceReturnValue = value;
		return this;
	};

	/**
	 * Fetches the current value to check against when executing listeners. If
	 * the listeners return value matches this one then it should be removed
	 * automatically. It will return true by default.
	 *
	 * @return {*|Boolean} The current value to check for or the default, true.
	 * @api private
	 */
	proto._getOnceReturnValue = function _getOnceReturnValue() {
		if (this.hasOwnProperty('_onceReturnValue')) {
			return this._onceReturnValue;
		}
		else {
			return true;
		}
	};

	/**
	 * Fetches the events object and creates one if required.
	 *
	 * @return {Object} The events storage object.
	 * @api private
	 */
	proto._getEvents = function _getEvents() {
		return this._events || (this._events = {});
	};

	/**
	 * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
	 *
	 * @return {Function} Non conflicting EventEmitter class.
	 */
	EventEmitter.noConflict = function noConflict() {
		exports.EventEmitter = originalGlobalValue;
		return EventEmitter;
	};

	// Expose the class either via AMD, CommonJS or the global object
	if (typeof define === 'function' && define.amd) {
		define('eventEmitter/EventEmitter',[],function () {
			return EventEmitter;
		});
	}
	else if (typeof module === 'object' && module.exports){
		module.exports = EventEmitter;
	}
	else {
		this.EventEmitter = EventEmitter;
	}
}.call(this));

/*!
 * getStyleProperty v1.0.3
 * original by kangax
 * http://perfectionkills.com/feature-testing-css-properties/
 */

/*jshint browser: true, strict: true, undef: true */
/*global define: false, exports: false, module: false */

( function( window ) {



var prefixes = 'Webkit Moz ms Ms O'.split(' ');
var docElemStyle = document.documentElement.style;

function getStyleProperty( propName ) {
  if ( !propName ) {
    return;
  }

  // test standard property first
  if ( typeof docElemStyle[ propName ] === 'string' ) {
    return propName;
  }

  // capitalize
  propName = propName.charAt(0).toUpperCase() + propName.slice(1);

  // test vendor specific properties
  var prefixed;
  for ( var i=0, len = prefixes.length; i < len; i++ ) {
    prefixed = prefixes[i] + propName;
    if ( typeof docElemStyle[ prefixed ] === 'string' ) {
      return prefixed;
    }
  }
}

// transport
if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( 'get-style-property/get-style-property',[],function() {
    return getStyleProperty;
  });
} else if ( typeof exports === 'object' ) {
  // CommonJS for Component
  module.exports = getStyleProperty;
} else {
  // browser global
  window.getStyleProperty = getStyleProperty;
}

})( window );

/**
 * getSize v1.1.7
 * measure size of elements
 */

/*jshint browser: true, strict: true, undef: true, unused: true */
/*global define: false, exports: false, require: false, module: false */

( function( window, undefined ) {



// -------------------------- helpers -------------------------- //

var getComputedStyle = window.getComputedStyle;
var getStyle = getComputedStyle ?
  function( elem ) {
    return getComputedStyle( elem, null );
  } :
  function( elem ) {
    return elem.currentStyle;
  };

// get a number from a string, not a percentage
function getStyleSize( value ) {
  var num = parseFloat( value );
  // not a percent like '100%', and a number
  var isValid = value.indexOf('%') === -1 && !isNaN( num );
  return isValid && num;
}

// -------------------------- measurements -------------------------- //

var measurements = [
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'marginLeft',
  'marginRight',
  'marginTop',
  'marginBottom',
  'borderLeftWidth',
  'borderRightWidth',
  'borderTopWidth',
  'borderBottomWidth'
];

function getZeroSize() {
  var size = {
    width: 0,
    height: 0,
    innerWidth: 0,
    innerHeight: 0,
    outerWidth: 0,
    outerHeight: 0
  };
  for ( var i=0, len = measurements.length; i < len; i++ ) {
    var measurement = measurements[i];
    size[ measurement ] = 0;
  }
  return size;
}



function defineGetSize( getStyleProperty ) {

// -------------------------- box sizing -------------------------- //

var boxSizingProp = getStyleProperty('boxSizing');
var isBoxSizeOuter;

/**
 * WebKit measures the outer-width on style.width on border-box elems
 * IE & Firefox measures the inner-width
 */
( function() {
  if ( !boxSizingProp ) {
    return;
  }

  var div = document.createElement('div');
  div.style.width = '200px';
  div.style.padding = '1px 2px 3px 4px';
  div.style.borderStyle = 'solid';
  div.style.borderWidth = '1px 2px 3px 4px';
  div.style[ boxSizingProp ] = 'border-box';

  var body = document.body || document.documentElement;
  body.appendChild( div );
  var style = getStyle( div );

  isBoxSizeOuter = getStyleSize( style.width ) === 200;
  body.removeChild( div );
})();


// -------------------------- getSize -------------------------- //

function getSize( elem ) {
  // use querySeletor if elem is string
  if ( typeof elem === 'string' ) {
    elem = document.querySelector( elem );
  }

  // do not proceed on non-objects
  if ( !elem || typeof elem !== 'object' || !elem.nodeType ) {
    return;
  }

  var style = getStyle( elem );

  // if hidden, everything is 0
  if ( style.display === 'none' ) {
    return getZeroSize();
  }

  var size = {};
  size.width = elem.offsetWidth;
  size.height = elem.offsetHeight;

  var isBorderBox = size.isBorderBox = !!( boxSizingProp &&
    style[ boxSizingProp ] && style[ boxSizingProp ] === 'border-box' );

  // get all measurements
  for ( var i=0, len = measurements.length; i < len; i++ ) {
    var measurement = measurements[i];
    var value = style[ measurement ];
    value = mungeNonPixel( elem, value );
    var num = parseFloat( value );
    // any 'auto', 'medium' value will be 0
    size[ measurement ] = !isNaN( num ) ? num : 0;
  }

  var paddingWidth = size.paddingLeft + size.paddingRight;
  var paddingHeight = size.paddingTop + size.paddingBottom;
  var marginWidth = size.marginLeft + size.marginRight;
  var marginHeight = size.marginTop + size.marginBottom;
  var borderWidth = size.borderLeftWidth + size.borderRightWidth;
  var borderHeight = size.borderTopWidth + size.borderBottomWidth;

  var isBorderBoxSizeOuter = isBorderBox && isBoxSizeOuter;

  // overwrite width and height if we can get it from style
  var styleWidth = getStyleSize( style.width );
  if ( styleWidth !== false ) {
    size.width = styleWidth +
      // add padding and border unless it's already including it
      ( isBorderBoxSizeOuter ? 0 : paddingWidth + borderWidth );
  }

  var styleHeight = getStyleSize( style.height );
  if ( styleHeight !== false ) {
    size.height = styleHeight +
      // add padding and border unless it's already including it
      ( isBorderBoxSizeOuter ? 0 : paddingHeight + borderHeight );
  }

  size.innerWidth = size.width - ( paddingWidth + borderWidth );
  size.innerHeight = size.height - ( paddingHeight + borderHeight );

  size.outerWidth = size.width + marginWidth;
  size.outerHeight = size.height + marginHeight;

  return size;
}

// IE8 returns percent values, not pixels
// taken from jQuery's curCSS
function mungeNonPixel( elem, value ) {
  // IE8 and has percent value
  if ( getComputedStyle || value.indexOf('%') === -1 ) {
    return value;
  }
  var style = elem.style;
  // Remember the original values
  var left = style.left;
  var rs = elem.runtimeStyle;
  var rsLeft = rs && rs.left;

  // Put in the new values to get a computed value out
  if ( rsLeft ) {
    rs.left = elem.currentStyle.left;
  }
  style.left = value;
  value = style.pixelLeft;

  // Revert the changed values
  style.left = left;
  if ( rsLeft ) {
    rs.left = rsLeft;
  }

  return value;
}

return getSize;

}

// transport
if ( typeof define === 'function' && define.amd ) {
  // AMD for RequireJS
  define( 'get-size/get-size',[ 'get-style-property/get-style-property' ], defineGetSize );
} else if ( typeof exports === 'object' ) {
  // CommonJS for Component
  module.exports = defineGetSize( require('get-style-property') );
} else {
  // browser global
  window.getSize = defineGetSize( window.getStyleProperty );
}

})( window );

/**
 * matchesSelector helper v1.0.1
 *
 * @name matchesSelector
 *   @param {Element} elem
 *   @param {String} selector
 */

/*jshint browser: true, strict: true, undef: true, unused: true */
/*global define: false */

( function( global, ElemProto ) {

  

  var matchesMethod = ( function() {
    // check un-prefixed
    if ( ElemProto.matchesSelector ) {
      return 'matchesSelector';
    }
    // check vendor prefixes
    var prefixes = [ 'webkit', 'moz', 'ms', 'o' ];

    for ( var i=0, len = prefixes.length; i < len; i++ ) {
      var prefix = prefixes[i];
      var method = prefix + 'MatchesSelector';
      if ( ElemProto[ method ] ) {
        return method;
      }
    }
  })();

  // ----- match ----- //

  function match( elem, selector ) {
    return elem[ matchesMethod ]( selector );
  }

  // ----- appendToFragment ----- //

  function checkParent( elem ) {
    // not needed if already has parent
    if ( elem.parentNode ) {
      return;
    }
    var fragment = document.createDocumentFragment();
    fragment.appendChild( elem );
  }

  // ----- query ----- //

  // fall back to using QSA
  // thx @jonathantneal https://gist.github.com/3062955
  function query( elem, selector ) {
    // append to fragment if no parent
    checkParent( elem );

    // match elem with all selected elems of parent
    var elems = elem.parentNode.querySelectorAll( selector );
    for ( var i=0, len = elems.length; i < len; i++ ) {
      // return true if match
      if ( elems[i] === elem ) {
        return true;
      }
    }
    // otherwise return false
    return false;
  }

  // ----- matchChild ----- //

  function matchChild( elem, selector ) {
    checkParent( elem );
    return match( elem, selector );
  }

  // ----- matchesSelector ----- //

  var matchesSelector;

  if ( matchesMethod ) {
    // IE9 supports matchesSelector, but doesn't work on orphaned elems
    // check for that
    var div = document.createElement('div');
    var supportsOrphans = match( div, 'div' );
    matchesSelector = supportsOrphans ? match : matchChild;
  } else {
    matchesSelector = query;
  }

  // transport
  if ( typeof define === 'function' && define.amd ) {
    // AMD
    define( 'matches-selector/matches-selector',[],function() {
      return matchesSelector;
    });
  } else {
    // browser global
    window.matchesSelector = matchesSelector;
  }

})( this, Element.prototype );

/**
 * Outlayer Item
 */

( function( window ) {



// ----- get style ----- //

var defView = document.defaultView;

var getStyle = defView && defView.getComputedStyle ?
  function( elem ) {
    return defView.getComputedStyle( elem, null );
  } :
  function( elem ) {
    return elem.currentStyle;
  };


// extend objects
function extend( a, b ) {
  for ( var prop in b ) {
    a[ prop ] = b[ prop ];
  }
  return a;
}

function isEmptyObj( obj ) {
  for ( var prop in obj ) {
    return false;
  }
  prop = null;
  return true;
}

// http://jamesroberts.name/blog/2010/02/22/string-functions-for-javascript-trim-to-camel-case-to-dashed-and-to-underscore/
function toDash( str ) {
  return str.replace( /([A-Z])/g, function( $1 ){
    return '-' + $1.toLowerCase();
  });
}

// -------------------------- Outlayer definition -------------------------- //

function outlayerItemDefinition( EventEmitter, getSize, getStyleProperty ) {

// -------------------------- CSS3 support -------------------------- //

var transitionProperty = getStyleProperty('transition');
var transformProperty = getStyleProperty('transform');
var supportsCSS3 = transitionProperty && transformProperty;
var is3d = !!getStyleProperty('perspective');

var transitionEndEvent = {
  WebkitTransition: 'webkitTransitionEnd',
  MozTransition: 'transitionend',
  OTransition: 'otransitionend',
  transition: 'transitionend'
}[ transitionProperty ];

// properties that could have vendor prefix
var prefixableProperties = [
  'transform',
  'transition',
  'transitionDuration',
  'transitionProperty'
];

// cache all vendor properties
var vendorProperties = ( function() {
  var cache = {};
  for ( var i=0, len = prefixableProperties.length; i < len; i++ ) {
    var prop = prefixableProperties[i];
    var supportedProp = getStyleProperty( prop );
    if ( supportedProp && supportedProp !== prop ) {
      cache[ prop ] = supportedProp;
    }
  }
  return cache;
})();

// -------------------------- Item -------------------------- //

function Item( element, layout ) {
  if ( !element ) {
    return;
  }

  this.element = element;
  // parent layout class, i.e. Masonry, Isotope, or Packery
  this.layout = layout;
  this.position = {
    x: 0,
    y: 0
  };

  this._create();
}

// inherit EventEmitter
extend( Item.prototype, EventEmitter.prototype );

Item.prototype._create = function() {
  // transition objects
  this._transn = {
    ingProperties: {},
    clean: {},
    onEnd: {}
  };

  this.css({
    position: 'absolute'
  });
};

// trigger specified handler for event type
Item.prototype.handleEvent = function( event ) {
  var method = 'on' + event.type;
  if ( this[ method ] ) {
    this[ method ]( event );
  }
};

Item.prototype.getSize = function() {
  this.size = getSize( this.element );
};

/**
 * apply CSS styles to element
 * @param {Object} style
 */
Item.prototype.css = function( style ) {
  var elemStyle = this.element.style;

  for ( var prop in style ) {
    // use vendor property if available
    var supportedProp = vendorProperties[ prop ] || prop;
    elemStyle[ supportedProp ] = style[ prop ];
  }
};

 // measure position, and sets it
Item.prototype.getPosition = function() {
  var style = getStyle( this.element );
  var layoutOptions = this.layout.options;
  var isOriginLeft = layoutOptions.isOriginLeft;
  var isOriginTop = layoutOptions.isOriginTop;
  var x = parseInt( style[ isOriginLeft ? 'left' : 'right' ], 10 );
  var y = parseInt( style[ isOriginTop ? 'top' : 'bottom' ], 10 );

  // clean up 'auto' or other non-integer values
  x = isNaN( x ) ? 0 : x;
  y = isNaN( y ) ? 0 : y;
  // remove padding from measurement
  var layoutSize = this.layout.size;
  x -= isOriginLeft ? layoutSize.paddingLeft : layoutSize.paddingRight;
  y -= isOriginTop ? layoutSize.paddingTop : layoutSize.paddingBottom;

  this.position.x = x;
  this.position.y = y;
};

// set settled position, apply padding
Item.prototype.layoutPosition = function() {
  var layoutSize = this.layout.size;
  var layoutOptions = this.layout.options;
  var style = {};

  if ( layoutOptions.isOriginLeft ) {
    style.left = ( this.position.x + layoutSize.paddingLeft ) + 'px';
    // reset other property
    style.right = '';
  } else {
    style.right = ( this.position.x + layoutSize.paddingRight ) + 'px';
    style.left = '';
  }

  if ( layoutOptions.isOriginTop ) {
    style.top = ( this.position.y + layoutSize.paddingTop ) + 'px';
    style.bottom = '';
  } else {
    style.bottom = ( this.position.y + layoutSize.paddingBottom ) + 'px';
    style.top = '';
  }

  this.css( style );
  this.emitEvent( 'layout', [ this ] );
};


// transform translate function
var translate = is3d ?
  function( x, y ) {
    return 'translate3d(' + x + 'px, ' + y + 'px, 0)';
  } :
  function( x, y ) {
    return 'translate(' + x + 'px, ' + y + 'px)';
  };


Item.prototype._transitionTo = function( x, y ) {
  this.getPosition();
  // get current x & y from top/left
  var curX = this.position.x;
  var curY = this.position.y;

  var compareX = parseInt( x, 10 );
  var compareY = parseInt( y, 10 );
  var didNotMove = compareX === this.position.x && compareY === this.position.y;

  // save end position
  this.setPosition( x, y );

  // if did not move and not transitioning, just go to layout
  if ( didNotMove && !this.isTransitioning ) {
    this.layoutPosition();
    return;
  }

  var transX = x - curX;
  var transY = y - curY;
  var transitionStyle = {};
  // flip cooridinates if origin on right or bottom
  var layoutOptions = this.layout.options;
  transX = layoutOptions.isOriginLeft ? transX : -transX;
  transY = layoutOptions.isOriginTop ? transY : -transY;
  transitionStyle.transform = translate( transX, transY );

  this.transition({
    to: transitionStyle,
    onTransitionEnd: {
      transform: this.layoutPosition
    },
    isCleaning: true
  });
};

// non transition + transform support
Item.prototype.goTo = function( x, y ) {
  this.setPosition( x, y );
  this.layoutPosition();
};

// use transition and transforms if supported
Item.prototype.moveTo = supportsCSS3 ?
  Item.prototype._transitionTo : Item.prototype.goTo;

Item.prototype.setPosition = function( x, y ) {
  this.position.x = parseInt( x, 10 );
  this.position.y = parseInt( y, 10 );
};

// ----- transition ----- //

/**
 * @param {Object} style - CSS
 * @param {Function} onTransitionEnd
 */

// non transition, just trigger callback
Item.prototype._nonTransition = function( args ) {
  this.css( args.to );
  if ( args.isCleaning ) {
    this._removeStyles( args.to );
  }
  for ( var prop in args.onTransitionEnd ) {
    args.onTransitionEnd[ prop ].call( this );
  }
};

/**
 * proper transition
 * @param {Object} args - arguments
 *   @param {Object} to - style to transition to
 *   @param {Object} from - style to start transition from
 *   @param {Boolean} isCleaning - removes transition styles after transition
 *   @param {Function} onTransitionEnd - callback
 */
Item.prototype._transition = function( args ) {
  // redirect to nonTransition if no transition duration
  if ( !parseFloat( this.layout.options.transitionDuration ) ) {
    this._nonTransition( args );
    return;
  }

  var _transition = this._transn;
  // keep track of onTransitionEnd callback by css property
  for ( var prop in args.onTransitionEnd ) {
    _transition.onEnd[ prop ] = args.onTransitionEnd[ prop ];
  }
  // keep track of properties that are transitioning
  for ( prop in args.to ) {
    _transition.ingProperties[ prop ] = true;
    // keep track of properties to clean up when transition is done
    if ( args.isCleaning ) {
      _transition.clean[ prop ] = true;
    }
  }

  // set from styles
  if ( args.from ) {
    this.css( args.from );
    // force redraw. http://blog.alexmaccaw.com/css-transitions
    var h = this.element.offsetHeight;
    // hack for JSHint to hush about unused var
    h = null;
  }
  // enable transition
  this.enableTransition( args.to );
  // set styles that are transitioning
  this.css( args.to );

  this.isTransitioning = true;

};

var itemTransitionProperties = transformProperty && ( toDash( transformProperty ) +
  ',opacity' );

Item.prototype.enableTransition = function(/* style */) {
  // only enable if not already transitioning
  // bug in IE10 were re-setting transition style will prevent
  // transitionend event from triggering
  if ( this.isTransitioning ) {
    return;
  }

  // make transition: foo, bar, baz from style object
  // TODO uncomment this bit when IE10 bug is resolved
  // var transitionValue = [];
  // for ( var prop in style ) {
  //   // dash-ify camelCased properties like WebkitTransition
  //   transitionValue.push( toDash( prop ) );
  // }
  // enable transition styles
  // HACK always enable transform,opacity for IE10
  this.css({
    transitionProperty: itemTransitionProperties,
    transitionDuration: this.layout.options.transitionDuration
  });
  // listen for transition end event
  this.element.addEventListener( transitionEndEvent, this, false );
};

Item.prototype.transition = Item.prototype[ transitionProperty ? '_transition' : '_nonTransition' ];

// ----- events ----- //

Item.prototype.onwebkitTransitionEnd = function( event ) {
  this.ontransitionend( event );
};

Item.prototype.onotransitionend = function( event ) {
  this.ontransitionend( event );
};

// properties that I munge to make my life easier
var dashedVendorProperties = {
  '-webkit-transform': 'transform',
  '-moz-transform': 'transform',
  '-o-transform': 'transform'
};

Item.prototype.ontransitionend = function( event ) {
  // disregard bubbled events from children
  if ( event.target !== this.element ) {
    return;
  }
  var _transition = this._transn;
  // get property name of transitioned property, convert to prefix-free
  var propertyName = dashedVendorProperties[ event.propertyName ] || event.propertyName;

  // remove property that has completed transitioning
  delete _transition.ingProperties[ propertyName ];
  // check if any properties are still transitioning
  if ( isEmptyObj( _transition.ingProperties ) ) {
    // all properties have completed transitioning
    this.disableTransition();
  }
  // clean style
  if ( propertyName in _transition.clean ) {
    // clean up style
    this.element.style[ event.propertyName ] = '';
    delete _transition.clean[ propertyName ];
  }
  // trigger onTransitionEnd callback
  if ( propertyName in _transition.onEnd ) {
    var onTransitionEnd = _transition.onEnd[ propertyName ];
    onTransitionEnd.call( this );
    delete _transition.onEnd[ propertyName ];
  }

  this.emitEvent( 'transitionEnd', [ this ] );
};

Item.prototype.disableTransition = function() {
  this.removeTransitionStyles();
  this.element.removeEventListener( transitionEndEvent, this, false );
  this.isTransitioning = false;
};

/**
 * removes style property from element
 * @param {Object} style
**/
Item.prototype._removeStyles = function( style ) {
  // clean up transition styles
  var cleanStyle = {};
  for ( var prop in style ) {
    cleanStyle[ prop ] = '';
  }
  this.css( cleanStyle );
};

var cleanTransitionStyle = {
  transitionProperty: '',
  transitionDuration: ''
};

Item.prototype.removeTransitionStyles = function() {
  // remove transition
  this.css( cleanTransitionStyle );
};

// ----- show/hide/remove ----- //

// remove element from DOM
Item.prototype.removeElem = function() {
  this.element.parentNode.removeChild( this.element );
  this.emitEvent( 'remove', [ this ] );
};

Item.prototype.remove = function() {
  // just remove element if no transition support or no transition
  if ( !transitionProperty || !parseFloat( this.layout.options.transitionDuration ) ) {
    this.removeElem();
    return;
  }

  // start transition
  var _this = this;
  this.on( 'transitionEnd', function() {
    _this.removeElem();
    return true; // bind once
  });
  this.hide();
};

Item.prototype.reveal = function() {
  delete this.isHidden;
  // remove display: none
  this.css({ display: '' });

  var options = this.layout.options;
  this.transition({
    from: options.hiddenStyle,
    to: options.visibleStyle,
    isCleaning: true
  });
};

Item.prototype.hide = function() {
  // set flag
  this.isHidden = true;
  // remove display: none
  this.css({ display: '' });

  var options = this.layout.options;
  this.transition({
    from: options.visibleStyle,
    to: options.hiddenStyle,
    // keep hidden stuff hidden
    isCleaning: true,
    onTransitionEnd: {
      opacity: function() {
        // check if still hidden
        // during transition, item may have been un-hidden
        if ( this.isHidden ) {
          this.css({ display: 'none' });
        }
      }
    }
  });
};

Item.prototype.destroy = function() {
  this.css({
    position: '',
    left: '',
    right: '',
    top: '',
    bottom: '',
    transition: '',
    transform: ''
  });
};

return Item;

}

// -------------------------- transport -------------------------- //

if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( 'outlayer/item',[
      'eventEmitter/EventEmitter',
      'get-size/get-size',
      'get-style-property/get-style-property'
    ],
    outlayerItemDefinition );
} else {
  // browser global
  window.Outlayer = {};
  window.Outlayer.Item = outlayerItemDefinition(
    window.EventEmitter,
    window.getSize,
    window.getStyleProperty
  );
}

})( window );

/*!
 * Outlayer v1.1.10
 * the brains and guts of a layout library
 * MIT license
 */

( function( window ) {



// ----- vars ----- //

var document = window.document;
var console = window.console;
var jQuery = window.jQuery;

var noop = function() {};

// -------------------------- helpers -------------------------- //

// extend objects
function extend( a, b ) {
  for ( var prop in b ) {
    a[ prop ] = b[ prop ];
  }
  return a;
}


var objToString = Object.prototype.toString;
function isArray( obj ) {
  return objToString.call( obj ) === '[object Array]';
}

// turn element or nodeList into an array
function makeArray( obj ) {
  var ary = [];
  if ( isArray( obj ) ) {
    // use object if already an array
    ary = obj;
  } else if ( obj && typeof obj.length === 'number' ) {
    // convert nodeList to array
    for ( var i=0, len = obj.length; i < len; i++ ) {
      ary.push( obj[i] );
    }
  } else {
    // array of single index
    ary.push( obj );
  }
  return ary;
}

// http://stackoverflow.com/a/384380/182183
var isElement = ( typeof HTMLElement === 'object' ) ?
  function isElementDOM2( obj ) {
    return obj instanceof HTMLElement;
  } :
  function isElementQuirky( obj ) {
    return obj && typeof obj === 'object' &&
      obj.nodeType === 1 && typeof obj.nodeName === 'string';
  };

// index of helper cause IE8
var indexOf = Array.prototype.indexOf ? function( ary, obj ) {
    return ary.indexOf( obj );
  } : function( ary, obj ) {
    for ( var i=0, len = ary.length; i < len; i++ ) {
      if ( ary[i] === obj ) {
        return i;
      }
    }
    return -1;
  };

function removeFrom( obj, ary ) {
  var index = indexOf( ary, obj );
  if ( index !== -1 ) {
    ary.splice( index, 1 );
  }
}

// http://jamesroberts.name/blog/2010/02/22/string-functions-for-javascript-trim-to-camel-case-to-dashed-and-to-underscore/
function toDashed( str ) {
  return str.replace( /(.)([A-Z])/g, function( match, $1, $2 ) {
    return $1 + '-' + $2;
  }).toLowerCase();
}


function outlayerDefinition( eventie, docReady, EventEmitter, getSize, matchesSelector, Item ) {

// -------------------------- Outlayer -------------------------- //

// globally unique identifiers
var GUID = 0;
// internal store of all Outlayer intances
var instances = {};


/**
 * @param {Element, String} element
 * @param {Object} options
 * @constructor
 */
function Outlayer( element, options ) {
  // use element as selector string
  if ( typeof element === 'string' ) {
    element = document.querySelector( element );
  }

  // bail out if not proper element
  if ( !element || !isElement( element ) ) {
    if ( console ) {
      console.error( 'Bad ' + this.constructor.namespace + ' element: ' + element );
    }
    return;
  }

  this.element = element;

  // options
  this.options = extend( {}, this.options );
  this.option( options );

  // add id for Outlayer.getFromElement
  var id = ++GUID;
  this.element.outlayerGUID = id; // expando
  instances[ id ] = this; // associate via id

  // kick it off
  this._create();

  if ( this.options.isInitLayout ) {
    this.layout();
  }
}

// settings are for internal use only
Outlayer.namespace = 'outlayer';
Outlayer.Item = Item;

// default options
Outlayer.prototype.options = {
  containerStyle: {
    position: 'relative'
  },
  isInitLayout: true,
  isOriginLeft: true,
  isOriginTop: true,
  isResizeBound: true,
  // item options
  transitionDuration: '0.4s',
  hiddenStyle: {
    opacity: 0,
    transform: 'scale(0.001)'
  },
  visibleStyle: {
    opacity: 1,
    transform: 'scale(1)'
  }
};

// inherit EventEmitter
extend( Outlayer.prototype, EventEmitter.prototype );

/**
 * set options
 * @param {Object} opts
 */
Outlayer.prototype.option = function( opts ) {
  extend( this.options, opts );
};

Outlayer.prototype._create = function() {
  // get items from children
  this.reloadItems();
  // elements that affect layout, but are not laid out
  this.stamps = [];
  this.stamp( this.options.stamp );
  // set container style
  extend( this.element.style, this.options.containerStyle );

  // bind resize method
  if ( this.options.isResizeBound ) {
    this.bindResize();
  }
};

// goes through all children again and gets bricks in proper order
Outlayer.prototype.reloadItems = function() {
  // collection of item elements
  this.items = this._itemize( this.element.children );
};


/**
 * turn elements into Outlayer.Items to be used in layout
 * @param {Array or NodeList or HTMLElement} elems
 * @returns {Array} items - collection of new Outlayer Items
 */
Outlayer.prototype._itemize = function( elems ) {

  var itemElems = this._filterFindItemElements( elems );
  var Item = this.constructor.Item;

  // create new Outlayer Items for collection
  var items = [];
  for ( var i=0, len = itemElems.length; i < len; i++ ) {
    var elem = itemElems[i];
    var item = new Item( elem, this );
    items.push( item );
  }

  return items;
};

/**
 * get item elements to be used in layout
 * @param {Array or NodeList or HTMLElement} elems
 * @returns {Array} items - item elements
 */
Outlayer.prototype._filterFindItemElements = function( elems ) {
  // make array of elems
  elems = makeArray( elems );
  var itemSelector = this.options.itemSelector;
  var itemElems = [];

  for ( var i=0, len = elems.length; i < len; i++ ) {
    var elem = elems[i];
    // check that elem is an actual element
    if ( !isElement( elem ) ) {
      continue;
    }
    // filter & find items if we have an item selector
    if ( itemSelector ) {
      // filter siblings
      if ( matchesSelector( elem, itemSelector ) ) {
        itemElems.push( elem );
      }
      // find children
      var childElems = elem.querySelectorAll( itemSelector );
      // concat childElems to filterFound array
      for ( var j=0, jLen = childElems.length; j < jLen; j++ ) {
        itemElems.push( childElems[j] );
      }
    } else {
      itemElems.push( elem );
    }
  }

  return itemElems;
};

/**
 * getter method for getting item elements
 * @returns {Array} elems - collection of item elements
 */
Outlayer.prototype.getItemElements = function() {
  var elems = [];
  for ( var i=0, len = this.items.length; i < len; i++ ) {
    elems.push( this.items[i].element );
  }
  return elems;
};

// ----- init & layout ----- //

/**
 * lays out all items
 */
Outlayer.prototype.layout = function() {
  this._resetLayout();
  this._manageStamps();

  // don't animate first layout
  var isInstant = this.options.isLayoutInstant !== undefined ?
    this.options.isLayoutInstant : !this._isLayoutInited;
  this.layoutItems( this.items, isInstant );

  // flag for initalized
  this._isLayoutInited = true;
};

// _init is alias for layout
Outlayer.prototype._init = Outlayer.prototype.layout;

/**
 * logic before any new layout
 */
Outlayer.prototype._resetLayout = function() {
  this.getSize();
};


Outlayer.prototype.getSize = function() {
  this.size = getSize( this.element );
};

/**
 * get measurement from option, for columnWidth, rowHeight, gutter
 * if option is String -> get element from selector string, & get size of element
 * if option is Element -> get size of element
 * else use option as a number
 *
 * @param {String} measurement
 * @param {String} size - width or height
 * @private
 */
Outlayer.prototype._getMeasurement = function( measurement, size ) {
  var option = this.options[ measurement ];
  var elem;
  if ( !option ) {
    // default to 0
    this[ measurement ] = 0;
  } else {
    // use option as an element
    if ( typeof option === 'string' ) {
      elem = this.element.querySelector( option );
    } else if ( isElement( option ) ) {
      elem = option;
    }
    // use size of element, if element
    this[ measurement ] = elem ? getSize( elem )[ size ] : option;
  }
};

/**
 * layout a collection of item elements
 * @api public
 */
Outlayer.prototype.layoutItems = function( items, isInstant ) {
  items = this._getItemsForLayout( items );

  this._layoutItems( items, isInstant );

  this._postLayout();
};

/**
 * get the items to be laid out
 * you may want to skip over some items
 * @param {Array} items
 * @returns {Array} items
 */
Outlayer.prototype._getItemsForLayout = function( items ) {
  var layoutItems = [];
  for ( var i=0, len = items.length; i < len; i++ ) {
    var item = items[i];
    if ( !item.isIgnored ) {
      layoutItems.push( item );
    }
  }
  return layoutItems;
};

/**
 * layout items
 * @param {Array} items
 * @param {Boolean} isInstant
 */
Outlayer.prototype._layoutItems = function( items, isInstant ) {
  var _this = this;
  function onItemsLayout() {
    _this.emitEvent( 'layoutComplete', [ _this, items ] );
  }

  if ( !items || !items.length ) {
    // no items, emit event with empty array
    onItemsLayout();
    return;
  }

  // emit layoutComplete when done
  this._itemsOn( items, 'layout', onItemsLayout );

  var queue = [];

  for ( var i=0, len = items.length; i < len; i++ ) {
    var item = items[i];
    // get x/y object from method
    var position = this._getItemLayoutPosition( item );
    // enqueue
    position.item = item;
    position.isInstant = isInstant || item.isLayoutInstant;
    queue.push( position );
  }

  this._processLayoutQueue( queue );
};

/**
 * get item layout position
 * @param {Outlayer.Item} item
 * @returns {Object} x and y position
 */
Outlayer.prototype._getItemLayoutPosition = function( /* item */ ) {
  return {
    x: 0,
    y: 0
  };
};

/**
 * iterate over array and position each item
 * Reason being - separating this logic prevents 'layout invalidation'
 * thx @paul_irish
 * @param {Array} queue
 */
Outlayer.prototype._processLayoutQueue = function( queue ) {
  for ( var i=0, len = queue.length; i < len; i++ ) {
    var obj = queue[i];
    this._positionItem( obj.item, obj.x, obj.y, obj.isInstant );
  }
};

/**
 * Sets position of item in DOM
 * @param {Outlayer.Item} item
 * @param {Number} x - horizontal position
 * @param {Number} y - vertical position
 * @param {Boolean} isInstant - disables transitions
 */
Outlayer.prototype._positionItem = function( item, x, y, isInstant ) {
  if ( isInstant ) {
    // if not transition, just set CSS
    item.goTo( x, y );
  } else {
    item.moveTo( x, y );
  }
};

/**
 * Any logic you want to do after each layout,
 * i.e. size the container
 */
Outlayer.prototype._postLayout = function() {
  var size = this._getContainerSize();
  if ( size ) {
    this._setContainerMeasure( size.width, true );
    this._setContainerMeasure( size.height, false );
  }
};

/**
 * @returns {Object} size
 *   @param {Number} width
 *   @param {Number} height
 */
Outlayer.prototype._getContainerSize = noop;

/**
 * @param {Number} measure - size of width or height
 * @param {Boolean} isWidth
 */
Outlayer.prototype._setContainerMeasure = function( measure, isWidth ) {
  if ( measure === undefined ) {
    return;
  }

  var elemSize = this.size;
  // add padding and border width if border box
  if ( elemSize.isBorderBox ) {
    measure += isWidth ? elemSize.paddingLeft + elemSize.paddingRight +
      elemSize.borderLeftWidth + elemSize.borderRightWidth :
      elemSize.paddingBottom + elemSize.paddingTop +
      elemSize.borderTopWidth + elemSize.borderBottomWidth;
  }

  measure = Math.max( measure, 0 );
  this.element.style[ isWidth ? 'width' : 'height' ] = measure + 'px';
};

/**
 * trigger a callback for a collection of items events
 * @param {Array} items - Outlayer.Items
 * @param {String} eventName
 * @param {Function} callback
 */
Outlayer.prototype._itemsOn = function( items, eventName, callback ) {
  var doneCount = 0;
  var count = items.length;
  // event callback
  var _this = this;
  function tick() {
    doneCount++;
    if ( doneCount === count ) {
      callback.call( _this );
    }
    return true; // bind once
  }
  // bind callback
  for ( var i=0, len = items.length; i < len; i++ ) {
    var item = items[i];
    item.on( eventName, tick );
  }
};

// -------------------------- ignore & stamps -------------------------- //


/**
 * keep item in collection, but do not lay it out
 * ignored items do not get skipped in layout
 * @param {Element} elem
 */
Outlayer.prototype.ignore = function( elem ) {
  var item = this.getItem( elem );
  if ( item ) {
    item.isIgnored = true;
  }
};

/**
 * return item to layout collection
 * @param {Element} elem
 */
Outlayer.prototype.unignore = function( elem ) {
  var item = this.getItem( elem );
  if ( item ) {
    delete item.isIgnored;
  }
};

/**
 * adds elements to stamps
 * @param {NodeList, Array, Element, or String} elems
 */
Outlayer.prototype.stamp = function( elems ) {
  elems = this._find( elems );
  if ( !elems ) {
    return;
  }

  this.stamps = this.stamps.concat( elems );
  // ignore
  for ( var i=0, len = elems.length; i < len; i++ ) {
    var elem = elems[i];
    this.ignore( elem );
  }
};

/**
 * removes elements to stamps
 * @param {NodeList, Array, or Element} elems
 */
Outlayer.prototype.unstamp = function( elems ) {
  elems = this._find( elems );
  if ( !elems ){
    return;
  }

  for ( var i=0, len = elems.length; i < len; i++ ) {
    var elem = elems[i];
    // filter out removed stamp elements
    removeFrom( elem, this.stamps );
    this.unignore( elem );
  }

};

/**
 * finds child elements
 * @param {NodeList, Array, Element, or String} elems
 * @returns {Array} elems
 */
Outlayer.prototype._find = function( elems ) {
  if ( !elems ) {
    return;
  }
  // if string, use argument as selector string
  if ( typeof elems === 'string' ) {
    elems = this.element.querySelectorAll( elems );
  }
  elems = makeArray( elems );
  return elems;
};

Outlayer.prototype._manageStamps = function() {
  if ( !this.stamps || !this.stamps.length ) {
    return;
  }

  this._getBoundingRect();

  for ( var i=0, len = this.stamps.length; i < len; i++ ) {
    var stamp = this.stamps[i];
    this._manageStamp( stamp );
  }
};

// update boundingLeft / Top
Outlayer.prototype._getBoundingRect = function() {
  // get bounding rect for container element
  var boundingRect = this.element.getBoundingClientRect();
  var size = this.size;
  this._boundingRect = {
    left: boundingRect.left + size.paddingLeft + size.borderLeftWidth,
    top: boundingRect.top + size.paddingTop + size.borderTopWidth,
    right: boundingRect.right - ( size.paddingRight + size.borderRightWidth ),
    bottom: boundingRect.bottom - ( size.paddingBottom + size.borderBottomWidth )
  };
};

/**
 * @param {Element} stamp
**/
Outlayer.prototype._manageStamp = noop;

/**
 * get x/y position of element relative to container element
 * @param {Element} elem
 * @returns {Object} offset - has left, top, right, bottom
 */
Outlayer.prototype._getElementOffset = function( elem ) {
  var boundingRect = elem.getBoundingClientRect();
  var thisRect = this._boundingRect;
  var size = getSize( elem );
  var offset = {
    left: boundingRect.left - thisRect.left - size.marginLeft,
    top: boundingRect.top - thisRect.top - size.marginTop,
    right: thisRect.right - boundingRect.right - size.marginRight,
    bottom: thisRect.bottom - boundingRect.bottom - size.marginBottom
  };
  return offset;
};

// -------------------------- resize -------------------------- //

// enable event handlers for listeners
// i.e. resize -> onresize
Outlayer.prototype.handleEvent = function( event ) {
  var method = 'on' + event.type;
  if ( this[ method ] ) {
    this[ method ]( event );
  }
};

/**
 * Bind layout to window resizing
 */
Outlayer.prototype.bindResize = function() {
  // bind just one listener
  if ( this.isResizeBound ) {
    return;
  }
  eventie.bind( window, 'resize', this );
  this.isResizeBound = true;
};

/**
 * Unbind layout to window resizing
 */
Outlayer.prototype.unbindResize = function() {
  eventie.unbind( window, 'resize', this );
  this.isResizeBound = false;
};

// original debounce by John Hann
// http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/

// this fires every resize
Outlayer.prototype.onresize = function() {
  if ( this.resizeTimeout ) {
    clearTimeout( this.resizeTimeout );
  }

  var _this = this;
  function delayed() {
    _this.resize();
    delete _this.resizeTimeout;
  }

  this.resizeTimeout = setTimeout( delayed, 100 );
};

// debounced, layout on resize
Outlayer.prototype.resize = function() {
  // don't trigger if size did not change
  var size = getSize( this.element );
  // check that this.size and size are there
  // IE8 triggers resize on body size change, so they might not be
  var hasSizes = this.size && size;
  if ( hasSizes && size.innerWidth === this.size.innerWidth ) {
    return;
  }

  this.layout();
};


// -------------------------- methods -------------------------- //

/**
 * add items to Outlayer instance
 * @param {Array or NodeList or Element} elems
 * @returns {Array} items - Outlayer.Items
**/
Outlayer.prototype.addItems = function( elems ) {
  var items = this._itemize( elems );
  // add items to collection
  if ( items.length ) {
    this.items = this.items.concat( items );
  }
  return items;
};

/**
 * Layout newly-appended item elements
 * @param {Array or NodeList or Element} elems
 */
Outlayer.prototype.appended = function( elems ) {
  var items = this.addItems( elems );
  if ( !items.length ) {
    return;
  }
  // layout and reveal just the new items
  this.layoutItems( items, true );
  this.reveal( items );
};

/**
 * Layout prepended elements
 * @param {Array or NodeList or Element} elems
 */
Outlayer.prototype.prepended = function( elems ) {
  var items = this._itemize( elems );
  if ( !items.length ) {
    return;
  }
  // add items to beginning of collection
  var previousItems = this.items.slice(0);
  this.items = items.concat( previousItems );
  // start new layout
  this._resetLayout();
  this._manageStamps();
  // layout new stuff without transition
  this.layoutItems( items, true );
  this.reveal( items );
  // layout previous items
  this.layoutItems( previousItems );
};

/**
 * reveal a collection of items
 * @param {Array of Outlayer.Items} items
 */
Outlayer.prototype.reveal = function( items ) {
  var len = items && items.length;
  if ( !len ) {
    return;
  }
  for ( var i=0; i < len; i++ ) {
    var item = items[i];
    item.reveal();
  }
};

/**
 * hide a collection of items
 * @param {Array of Outlayer.Items} items
 */
Outlayer.prototype.hide = function( items ) {
  var len = items && items.length;
  if ( !len ) {
    return;
  }
  for ( var i=0; i < len; i++ ) {
    var item = items[i];
    item.hide();
  }
};

/**
 * get Outlayer.Item, given an Element
 * @param {Element} elem
 * @param {Function} callback
 * @returns {Outlayer.Item} item
 */
Outlayer.prototype.getItem = function( elem ) {
  // loop through items to get the one that matches
  for ( var i=0, len = this.items.length; i < len; i++ ) {
    var item = this.items[i];
    if ( item.element === elem ) {
      // return item
      return item;
    }
  }
};

/**
 * get collection of Outlayer.Items, given Elements
 * @param {Array} elems
 * @returns {Array} items - Outlayer.Items
 */
Outlayer.prototype.getItems = function( elems ) {
  if ( !elems || !elems.length ) {
    return;
  }
  var items = [];
  for ( var i=0, len = elems.length; i < len; i++ ) {
    var elem = elems[i];
    var item = this.getItem( elem );
    if ( item ) {
      items.push( item );
    }
  }

  return items;
};

/**
 * remove element(s) from instance and DOM
 * @param {Array or NodeList or Element} elems
 */
Outlayer.prototype.remove = function( elems ) {
  elems = makeArray( elems );

  var removeItems = this.getItems( elems );
  // bail if no items to remove
  if ( !removeItems || !removeItems.length ) {
    return;
  }

  this._itemsOn( removeItems, 'remove', function() {
    this.emitEvent( 'removeComplete', [ this, removeItems ] );
  });

  for ( var i=0, len = removeItems.length; i < len; i++ ) {
    var item = removeItems[i];
    item.remove();
    // remove item from collection
    removeFrom( item, this.items );
  }
};

// ----- destroy ----- //

// remove and disable Outlayer instance
Outlayer.prototype.destroy = function() {
  // clean up dynamic styles
  var style = this.element.style;
  style.height = '';
  style.position = '';
  style.width = '';
  // destroy items
  for ( var i=0, len = this.items.length; i < len; i++ ) {
    var item = this.items[i];
    item.destroy();
  }

  this.unbindResize();

  delete this.element.outlayerGUID;
  // remove data for jQuery
  if ( jQuery ) {
    jQuery.removeData( this.element, this.constructor.namespace );
  }

};

// -------------------------- data -------------------------- //

/**
 * get Outlayer instance from element
 * @param {Element} elem
 * @returns {Outlayer}
 */
Outlayer.data = function( elem ) {
  var id = elem && elem.outlayerGUID;
  return id && instances[ id ];
};

// --------------------------  -------------------------- //

// copy an object on the Outlayer prototype to new object
function copyOutlayerProto( obj, property ) {
  obj.prototype[ property ] = extend( {}, Outlayer.prototype[ property ] );
}

// -------------------------- create Outlayer class -------------------------- //

/**
 * create a layout class
 * @param {String} namespace
 */
Outlayer.create = function( namespace, options ) {
  // sub-class Outlayer
  function Layout() {
    Outlayer.apply( this, arguments );
  }
  // inherit Outlayer prototype, use Object.create if there
  if ( Object.create ) {
    Layout.prototype = Object.create( Outlayer.prototype );
  } else {
    extend( Layout.prototype, Outlayer.prototype );
  }
  // set contructor, used for namespace and Item
  Layout.prototype.constructor = Layout;

  // copy default options so Outlayer.options don't get touched
  copyOutlayerProto( Layout, 'options' );
  // apply new options
  extend( Layout.prototype.options, options );

  Layout.namespace = namespace;

  Layout.data = Outlayer.data;

  // sub-class Item
  Layout.Item = function LayoutItem() {
    Item.apply( this, arguments );
  };

  Layout.Item.prototype = new Item();

  // -------------------------- declarative -------------------------- //

  /**
   * allow user to initialize Outlayer via .js-namespace class
   * options are parsed from data-namespace-option attribute
   */
  docReady( function() {
    var dashedNamespace = toDashed( namespace );
    var elems = document.querySelectorAll( '.js-' + dashedNamespace );
    var dataAttr = 'data-' + dashedNamespace + '-options';

    for ( var i=0, len = elems.length; i < len; i++ ) {
      var elem = elems[i];
      var attr = elem.getAttribute( dataAttr );
      var options;
      try {
        options = attr && JSON.parse( attr );
      } catch ( error ) {
        // log error, do not initialize
        if ( console ) {
          console.error( 'Error parsing ' + dataAttr + ' on ' +
            elem.nodeName.toLowerCase() + ( elem.id ? '#' + elem.id : '' ) + ': ' +
            error );
        }
        continue;
      }
      // initialize
      var instance = new Layout( elem, options );
      // make available via $().data('layoutname')
      if ( jQuery ) {
        jQuery.data( elem, namespace, instance );
      }
    }
  });

  // -------------------------- jQuery bridge -------------------------- //

  // make into jQuery plugin
  if ( jQuery && jQuery.bridget ) {
    jQuery.bridget( namespace, Layout );
  }

  return Layout;
};

// ----- fin ----- //

// back in global
Outlayer.Item = Item;

return Outlayer;

}

// -------------------------- transport -------------------------- //

if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( 'outlayer/outlayer',[
      'eventie/eventie',
      'doc-ready/doc-ready',
      'eventEmitter/EventEmitter',
      'get-size/get-size',
      'matches-selector/matches-selector',
      './item'
    ],
    outlayerDefinition );
} else {
  // browser global
  window.Outlayer = outlayerDefinition(
    window.eventie,
    window.docReady,
    window.EventEmitter,
    window.getSize,
    window.matchesSelector,
    window.Outlayer.Item
  );
}

})( window );

/*!
 * Masonry v3.1.4
 * Cascading grid layout library
 * http://masonry.desandro.com
 * MIT License
 * by David DeSandro
 */

( function( window ) {



// -------------------------- helpers -------------------------- //

var indexOf = Array.prototype.indexOf ?
  function( items, value ) {
    return items.indexOf( value );
  } :
  function ( items, value ) {
    for ( var i=0, len = items.length; i < len; i++ ) {
      var item = items[i];
      if ( item === value ) {
        return i;
      }
    }
    return -1;
  };

// -------------------------- masonryDefinition -------------------------- //

// used for AMD definition and requires
function masonryDefinition( Outlayer, getSize ) {
  // create an Outlayer layout class
  var Masonry = Outlayer.create('masonry');

  Masonry.prototype._resetLayout = function() {
    this.getSize();
    this._getMeasurement( 'columnWidth', 'outerWidth' );
    this._getMeasurement( 'gutter', 'outerWidth' );
    this.measureColumns();

    // reset column Y
    var i = this.cols;
    this.colYs = [];
    while (i--) {
      this.colYs.push( 0 );
    }

    this.maxY = 0;
  };

  Masonry.prototype.measureColumns = function() {
    this.getContainerWidth();
    // if columnWidth is 0, default to outerWidth of first item
    if ( !this.columnWidth ) {
      var firstItem = this.items[0];
      var firstItemElem = firstItem && firstItem.element;
      // columnWidth fall back to item of first element
      this.columnWidth = firstItemElem && getSize( firstItemElem ).outerWidth ||
        // if first elem has no width, default to size of container
        this.containerWidth;
    }

    this.columnWidth += this.gutter;

    this.cols = Math.floor( ( this.containerWidth + this.gutter ) / this.columnWidth );
    this.cols = Math.max( this.cols, 1 );
  };

  Masonry.prototype.getContainerWidth = function() {
    // container is parent if fit width
    var container = this.options.isFitWidth ? this.element.parentNode : this.element;
    // check that this.size and size are there
    // IE8 triggers resize on body size change, so they might not be
    var size = getSize( container );
    this.containerWidth = size && size.innerWidth;
  };

  Masonry.prototype._getItemLayoutPosition = function( item ) {
    item.getSize();
    // how many columns does this brick span
    var remainder = item.size.outerWidth % this.columnWidth;
    var mathMethod = remainder && remainder < 1 ? 'round' : 'ceil';
    // round if off by 1 pixel, otherwise use ceil
    var colSpan = Math[ mathMethod ]( item.size.outerWidth / this.columnWidth );
    colSpan = Math.min( colSpan, this.cols );

    var colGroup = this._getColGroup( colSpan );
    // get the minimum Y value from the columns
    var minimumY = Math.min.apply( Math, colGroup );
    var shortColIndex = indexOf( colGroup, minimumY );

    // position the brick
    var position = {
      x: this.columnWidth * shortColIndex,
      y: minimumY
    };

    // apply setHeight to necessary columns
    var setHeight = minimumY + item.size.outerHeight;
    var setSpan = this.cols + 1 - colGroup.length;
    for ( var i = 0; i < setSpan; i++ ) {
      this.colYs[ shortColIndex + i ] = setHeight;
    }

    return position;
  };

  /**
   * @param {Number} colSpan - number of columns the element spans
   * @returns {Array} colGroup
   */
  Masonry.prototype._getColGroup = function( colSpan ) {
    if ( colSpan < 2 ) {
      // if brick spans only one column, use all the column Ys
      return this.colYs;
    }

    var colGroup = [];
    // how many different places could this brick fit horizontally
    var groupCount = this.cols + 1 - colSpan;
    // for each group potential horizontal position
    for ( var i = 0; i < groupCount; i++ ) {
      // make an array of colY values for that one group
      var groupColYs = this.colYs.slice( i, i + colSpan );
      // and get the max value of the array
      colGroup[i] = Math.max.apply( Math, groupColYs );
    }
    return colGroup;
  };

  Masonry.prototype._manageStamp = function( stamp ) {
    var stampSize = getSize( stamp );
    var offset = this._getElementOffset( stamp );
    // get the columns that this stamp affects
    var firstX = this.options.isOriginLeft ? offset.left : offset.right;
    var lastX = firstX + stampSize.outerWidth;
    var firstCol = Math.floor( firstX / this.columnWidth );
    firstCol = Math.max( 0, firstCol );
    var lastCol = Math.floor( lastX / this.columnWidth );
    // lastCol should not go over if multiple of columnWidth #425
    lastCol -= lastX % this.columnWidth ? 0 : 1;
    lastCol = Math.min( this.cols - 1, lastCol );
    // set colYs to bottom of the stamp
    var stampMaxY = ( this.options.isOriginTop ? offset.top : offset.bottom ) +
      stampSize.outerHeight;
    for ( var i = firstCol; i <= lastCol; i++ ) {
      this.colYs[i] = Math.max( stampMaxY, this.colYs[i] );
    }
  };

  Masonry.prototype._getContainerSize = function() {
    this.maxY = Math.max.apply( Math, this.colYs );
    var size = {
      height: this.maxY
    };

    if ( this.options.isFitWidth ) {
      size.width = this._getContainerFitWidth();
    }

    return size;
  };

  Masonry.prototype._getContainerFitWidth = function() {
    var unusedCols = 0;
    // count unused columns
    var i = this.cols;
    while ( --i ) {
      if ( this.colYs[i] !== 0 ) {
        break;
      }
      unusedCols++;
    }
    // fit container to columns that have been used
    return ( this.cols - unusedCols ) * this.columnWidth - this.gutter;
  };

  // debounced, layout on resize
  // HEADS UP this overwrites Outlayer.resize
  // Any changes in Outlayer.resize need to be manually added here
  Masonry.prototype.resize = function() {
    // don't trigger if size did not change
    var previousWidth = this.containerWidth;
    this.getContainerWidth();
    if ( previousWidth === this.containerWidth ) {
      return;
    }

    this.layout();
  };

  return Masonry;
}

// -------------------------- transport -------------------------- //

if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( [
      'outlayer/outlayer',
      'get-size/get-size'
    ],
    masonryDefinition );
} else {
  // browser global
  window.Masonry = masonryDefinition(
    window.Outlayer,
    window.getSize
  );
}

})( window );
(function() {
  var Evented, addClass, defer, deferred, extend, flush, getBounds, getOffsetParent, getOrigin, getScrollBarSize, getScrollParent, hasClass, node, removeClass, uniqueId, updateClasses, zeroPosCache,
    __hasProp = {}.hasOwnProperty,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = [].slice;

  if (this.Tether == null) {
    this.Tether = {
      modules: []
    };
  }

  getScrollParent = function(el) {
    var parent, position, scrollParent, style, _ref;
    position = getComputedStyle(el).position;
    if (position === 'fixed') {
      return el;
    }
    scrollParent = void 0;
    parent = el;
    while (parent = parent.parentNode) {
      try {
        style = getComputedStyle(parent);
      } catch (_error) {}
      if (style == null) {
        return parent;
      }
      if (/(auto|scroll)/.test(style['overflow'] + style['overflow-y'] + style['overflow-x'])) {
        if (position !== 'absolute' || ((_ref = style['position']) === 'relative' || _ref === 'absolute' || _ref === 'fixed')) {
          return parent;
        }
      }
    }
    return document.body;
  };

  uniqueId = (function() {
    var id;
    id = 0;
    return function() {
      return id++;
    };
  })();

  zeroPosCache = {};

  getOrigin = function(doc) {
    var id, k, node, v, _ref;
    node = doc._tetherZeroElement;
    if (node == null) {
      node = doc.createElement('div');
      node.setAttribute('data-tether-id', uniqueId());
      extend(node.style, {
        top: 0,
        left: 0,
        position: 'absolute'
      });
      doc.body.appendChild(node);
      doc._tetherZeroElement = node;
    }
    id = node.getAttribute('data-tether-id');
    if (zeroPosCache[id] == null) {
      zeroPosCache[id] = {};
      _ref = node.getBoundingClientRect();
      for (k in _ref) {
        v = _ref[k];
        zeroPosCache[id][k] = v;
      }
      defer(function() {
        return zeroPosCache[id] = void 0;
      });
    }
    return zeroPosCache[id];
  };

  node = null;

  getBounds = function(el) {
    var box, doc, docEl, k, origin, v, _ref;
    if (el === document) {
      doc = document;
      el = document.documentElement;
    } else {
      doc = el.ownerDocument;
    }
    docEl = doc.documentElement;
    box = {};
    _ref = el.getBoundingClientRect();
    for (k in _ref) {
      v = _ref[k];
      box[k] = v;
    }
    origin = getOrigin(doc);
    box.top -= origin.top;
    box.left -= origin.left;
    if (box.width == null) {
      box.width = document.body.scrollWidth - box.left - box.right;
    }
    if (box.height == null) {
      box.height = document.body.scrollHeight - box.top - box.bottom;
    }
    box.top = box.top - docEl.clientTop;
    box.left = box.left - docEl.clientLeft;
    box.right = doc.body.clientWidth - box.width - box.left;
    box.bottom = doc.body.clientHeight - box.height - box.top;
    return box;
  };

  getOffsetParent = function(el) {
    return el.offsetParent || document.documentElement;
  };

  getScrollBarSize = function() {
    var inner, outer, width, widthContained, widthScroll;
    inner = document.createElement('div');
    inner.style.width = '100%';
    inner.style.height = '200px';
    outer = document.createElement('div');
    extend(outer.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      pointerEvents: 'none',
      visibility: 'hidden',
      width: '200px',
      height: '150px',
      overflow: 'hidden'
    });
    outer.appendChild(inner);
    document.body.appendChild(outer);
    widthContained = inner.offsetWidth;
    outer.style.overflow = 'scroll';
    widthScroll = inner.offsetWidth;
    if (widthContained === widthScroll) {
      widthScroll = outer.clientWidth;
    }
    document.body.removeChild(outer);
    width = widthContained - widthScroll;
    return {
      width: width,
      height: width
    };
  };

  extend = function(out) {
    var args, key, obj, val, _i, _len, _ref;
    if (out == null) {
      out = {};
    }
    args = [];
    Array.prototype.push.apply(args, arguments);
    _ref = args.slice(1);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      obj = _ref[_i];
      if (obj) {
        for (key in obj) {
          if (!__hasProp.call(obj, key)) continue;
          val = obj[key];
          out[key] = val;
        }
      }
    }
    return out;
  };

  removeClass = function(el, name) {
    var cls, _i, _len, _ref, _results;
    if (el.classList != null) {
      _ref = name.split(' ');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cls = _ref[_i];
        if (cls.trim()) {
          _results.push(el.classList.remove(cls));
        }
      }
      return _results;
    } else {
      return el.className = el.className.replace(new RegExp("(^| )" + (name.split(' ').join('|')) + "( |$)", 'gi'), ' ');
    }
  };

  addClass = function(el, name) {
    var cls, _i, _len, _ref, _results;
    if (el.classList != null) {
      _ref = name.split(' ');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cls = _ref[_i];
        if (cls.trim()) {
          _results.push(el.classList.add(cls));
        }
      }
      return _results;
    } else {
      removeClass(el, name);
      return el.className += " " + name;
    }
  };

  hasClass = function(el, name) {
    if (el.classList != null) {
      return el.classList.contains(name);
    } else {
      return new RegExp("(^| )" + name + "( |$)", 'gi').test(el.className);
    }
  };

  updateClasses = function(el, add, all) {
    var cls, _i, _j, _len, _len1, _results;
    for (_i = 0, _len = all.length; _i < _len; _i++) {
      cls = all[_i];
      if (__indexOf.call(add, cls) < 0) {
        if (hasClass(el, cls)) {
          removeClass(el, cls);
        }
      }
    }
    _results = [];
    for (_j = 0, _len1 = add.length; _j < _len1; _j++) {
      cls = add[_j];
      if (!hasClass(el, cls)) {
        _results.push(addClass(el, cls));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  deferred = [];

  defer = function(fn) {
    return deferred.push(fn);
  };

  flush = function() {
    var fn, _results;
    _results = [];
    while (fn = deferred.pop()) {
      _results.push(fn());
    }
    return _results;
  };

  Evented = (function() {
    function Evented() {}

    Evented.prototype.on = function(event, handler, ctx, once) {
      var _base;
      if (once == null) {
        once = false;
      }
      if (this.bindings == null) {
        this.bindings = {};
      }
      if ((_base = this.bindings)[event] == null) {
        _base[event] = [];
      }
      return this.bindings[event].push({
        handler: handler,
        ctx: ctx,
        once: once
      });
    };

    Evented.prototype.once = function(event, handler, ctx) {
      return this.on(event, handler, ctx, true);
    };

    Evented.prototype.off = function(event, handler) {
      var i, _ref, _results;
      if (((_ref = this.bindings) != null ? _ref[event] : void 0) == null) {
        return;
      }
      if (handler == null) {
        return delete this.bindings[event];
      } else {
        i = 0;
        _results = [];
        while (i < this.bindings[event].length) {
          if (this.bindings[event][i].handler === handler) {
            _results.push(this.bindings[event].splice(i, 1));
          } else {
            _results.push(i++);
          }
        }
        return _results;
      }
    };

    Evented.prototype.trigger = function() {
      var args, ctx, event, handler, i, once, _ref, _ref1, _results;
      event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if ((_ref = this.bindings) != null ? _ref[event] : void 0) {
        i = 0;
        _results = [];
        while (i < this.bindings[event].length) {
          _ref1 = this.bindings[event][i], handler = _ref1.handler, ctx = _ref1.ctx, once = _ref1.once;
          handler.apply(ctx != null ? ctx : this, args);
          if (once) {
            _results.push(this.bindings[event].splice(i, 1));
          } else {
            _results.push(i++);
          }
        }
        return _results;
      }
    };

    return Evented;

  })();

  this.Tether.Utils = {
    getScrollParent: getScrollParent,
    getBounds: getBounds,
    getOffsetParent: getOffsetParent,
    extend: extend,
    addClass: addClass,
    removeClass: removeClass,
    hasClass: hasClass,
    updateClasses: updateClasses,
    defer: defer,
    flush: flush,
    uniqueId: uniqueId,
    Evented: Evented,
    getScrollBarSize: getScrollBarSize
  };

}).call(this);
(function() {
  var MIRROR_LR, MIRROR_TB, OFFSET_MAP, Tether, addClass, addOffset, attachmentToOffset, autoToFixedAttachment, defer, extend, flush, getBounds, getOffsetParent, getOuterSize, getScrollBarSize, getScrollParent, getSize, now, offsetToPx, parseAttachment, parseOffset, position, removeClass, tethers, transformKey, updateClasses, within, _Tether, _ref,
    __slice = [].slice,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  if (this.Tether == null) {
    throw new Error("You must include the utils.js file before tether.js");
  }

  Tether = this.Tether;

  _ref = Tether.Utils, getScrollParent = _ref.getScrollParent, getSize = _ref.getSize, getOuterSize = _ref.getOuterSize, getBounds = _ref.getBounds, getOffsetParent = _ref.getOffsetParent, extend = _ref.extend, addClass = _ref.addClass, removeClass = _ref.removeClass, updateClasses = _ref.updateClasses, defer = _ref.defer, flush = _ref.flush, getScrollBarSize = _ref.getScrollBarSize;

  within = function(a, b, diff) {
    if (diff == null) {
      diff = 1;
    }
    return (a + diff >= b && b >= a - diff);
  };

  transformKey = (function() {
    var el, key, _i, _len, _ref1;
    el = document.createElement('div');
    _ref1 = ['transform', 'webkitTransform', 'OTransform', 'MozTransform', 'msTransform'];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      key = _ref1[_i];
      if (el.style[key] !== void 0) {
        return key;
      }
    }
  })();

  tethers = [];

  position = function() {
    var tether, _i, _len;
    for (_i = 0, _len = tethers.length; _i < _len; _i++) {
      tether = tethers[_i];
      tether.position(false);
    }
    return flush();
  };

  now = function() {
    var _ref1;
    return (_ref1 = typeof performance !== "undefined" && performance !== null ? typeof performance.now === "function" ? performance.now() : void 0 : void 0) != null ? _ref1 : +(new Date);
  };

  (function() {
    var event, lastCall, lastDuration, pendingTimeout, tick, _i, _len, _ref1, _results;
    lastCall = null;
    lastDuration = null;
    pendingTimeout = null;
    tick = function() {
      if ((lastDuration != null) && lastDuration > 16) {
        lastDuration = Math.min(lastDuration - 16, 250);
        pendingTimeout = setTimeout(tick, 250);
        return;
      }
      if ((lastCall != null) && (now() - lastCall) < 10) {
        return;
      }
      if (pendingTimeout != null) {
        clearTimeout(pendingTimeout);
        pendingTimeout = null;
      }
      lastCall = now();
      position();
      return lastDuration = now() - lastCall;
    };
    _ref1 = ['resize', 'scroll', 'touchmove'];
    _results = [];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      event = _ref1[_i];
      _results.push(window.addEventListener(event, tick));
    }
    return _results;
  })();

  MIRROR_LR = {
    center: 'center',
    left: 'right',
    right: 'left'
  };

  MIRROR_TB = {
    middle: 'middle',
    top: 'bottom',
    bottom: 'top'
  };

  OFFSET_MAP = {
    top: 0,
    left: 0,
    middle: '50%',
    center: '50%',
    bottom: '100%',
    right: '100%'
  };

  autoToFixedAttachment = function(attachment, relativeToAttachment) {
    var left, top;
    left = attachment.left, top = attachment.top;
    if (left === 'auto') {
      left = MIRROR_LR[relativeToAttachment.left];
    }
    if (top === 'auto') {
      top = MIRROR_TB[relativeToAttachment.top];
    }
    return {
      left: left,
      top: top
    };
  };

  attachmentToOffset = function(attachment) {
    var _ref1, _ref2;
    return {
      left: (_ref1 = OFFSET_MAP[attachment.left]) != null ? _ref1 : attachment.left,
      top: (_ref2 = OFFSET_MAP[attachment.top]) != null ? _ref2 : attachment.top
    };
  };

  addOffset = function() {
    var left, offsets, out, top, _i, _len, _ref1;
    offsets = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    out = {
      top: 0,
      left: 0
    };
    for (_i = 0, _len = offsets.length; _i < _len; _i++) {
      _ref1 = offsets[_i], top = _ref1.top, left = _ref1.left;
      if (typeof top === 'string') {
        top = parseFloat(top, 10);
      }
      if (typeof left === 'string') {
        left = parseFloat(left, 10);
      }
      out.top += top;
      out.left += left;
    }
    return out;
  };

  offsetToPx = function(offset, size) {
    if (typeof offset.left === 'string' && offset.left.indexOf('%') !== -1) {
      offset.left = parseFloat(offset.left, 10) / 100 * size.width;
    }
    if (typeof offset.top === 'string' && offset.top.indexOf('%') !== -1) {
      offset.top = parseFloat(offset.top, 10) / 100 * size.height;
    }
    return offset;
  };

  parseAttachment = parseOffset = function(value) {
    var left, top, _ref1;
    _ref1 = value.split(' '), top = _ref1[0], left = _ref1[1];
    return {
      top: top,
      left: left
    };
  };

  _Tether = (function() {
    _Tether.modules = [];

    function _Tether(options) {
      this.position = __bind(this.position, this);
      var module, _i, _len, _ref1, _ref2;
      tethers.push(this);
      this.history = [];
      this.setOptions(options, false);
      _ref1 = Tether.modules;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        module = _ref1[_i];
        if ((_ref2 = module.initialize) != null) {
          _ref2.call(this);
        }
      }
      this.position();
    }

    _Tether.prototype.getClass = function(key) {
      var _ref1, _ref2;
      if ((_ref1 = this.options.classes) != null ? _ref1[key] : void 0) {
        return this.options.classes[key];
      } else if (((_ref2 = this.options.classes) != null ? _ref2[key] : void 0) !== false) {
        if (this.options.classPrefix) {
          return "" + this.options.classPrefix + "-" + key;
        } else {
          return key;
        }
      } else {
        return '';
      }
    };

    _Tether.prototype.setOptions = function(options, position) {
      var defaults, key, _i, _len, _ref1, _ref2;
      this.options = options;
      if (position == null) {
        position = true;
      }
      defaults = {
        offset: '0 0',
        targetOffset: '0 0',
        targetAttachment: 'auto auto',
        classPrefix: 'tether'
      };
      this.options = extend(defaults, this.options);
      _ref1 = this.options, this.element = _ref1.element, this.target = _ref1.target, this.targetModifier = _ref1.targetModifier;
      if (this.target === 'viewport') {
        this.target = document.body;
        this.targetModifier = 'visible';
      } else if (this.target === 'scroll-handle') {
        this.target = document.body;
        this.targetModifier = 'scroll-handle';
      }
      _ref2 = ['element', 'target'];
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        key = _ref2[_i];
        if (this[key] == null) {
          throw new Error("Tether Error: Both element and target must be defined");
        }
        if (this[key].jquery != null) {
          this[key] = this[key][0];
        } else if (typeof this[key] === 'string') {
          this[key] = document.querySelector(this[key]);
        }
      }
      addClass(this.element, this.getClass('element'));
      addClass(this.target, this.getClass('target'));
      if (!this.options.attachment) {
        throw new Error("Tether Error: You must provide an attachment");
      }
      this.targetAttachment = parseAttachment(this.options.targetAttachment);
      this.attachment = parseAttachment(this.options.attachment);
      this.offset = parseOffset(this.options.offset);
      this.targetOffset = parseOffset(this.options.targetOffset);
      if (this.scrollParent != null) {
        this.disable();
      }
      if (this.targetModifier === 'scroll-handle') {
        this.scrollParent = this.target;
      } else {
        this.scrollParent = getScrollParent(this.target);
      }
      if (this.options.enabled !== false) {
        return this.enable(position);
      }
    };

    _Tether.prototype.getTargetBounds = function() {
      var bounds, fitAdj, hasBottomScroll, height, out, scrollBottom, scrollPercentage, style, target;
      if (this.targetModifier != null) {
        switch (this.targetModifier) {
          case 'visible':
            if (this.target === document.body) {
              return {
                top: pageYOffset,
                left: pageXOffset,
                height: innerHeight,
                width: innerWidth
              };
            } else {
              bounds = getBounds(this.target);
              out = {
                height: bounds.height,
                width: bounds.width,
                top: bounds.top,
                left: bounds.left
              };
              out.height = Math.min(out.height, bounds.height - (pageYOffset - bounds.top));
              out.height = Math.min(out.height, bounds.height - ((bounds.top + bounds.height) - (pageYOffset + innerHeight)));
              out.height = Math.min(innerHeight, out.height);
              out.height -= 2;
              out.width = Math.min(out.width, bounds.width - (pageXOffset - bounds.left));
              out.width = Math.min(out.width, bounds.width - ((bounds.left + bounds.width) - (pageXOffset + innerWidth)));
              out.width = Math.min(innerWidth, out.width);
              out.width -= 2;
              if (out.top < pageYOffset) {
                out.top = pageYOffset;
              }
              if (out.left < pageXOffset) {
                out.left = pageXOffset;
              }
              return out;
            }
            break;
          case 'scroll-handle':
            target = this.target;
            if (target === document.body) {
              target = document.documentElement;
              bounds = {
                left: pageXOffset,
                top: pageYOffset,
                height: innerHeight,
                width: innerWidth
              };
            } else {
              bounds = getBounds(target);
            }
            style = getComputedStyle(target);
            hasBottomScroll = target.scrollWidth > target.clientWidth || 'scroll' === [style.overflow, style.overflowX] || this.target !== document.body;
            scrollBottom = 0;
            if (hasBottomScroll) {
              scrollBottom = 15;
            }
            height = bounds.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth) - scrollBottom;
            out = {
              width: 15,
              height: height * 0.975 * (height / target.scrollHeight),
              left: bounds.left + bounds.width - parseFloat(style.borderLeftWidth) - 15
            };
            fitAdj = 0;
            if (height < 408 && this.target === document.body) {
              fitAdj = -0.00011 * Math.pow(height, 2) - 0.00727 * height + 22.58;
            }
            if (this.target !== document.body) {
              out.height = Math.max(out.height, 24);
            }
            scrollPercentage = this.target.scrollTop / (target.scrollHeight - height);
            out.top = scrollPercentage * (height - out.height - fitAdj) + bounds.top + parseFloat(style.borderTopWidth);
            if (this.target === document.body) {
              out.height = Math.max(out.height, 24);
            }
            return out;
        }
      } else {
        return getBounds(this.target);
      }
    };

    _Tether.prototype.clearCache = function() {
      return this._cache = {};
    };

    _Tether.prototype.cache = function(k, getter) {
      if (this._cache == null) {
        this._cache = {};
      }
      if (this._cache[k] == null) {
        this._cache[k] = getter.call(this);
      }
      return this._cache[k];
    };

    _Tether.prototype.enable = function(position) {
      if (position == null) {
        position = true;
      }
      addClass(this.target, this.getClass('enabled'));
      addClass(this.element, this.getClass('enabled'));
      this.enabled = true;
      if (this.scrollParent !== document) {
        this.scrollParent.addEventListener('scroll', this.position);
      }
      if (position) {
        return this.position();
      }
    };

    _Tether.prototype.disable = function() {
      removeClass(this.target, this.getClass('enabled'));
      removeClass(this.element, this.getClass('enabled'));
      this.enabled = false;
      if (this.scrollParent != null) {
        return this.scrollParent.removeEventListener('scroll', this.position);
      }
    };

    _Tether.prototype.destroy = function() {
      var i, tether, _i, _len, _results;
      this.disable();
      _results = [];
      for (i = _i = 0, _len = tethers.length; _i < _len; i = ++_i) {
        tether = tethers[i];
        if (tether === this) {
          tethers.splice(i, 1);
          break;
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    _Tether.prototype.updateAttachClasses = function(elementAttach, targetAttach) {
      var add, all, side, sides, _i, _j, _len, _len1, _ref1,
        _this = this;
      if (elementAttach == null) {
        elementAttach = this.attachment;
      }
      if (targetAttach == null) {
        targetAttach = this.targetAttachment;
      }
      sides = ['left', 'top', 'bottom', 'right', 'middle', 'center'];
      if ((_ref1 = this._addAttachClasses) != null ? _ref1.length : void 0) {
        this._addAttachClasses.splice(0, this._addAttachClasses.length);
      }
      add = this._addAttachClasses != null ? this._addAttachClasses : this._addAttachClasses = [];
      if (elementAttach.top) {
        add.push("" + (this.getClass('element-attached')) + "-" + elementAttach.top);
      }
      if (elementAttach.left) {
        add.push("" + (this.getClass('element-attached')) + "-" + elementAttach.left);
      }
      if (targetAttach.top) {
        add.push("" + (this.getClass('target-attached')) + "-" + targetAttach.top);
      }
      if (targetAttach.left) {
        add.push("" + (this.getClass('target-attached')) + "-" + targetAttach.left);
      }
      all = [];
      for (_i = 0, _len = sides.length; _i < _len; _i++) {
        side = sides[_i];
        all.push("" + (this.getClass('element-attached')) + "-" + side);
      }
      for (_j = 0, _len1 = sides.length; _j < _len1; _j++) {
        side = sides[_j];
        all.push("" + (this.getClass('target-attached')) + "-" + side);
      }
      return defer(function() {
        if (_this._addAttachClasses == null) {
          return;
        }
        updateClasses(_this.element, _this._addAttachClasses, all);
        updateClasses(_this.target, _this._addAttachClasses, all);
        return _this._addAttachClasses = void 0;
      });
    };

    _Tether.prototype.position = function(flushChanges) {
      var elementPos, elementStyle, height, left, manualOffset, manualTargetOffset, module, next, offset, offsetBorder, offsetParent, offsetParentSize, offsetParentStyle, offsetPosition, ret, scrollLeft, scrollTop, scrollbarSize, side, targetAttachment, targetOffset, targetPos, targetSize, top, width, _i, _j, _len, _len1, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6,
        _this = this;
      if (flushChanges == null) {
        flushChanges = true;
      }
      if (!this.enabled) {
        return;
      }
      this.clearCache();
      targetAttachment = autoToFixedAttachment(this.targetAttachment, this.attachment);
      this.updateAttachClasses(this.attachment, targetAttachment);
      elementPos = this.cache('element-bounds', function() {
        return getBounds(_this.element);
      });
      width = elementPos.width, height = elementPos.height;
      if (width === 0 && height === 0 && (this.lastSize != null)) {
        _ref1 = this.lastSize, width = _ref1.width, height = _ref1.height;
      } else {
        this.lastSize = {
          width: width,
          height: height
        };
      }
      targetSize = targetPos = this.cache('target-bounds', function() {
        return _this.getTargetBounds();
      });
      offset = offsetToPx(attachmentToOffset(this.attachment), {
        width: width,
        height: height
      });
      targetOffset = offsetToPx(attachmentToOffset(targetAttachment), targetSize);
      manualOffset = offsetToPx(this.offset, {
        width: width,
        height: height
      });
      manualTargetOffset = offsetToPx(this.targetOffset, targetSize);
      offset = addOffset(offset, manualOffset);
      targetOffset = addOffset(targetOffset, manualTargetOffset);
      left = targetPos.left + targetOffset.left - offset.left;
      top = targetPos.top + targetOffset.top - offset.top;
      _ref2 = Tether.modules;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        module = _ref2[_i];
        ret = module.position.call(this, {
          left: left,
          top: top,
          targetAttachment: targetAttachment,
          targetPos: targetPos,
          attachment: this.attachment,
          elementPos: elementPos,
          offset: offset,
          targetOffset: targetOffset,
          manualOffset: manualOffset,
          manualTargetOffset: manualTargetOffset,
          scrollbarSize: scrollbarSize
        });
        if ((ret == null) || typeof ret !== 'object') {
          continue;
        } else if (ret === false) {
          return false;
        } else {
          top = ret.top, left = ret.left;
        }
      }
      next = {
        page: {
          top: top,
          left: left
        },
        viewport: {
          top: top - pageYOffset,
          bottom: pageYOffset - top - height + innerHeight,
          left: left - pageXOffset,
          right: pageXOffset - left - width + innerWidth
        }
      };
      if (document.body.scrollWidth > window.innerWidth) {
        scrollbarSize = this.cache('scrollbar-size', getScrollBarSize);
        next.viewport.bottom -= scrollbarSize.height;
      }
      if (document.body.scrollHeight > window.innerHeight) {
        scrollbarSize = this.cache('scrollbar-size', getScrollBarSize);
        next.viewport.right -= scrollbarSize.width;
      }
      if (((_ref3 = document.body.style.position) !== '' && _ref3 !== 'static') || ((_ref4 = document.body.parentElement.style.position) !== '' && _ref4 !== 'static')) {
        next.page.bottom = document.body.scrollHeight - top - height;
        next.page.right = document.body.scrollWidth - left - width;
      }
      if (((_ref5 = this.options.optimizations) != null ? _ref5.moveElement : void 0) !== false && (this.targetModifier == null)) {
        offsetParent = this.cache('target-offsetparent', function() {
          return getOffsetParent(_this.target);
        });
        offsetPosition = this.cache('target-offsetparent-bounds', function() {
          return getBounds(offsetParent);
        });
        offsetParentStyle = getComputedStyle(offsetParent);
        elementStyle = getComputedStyle(this.element);
        offsetParentSize = offsetPosition;
        offsetBorder = {};
        _ref6 = ['Top', 'Left', 'Bottom', 'Right'];
        for (_j = 0, _len1 = _ref6.length; _j < _len1; _j++) {
          side = _ref6[_j];
          offsetBorder[side.toLowerCase()] = parseFloat(offsetParentStyle["border" + side + "Width"]);
        }
        offsetPosition.right = document.body.scrollWidth - offsetPosition.left - offsetParentSize.width + offsetBorder.right;
        offsetPosition.bottom = document.body.scrollHeight - offsetPosition.top - offsetParentSize.height + offsetBorder.bottom;
        if (next.page.top >= (offsetPosition.top + offsetBorder.top) && next.page.bottom >= offsetPosition.bottom) {
          if (next.page.left >= (offsetPosition.left + offsetBorder.left) && next.page.right >= offsetPosition.right) {
            scrollTop = offsetParent.scrollTop;
            scrollLeft = offsetParent.scrollLeft;
            next.offset = {
              top: next.page.top - offsetPosition.top + scrollTop - offsetBorder.top,
              left: next.page.left - offsetPosition.left + scrollLeft - offsetBorder.left
            };
          }
        }
      }
      this.move(next);
      this.history.unshift(next);
      if (this.history.length > 3) {
        this.history.pop();
      }
      if (flushChanges) {
        flush();
      }
      return true;
    };

    _Tether.prototype.move = function(position) {
      var css, elVal, found, key, moved, offsetParent, point, same, transcribe, type, val, write, writeCSS, _i, _len, _ref1, _ref2,
        _this = this;
      if (this.element.parentNode == null) {
        return;
      }
      same = {};
      for (type in position) {
        same[type] = {};
        for (key in position[type]) {
          found = false;
          _ref1 = this.history;
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            point = _ref1[_i];
            if (!within((_ref2 = point[type]) != null ? _ref2[key] : void 0, position[type][key])) {
              found = true;
              break;
            }
          }
          if (!found) {
            same[type][key] = true;
          }
        }
      }
      css = {
        top: '',
        left: '',
        right: '',
        bottom: ''
      };
      transcribe = function(same, pos) {
        var xPos, yPos, _ref3;
        if (((_ref3 = _this.options.optimizations) != null ? _ref3.gpu : void 0) !== false) {
          if (same.top) {
            css.top = 0;
            yPos = pos.top;
          } else {
            css.bottom = 0;
            yPos = -pos.bottom;
          }
          if (same.left) {
            css.left = 0;
            xPos = pos.left;
          } else {
            css.right = 0;
            xPos = -pos.right;
          }
          css[transformKey] = "translateX(" + (Math.round(xPos)) + "px) translateY(" + (Math.round(yPos)) + "px)";
          if (transformKey !== 'msTransform') {
            return css[transformKey] += " translateZ(0)";
          }
        } else {
          if (same.top) {
            css.top = "" + pos.top + "px";
          } else {
            css.bottom = "" + pos.bottom + "px";
          }
          if (same.left) {
            return css.left = "" + pos.left + "px";
          } else {
            return css.right = "" + pos.right + "px";
          }
        }
      };
      moved = false;
      if ((same.page.top || same.page.bottom) && (same.page.left || same.page.right)) {
        css.position = 'absolute';
        transcribe(same.page, position.page);
      } else if ((same.viewport.top || same.viewport.bottom) && (same.viewport.left || same.viewport.right)) {
        css.position = 'fixed';
        transcribe(same.viewport, position.viewport);
      } else if ((same.offset != null) && same.offset.top && same.offset.left) {
        css.position = 'absolute';
        offsetParent = this.cache('target-offsetparent', function() {
          return getOffsetParent(_this.target);
        });
        if (getOffsetParent(this.element) !== offsetParent) {
          defer(function() {
            _this.element.parentNode.removeChild(_this.element);
            return offsetParent.appendChild(_this.element);
          });
        }
        transcribe(same.offset, position.offset);
        moved = true;
      } else {
        css.position = 'absolute';
        transcribe({
          top: true,
          left: true
        }, position.page);
      }
      if (!moved && this.element.parentNode.tagName !== 'BODY') {
        this.element.parentNode.removeChild(this.element);
        document.body.appendChild(this.element);
      }
      writeCSS = {};
      write = false;
      for (key in css) {
        val = css[key];
        elVal = this.element.style[key];
        if (elVal !== '' && val !== '' && (key === 'top' || key === 'left' || key === 'bottom' || key === 'right')) {
          elVal = parseFloat(elVal);
          val = parseFloat(val);
        }
        if (elVal !== val) {
          write = true;
          writeCSS[key] = css[key];
        }
      }
      if (write) {
        return defer(function() {
          return extend(_this.element.style, writeCSS);
        });
      }
    };

    return _Tether;

  })();

  Tether.position = position;

  this.Tether = extend(_Tether, Tether);

}).call(this);
(function() {
  var Evented, MIRROR_ATTACH, addClass, allDrops, clickEvents, createContext, end, extend, hasClass, name, removeClass, removeFromArray, sortAttach, tempEl, touchDevice, transitionEndEvent, transitionEndEvents, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  _ref = Tether.Utils, extend = _ref.extend, addClass = _ref.addClass, removeClass = _ref.removeClass, hasClass = _ref.hasClass, Evented = _ref.Evented;

  touchDevice = 'ontouchstart' in document.documentElement;

  clickEvents = ['click'];

  if (touchDevice) {
    clickEvents.push('touchstart');
  }

  transitionEndEvents = {
    'WebkitTransition': 'webkitTransitionEnd',
    'MozTransition': 'transitionend',
    'OTransition': 'otransitionend',
    'transition': 'transitionend'
  };

  transitionEndEvent = '';

  for (name in transitionEndEvents) {
    end = transitionEndEvents[name];
    tempEl = document.createElement('p');
    if (tempEl.style[name] !== void 0) {
      transitionEndEvent = end;
    }
  }

  sortAttach = function(str) {
    var first, second, _ref1, _ref2;
    _ref1 = str.split(' '), first = _ref1[0], second = _ref1[1];
    if (first === 'left' || first === 'right') {
      _ref2 = [second, first], first = _ref2[0], second = _ref2[1];
    }
    return [first, second].join(' ');
  };

  MIRROR_ATTACH = {
    left: 'right',
    right: 'left',
    top: 'bottom',
    bottom: 'top',
    middle: 'middle',
    center: 'center'
  };

  allDrops = {};

  removeFromArray = function(arr, item) {
    var index, _results;
    _results = [];
    while ((index = arr.indexOf(item)) !== -1) {
      _results.push(arr.splice(index, 1));
    }
    return _results;
  };

  createContext = function(options) {
    var DropInstance, defaultOptions, drop, _name;
    if (options == null) {
      options = {};
    }
    drop = function() {
      return (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return Object(result) === result ? result : child;
      })(DropInstance, arguments, function(){});
    };
    extend(drop, {
      createContext: createContext,
      drops: [],
      defaults: {}
    });
    defaultOptions = {
      classPrefix: 'drop',
      defaults: {
        position: 'bottom left',
        openOn: 'click',
        constrainToScrollParent: true,
        constrainToWindow: true,
        classes: '',
        remove: false,
        tetherOptions: {}
      }
    };
    extend(drop, defaultOptions, options);
    extend(drop.defaults, defaultOptions.defaults, options.defaults);
    if (allDrops[_name = drop.classPrefix] == null) {
      allDrops[_name] = [];
    }
    drop.updateBodyClasses = function() {
      var anyOpen, _drop, _i, _len, _ref1;
      anyOpen = false;
      _ref1 = allDrops[drop.classPrefix];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        _drop = _ref1[_i];
        if (!(_drop.isOpened())) {
          continue;
        }
        anyOpen = true;
        break;
      }
      if (anyOpen) {
        return addClass(document.body, "" + drop.classPrefix + "-open");
      } else {
        return removeClass(document.body, "" + drop.classPrefix + "-open");
      }
    };
    DropInstance = (function(_super) {
      __extends(DropInstance, _super);

      function DropInstance(options) {
        this.options = options;
        this.options = extend({}, drop.defaults, this.options);
        this.target = this.options.target;
        if (this.target == null) {
          throw new Error('Drop Error: You must provide a target.');
        }
        if (this.options.classes) {
          addClass(this.target, this.options.classes);
        }
        drop.drops.push(this);
        allDrops[drop.classPrefix].push(this);
        this._boundEvents = [];
        this.setupElements();
        this.setupEvents();
        this.setupTether();
      }

      DropInstance.prototype._on = function(element, event, handler) {
        this._boundEvents.push({
          element: element,
          event: event,
          handler: handler
        });
        return element.addEventListener(event, handler);
      };

      DropInstance.prototype.setupElements = function() {
        var _this = this;
        this.drop = document.createElement('div');
        addClass(this.drop, drop.classPrefix);
        if (this.options.classes) {
          addClass(this.drop, this.options.classes);
        }
        this.content = document.createElement('div');
        addClass(this.content, "" + drop.classPrefix + "-content");
        if (typeof this.options.content === 'function') {
          this.content.innerHTML = this.options.content.call(this, this);
          this.on('open', function() {
            return _this.content.innerHTML = _this.options.content.call(_this, _this);
          });
        } else if (typeof this.options.content === 'object') {
          this.content.appendChild(this.options.content);
        } else {
          this.content.innerHTML = this.options.content;
        }
        return this.drop.appendChild(this.content);
      };

      DropInstance.prototype.setupTether = function() {
        var constraints, dropAttach;
        dropAttach = this.options.position.split(' ');
        dropAttach[0] = MIRROR_ATTACH[dropAttach[0]];
        dropAttach = dropAttach.join(' ');
        constraints = [];
        if (this.options.constrainToScrollParent) {
          constraints.push({
            to: 'scrollParent',
            pin: 'top, bottom',
            attachment: 'together none'
          });
        } else {
          constraints.push({
            to: 'scrollParent'
          });
        }
        if (this.options.constrainToWindow !== false) {
          constraints.push({
            to: 'window',
            attachment: 'together'
          });
        } else {
          constraints.push({
            to: 'window'
          });
        }
        options = {
          element: this.drop,
          target: this.target,
          attachment: sortAttach(dropAttach),
          targetAttachment: sortAttach(this.options.position),
          classPrefix: drop.classPrefix,
          offset: '0 0',
          targetOffset: '0 0',
          enabled: false,
          constraints: constraints
        };
        if (this.options.tetherOptions !== false) {
          return this.tether = new Tether(extend({}, options, this.options.tetherOptions));
        }
      };

      DropInstance.prototype.setupEvents = function() {
        var clickEvent, closeHandler, events, onUs, openHandler, out, outTimeout, over, _i, _len,
          _this = this;
        if (!this.options.openOn) {
          return;
        }
        if (this.options.openOn === 'always') {
          setTimeout(this.open.bind(this));
          return;
        }
        events = this.options.openOn.split(' ');
        if (__indexOf.call(events, 'click') >= 0) {
          openHandler = function(event) {
            _this.toggle();
            return event.preventDefault();
          };
          closeHandler = function(event) {
            if (!_this.isOpened()) {
              return;
            }
            if (event.target === _this.drop || _this.drop.contains(event.target)) {
              return;
            }
            if (event.target === _this.target || _this.target.contains(event.target)) {
              return;
            }
            return _this.close();
          };
          for (_i = 0, _len = clickEvents.length; _i < _len; _i++) {
            clickEvent = clickEvents[_i];
            this._on(this.target, clickEvent, openHandler);
            this._on(document, clickEvent, closeHandler);
          }
        }
        if (__indexOf.call(events, 'hover') >= 0) {
          onUs = false;
          over = function() {
            onUs = true;
            return _this.open();
          };
          outTimeout = null;
          out = function() {
            onUs = false;
            if (outTimeout != null) {
              clearTimeout(outTimeout);
            }
            return outTimeout = setTimeout(function() {
              if (!onUs) {
                _this.close();
              }
              return outTimeout = null;
            }, 50);
          };
          this._on(this.target, 'mouseover', over);
          this._on(this.drop, 'mouseover', over);
          this._on(this.target, 'mouseout', out);
          return this._on(this.drop, 'mouseout', out);
        }
      };

      DropInstance.prototype.isOpened = function() {
        return hasClass(this.drop, "" + drop.classPrefix + "-open");
      };

      DropInstance.prototype.toggle = function() {
        if (this.isOpened()) {
          return this.close();
        } else {
          return this.open();
        }
      };

      DropInstance.prototype.open = function() {
        var _ref1, _ref2,
          _this = this;
        if (this.isOpened()) {
          return;
        }
        if (!this.drop.parentNode) {
          document.body.appendChild(this.drop);
        }
        if ((_ref1 = this.tether) != null) {
          _ref1.enable();
        }
        addClass(this.drop, "" + drop.classPrefix + "-open");
        addClass(this.drop, "" + drop.classPrefix + "-open-transitionend");
        setTimeout(function() {
          return addClass(_this.drop, "" + drop.classPrefix + "-after-open");
        });
        if ((_ref2 = this.tether) != null) {
          _ref2.position();
        }
        this.trigger('open');
        return drop.updateBodyClasses();
      };

      DropInstance.prototype.close = function() {
        var handler, _ref1,
          _this = this;
        if (!this.isOpened()) {
          return;
        }
        removeClass(this.drop, "" + drop.classPrefix + "-open");
        removeClass(this.drop, "" + drop.classPrefix + "-after-open");
        this.drop.addEventListener(transitionEndEvent, handler = function() {
          if (!hasClass(_this.drop, "" + drop.classPrefix + "-open")) {
            removeClass(_this.drop, "" + drop.classPrefix + "-open-transitionend");
          }
          return _this.drop.removeEventListener(transitionEndEvent, handler);
        });
        this.trigger('close');
        if ((_ref1 = this.tether) != null) {
          _ref1.disable();
        }
        drop.updateBodyClasses();
        if (this.options.remove) {
          return this.remove();
        }
      };

      DropInstance.prototype.remove = function() {
        var _ref1;
        this.close();
        return (_ref1 = this.drop.parentNode) != null ? _ref1.removeChild(this.drop) : void 0;
      };

      DropInstance.prototype.position = function() {
        var _ref1;
        if (this.isOpened()) {
          return (_ref1 = this.tether) != null ? _ref1.position() : void 0;
        }
      };

      DropInstance.prototype.destroy = function() {
        var element, event, handler, _i, _len, _ref1, _ref2, _ref3;
        this.remove();
        if ((_ref1 = this.tether) != null) {
          _ref1.destroy();
        }
        _ref2 = this._boundEvents;
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          _ref3 = _ref2[_i], element = _ref3.element, event = _ref3.event, handler = _ref3.handler;
          element.removeEventListener(event, handler);
        }
        this._boundEvents = [];
        this.tether = null;
        this.drop = null;
        this.content = null;
        this.target = null;
        removeFromArray(allDrops[drop.classPrefix], this);
        return removeFromArray(drop.drops, this);
      };

      return DropInstance;

    })(Evented);
    return drop;
  };

  window.Drop = createContext();

  document.addEventListener('DOMContentLoaded', function() {
    return Drop.updateBodyClasses();
  });

}).call(this);
/*!
* Clamp.js 0.5.1
*
* Copyright 2011-2013, Joseph Schmitt http://joe.sh
* Released under the WTFPL license
* http://sam.zoy.org/wtfpl/
*/


(function(){
    /**
     * Clamps a text node.
     * @param {HTMLElement} element. Element containing the text node to clamp.
     * @param {Object} options. Options to pass to the clamper.
     */
    function clamp(element, options) {
        options = options || {};

        var self = this,
            win = window,
            opt = {
                clamp:              options.clamp || 2,
                useNativeClamp:     typeof(options.useNativeClamp) != 'undefined' ? options.useNativeClamp : true,
                splitOnChars:       options.splitOnChars || ['.', '-', '–', '—', ' '], //Split on sentences (periods), hypens, en-dashes, em-dashes, and words (spaces).
                animate:            options.animate || false,
                truncationChar:     options.truncationChar || '…',
                truncationHTML:     options.truncationHTML
            },

            sty = element.style,
            originalText = element.innerHTML,

            supportsNativeClamp = typeof(element.style.webkitLineClamp) != 'undefined',
            clampValue = opt.clamp,
            isCSSValue = clampValue.indexOf && (clampValue.indexOf('px') > -1 || clampValue.indexOf('em') > -1),
            truncationHTMLContainer;

        if (opt.truncationHTML) {
            truncationHTMLContainer = document.createElement('span');
            truncationHTMLContainer.innerHTML = opt.truncationHTML;
        }


// UTILITY FUNCTIONS __________________________________________________________

        /**
         * Return the current style for an element.
         * @param {HTMLElement} elem The element to compute.
         * @param {string} prop The style property.
         * @returns {number}
         */
        function computeStyle(elem, prop) {
            if (!win.getComputedStyle) {
                win.getComputedStyle = function(el, pseudo) {
                    this.el = el;
                    this.getPropertyValue = function(prop) {
                        var re = /(\-([a-z]){1})/g;
                        if (prop == 'float') prop = 'styleFloat';
                        if (re.test(prop)) {
                            prop = prop.replace(re, function () {
                                return arguments[2].toUpperCase();
                            });
                        }
                        return el.currentStyle && el.currentStyle[prop] ? el.currentStyle[prop] : null;
                    }
                    return this;
                }
            }

            return win.getComputedStyle(elem, null).getPropertyValue(prop);
        }

        /**
         * Returns the maximum number of lines of text that should be rendered based
         * on the current height of the element and the line-height of the text.
         */
        function getMaxLines(height) {
            var availHeight = height || element.clientHeight,
                lineHeight = getLineHeight(element);

            return Math.max(Math.floor(availHeight/lineHeight), 0);
        }

        /**
         * Returns the maximum height a given element should have based on the line-
         * height of the text and the given clamp value.
         */
        function getMaxHeight(clmp) {
            var lineHeight = getLineHeight(element);
            return lineHeight * clmp;
        }

        /**
         * Returns the line-height of an element as an integer.
         */
        function getLineHeight(elem) {
            var lh = computeStyle(elem, 'line-height');
            if (lh == 'normal') {
                // Normal line heights vary from browser to browser. The spec recommends
                // a value between 1.0 and 1.2 of the font size. Using 1.1 to split the diff.
                lh = parseInt(computeStyle(elem, 'font-size')) * 1.2;
            }
            return parseInt(lh);
        }


// MEAT AND POTATOES (MMMM, POTATOES...) ______________________________________
        var splitOnChars = opt.splitOnChars.slice(0),
            splitChar = splitOnChars[0],
            chunks,
            lastChunk;

        /**
         * Gets an element's last child. That may be another node or a node's contents.
         */
        function getLastChild(elem) {
            //Current element has children, need to go deeper and get last child as a text node
            if (elem.lastChild.children && elem.lastChild.children.length > 0) {
                return getLastChild(Array.prototype.slice.call(elem.children).pop());
            }
            //This is the absolute last child, a text node, but something's wrong with it. Remove it and keep trying
            else if (!elem.lastChild || !elem.lastChild.nodeValue || elem.lastChild.nodeValue == '' || elem.lastChild.nodeValue == opt.truncationChar) {
                elem.lastChild.parentNode.removeChild(elem.lastChild);
                return getLastChild(element);
            }
            //This is the last child we want, return it
            else {
                return elem.lastChild;
            }
        }

        /**
         * Removes one character at a time from the text until its width or
         * height is beneath the passed-in max param.
         */
        function truncate(target, maxHeight) {
            if (!maxHeight) {return;}

            /**
             * Resets global variables.
             */
            function reset() {
                splitOnChars = opt.splitOnChars.slice(0);
                splitChar = splitOnChars[0];
                chunks = null;
                lastChunk = null;
            }

            var nodeValue = target.nodeValue.replace(opt.truncationChar, '');

            //Grab the next chunks
            if (!chunks) {
                //If there are more characters to try, grab the next one
                if (splitOnChars.length > 0) {
                    splitChar = splitOnChars.shift();
                }
                //No characters to chunk by. Go character-by-character
                else {
                    splitChar = '';
                }

                chunks = nodeValue.split(splitChar);
            }

            //If there are chunks left to remove, remove the last one and see if
            // the nodeValue fits.
            if (chunks.length > 1) {
                // console.log('chunks', chunks);
                lastChunk = chunks.pop();
                // console.log('lastChunk', lastChunk);
                applyEllipsis(target, chunks.join(splitChar));
            }
            //No more chunks can be removed using this character
            else {
                chunks = null;
            }

            //Insert the custom HTML before the truncation character
            if (truncationHTMLContainer) {
                target.nodeValue = target.nodeValue.replace(opt.truncationChar, '');
                element.innerHTML = target.nodeValue + ' ' + truncationHTMLContainer.innerHTML + opt.truncationChar;
            }

            //Search produced valid chunks
            if (chunks) {
                //It fits
                if (element.clientHeight <= maxHeight) {
                    //There's still more characters to try splitting on, not quite done yet
                    if (splitOnChars.length >= 0 && splitChar != '') {
                        applyEllipsis(target, chunks.join(splitChar) + splitChar + lastChunk);
                        chunks = null;
                    }
                    //Finished!
                    else {
                        return element.innerHTML;
                    }
                }
            }
            //No valid chunks produced
            else {
                //No valid chunks even when splitting by letter, time to move
                //on to the next node
                if (splitChar == '') {
                    applyEllipsis(target, '');
                    target = getLastChild(element);

                    reset();
                }
            }

            //If you get here it means still too big, let's keep truncating
            if (opt.animate) {
                setTimeout(function() {
                    truncate(target, maxHeight);
                }, opt.animate === true ? 10 : opt.animate);
            }
            else {
                return truncate(target, maxHeight);
            }
        }

        function applyEllipsis(elem, str) {
            elem.nodeValue = str + opt.truncationChar;
        }


// CONSTRUCTOR ________________________________________________________________

        if (clampValue == 'auto') {
            clampValue = getMaxLines();
        }
        else if (isCSSValue) {
            clampValue = getMaxLines(parseInt(clampValue));
        }

        var clampedText;
        if (supportsNativeClamp && opt.useNativeClamp) {
            sty.overflow = 'hidden';
            sty.textOverflow = 'ellipsis';
            sty.webkitBoxOrient = 'vertical';
            sty.display = '-webkit-box';
            sty.webkitLineClamp = clampValue;

            if (isCSSValue) {
                sty.height = opt.clamp + 'px';
            }
        }
        else {
            var height = getMaxHeight(clampValue);
            if (height <= element.clientHeight) {
                clampedText = truncate(getLastChild(element), height);
            }
        }

        return {
            'original': originalText,
            'clamped': clampedText
        }
    }

    window.$clamp = clamp;
})();
(function (root) {/*global exports, Intl*/
/**
 * This script gives you the zone info key representing your device's time zone setting.
 *
 * @name jsTimezoneDetect
 * @version 1.0.6
 * @author Jon Nylander
 * @license MIT License - https://bitbucket.org/pellepim/jstimezonedetect/src/default/LICENCE.txt
 *
 * For usage and examples, visit:
 * http://pellepim.bitbucket.org/jstz/
 *
 * Copyright (c) Jon Nylander
 */


/**
 * Namespace to hold all the code for timezone detection.
 */
var jstz = (function () {
    'use strict';
    var HEMISPHERE_SOUTH = 's',

        consts = {
            DAY: 86400000,
            HOUR: 3600000,
            MINUTE: 60000,
            SECOND: 1000,
            BASELINE_YEAR: 2014,
            MAX_SCORE: 864000000, // 10 days
            AMBIGUITIES: {
                'America/Denver':       ['America/Mazatlan'],
                'Europe/London':        ['Africa/Casablanca'],
                'America/Chicago':      ['America/Mexico_City'],
                'America/Asuncion':     ['America/Campo_Grande', 'America/Santiago'],
                'America/Montevideo':   ['America/Sao_Paulo', 'America/Santiago'],
                // Europe/Minsk should not be in this list... but Windows.
                'Asia/Beirut':          ['Asia/Amman', 'Asia/Jerusalem', 'Europe/Helsinki', 'Asia/Damascus', 'Africa/Cairo', 'Asia/Gaza', 'Europe/Minsk'],
                'Pacific/Auckland':     ['Pacific/Fiji'],
                'America/Los_Angeles':  ['America/Santa_Isabel'],
                'America/New_York':     ['America/Havana'],
                'America/Halifax':      ['America/Goose_Bay'],
                'America/Godthab':      ['America/Miquelon'],
                'Asia/Dubai':           ['Asia/Yerevan'],
                'Asia/Jakarta':         ['Asia/Krasnoyarsk'],
                'Asia/Shanghai':        ['Asia/Irkutsk', 'Australia/Perth'],
                'Australia/Sydney':     ['Australia/Lord_Howe'],
                'Asia/Tokyo':           ['Asia/Yakutsk'],
                'Asia/Dhaka':           ['Asia/Omsk'],
                // In the real world Yerevan is not ambigous for Baku... but Windows.
                'Asia/Baku':            ['Asia/Yerevan'],
                'Australia/Brisbane':   ['Asia/Vladivostok'],
                'Pacific/Noumea':       ['Asia/Vladivostok'],
                'Pacific/Majuro':       ['Asia/Kamchatka', 'Pacific/Fiji'],
                'Pacific/Tongatapu':    ['Pacific/Apia'],
                'Asia/Baghdad':         ['Europe/Minsk', 'Europe/Moscow'],
                'Asia/Karachi':         ['Asia/Yekaterinburg'],
                'Africa/Johannesburg':  ['Asia/Gaza', 'Africa/Cairo']
            }
        },

        /**
         * Gets the offset in minutes from UTC for a certain date.
         * @param {Date} date
         * @returns {Number}
         */
        get_date_offset = function get_date_offset(date) {
            var offset = -date.getTimezoneOffset();
            return (offset !== null ? offset : 0);
        },

        /**
         * This function does some basic calculations to create information about
         * the user's timezone. It uses REFERENCE_YEAR as a solid year for which
         * the script has been tested rather than depend on the year set by the
         * client device.
         *
         * Returns a key that can be used to do lookups in jstz.olson.timezones.
         * eg: "720,1,2".
         *
         * @returns {String}
         */
        lookup_key = function lookup_key() {
            var january_offset = get_date_offset(new Date(consts.BASELINE_YEAR, 0, 2)),
                june_offset = get_date_offset(new Date(consts.BASELINE_YEAR, 5, 2)),
                diff = january_offset - june_offset;

            if (diff < 0) {
                return january_offset + ",1";
            } else if (diff > 0) {
                return june_offset + ",1," + HEMISPHERE_SOUTH;
            }

            return january_offset + ",0";
        },


        /**
         * Tries to get the time zone key directly from the operating system for those
         * environments that support the ECMAScript Internationalization API.
         */
        get_from_internationalization_api = function get_from_internationalization_api() {
            var format, timezone;
            if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat === "undefined") {
                return;
            }

            format = Intl.DateTimeFormat();

            if (typeof format === "undefined" || typeof format.resolvedOptions === "undefined") {
                return;
            }

            timezone = format.resolvedOptions().timeZone;

            if (timezone && (timezone.indexOf("/") > -1 || timezone === 'UTC')) {
                return timezone;
            }

        },

        /**
         * Starting point for getting all the DST rules for a specific year
         * for the current timezone (as described by the client system).
         *
         * Returns an object with start and end attributes, or false if no
         * DST rules were found for the year.
         *
         * @param year
         * @returns {Object} || {Boolean}
         */
        dst_dates = function dst_dates(year) {
            var yearstart = new Date(year, 0, 1, 0, 0, 1, 0).getTime();
            var yearend = new Date(year, 12, 31, 23, 59, 59).getTime();
            var current = yearstart;
            var offset = (new Date(current)).getTimezoneOffset();
            var dst_start = null;
            var dst_end = null;

            while (current < yearend - 86400000) {
                var dateToCheck = new Date(current);
                var dateToCheckOffset = dateToCheck.getTimezoneOffset();

                if (dateToCheckOffset !== offset) {
                    if (dateToCheckOffset < offset) {
                        dst_start = dateToCheck;
                    }
                    if (dateToCheckOffset > offset) {
                        dst_end = dateToCheck;
                    }
                    offset = dateToCheckOffset;
                }

                current += 86400000;
            }

            if (dst_start && dst_end) {
                return {
                    s: find_dst_fold(dst_start).getTime(),
                    e: find_dst_fold(dst_end).getTime()
                };
            }

            return false;
        },

        /**
         * Probably completely unnecessary function that recursively finds the
         * exact (to the second) time when a DST rule was changed.
         *
         * @param a_date - The candidate Date.
         * @param padding - integer specifying the padding to allow around the candidate
         *                  date for finding the fold.
         * @param iterator - integer specifying how many milliseconds to iterate while
         *                   searching for the fold.
         *
         * @returns {Date}
         */
        find_dst_fold = function find_dst_fold(a_date, padding, iterator) {
            if (typeof padding === 'undefined') {
                padding = consts.DAY;
                iterator = consts.HOUR;
            }

            var date_start = new Date(a_date.getTime() - padding).getTime();
            var date_end = a_date.getTime() + padding;
            var offset = new Date(date_start).getTimezoneOffset();

            var current = date_start;

            var dst_change = null;
            while (current < date_end - iterator) {
                var dateToCheck = new Date(current);
                var dateToCheckOffset = dateToCheck.getTimezoneOffset();

                if (dateToCheckOffset !== offset) {
                    dst_change = dateToCheck;
                    break;
                }
                current += iterator;
            }

            if (padding === consts.DAY) {
                return find_dst_fold(dst_change, consts.HOUR, consts.MINUTE);
            }

            if (padding === consts.HOUR) {
                return find_dst_fold(dst_change, consts.MINUTE, consts.SECOND);
            }

            return dst_change;
        },

        windows7_adaptations = function windows7_adaptions(rule_list, preliminary_timezone, score, sample) {
            if (score !== 'N/A') {
                return score;
            }
            if (preliminary_timezone === 'Asia/Beirut') {
                if (sample.name === 'Africa/Cairo') {
                    if (rule_list[6].s === 1398376800000 && rule_list[6].e === 1411678800000) {
                        return 0;
                    }
                }
                if (sample.name === 'Asia/Jerusalem') {
                    if (rule_list[6].s === 1395964800000 && rule_list[6].e === 1411858800000) {
                        return 0;
                }
            }
            } else if (preliminary_timezone === 'America/Santiago') {
                if (sample.name === 'America/Asuncion') {
                    if (rule_list[6].s === 1412481600000 && rule_list[6].e === 1397358000000) {
                        return 0;
                    }
                }
                if (sample.name === 'America/Campo_Grande') {
                    if (rule_list[6].s === 1413691200000 && rule_list[6].e === 1392519600000) {
                        return 0;
                    }
                }
            } else if (preliminary_timezone === 'America/Montevideo') {
                if (sample.name === 'America/Sao_Paulo') {
                    if (rule_list[6].s === 1413687600000 && rule_list[6].e === 1392516000000) {
                        return 0;
                    }
                }
            } else if (preliminary_timezone === 'Pacific/Auckland') {
                if (sample.name === 'Pacific/Fiji') {
                    if (rule_list[6].s === 1414245600000 && rule_list[6].e === 1396101600000) {
                        return 0;
                    }
                }
            }

            return score;
        },

        /**
         * Takes the DST rules for the current timezone, and proceeds to find matches
         * in the jstz.olson.dst_rules.zones array.
         *
         * Compares samples to the current timezone on a scoring basis.
         *
         * Candidates are ruled immediately if either the candidate or the current zone
         * has a DST rule where the other does not.
         *
         * Candidates are ruled out immediately if the current zone has a rule that is
         * outside the DST scope of the candidate.
         *
         * Candidates are included for scoring if the current zones rules fall within the
         * span of the samples rules.
         *
         * Low score is best, the score is calculated by summing up the differences in DST
         * rules and if the consts.MAX_SCORE is overreached the candidate is ruled out.
         *
         * Yah follow? :)
         *
         * @param rule_list
         * @param preliminary_timezone
         * @returns {*}
         */
        best_dst_match = function best_dst_match(rule_list, preliminary_timezone) {
            var score_sample = function score_sample(sample) {
                var score = 0;

                for (var j = 0; j < rule_list.length; j++) {

                    // Both sample and current time zone report DST during the year.
                    if (!!sample.rules[j] && !!rule_list[j]) {

                        // The current time zone's DST rules are inside the sample's. Include.
                        if (rule_list[j].s >= sample.rules[j].s && rule_list[j].e <= sample.rules[j].e) {
                            score = 0;
                            score += Math.abs(rule_list[j].s - sample.rules[j].s);
                            score += Math.abs(sample.rules[j].e - rule_list[j].e);

                        // The current time zone's DST rules are outside the sample's. Discard.
                        } else {
                            score = 'N/A';
                            break;
                        }

                        // The max score has been reached. Discard.
                        if (score > consts.MAX_SCORE) {
                            score = 'N/A';
                            break;
                        }
                    }
                }

                score = windows7_adaptations(rule_list, preliminary_timezone, score, sample);

                return score;
            };
            var scoreboard = {};
            var dst_zones = jstz.olson.dst_rules.zones;
            var dst_zones_length = dst_zones.length;
            var ambiguities = consts.AMBIGUITIES[preliminary_timezone];

            for (var i = 0; i < dst_zones_length; i++) {
                var sample = dst_zones[i];
                var score = score_sample(dst_zones[i]);

                if (score !== 'N/A') {
                    scoreboard[sample.name] = score;
                }
            }

            for (var tz in scoreboard) {
                if (scoreboard.hasOwnProperty(tz)) {
                    for (var j = 0; j < ambiguities.length; j++) {
                        if (ambiguities[j] === tz) {
                            return tz;
                        }
                    }
                }
            }

            return preliminary_timezone;
        },

        /**
         * Takes the preliminary_timezone as detected by lookup_key().
         *
         * Builds up the current timezones DST rules for the years defined
         * in the jstz.olson.dst_rules.years array.
         *
         * If there are no DST occurences for those years, immediately returns
         * the preliminary timezone. Otherwise proceeds and tries to solve
         * ambiguities.
         *
         * @param preliminary_timezone
         * @returns {String} timezone_name
         */
        get_by_dst = function get_by_dst(preliminary_timezone) {
            var get_rules = function get_rules() {
                var rule_list = [];
                for (var i = 0; i < jstz.olson.dst_rules.years.length; i++) {
                    var year_rules = dst_dates(jstz.olson.dst_rules.years[i]);
                    rule_list.push(year_rules);
                }
                return rule_list;
            };
            var check_has_dst = function check_has_dst(rules) {
                for (var i = 0; i < rules.length; i++) {
                    if (rules[i] !== false) {
                        return true;
                    }
                }
                return false;
            };
            var rules = get_rules();
            var has_dst = check_has_dst(rules);

            if (has_dst) {
                return best_dst_match(rules, preliminary_timezone);
            }

            return preliminary_timezone;
        },

        /**
         * Uses get_timezone_info() to formulate a key to use in the olson.timezones dictionary.
         *
         * Returns an object with one function ".name()"
         *
         * @returns Object
         */
        determine = function determine() {
            var preliminary_tz = get_from_internationalization_api();

            if (!preliminary_tz) {
                preliminary_tz = jstz.olson.timezones[lookup_key()];

                if (typeof consts.AMBIGUITIES[preliminary_tz] !== 'undefined') {
                    preliminary_tz = get_by_dst(preliminary_tz);
                }
            }

            return {
                name: function () {
                    return preliminary_tz;
                }
            };
        };

    return {
        determine: determine
    };
}());


jstz.olson = jstz.olson || {};

/**
 * The keys in this dictionary are comma separated as such:
 *
 * First the offset compared to UTC time in minutes.
 *
 * Then a flag which is 0 if the timezone does not take daylight savings into account and 1 if it
 * does.
 *
 * Thirdly an optional 's' signifies that the timezone is in the southern hemisphere,
 * only interesting for timezones with DST.
 *
 * The mapped arrays is used for constructing the jstz.TimeZone object from within
 * jstz.determine();
 */
jstz.olson.timezones = {
    '-720,0': 'Etc/GMT+12',
    '-660,0': 'Pacific/Pago_Pago',
    '-660,1,s': 'Pacific/Apia', // Why? Because windows... cry!
    '-600,1': 'America/Adak',
    '-600,0': 'Pacific/Honolulu',
    '-570,0': 'Pacific/Marquesas',
    '-540,0': 'Pacific/Gambier',
    '-540,1': 'America/Anchorage',
    '-480,1': 'America/Los_Angeles',
    '-480,0': 'Pacific/Pitcairn',
    '-420,0': 'America/Phoenix',
    '-420,1': 'America/Denver',
    '-360,0': 'America/Guatemala',
    '-360,1': 'America/Chicago',
    '-360,1,s': 'Pacific/Easter',
    '-300,0': 'America/Bogota',
    '-300,1': 'America/New_York',
    '-270,0': 'America/Caracas',
    '-240,1': 'America/Halifax',
    '-240,0': 'America/Santo_Domingo',
    '-240,1,s': 'America/Asuncion',
    '-210,1': 'America/St_Johns',
    '-180,1': 'America/Godthab',
    '-180,0': 'America/Argentina/Buenos_Aires',
    '-180,1,s': 'America/Montevideo',
    '-120,0': 'America/Noronha',
    '-120,1': 'America/Noronha',
    '-60,1': 'Atlantic/Azores',
    '-60,0': 'Atlantic/Cape_Verde',
    '0,0': 'UTC',
    '0,1': 'Europe/London',
    '60,1': 'Europe/Berlin',
    '60,0': 'Africa/Lagos',
    '60,1,s': 'Africa/Windhoek',
    '120,1': 'Asia/Beirut',
    '120,0': 'Africa/Johannesburg',
    '180,0': 'Asia/Baghdad',
    '180,1': 'Europe/Moscow',
    '210,1': 'Asia/Tehran',
    '240,0': 'Asia/Dubai',
    '240,1': 'Asia/Baku',
    '270,0': 'Asia/Kabul',
    '300,1': 'Asia/Yekaterinburg',
    '300,0': 'Asia/Karachi',
    '330,0': 'Asia/Kolkata',
    '345,0': 'Asia/Kathmandu',
    '360,0': 'Asia/Dhaka',
    '360,1': 'Asia/Omsk',
    '390,0': 'Asia/Rangoon',
    '420,1': 'Asia/Krasnoyarsk',
    '420,0': 'Asia/Jakarta',
    '480,0': 'Asia/Shanghai',
    '480,1': 'Asia/Irkutsk',
    '525,0': 'Australia/Eucla',
    '525,1,s': 'Australia/Eucla',
    '540,1': 'Asia/Yakutsk',
    '540,0': 'Asia/Tokyo',
    '570,0': 'Australia/Darwin',
    '570,1,s': 'Australia/Adelaide',
    '600,0': 'Australia/Brisbane',
    '600,1': 'Asia/Vladivostok',
    '600,1,s': 'Australia/Sydney',
    '630,1,s': 'Australia/Lord_Howe',
    '660,1': 'Asia/Kamchatka',
    '660,0': 'Pacific/Noumea',
    '690,0': 'Pacific/Norfolk',
    '720,1,s': 'Pacific/Auckland',
    '720,0': 'Pacific/Majuro',
    '765,1,s': 'Pacific/Chatham',
    '780,0': 'Pacific/Tongatapu',
    '780,1,s': 'Pacific/Apia',
    '840,0': 'Pacific/Kiritimati'
};

/* Build time: 2015-11-02 13:01:00Z Build by invoking python utilities/dst.py generate */
jstz.olson.dst_rules = {
    "years": [
        2008,
        2009,
        2010,
        2011,
        2012,
        2013,
        2014
    ],
    "zones": [
        {
            "name": "Africa/Cairo",
            "rules": [
                {
                    "e": 1219957200000,
                    "s": 1209074400000
                },
                {
                    "e": 1250802000000,
                    "s": 1240524000000
                },
                {
                    "e": 1285880400000,
                    "s": 1284069600000
                },
                false,
                false,
                false,
                {
                    "e": 1411678800000,
                    "s": 1406844000000
                }
            ]
        },
        {
            "name": "Africa/Casablanca",
            "rules": [
                {
                    "e": 1220223600000,
                    "s": 1212278400000
                },
                {
                    "e": 1250809200000,
                    "s": 1243814400000
                },
                {
                    "e": 1281222000000,
                    "s": 1272758400000
                },
                {
                    "e": 1312066800000,
                    "s": 1301788800000
                },
                {
                    "e": 1348970400000,
                    "s": 1345428000000
                },
                {
                    "e": 1382839200000,
                    "s": 1376100000000
                },
                {
                    "e": 1414288800000,
                    "s": 1406944800000
                }
            ]
        },
        {
            "name": "America/Asuncion",
            "rules": [
                {
                    "e": 1205031600000,
                    "s": 1224388800000
                },
                {
                    "e": 1236481200000,
                    "s": 1255838400000
                },
                {
                    "e": 1270954800000,
                    "s": 1286078400000
                },
                {
                    "e": 1302404400000,
                    "s": 1317528000000
                },
                {
                    "e": 1333854000000,
                    "s": 1349582400000
                },
                {
                    "e": 1364094000000,
                    "s": 1381032000000
                },
                {
                    "e": 1395543600000,
                    "s": 1412481600000
                }
            ]
        },
        {
            "name": "America/Campo_Grande",
            "rules": [
                {
                    "e": 1203217200000,
                    "s": 1224388800000
                },
                {
                    "e": 1234666800000,
                    "s": 1255838400000
                },
                {
                    "e": 1266721200000,
                    "s": 1287288000000
                },
                {
                    "e": 1298170800000,
                    "s": 1318737600000
                },
                {
                    "e": 1330225200000,
                    "s": 1350792000000
                },
                {
                    "e": 1361070000000,
                    "s": 1382241600000
                },
                {
                    "e": 1392519600000,
                    "s": 1413691200000
                }
            ]
        },
        {
            "name": "America/Goose_Bay",
            "rules": [
                {
                    "e": 1225594860000,
                    "s": 1205035260000
                },
                {
                    "e": 1257044460000,
                    "s": 1236484860000
                },
                {
                    "e": 1289098860000,
                    "s": 1268539260000
                },
                {
                    "e": 1320555600000,
                    "s": 1299988860000
                },
                {
                    "e": 1352005200000,
                    "s": 1331445600000
                },
                {
                    "e": 1383454800000,
                    "s": 1362895200000
                },
                {
                    "e": 1414904400000,
                    "s": 1394344800000
                }
            ]
        },
        {
            "name": "America/Havana",
            "rules": [
                {
                    "e": 1224997200000,
                    "s": 1205643600000
                },
                {
                    "e": 1256446800000,
                    "s": 1236488400000
                },
                {
                    "e": 1288501200000,
                    "s": 1268542800000
                },
                {
                    "e": 1321160400000,
                    "s": 1300597200000
                },
                {
                    "e": 1352005200000,
                    "s": 1333256400000
                },
                {
                    "e": 1383454800000,
                    "s": 1362891600000
                },
                {
                    "e": 1414904400000,
                    "s": 1394341200000
                }
            ]
        },
        {
            "name": "America/Mazatlan",
            "rules": [
                {
                    "e": 1225008000000,
                    "s": 1207472400000
                },
                {
                    "e": 1256457600000,
                    "s": 1238922000000
                },
                {
                    "e": 1288512000000,
                    "s": 1270371600000
                },
                {
                    "e": 1319961600000,
                    "s": 1301821200000
                },
                {
                    "e": 1351411200000,
                    "s": 1333270800000
                },
                {
                    "e": 1382860800000,
                    "s": 1365325200000
                },
                {
                    "e": 1414310400000,
                    "s": 1396774800000
                }
            ]
        },
        {
            "name": "America/Mexico_City",
            "rules": [
                {
                    "e": 1225004400000,
                    "s": 1207468800000
                },
                {
                    "e": 1256454000000,
                    "s": 1238918400000
                },
                {
                    "e": 1288508400000,
                    "s": 1270368000000
                },
                {
                    "e": 1319958000000,
                    "s": 1301817600000
                },
                {
                    "e": 1351407600000,
                    "s": 1333267200000
                },
                {
                    "e": 1382857200000,
                    "s": 1365321600000
                },
                {
                    "e": 1414306800000,
                    "s": 1396771200000
                }
            ]
        },
        {
            "name": "America/Miquelon",
            "rules": [
                {
                    "e": 1225598400000,
                    "s": 1205038800000
                },
                {
                    "e": 1257048000000,
                    "s": 1236488400000
                },
                {
                    "e": 1289102400000,
                    "s": 1268542800000
                },
                {
                    "e": 1320552000000,
                    "s": 1299992400000
                },
                {
                    "e": 1352001600000,
                    "s": 1331442000000
                },
                {
                    "e": 1383451200000,
                    "s": 1362891600000
                },
                {
                    "e": 1414900800000,
                    "s": 1394341200000
                }
            ]
        },
        {
            "name": "America/Santa_Isabel",
            "rules": [
                {
                    "e": 1225011600000,
                    "s": 1207476000000
                },
                {
                    "e": 1256461200000,
                    "s": 1238925600000
                },
                {
                    "e": 1288515600000,
                    "s": 1270375200000
                },
                {
                    "e": 1319965200000,
                    "s": 1301824800000
                },
                {
                    "e": 1351414800000,
                    "s": 1333274400000
                },
                {
                    "e": 1382864400000,
                    "s": 1365328800000
                },
                {
                    "e": 1414314000000,
                    "s": 1396778400000
                }
            ]
        },
        {
            "name": "America/Santiago",
            "rules": [
                {
                    "e": 1206846000000,
                    "s": 1223784000000
                },
                {
                    "e": 1237086000000,
                    "s": 1255233600000
                },
                {
                    "e": 1270350000000,
                    "s": 1286683200000
                },
                {
                    "e": 1304823600000,
                    "s": 1313899200000
                },
                {
                    "e": 1335668400000,
                    "s": 1346558400000
                },
                {
                    "e": 1367118000000,
                    "s": 1378612800000
                },
                {
                    "e": 1398567600000,
                    "s": 1410062400000
                }
            ]
        },
        {
            "name": "America/Sao_Paulo",
            "rules": [
                {
                    "e": 1203213600000,
                    "s": 1224385200000
                },
                {
                    "e": 1234663200000,
                    "s": 1255834800000
                },
                {
                    "e": 1266717600000,
                    "s": 1287284400000
                },
                {
                    "e": 1298167200000,
                    "s": 1318734000000
                },
                {
                    "e": 1330221600000,
                    "s": 1350788400000
                },
                {
                    "e": 1361066400000,
                    "s": 1382238000000
                },
                {
                    "e": 1392516000000,
                    "s": 1413687600000
                }
            ]
        },
        {
            "name": "Asia/Amman",
            "rules": [
                {
                    "e": 1225404000000,
                    "s": 1206655200000
                },
                {
                    "e": 1256853600000,
                    "s": 1238104800000
                },
                {
                    "e": 1288303200000,
                    "s": 1269554400000
                },
                {
                    "e": 1319752800000,
                    "s": 1301608800000
                },
                false,
                false,
                {
                    "e": 1414706400000,
                    "s": 1395957600000
                }
            ]
        },
        {
            "name": "Asia/Damascus",
            "rules": [
                {
                    "e": 1225486800000,
                    "s": 1207260000000
                },
                {
                    "e": 1256850000000,
                    "s": 1238104800000
                },
                {
                    "e": 1288299600000,
                    "s": 1270159200000
                },
                {
                    "e": 1319749200000,
                    "s": 1301608800000
                },
                {
                    "e": 1351198800000,
                    "s": 1333058400000
                },
                {
                    "e": 1382648400000,
                    "s": 1364508000000
                },
                {
                    "e": 1414702800000,
                    "s": 1395957600000
                }
            ]
        },
        {
            "name": "Asia/Dubai",
            "rules": [
                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Gaza",
            "rules": [
                {
                    "e": 1219957200000,
                    "s": 1206655200000
                },
                {
                    "e": 1252015200000,
                    "s": 1238104800000
                },
                {
                    "e": 1281474000000,
                    "s": 1269640860000
                },
                {
                    "e": 1312146000000,
                    "s": 1301608860000
                },
                {
                    "e": 1348178400000,
                    "s": 1333058400000
                },
                {
                    "e": 1380229200000,
                    "s": 1364508000000
                },
                {
                    "e": 1414098000000,
                    "s": 1395957600000
                }
            ]
        },
        {
            "name": "Asia/Irkutsk",
            "rules": [
                {
                    "e": 1224957600000,
                    "s": 1206813600000
                },
                {
                    "e": 1256407200000,
                    "s": 1238263200000
                },
                {
                    "e": 1288461600000,
                    "s": 1269712800000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Jerusalem",
            "rules": [
                {
                    "e": 1223161200000,
                    "s": 1206662400000
                },
                {
                    "e": 1254006000000,
                    "s": 1238112000000
                },
                {
                    "e": 1284246000000,
                    "s": 1269561600000
                },
                {
                    "e": 1317510000000,
                    "s": 1301616000000
                },
                {
                    "e": 1348354800000,
                    "s": 1333065600000
                },
                {
                    "e": 1382828400000,
                    "s": 1364515200000
                },
                {
                    "e": 1414278000000,
                    "s": 1395964800000
                }
            ]
        },
        {
            "name": "Asia/Kamchatka",
            "rules": [
                {
                    "e": 1224943200000,
                    "s": 1206799200000
                },
                {
                    "e": 1256392800000,
                    "s": 1238248800000
                },
                {
                    "e": 1288450800000,
                    "s": 1269698400000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Krasnoyarsk",
            "rules": [
                {
                    "e": 1224961200000,
                    "s": 1206817200000
                },
                {
                    "e": 1256410800000,
                    "s": 1238266800000
                },
                {
                    "e": 1288465200000,
                    "s": 1269716400000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Omsk",
            "rules": [
                {
                    "e": 1224964800000,
                    "s": 1206820800000
                },
                {
                    "e": 1256414400000,
                    "s": 1238270400000
                },
                {
                    "e": 1288468800000,
                    "s": 1269720000000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Vladivostok",
            "rules": [
                {
                    "e": 1224950400000,
                    "s": 1206806400000
                },
                {
                    "e": 1256400000000,
                    "s": 1238256000000
                },
                {
                    "e": 1288454400000,
                    "s": 1269705600000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Yakutsk",
            "rules": [
                {
                    "e": 1224954000000,
                    "s": 1206810000000
                },
                {
                    "e": 1256403600000,
                    "s": 1238259600000
                },
                {
                    "e": 1288458000000,
                    "s": 1269709200000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Yekaterinburg",
            "rules": [
                {
                    "e": 1224968400000,
                    "s": 1206824400000
                },
                {
                    "e": 1256418000000,
                    "s": 1238274000000
                },
                {
                    "e": 1288472400000,
                    "s": 1269723600000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Asia/Yerevan",
            "rules": [
                {
                    "e": 1224972000000,
                    "s": 1206828000000
                },
                {
                    "e": 1256421600000,
                    "s": 1238277600000
                },
                {
                    "e": 1288476000000,
                    "s": 1269727200000
                },
                {
                    "e": 1319925600000,
                    "s": 1301176800000
                },
                false,
                false,
                false
            ]
        },
        {
            "name": "Australia/Lord_Howe",
            "rules": [
                {
                    "e": 1207407600000,
                    "s": 1223134200000
                },
                {
                    "e": 1238857200000,
                    "s": 1254583800000
                },
                {
                    "e": 1270306800000,
                    "s": 1286033400000
                },
                {
                    "e": 1301756400000,
                    "s": 1317483000000
                },
                {
                    "e": 1333206000000,
                    "s": 1349537400000
                },
                {
                    "e": 1365260400000,
                    "s": 1380987000000
                },
                {
                    "e": 1396710000000,
                    "s": 1412436600000
                }
            ]
        },
        {
            "name": "Australia/Perth",
            "rules": [
                {
                    "e": 1206813600000,
                    "s": 1224957600000
                },
                false,
                false,
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Europe/Helsinki",
            "rules": [
                {
                    "e": 1224982800000,
                    "s": 1206838800000
                },
                {
                    "e": 1256432400000,
                    "s": 1238288400000
                },
                {
                    "e": 1288486800000,
                    "s": 1269738000000
                },
                {
                    "e": 1319936400000,
                    "s": 1301187600000
                },
                {
                    "e": 1351386000000,
                    "s": 1332637200000
                },
                {
                    "e": 1382835600000,
                    "s": 1364691600000
                },
                {
                    "e": 1414285200000,
                    "s": 1396141200000
                }
            ]
        },
        {
            "name": "Europe/Minsk",
            "rules": [
                {
                    "e": 1224979200000,
                    "s": 1206835200000
                },
                {
                    "e": 1256428800000,
                    "s": 1238284800000
                },
                {
                    "e": 1288483200000,
                    "s": 1269734400000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Europe/Moscow",
            "rules": [
                {
                    "e": 1224975600000,
                    "s": 1206831600000
                },
                {
                    "e": 1256425200000,
                    "s": 1238281200000
                },
                {
                    "e": 1288479600000,
                    "s": 1269730800000
                },
                false,
                false,
                false,
                false
            ]
        },
        {
            "name": "Pacific/Apia",
            "rules": [
                false,
                false,
                false,
                {
                    "e": 1301752800000,
                    "s": 1316872800000
                },
                {
                    "e": 1333202400000,
                    "s": 1348927200000
                },
                {
                    "e": 1365256800000,
                    "s": 1380376800000
                },
                {
                    "e": 1396706400000,
                    "s": 1411826400000
                }
            ]
        },
        {
            "name": "Pacific/Fiji",
            "rules": [
                false,
                false,
                {
                    "e": 1269698400000,
                    "s": 1287842400000
                },
                {
                    "e": 1327154400000,
                    "s": 1319292000000
                },
                {
                    "e": 1358604000000,
                    "s": 1350741600000
                },
                {
                    "e": 1390050000000,
                    "s": 1382796000000
                },
                {
                    "e": 1421503200000,
                    "s": 1414850400000
                }
            ]
        },
        {
            "name": "Europe/London",
            "rules": [
                {
                    "e": 1224982800000,
                    "s": 1206838800000
                },
                {
                    "e": 1256432400000,
                    "s": 1238288400000
                },
                {
                    "e": 1288486800000,
                    "s": 1269738000000
                },
                {
                    "e": 1319936400000,
                    "s": 1301187600000
                },
                {
                    "e": 1351386000000,
                    "s": 1332637200000
                },
                {
                    "e": 1382835600000,
                    "s": 1364691600000
                },
                {
                    "e": 1414285200000,
                    "s": 1396141200000
                }
            ]
        }
    ]
};
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = jstz;
} else if ((typeof define !== 'undefined' && define !== null) && (define.amd != null)) {
    define([], function() {
        return jstz;
    });
} else {
    if (typeof root === 'undefined') {
        window.jstz = jstz;
    } else {
        root.jstz = jstz;
    }
}
}());
var WeightTraining = {};
WeightTraining.utils = {};
WeightTraining.env = 'production';
WeightTraining.url = 'https://www.exercise.com/';
WeightTraining.embedly_key = '';
WeightTraining.stripe_connect_api_key = '';

WeightTraining.i18n = {
  en: {
    difficulty_levels: {
      level: "",
      level0: "Very Easy",
      level1: "Beginner",
      level2: "Intermediate",
      level3: "Expert",
      level4: "Insane"
    },
    muscle_group_names: {
      name: "",
      name1: "Chest",
      name2: "Neck",
      name3: "Traps",
      name4: "Shoulders",
      name5: "Biceps",
      name6: "Forearms",
      name7: "Abs",
      name8: "Quads",
      name9: "Calves",
      name10: "Triceps",
      name11: "Lats",
      name12: "Middle Back",
      name13: "Lower Back",
      name14: "Glutes",
      name15: "Hamstrings",
      name16: "Hip Flexors",
      name17: "Obliques",
      name18: "Groin",
      name19: "Outer Thighs",
      name20: "Shins",
      name21: "Ankles",
      name22: "Core",
      name23: "Inner Thighs",
      name24: "Adductors",
      name25: "Abductors",
      name26: "Posterior Chain",
      name27: "Deltoids",
      name28: "Rhomboids",
      name29: "Pecs",
      name30: "Rear/Posterior Delt",
      name31: "Side/Lateral Delt",
      name32: "Front/Anterior Delt",
      name33: "Lower Traps",
      name34: "Mid Traps",
      name35: "Upper Traps",
      name36: "Upper Back"
    }
  }
}
;













//








//# NEED TO MIGRATE THIS


var WT = window.WT || {};

// Line Clamping
$('[data-full-text]').on('click', function() {
  $('.truncated').hide();
  $(this).closest('p').hide();
  $($(this).data('full-text')).show();
});
// reverses data-full-text
$('[data-truncate-text]').on('click', function() {
  $('#full-description').hide();
  $('.truncated').show();
  $('.truncated p').show();
});

$('[data-clamp-lines]').each(function(element) {
  var $this = $(this);
  $clamp(this, { clamp: $this.data('clamp-lines') });

  // if there is a separate full portion show that
  if( $this.data('clamp-full') ) {
    $this.on('click', function() {
      $(this).hide();
      $($this.data('clamp-full')).removeClass('hide');
    });
  }
});

$(window).on('load', function() {
  var hash = window.location.hash;
  if(hash.indexOf('/')) {
    var tab = hash.split(/\/(.+)/)[0];
    var url = hash.split(/\/(.+)/)[1];
  } else {
    var tab = hash;
  }

  if(hash && hash != "#!") {
    var selectedTab = $('.mod-tabs, .sidebar-tabs').find('.' + tab.substring(1));
    var contentSection = $('.tab-content').children().eq(selectedTab.index());

    if(contentSection.find('iframe').length > 0 && url) {
      contentSection.find('iframe')[0].src = '/' + url + '?embedded=true&iframe=true&web_embed=true';
    }
    selectedTab.click();
  }

  $('.activity-frame').on('load', function() {
    var iframe = $(this);
    iframe.parent().find('.loader').css('display', 'none');
  });

  var firstFrame = $('.tab-content').children().first().find('.activity-frame');
  if(firstFrame && !firstFrame.attr('src') && !url) {
    firstFrame.attr('src', firstFrame.attr('data-src'));
  }
});

$(document).ready(function() {
  var canvas = document.getElementById('waiver-signature-pad');
  if (canvas) {
    // initialize signature
    var signaturePad = new SignaturePad(canvas, {
      maxWidth: 1.5,
      width: 0.5,
    });
    signaturePad.onEnd = function() {
      $('#hidden-waiver-signature-pad').val(signaturePad.toDataURL());
    }
    $('#waiver-signature-clear').click(function() {
      signaturePad.clear();
      $('#hidden-waiver-signature-pad').val(null);
    });
    function resizeCanvas() {
      var canvas = document.getElementById('waiver-signature-pad');
      var ratio =  Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d").scale(ratio, ratio);
      signaturePad.clear(); // otherwise isEmpty() might return incorrect value
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
  }

  // password visbility toggle
  var passwordField = document.getElementById('password');
  var togglePassword = document.getElementById('toggle-password');

  if (passwordField && togglePassword) {
    var toggleIcon = togglePassword.querySelector('i');

    if (toggleIcon) {
      togglePassword.addEventListener('click', function () {
        var type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordField.setAttribute('type', type);

        // Toggle the icon
        toggleIcon.classList.toggle('fa-eye');
        toggleIcon.classList.toggle('fa-eye-slash');
      });
    }
  }

  //open group welcome modal
  if ($("#group-welcome-modal").length > 0) {
    location.hash = "#group-welcome-modal";
  } else if ($("#plan-welcome-modal").length > 0) {
    location.hash = "#plan-welcome-modal";
  }
  
  $('#plan-welcome-modal .modal-close, #plan-welcome-modal .dismiss').on('click', function() {
    var classes = $('#plan-welcome-modal').attr('class').split(' ');
    var user_id = classes[1];

    return $.ajax({
      url: '/api/v3/users/' + user_id,
      type: 'PUT',
      data: { user: { plan_welcome_message: '' } }
    });
  });

  $('#group-welcome-modal .modal-close').on('click', function() {
    var classes = $('#group-welcome-modal').attr('class').split(' ');
    var group_id = classes[1];
    var member_id = classes[2];

    return $.ajax({
      url: '/groups/' + group_id + '/group-members/' + member_id + '/dismiss_welcome',
      type: "POST"
    });
  });

  // Tabs
  $('body').on('change', '.tab-select', function() {
    var $container = $($(this).data('tab-content'));
    var $tabs = $(this).next();
    var index = $(this).find(':selected').data('index');

    $tabs.find('li').removeClass('active')
    $tabs.find('li:eq(' + index + ')').addClass('active').trigger('tab:changed', index);

    $container.find('> ').addClass('hidden').hide();
    $container.find('> :eq(' + index + ')').removeClass('hidden').show().trigger('tab:changed:after', index);
  });

  $('.mod-tabs, .sidebar-tabs').each(function() {
    var $tabs = $(this)
    if(!$tabs.data('tabs-css-hidden')) {
      var $container = $($tabs.data('tab-content'));
      $container.find('> :gt(0)').hide();
    }
  });

  $('body').on('click', '.mod-tabs li, .sidebar-tabs li', function() {
    var $tabs = $(this).parent();
    var $select = $tabs.prev();
    var $container = $($tabs.data('tab-content'));
    var index = $tabs.find('li').index($(this));


    if($select.hasClass('tab-select')) {
      var optIndex = $select.find('option').index($select.find('[data-index=' + index + ']'));

      if(optIndex == -1) {
        optIndex = $select.find('option').index($select.find('[data-index=' + (index-1) + ']'));
      }

      $select[0].selectedIndex = optIndex;
    }

    $tabs.find('li').removeClass('active')
    $tabs.find('li:eq(' + index + ')').addClass('active').trigger('tab:changed', index);

    $container.find('> ').addClass('hidden').hide();
    $container.find('> :eq(' + index + ')').removeClass('hidden').show().trigger('tab:changed:after', index);
  });

  // SHOW MORE BUTTONS
  $('.show-more-button, [data-show-items]').on('click', function() {
    $($(this).data('show-items')).show();
    $('.show-more-button, [data-show-items]').hide();
  });

  /* Custom Dropdown/Tooltips */
  $('[data-tooltip]').each(function() {
    var options = {
      target: $(this)[0],
      content: function (drop) {
        return $(drop.target).data('tooltip')
      },
      position: $(this).data('tooltip-position') ||'top center',
      openOn: 'hover',
      classes: 'drop-theme-arrows-bounce'
    }
    new Drop(options);
  });

  /* WORKOUT PLANS */
  $(document).on('change', '.workout-week-dropdown', function() {
    var index = $(this).find('option').index($(this).find('option:selected'));
    $('.plan-workout-details-container').load('/workout-plans/' + window.location.pathname.split('/')[2] + "/workout?group_index="+(index+1), function() {
      // reset youtube videos
      window.player = {};

    });
  });

  $('.workout_plans.show').on('tab:changed', '.workout-tab-holder', function(e, index) {
    $('.daynum').text(index + 1);
  });

  $('.workout_plans.show').on('click', '.show-exercise-notes', function() {
    $('.show-exercise-notes i').toggleClass('fa-toggle-on');
    $('.show-exercise-notes i').toggleClass('fa-toggle-off');

    $('tr.alternate').toggleClass('hidden');
    $('tr.ex-table-notes').toggleClass('hidden');

    if ($('tr.ex-table-notes').first().hasClass("hidden")) {
      $('.block-exercise.first:not(.ex-table-notes)').removeClass('first');
      $(".workout-table").each(function() { //fixes missing ending border for superset on last row
        $(this).find('.alt').not(".hidden").last().addClass('end-superset-table');
      });
    } else {
      $('.end-superset-table').removeClass("end-superset-table");
    }
  });

  window.onbeforeunload = function () {
    if($('html.workout_plans.show').length) {
      $('.workout-week-dropdown').prop("selectedIndex",0);
    }
  };

  $(document).on('cssmodal:hide', function(e, elem) {
    // see controllers/dashboard/me/modal-start-plan.js
    if($('.workout_plans.show #modal-follow').length > 0 && window.newPlanFollowed) {
      window.location = '/dashboard/journal/';
    }
  });

  /* Checkout */
  $('.other-login-link').on('click', function() {
    $('.checkout-login-forms > div').toggle();

    if ($('.signup-login-crumb h2').text() == "Sign Up") {
      $('.signup-login-crumb h2').text("Log In");
    } else {
      $('.signup-login-crumb h2').text("Sign Up");
    }
  });


  $('[rel=modal]').on('click', function(e) {
    e.preventDefault();
    $.get($(this).attr("href"), function(results) {
      $(results).prependTo('body');
      window.location.hash = 'modal';
    });
  });

  // masonry
  if($('.responsive-cards.msnry').length > 0) {
    $('body').on('tab:changed:after', function() {
      msnry.layout();
    });

    var msnry = new Masonry($('.responsive-cards.msnry')[0], {
      columnWidth: '.photo-card',
      itemSelector: 'li',
      gutter: 0,
      percentPosition: true
    });

    imagesLoaded($('.responsive-cards.msnry')[0], function() {
      msnry.layout();
    });
  }
});// end document.ready

/* video modals */

// load youtube api
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player = {};
function onYouTubeIframeAPIReady() {
};

$(document).on('cssmodal:hide', function(e, elem) {
  e.preventDefault();
  var modal = $(elem.detail.modal);
  var videoElement = modal.find('video');

  if (videoElement && videoElement.length == 1 && videoElement.data('mux') == '1') {
    var player = videojs(videoElement.attr('id'));
    player.pause();
  } else {
    var iframe = modal.find('iframe');

    if (iframe && iframe.length == 0) iframe = modal.find('source');

    if(iframe.data('src')) {
      iframe.attr('src', '');
    }
  }
});

$(document).on('cssmodal:show', function(e, elem) {
  e.preventDefault();
  var modal = $(elem.detail.modal);
  var iframe = modal.find('iframe');

  if (iframe && iframe.length == 0) iframe = modal.find('source');

  if(!iframe.attr('src')) {
    iframe.attr('src', iframe.data('src'));
  }
});

$('.exercises.show .overlay').on('click', function() {
  $(this).hide();
  $('.exercise-video').removeClass('hidden');
});

$('.comment-box').keyup(function() {
  var charText = $('#chars');
  var charsLeft = 1024 - $(this).val().length;
  charText.text(charsLeft);
  if(charsLeft < 0) { charText.addClass('red'); }
  else { charText.removeClass('red'); }
})

$('.groups.show').on('ajax:complete', '.members-inner .sort_link', function(e, data) {
  $('#members-content').html(data.responseText);
});

$('.groups.show').on('ajax:complete', '#leaderboard-content .sort_link', function(e, data) {
  $('#leaderboard-content').html(data.responseText);
});

$('.groups.show').on('ajax:complete', '.edit_group', function(e, data) {
    if(data.responseText) {
			$('#modal-add-resource .mod-flash-message').removeClass('hide');
		} else {
			$('#modal-add-resource .mod-flash-message').addClass('hide');
			document.location = window.location.href.split('#')[0]
		}
});

$('.groups.show').on('tab:changed:after', function(e, index) {
  var contents = $('.tab-content > div').eq(index);
  var iframe = contents.find('iframe');
  iframe.removeClass('hidden');

  if(iframe && !iframe.attr('src')) {
    iframe.attr('src', iframe.attr('data-src'));
  }

  if(contents.find('.pre-loader').length > 0 && contents.data('load')) {
    contents.load(contents.data('load'), contents.data('params'));
  }
});

$('.groups.show').on('ajax:complete', '.group_member_search', function(e, data) {
  $('#members-content').html(data.responseText);
});

$('#new_user_plan').on('ajax:success', function(){
  $('#new_user_plan').toggle();
  $('#start_plan_confirmation').toggle();
  $('.modal-content').scrollTop(0);
});

/* Group Videos */
window.addEventListener('message', function(event) {
  var video = event.data;
  if(video.action && video.action == 'show-video') {
    var modal = $('#modal-video-player');
    var iframe = modal.find('#modal-group-iframe-player');
    var videoElement = modal.find('#modal-group-video-player');

    if (video.url.includes('stream.mux')) {
      iframe.attr('src', '');
      iframe.attr('data-src', '');
      iframe.hide();
      videoElement.show();
      var regex = /\/([^/.]+)\.m3u8$/;
      var match = video.url.match(regex);
      var muxId = '';

      if (match) {
        muxId = match[1];
      }

      var player = videojs('modal-group-video-player', {});

      player.src({
        src: muxId,
        type: 'video/mux',
      });
    } else {
      iframe.attr('src', video.url);
      iframe.attr('data-src', video.url);
      videoElement.hide();
      iframe.show();
    }

    modal.find('h2').html(video.name);
    location.href = '#modal-video-player';
    if(video.fullDescription) {
      modal.find('div.video-description').show().find('div').html(video.fullDescription.replace(/\n/g,"<br>"));
    } else {
      modal.find('div.video-description').hide();
    }
  }
}, false);

/* Group Members */
$('.groups.show').on('ajax:complete', '.sort_link', function(e, data) {
  $('#members-content').html(data.responseText);
});

$('.groups.show').on('ajax:complete', '.group_member_search', function(e, data) {
  $('#members-content').html(data.responseText);
});

$('.groups.show').on('ajax:complete', '.delete_link', function() {
  var groupId = $(this).attr('group_id');
  $('#members-content').load('/groups/' + groupId + '/group-members/');
});

$('.groups.show').on('ajax:complete', '.members-inner .pagination', function(e, response) {
  $('#members-content').html(response.responseText);
});

$('.groups.show').on('click', '.change-member-date', function() {
  var span = $(this);
  span.hide();
  span.prev().hide();
  span.next().show();
});

$('.groups.show').on('click', '.member-index-link', function() {
  var groupId = $(this).attr('group-id');
  $('#members-content').load('/groups/' + groupId + '/group-members/');
});

$('.groups.show').on('click', '.group-member-manage-link', function() {
  var memberId = $(this).attr('member-id');
  var groupId = $(this).attr('group-id');
  $('#members-content').load('/groups/' + groupId + '/group-members/' + memberId + '/');
});

$('.groups.show').on('keyup', '.save-video-form', function () {
  var formId = $(this).data('form-id');
  var disabled = false;
  $(this).find("input[name*='group_video']").each(function(){
    if($(this).data('required') == true && $(this).val().length == 0)
      disabled = true;
  });
  $('#save-video-' + formId).prop("disabled", disabled);
});

$.extend($.expr[":"], {
  "icontains": function(elem, i, match, array) {
    return (elem.textContent || elem.innerText || "").toLowerCase().indexOf((match[3] || "").toLowerCase()) >= 0;
  }
});

$('.mod-flash-message').delay(8000).fadeOut();

// utils
function secondsToTime(value) {
  var sec_num = parseInt(value, 10); // don't forget the second param
  var hours   = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  var seconds = sec_num - (hours * 3600) - (minutes * 60);

  if (hours   < 10) {hours   = "0"+hours;}
  if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}

  if(isNaN(hours)) hours = "--";
  if(isNaN(minutes)) minutes = "--";
  if(isNaN(seconds)) seconds = "--";

  return hours+':'+minutes+':'+seconds;
}

if($('#new_user').find('#timezone').length > 0) {
  $('#new_user').find('#timezone').val(jstz.determine().name());
}
;
$(document).ready(function() {
  $('.more-records').on('click', function() {
    var link = $(this);
    if (!link.data('disabled')) { 
      link.data('disabled', true);
      var container = link.parent().prev();
      var userId = container.data('user-id');
      var offset = container.find('.record-row').length;
      var data = { offset: offset };
      $.get('/users/' + userId + '/more_records.html', data, function(data) {
        if (link) {
          link.data('disabled', false)
        }
        if (data && $(data).find('tr.record-row').length != 0) {
          var newDiv = $(data).find('tr.record-row');
          newDiv.appendTo(container);
        }
        if (!data || $(data).find('tr.record-row').length != 25) {
          link.hide();
        }
      });
    }
  });

  $('.dashboard-cards .show-all').on('click', function() {
    $(this).parents('.dashboard-cards').find('li').removeClass('extra-card');
    $(this).hide();
  });
});
WT.Comments = function(el, options) {
  // if we need options
  this.options = $.extend({
    replyLinkSelector: '.reply-link',
    deleteLinkSelector: '.comment-delete',
    formContainerSelector: '#respond',
    commentSelector: '.comment-container',
    formParentSelector: '#comment_parent_id',
    nestedCommentWrapper: '<ul class="nested-comment children">',
    nestedCommentParent: '<li class="comment clearfix" id="li-comment-94846">'
  }, options);


  this.$commentsEl = el;
  this.replyTo =  null;
  this.$respond = this.$commentsEl.find(this.options.formContainerSelector);
  this.$form = this.$respond.find("form");
  this.setupListeners();
};

WT.Comments.prototype = {
  setupListeners: function() {
    // move reply box
    this.$commentsEl.on('click', this.options.replyLinkSelector, $.proxy(this.onReplyClick, this));

    // submit new comment
    this.$commentsEl.find(this.options.formContainerSelector)
      .find('form').on('submit', $.proxy(this.onCommentSubmit, this));

    // delete comment
    this.$commentsEl.on('click', this.options.deleteLinkSelector, $.proxy(this.onDeleteClick, this));
  },

  // handle reply button click
  onReplyClick: function(event) {
    var $link = $(event.target);
    var $curComment = $link.closest(this.options.commentSelector);

    // store reply to in object and form
    this.replyTo = $link.data('comment');
    this.$form.find(this.options.formParentSelector).val(this.replyTo);

    // move text box
    this.$respond.insertAfter($curComment);
  },

  // handle form submission
  onCommentSubmit: function(event) {
    event.preventDefault();

    // save comment via ajax
    $.post(
      this.$form.attr('action') + ".js", 
      this.$form.serialize(), 
      $.proxy(this.renderNewComment, this), 
      'html'
    ).fail(function(response) {
      window.scrollTo(0, 0);
      location.reload();
    });
  },

  //handle comment delete
  onDeleteClick: function(event) {
    event.preventDefault();

    // delete comment via ajax
    if (confirm('Are you sure that you want to delete this comment?')) {
      var comment_id = $(event.currentTarget).data('comment-id'); //Get the comment id
      $.ajax({
        url: $(event.currentTarget).attr('href'),
        type: "DELETE",
        success: function(data) {
          $('#li-comment-'+comment_id).fadeOut(500); //Remove the comment and all of its children
        }
      });
    }
  },

  // put new comment in correct spot
  renderNewComment: function(html) {
    var $container = $('.commentlist');
    var $newComment = $(html);
    var newId = $newComment.find(this.options.replyLinkSelector).data('comment');

    if(this.replyTo) {
      $container = $('#li-comment-' + this.replyTo);

      if($container.find('ul').size() == 0) {
        $(this.options.nestedCommentWrapper).appendTo($container);
      }

      $container = $(this.options.nestedCommentParent).attr('id', 'li-comment-' + newId).prependTo($container.find('ul'))
    } else {
      $container = $(this.options.nestedCommentParent).attr('id', 'li-comment-' + newId).appendTo($container)
    }
    $(html).appendTo($container);

    // reset
    this.$form.find('[name*=content]').val('');
    this.$form.find(this.options.formParentSelector).val('');
    this.$respond.appendTo(this.$commentsEl);
    $('.nocomments').hide(); // Need to hide the default text if this was the first comment
  }
}

new WT.Comments($('.comments-wrapper'));

// RATINGS
WT.Ratings = function(el, options) {
  $('.mod-star-rating.editable').on('mouseenter', 'li', $.proxy(this.selectStar, this));
  $('.mod-star-rating.editable').on('mouseout', $.proxy(this.resetRating, this));
  $('.mod-star-rating.editable').on('click', 'li', $.proxy(this.setRating, this));
}

WT.Ratings.prototype = {
  // highlight
  selectStar: function(e) {
    $item = $(e.target);
    $list = $item.closest('ul');
    this.matchRating($list, this.getRatingFromStars($item));
  },
  // display should match rating
  resetRating: function(e) {
    var $list = $(e.delegateTarget);
    this.matchRating($list, $list.data('rating'));
  },
  // set a new rating
  setRating:function(e) {
    var $item = $(e.target);
    var $list = $item.closest('ul');
    var $input = $list.next();
    var rating = this.getRatingFromStars($item);

    $list.data('rating', rating);
    $input.val(rating);

    this.matchRating($list, rating);
  },
  getRatingFromStars: function($item) {
    return $item.index() + 1;
  },
  // make sure data-rating and display match
  matchRating: function($list, rating) {
    $list.find('li').removeClass('star');
    $list.find('li:lt(' + rating + ')').addClass('star');
  }
}

new WT.Ratings();

$(document).ready(function() {
  if (window.location.hash == "#confirmation-modal") {
    window.location.hash = '#!';
  }

  $("a[data-confirm]").on('click', function(event) {
    var element = $(this);
    $.rails.stopEverything(event);

    if (element.attr('data-status') != 'ready') {
      var dialog = $('#confirmation-modal');
      var message = element.attr("data-confirm");
      var ok = dialog.find('#ok-button');
      var content = dialog.find('#confirm-message p');

      event.preventDefault();
      content.text(message);
      element.attr('data-status', 'ready');

      ok.unbind('click');
      ok.one('click', function(event) {
        event.preventDefault();
        window.location.hash = "#";
        element.get(0).click();
        element.attr('data-status', null);
      });

      window.location.hash = "#confirmation-modal";
    }
  });

  $('.confirmation-close').on('click', function() {
    var element = $("*[data-status='ready']");
    if (element[0]) element.attr('data-status', null);
  });
});
/**** Stripe Elements ****/

if(typeof(Stripe) != "undefined"){
  var paymentRequest = null;
  stripeInitialize();
  stripePaymentRequest();
  stripePaymentIntent();

  function stripeTokenHandler(token) {
    // Insert the token ID into the form so it gets submitted to the server
    var hiddenInput = document.getElementById('stripe_card_token') || document.getElementById('subscription_stripe_card_token') || document.getElementById('payment_method_token');

    hiddenInput.setAttribute('value', token.id);

    // Submit the form
    var form = document.getElementById('stripe-payment-form');
    form.submit();
  }

  function isPurchase() {
    return $('#card-details').data('is-purchase') == '1';
  }

  function initialize_and_complete(stripe, paymentMethod, successCallback) {
    if(isPurchase()) {
      $.post('/initialize-purchase/', { coupon_code: document.getElementById('coupon_code').value }).then(function(response) {
        if(response.client_secret.indexOf('seti') !== -1) {
          var confirmMethod = stripe.confirmCardSetup(response.client_secret, {
            payment_method: paymentMethod,
          });
        } else {
          var confirmMethod = stripe.confirmCardPayment(response.client_secret, {
            payment_method: paymentMethod,
          });
        }

        confirmMethod.then(function(response) {
          if (response.error) {
            // Inform the user if there was an error
            var errorElement = document.getElementById('stripe_error');
            errorElement.textContent = response.error.message;
            if (response.error.decline_code && response.error.decline_code != 'stolen_card') {
              var code = response.error.decline_code.replace('_', ' ');
              errorElement.textContent += (" (" + code + ")");
            }
            $.post('/card-failure/', response.error);
            updateStripeSubmit(false);
          } else {
            // redirect to thank you
            if(successCallback) { successCallback(); }
            stripeTokenHandler(response.setupIntent || response.purchaseIntent);
          }
        });
      });
    } else {
      $.post('/initialize-subscription/').then(function(response) {
        var confirmMethod = stripe.confirmCardSetup(response.client_secret, {
          payment_method: paymentMethod,
        });

        confirmMethod.then(function(response) {
          if (response.error) {
            // Inform the user if there was an error
            var errorElement = document.getElementById('stripe_error');
            errorElement.textContent = response.error.message;
            if (response.error.decline_code && response.error.decline_code != 'stolen_card') {
              var code = response.error.decline_code.replace('_', ' ');
              errorElement.textContent += (" (" + code + ")");
            }
            $.post('/card-failure', response.error);
            updateStripeSubmit(false);
          } else {
            // redirect to thank you
            if(successCallback) { successCallback(); }
            stripeTokenHandler(response.setupIntent);
          }
        });
      });
    }
    //TODO: handle additional actions? if `paymentIntent.status === "requires_action"`
  }

  function stripePaymentRequest(coupon_code) {
    var mountPoint = document.getElementById("payment-request-button");
    var card_hidden = document.getElementById('payment-method-details');

    if (mountPoint && !card_hidden.classList.contains("hidden")) {
      var stripe_key = $('meta[name="platform-stripe-key"]').attr('content');
      var stripe = Stripe(stripe_key);
      WeightTraining.stripe_elements = stripe.elements();
      WeightTraining.stripe = stripe;

      var type = $('.subscription-form, .purchase-form').closest('.subscription-form').length ? 'subscription' : 'purchase';
      var plan_id = $('[name="subscription[plan_id]"]:checked').val() || $('[name="subscription[plan_id]"]').val();
      $.get('/initial-payment/', { coupon_code: coupon_code || null, type: type, plan_id: plan_id }, function(result) {
        if (result) {
          // Create an instance of the card Element
          paymentRequest = WeightTraining.stripe.paymentRequest({
            country: 'US',
            currency: $('[data-currency]').attr('data-currency'),
            total: {
              label: $('.details h4').text(),
              amount: result.price,
            },
            requestPayerName: false,
            requestPayerEmail: false,
            requestShipping: false,
          });

          var prButton = WeightTraining.stripe_elements.create('paymentRequestButton', {
            paymentRequest: paymentRequest,
            style: {
              paymentRequestButton: {
                type: 'default', // One of 'default', 'book', 'buy', or 'donate'
                theme: 'dark', // One of 'dark', 'light', or 'light-outline'
                height: '40px' // Defaults to '40px'. The width is always '100%'.
              },
            },
          });

          // Check the availability of the Payment Request API first.
          paymentRequest.canMakePayment().then(function(result) {
            $('#fast-checkout-section-loading').addClass('hidden');

            if (result) {
              document.getElementById('payment-method-details').style.display = 'block';
              document.getElementById('pay-button-row').style.display = 'block';
              $('#fast-checkout-section').removeClass('hidden');
              prButton.mount('#payment-request-button');
              prButton.on('click', function(event) {
                if ($('.stripe_submit').attr('disabled') === 'disabled') {
                  event.preventDefault();
                  location.href = "#coupon_code_label";
                }
              });
            } else {
              $('#fast-checkout-section').addClass('hidden');
              document.getElementById('payment-method-details').style.display = 'none';
              document.getElementById('payment-request-button').style.display = 'none';
            }
          });

          paymentRequest.on('paymentmethod', function(ev) {
            updateStripeSubmit('disabled');
            initialize_and_complete(stripe, ev.paymentMethod.id, function() {
              ev.complete('success');
            });
          });
        }
      }).fail(function() {
        $('#fast-checkout-section-loading').addClass('hidden');
      });
    } else {
      $('#fast-checkout-section-loading').addClass('hidden');
    }
  }

  function stripePaymentIntent() {
    var stripe_key = $('meta[name="platform-stripe-key"]').attr('content');
    var stripe = Stripe(stripe_key);

    initializeKlarna(stripe);
    initializeAfterPay(stripe);
  }

  function initializeAfterPay(stripe) {
    $('#afterpay-section').removeClass('hidden');
    // Create a token or display an error when the form is submitted.
    $('#afterpay-button').on('click', function(event) {
      event.preventDefault();
      if ($('.stripe_submit').attr('disabled') === 'disabled') {
        location.href = "#coupon_code_label";
        return
      }

      stripe.confirmAfterpayClearpayPayment(
        $('#afterpay-payment-intent').attr("data-secret"),
        {
          payment_method: {
            billing_details: {
              email: $('#afterpay-payment-intent').attr("data-email"),
              name: $('#afterpay-payment-intent').attr("data-name"),
              address: {
                country: $('#afterpay_country_code').val(),
                line1: $('#afterpay-payment-intent').attr("data-line1"),
                city: $('#afterpay-payment-intent').attr("data-city"),
                state: $('#afterpay-payment-intent').attr("data-state"),
                postal_code: $('#afterpay-payment-intent').attr("data-postal_code"),
              },
            },
          },
          return_url: (window.location.protocol + "//" + window.location.host + "/checkout/confirm/" + window.location.search),
        }
      ).then(function(result) {
        if (result.error) {
          var errorElement = document.getElementById('stripe_error');
          errorElement.textContent = 'This country (' + $('#afterpay_country_code').val() + ') is not supported with Afterpay.';
          window.location.hash = '#!';
        }
      });
    });
  }

  function initializeKlarna(stripe) {
    $('#klarna-section').removeClass('hidden');
    // Create a token or display an error when the form is submitted.
    $('#klarna-button').on('click', function(event) {
      event.preventDefault();
      if ($('.stripe_submit').attr('disabled') === 'disabled') {
        location.href = "#coupon_code_label";
        return
      }

      stripe.confirmKlarnaPayment(
        $('#klarna-payment-intent').attr("data-secret"),
        {
          payment_method: {
            billing_details: {
              email: $('#klarna-payment-intent').attr("data-email"),
              address: {
                country: $('#klarna_country_code').val(),
              },
            },
          },
          return_url: (window.location.protocol + "//" + window.location.host + "/checkout/confirm/" + window.location.search),
        }
      ).then(function(result) {
        if (result.error) {
          var errorElement = document.getElementById('stripe_error');
          errorElement.textContent = 'This country (' + $('#klarna_country_code').val() + ') is not supported with Klarna.';
          window.location.hash = '#!';
        }
      });
    });
  }

  function stripeInitialize(token) {
    var mountPoint = document.getElementById('card-element');
    var card_hidden = document.getElementById('card-details');

    if(mountPoint && !card_hidden.classList.contains("hidden")) {
      var stripe_key = $('meta[name="platform-stripe-key"]').attr('content');
      var stripe = Stripe(stripe_key, { betas: ['us_bank_account_beta_2'], apiVersion: '2019-11-05' });
      WeightTraining.stripe_elements = stripe.elements();

      var style = {
        base: {
          // Add your base input styles here. For example:
          color: '#505050'
        }
      };
      // Create an instance of the card Element
      var card = WeightTraining.stripe_elements.create('card', {style: style});

      card.mount(mountPoint);
      card.addEventListener('change', function(event) {
        var displayError = document.getElementById('stripe_error');
        if (event.error) {
          displayError.textContent = event.error.message;
        } else {
          displayError.textContent = '';
          updateStripeSubmit(false);
        }
      });

      // Create a token or display an error when the form is submitted.
      var form = document.getElementById('stripe-payment-form');
      form.addEventListener('submit', function(event) {
        event.preventDefault();

        if($('.edit-card-form').length) {
          stripe.confirmCardSetup(
            $('#card-details').attr("data-secret"),
            { payment_method: { card: card } }
          ).then(function(result) {
            if (result.error) {
              var errorElement = document.getElementById('stripe_error');
              errorElement.textContent = result.error.message;
              if (result.error.decline_code && result.error.decline_code != 'stolen_card') {
                var code = result.error.decline_code.replace('_', ' ');
                errorElement.textContent += (" (" + code + ")");
              }
              updateStripeSubmit(false);
            } else {
              stripeTokenHandler(result.setupIntent);
            }
          });
        } else {
          initialize_and_complete(stripe, { card: card });
        }
      });
    }
  }
}

$('.subscription-form .plan-type-info:not(.payment-methods) input').on('click', function(){
  var price = $("label[for='"+this.id+"']");
  var descriptor = $("label[for='"+this.id+"'] .descriptor");
  var currency = price.attr('data-currency');
  var amount = price.attr('data-price')
  $('[data-currency]').attr('data-currency', currency);
  $('[data-sub]').attr('data-sub', amount);

  var code = null;
  if ($('.success').is(":visible")) code = $('#coupon_code').val();

  updatePR(code, price.html(), descriptor.html());
  checkCoupon();
});

$('#change-cc').on('click', function() {
  $('#card-details').removeClass('hidden');
  $('.new_subscription').removeAttr('novalidate');
  stripeInitialize();
});

$('#add-cc').on('click', function() {
  $('#card-details').removeClass('hidden');
  $('#remove-cc').removeClass('hidden');
  $('#add-cc').addClass('hidden');
  $('.new_subscription').removeAttr('novalidate');
  stripeInitialize();
});

function updatePR(code, fallbackPriceHtml, descriptor) {
  var type = $('.subscription-form, .purchase-form').closest('.subscription-form').length ? 'subscription' : 'purchase';
  var plan_id = $('[name="subscription[plan_id]"]:checked').val() || $('[name="subscription[plan_id]"]').val();

  $.get('/initial-payment/', { coupon_code: code || null, type: type, plan_id: plan_id }, function(result) {
    if (result) {
      if (result.display_price && $('.details-pricing .price')[0]) {
        $('.details-pricing .price').contents().filter(function() { return this.nodeType == 3 })[0].nodeValue = result.display_price;
        $('.details-pricing .price')[0].innerHTML = $('.details-pricing .price')[0].innerHTML.replaceAll('&amp;', "&")

        if (descriptor && $('.details-pricing .price .descriptor')[0]) $('.details-pricing .price .descriptor').contents().filter(function() { return this.nodeType == 3 })[0].nodeValue = descriptor;
        if (code) $('.details-pricing .price').css('color', 'green');
        else $('.details-pricing .price').css('color', 'unset');

      } else {
        if (fallbackPriceHtml) $('.details-pricing .price').html(fallbackPriceHtml);
      }

      if (paymentRequest && paymentRequest.canMakePayment()) {
        var label = $('.details h4').text();

        if((result.price || result.price == 0) && code) {
          label = label + " (with coupon)";
        }

        paymentRequest.update({
          total: { amount: result.price, label: label }
        });
      }
    }
  }).fail(function() {
    if (fallbackPriceHtml) $('.details-pricing .price').html(fallbackPriceHtml);
  });
}

function updateStripeSubmit(value) {
  if (value == 'disabled') {
    // disable button
    $('.stripe_submit').attr('disabled', value);
  } else if (!$('.error').length || $('.error').is(":hidden")) { // if coupon code is not invalid
    // enable button
    $('.stripe_submit').attr('disabled', value);
  }
}

function checkCoupon() {
  var code = $('#coupon_code').val();
  var type = $('.subscription-form, .purchase-form').closest('.subscription-form').length ? 'subscription' : 'purchase';
  //validate coupon message
  if (code) {
    updateStripeSubmit('disabled');
    $('#coupon_code').attr('disabled', true);
    var plan_id = $('[name="subscription[plan_id]"]:checked').val() || $('[name="subscription[plan_id]"]').val();

    $.get('/confirm-coupon', { coupon: code, type: type, plan_id: plan_id }, function(result) {
      if(result.valid) {
        $('.success').show().html(result.message);
        $('#coupon_code_button').hide();
        $('.error').hide();
        $('#coupon_code').css('border-color', '#69BB2D');
        updateStripeSubmit(false);
        updatePR(code);
      } else {
        $('.success').hide();
        $('#coupon_code_button').show();
        $('.error').show().text(result.message);
        $('#coupon_code').css('border-color', '#F36534');
        updatePR();
      }
    }).fail(function() {
      updatePR();
      $('#coupon_code_button').show();
    }).always(function() {
      $('#coupon_code').attr('disabled', false);
    });
  } else {
    $('.success, .error').hide();
    $('#coupon_code_button').hide();
    $('#coupon_code').css('border-color', '');
    updateStripeSubmit(false);
    updatePR();
  }
}

$('#coupon_code').ready(function() {
  // check if input is auto-filled
  if ($('#coupon_code').length) checkCoupon();

  // when button is clicked
  $('#coupon_code_button').click(function() {
    checkCoupon();
  });

  // when focus leaves
  $('.subscription-form, .purchase-form').on('blur', '#coupon_code', function() {
    checkCoupon();
  });

  $('.subscription-form, .purchase-form').on('input', '#coupon_code', function() {
    $('.success, .error').hide();
    $('#coupon_code').css('border-color', '');

    if ($('#coupon_code').val()) {
      $('#coupon_code_button').show();
      updateStripeSubmit('disabled');
    } else {
      $('#coupon_code_button').hide();
      updateStripeSubmit(false);
    }
  });
});
/*!
 * CSS Modal
 * http://drublic.github.com/css-modal
 *
 * @author Hans Christian Reinl - @drublic
 */


(function (global, $) {

	'use strict';

	/*
	 * Storage for functions and attributes
	 */
	var modal = {

		activeElement: undefined, // Store for currently active element
		lastActive: undefined, // Store for last active elemet
		stackedElements: [], // Store for stacked elements

		// All elements that can get focus, can be tabbed in a modal
		tabbableElements: 'a[href], area[href], input:not([disabled]),' +
			'select:not([disabled]), textarea:not([disabled]),' +
			'button:not([disabled]), iframe, object, embed, *[tabindex],' +
			'*[contenteditable]',

		/*
		 * Polyfill addEventListener for IE8 (only very basic)
		 * @param event {string} event type
		 * @param element {Node} node to fire event on
		 * @param callback {function} gets fired if event is triggered
		 */
		on: function (event, elements, callback) {
			var i = 0;

			if (typeof event !== 'string') {
				throw new Error('Type error: `event` has to be a string');
			}

			if (typeof callback !== 'function') {
				throw new Error('Type error: `callback` has to be a function');
			}

			if (!elements) {
				return;
			}

			// Make elements an array and attach event listeners
			if (!elements.length) {
				elements = [elements];
			}

			for (; i < elements.length; i++) {

				// If jQuery is supported
				if ($) {
					$(elements[i]).on(event, callback);

				// Default way to support events
				} else if ('addEventListener' in elements[i]) {
					elements[i].addEventListener(event, callback, false);
				}

			}
		},

		/*
		 * Convenience function to trigger event
		 * @param event {string} event type
		 * @param modal {string} id of modal that the event is triggered on
		 */
		trigger: function (event, modal) {
			var eventTrigger;
			var eventParams = {
				detail: {
					'modal': modal
				}
			};

			// Use jQuery to fire the event if it is included
			if ($) {
				$(document).trigger(event, eventParams);

			// Use createEvent if supported (that's mostly the case)
			} else if (document.createEvent) {
				eventTrigger = document.createEvent('CustomEvent');

				eventTrigger.initCustomEvent(event, false, false, {
					'modal': modal
				});

				document.dispatchEvent(eventTrigger);

			// Use CustomEvents if supported
			} else {
				eventTrigger = new CustomEvent(event, eventParams);

				document.dispatchEvent(eventTrigger);
			}
		},

		/*
		 * Convenience function to add a class to an element
		 * @param element {Node} element to add class to
		 * @param className {string}
		 */
		addClass: function (element, className) {
			if (element && !element.className.match(className)) {
				element.className += ' ' + className;
			}
		},

		/*
		 * Convenience function to remove a class from an element
		 * @param element {Node} element to remove class off
		 * @param className {string}
		 */
		removeClass: function (element, className) {
			element.className = element.className.replace(className, '').replace('  ', ' ');
		},

		/**
		 * Convenience function to check if an element has a class
		 * @param  {Node}    element   Element to check classname on
		 * @param  {string}  className Class name to check for
		 * @return {Boolean}           true, if class is available on modal
		 */
		hasClass: function (element, className) {
			return !!element.className.match(className);
		},

		/*
		 * Focus modal
		 */
		setFocus: function () {
			if (modal.activeElement) {

				// Set element with last focus
				modal.lastActive = document.activeElement;

				// New focussing
				modal.activeElement.focus();

				// Add handler to keep the focus
				modal.keepFocus(modal.activeElement);
			}
		},

		/*
		 * Unfocus
		 */
		removeFocus: function () {
			if (modal.lastActive) {
				modal.lastActive.focus();
			}
		},

		/*
		 * Keep focus inside the modal
		 * @param element {node} element to keep focus in
		 */
		keepFocus: function (element) {
			var allTabbableElements = [];

			// Don't keep the focus if the browser is unable to support
			// CSS3 selectors
			try {
				allTabbableElements = element.querySelectorAll(modal.tabbableElements);
			} catch (ex) {
				return;
			}

			var firstTabbableElement = modal.getFirstElementVisible(allTabbableElements);
			var lastTabbableElement = modal.getLastElementVisible(allTabbableElements);

			var focusHandler = function (event) {
				var keyCode = event.which || event.keyCode;

				// TAB pressed
				if (keyCode !== 9) {
					return;
				}

				// Polyfill to prevent the default behavior of events
				event.preventDefault = event.preventDefault || function () {
					event.returnValue = false;
				};

				// Move focus to first element that can be tabbed if Shift isn't used
				if (event.target === lastTabbableElement && !event.shiftKey) {
					event.preventDefault();
					firstTabbableElement.focus();

				// Move focus to last element that can be tabbed if Shift is used
				} else if (event.target === firstTabbableElement && event.shiftKey) {
					event.preventDefault();
					lastTabbableElement.focus();
				}
			};

			modal.on('keydown', element, focusHandler);
		},

		/*
		 * Return the first visible element of a nodeList
		 *
		 * @param nodeList The nodelist to parse
		 * @return {Node|null} Returns a specific node or null if no element found
		 */
		getFirstElementVisible: function (nodeList) {
			var nodeListLength = nodeList.length;

			// If the first item is not visible
			if (!modal.isElementVisible(nodeList[0])) {
				for (var i = 1; i < nodeListLength - 1; i++) {

					// Iterate elements in the NodeList, return the first visible
					if (modal.isElementVisible(nodeList[i])) {
						return nodeList[i];
					}
				}
			} else {
				return nodeList[0];
			}

			return null;
		},

		/*
		 * Return the last visible element of a nodeList
		 *
		 * @param nodeList The nodelist to parse
		 * @return {Node|null} Returns a specific node or null if no element found
		 */
		getLastElementVisible: function (nodeList) {
			var nodeListLength = nodeList.length;
			var lastTabbableElement = nodeList[nodeListLength - 1];

			// If the last item is not visible
			if (!modal.isElementVisible(lastTabbableElement)) {
				for (var i = nodeListLength - 1; i >= 0; i--) {

					// Iterate elements in the NodeList, return the first visible
					if (modal.isElementVisible(nodeList[i])) {
						return nodeList[i];
					}
				}
			} else {
				return lastTabbableElement;
			}

			return null;
		},

		/*
		 * Convenience function to check if an element is visible
		 *
		 * Test idea taken from jQuery 1.3.2 source code
		 *
		 * @param element {Node} element to test
		 * @return {boolean} is the element visible or not
		 */
		isElementVisible: function (element) {
			return !(element.offsetWidth === 0 && element.offsetHeight === 0);
		},

		/*
		 * Mark modal as active
		 * @param element {Node} element to set active
		 */
		setActive: function (element) {
			modal.addClass(element, 'is-active');
			modal.activeElement = element;

			// Update aria-hidden
			modal.activeElement.setAttribute('aria-hidden', 'false');

			// Set the focus to the modal
			modal.setFocus(element.id);

			// Fire an event
			modal.trigger('cssmodal:show', modal.activeElement);
		},

		/*
		 * Unset previous active modal
		 * @param isStacked          {boolean} `true` if element is stacked above another
		 * @param shouldNotBeStacked {boolean} `true` if next element should be stacked
		 */
		unsetActive: function (isStacked, shouldNotBeStacked) {
			modal.removeClass(document.documentElement, 'has-overlay');

			if (modal.activeElement) {
				modal.removeClass(modal.activeElement, 'is-active');

				// Fire an event
				modal.trigger('cssmodal:hide', modal.activeElement);

				// Update aria-hidden
				modal.activeElement.setAttribute('aria-hidden', 'true');

				// Unfocus
				modal.removeFocus();

				// Make modal stacked if needed
				if (isStacked && !shouldNotBeStacked) {
					modal.stackModal(modal.activeElement);
				}

				// If there are any stacked elements
				if (!isStacked && modal.stackedElements.length > 0) {
					modal.unstackModal();
				}

				var s = '#'+modal.activeElement.id + " iframe"
				$(s).attr("src", $(s).attr('src'));

				// Reset active element
				modal.activeElement = null;
			}
		},

		/*
		 * Stackable modal
		 * @param stackableModal {node} element to be stacked
		 */
		stackModal: function (stackableModal) {
			modal.addClass(stackableModal, 'is-stacked');

			// Set modal as stacked
			modal.stackedElements.push(modal.activeElement);
		},

		/*
		 * Reactivate stacked modal
		 */
		unstackModal: function () {
			var stackedCount = modal.stackedElements.length;
			var lastStacked = modal.stackedElements[stackedCount - 1];

			modal.removeClass(lastStacked, 'is-stacked');

			// Set hash to modal, activates the modal automatically
			global.location.hash = lastStacked.id;

			// Remove modal from stackedElements array
			modal.stackedElements.splice(stackedCount - 1, 1);
		},

		/*
		 * When displaying modal, prevent background from scrolling
		 * @param  {Object} event The incoming hashChange event
		 * @return {void}
		 */
		mainHandler: function (event, noHash) {
			var hash = global.location.hash.replace('#', '');
			var index = 0;
			var tmp = [];
			var modalElement;
			var modalChild;

			// JS-only: no hash present
			if (noHash) {
				hash = event.target.getAttribute('href').replace('#', '');
			}

			modalElement = document.getElementById(hash);

			// Check if the hash contains an index
			if (hash.indexOf('/') !== -1) {
				tmp = hash.split('/');
				index = tmp.pop();
				hash = tmp.join('/');

				// Remove the index from the hash...
				modalElement = document.getElementById(hash);

				// ... and store the index as a number on the element to
				// make it accessible for plugins
				if (!modalElement) {
					throw new Error('ReferenceError: element "' + hash + '" does not exist!');
				}

				modalElement.index = (1 * index);
			}

			// If the hash element exists
			if (modalElement) {

				// Polyfill to prevent the default behavior of events
				try {
					event.preventDefault();
				} catch (ex) {
					event.returnValue = false;
				}

				// Get first element in selected element
				modalChild = modalElement.children[0];

				// When we deal with a modal and body-class `has-overlay` is not set
				if (modalChild && modalChild.className.match(/modal-inner/)) {

					// Make previous element stackable if it is not the same modal
					modal.unsetActive(
						!modal.hasClass(modalElement, 'is-active'),
						(modalElement.getAttribute('data-stackable') === 'false')
					);

					// Set an html class to prevent scrolling
					modal.addClass(document.documentElement, 'has-overlay');

					// Set scroll position for modal
					modal._currentScrollPositionY = global.scrollY;
					modal._currentScrollPositionX = global.scrollX;

					// Mark the active element
					modal.setActive(modalElement);
				}
			} else {

				// If activeElement is already defined, delete it
				modal.unsetActive();
			}

			return true;
		},

		/**
		 * Inject iframes
		 */
		injectIframes: function () {
			var iframes = document.querySelectorAll('[data-iframe-src]');
			var iframe;
			var i = 0;

			for (; i < iframes.length; i++) {
				iframe = document.createElement('iframe');

				iframe.src = iframes[i].getAttribute('data-iframe-src');
				iframe.setAttribute('webkitallowfullscreen', true);
				iframe.setAttribute('mozallowfullscreen', true);
				iframe.setAttribute('allowfullscreen', true);

				iframes[i].appendChild(iframe);
			}
		},

		/**
		 * Listen to all relevant events
		 * @return {void}
		 */
		init: function () {

			/*
			 * Hide overlay when ESC is pressed
			 */
			this.on('keyup', document, function (event) {
				var hash = global.location.hash.replace('#', '');

				// If key ESC is pressed
				if (event.keyCode === 27) {
					if (modal.activeElement && hash === modal.activeElement.id) {
						global.location.hash = '!';
					} else {
						modal.unsetActive();
					}

					if (modal.lastActive) {
						return false;
					}

					// Unfocus
					modal.removeFocus();
				}
			}, false);

			/**
			 * Trigger main handler on click if hash is deactivated
			 */
			/*$(global).on('click', document.querySelectorAll('[data-cssmodal-nohash]'), function (event) {
        debugger;
        modal.mainHandler(event, true);
			});*/

			this.on('click', document.querySelectorAll('[data-cssmodal-nohash]'), function (event) {
				modal.mainHandler(event, true);
			});

			/*
			 * Trigger main handler on load and hashchange
			 */
      $(global).on('load', modal.mainHandler);
      $(global).on('hashchange', modal.mainHandler);
			//modal.on('hashchange', global, modal.mainHandler);
			//modal.on('load', global, modal.mainHandler);

			/**
			 * Prevent scrolling when modal is active
			 * @return {void}
			 */
			global.onscroll = global.onmousewheel = function () {
				if (document.documentElement.className.match(/has-overlay/)) {
					global.scrollTo(modal._currentScrollPositionX, modal._currentScrollPositionY);
				}
			};

			/**
			 * Inject iframes
			 */
			modal.injectIframes();
		}
	};

	/*
	 * AMD, module loader, global registration
	 */

	// Expose modal for loaders that implement the Node module pattern.
	if (typeof module === 'object' && module && typeof module.exports === 'object') {
		module.exports = modal;

	// Register as an AMD module
	} else if (typeof define === 'function' && define.amd) {
		define('CSSModal', [], function () {

			// We use jQuery if the browser doesn't support CustomEvents
			if (!global.CustomEvent && !$) {
				throw new Error('This browser doesn\'t support CustomEvent - please include jQuery.');
			}

			modal.init();

			return modal;
		});

	// Export CSSModal into global space
	} else if (typeof global === 'object' && typeof global.document === 'object') {
		global.CSSModal = modal;
		modal.init();
	}

}(window, window.jQuery));
/*
 * CSS Modal Plugin for setting a max-width for modals
 *
 * @author Hans Christian Reinl
 * @date 2014-05-27
 *
 */

(function (global) {
	'use strict';

	/**
	 * Main modal object
	 */
	var CSSModal;
	var _currentMaxWidth;

	// Config: margin for modal when too narrow to show max width
	// can be overwritten with `data-cssmodal-margin` attribute
	var _margin = 20;

	var MODAL_SMALL_BREAKPOINT = 480;

	/**
	 * Include styles into the DOM
	 * @param {string} rule Styles to inject into the DOM
	 * @param {string} id   Unique ID for styles
	 */
	var _injectStyles = function (rule, id) {
		id = 'modal__rule--' + (id || '');

		var head = document.querySelector('head');
		var existingStyleElement = document.getElementById(id);
		var styleElement = null;

		if (existingStyleElement) {
			styleElement = existingStyleElement;
		} else {
			styleElement = document.createElement('style');
			styleElement.id = id;

			// The element must be in the DOM before adding rules in IE8
			head.appendChild(styleElement);
		}

		if (styleElement.styleSheet) {
			// IE8 and other legacy browers
			styleElement.styleSheet.cssText = rule;
		} else {
			// modern browsers
			styleElement.innerHTML = rule;
		}
	};

	/**
	 * Scale the modal according to its custom width
	 */
	var _scale = function () {
		var element = CSSModal.activeElement;

		// Eject if no active element is set
		if (!element) {
			return;
		}

		_currentMaxWidth = element.getAttribute('data-cssmodal-maxwidth');
		_currentMaxWidth = parseInt(_currentMaxWidth, 10);

		if (_currentMaxWidth) {
			_injectStyles('[data-cssmodal-maxwidth] .modal-inner {' +
				'max-width: ' + _currentMaxWidth + 'px;' +
				'margin-left: -' + (_currentMaxWidth / 2) + 'px;' +
			'}' +

			'[data-cssmodal-maxwidth] .modal-close:after {' +
				'margin-right: -' + (_currentMaxWidth / 2) + 'px !important;' +
			'}', element.id);
		}
	};

	var _scaleLower = function () {
		var innerWidth = global.innerWidth || document.documentElement.clientWidth;
		var element = CSSModal.activeElement;
		var closeButtonMarginRight = 10;

		// Skip if there is no max width or the window is wider
		if (!element || !_currentMaxWidth || innerWidth > _currentMaxWidth) {
			return;
		}

		// Window width minus margin left and right
		_margin = parseInt(element.getAttribute('data-cssmodal-margin'), 10) || _margin;
		_currentMaxWidth = innerWidth - (_margin * 2);

		if (innerWidth > MODAL_SMALL_BREAKPOINT) {
			closeButtonMarginRight = '-' + Math.floor(_currentMaxWidth / 2);
		}

		_injectStyles('[data-cssmodal-maxwidth] .modal-inner {' +
			'max-width: ' + _currentMaxWidth + 'px;' +
			'margin-left: -' + (_currentMaxWidth / 2) + 'px;' +
		'}' +

		'[data-cssmodal-maxwidth] .modal-close:after {' +
			'margin-right: ' + closeButtonMarginRight + 'px !important;' +
		'}', element.id);
	};

	/**
	 * Plugin API
	 */
	var _api = {
		scaleMaxSize: _scale
	};

	/**
	 * Initial call
	 */
	var init = function (modal) {
		CSSModal = modal;

		/*
		 * Assign basic event handlers
		 */
		CSSModal.on('cssmodal:show', document, function () {
			_scale();
			_scaleLower();
		});

		CSSModal.on('resize', window, function () {
			_scale();
			_scaleLower();
		});

		// Public API
		return _api;
	};

	/*
	 * AMD, module loader, global registration
	 */

	// Expose modal for loaders that implement the Node module pattern.
	if (typeof module === 'object' && module && typeof module.exports === 'object') {
		module.exports = _api;

	// Register as an AMD module
	} else if (typeof define === 'function' && define.amd) {

		define(['CSSModal'], init);

	// Export CSSModal into global space
	} else if (typeof global === 'object' && typeof global.document === 'object') {
		init(global.CSSModal);
	}

}(window));
// FACEBOOK
window.loadfacebook = true;
if(window.location.host.match(/exercise[.]com/)) {
  window.fbAsyncInit = function() {
    FB.init({
      appId      : '173359552718035',
      xfbml      : true,
      version    : 'v2.1',
      cookie: true, 
      oauth: true
    });
  };

  $('.fa-facebook').on('click', function() {
    if($(this).closest('a').attr('href') == "#") {
      FB.ui({
        method: 'share',
        href: $("meta[property='og:url']").attr("content")
      }, function(response){});
    }
  })

  $("a.popup").click(function(e) {
    e.preventDefault();
    fbLogin()
  });

  function fbLogin(deferred) {
    FB.login(function(response) {
      if (response.status === 'connected') {
        $.getJSON('/users/auth/facebook/callback', function(json) {
          if(deferred) {
            deferred.resolve()
          } else {
            document.location.reload();
          }
        });
      } else {
        deferred.reject()
      }
    }, { 
      scope: "publish_actions, email" 
    });
  }

  function fbLoginIfNecessary(deferred) {
    FB.getLoginStatus(function(response) {
      console.log(response);
      if (response.status === 'connected') {
        var uid = response.authResponse.userID;
        var accessToken = response.authResponse.accessToken;
        deferred.resolve()
      } else if (response.status === 'not_authorized') {
        fbLogin(deferred)
      } else {
        fbLogin(deferred)
      }
   });
  }
}

// TWITTER

(function() {
  if (window.__twitterIntentHandler) return;
  var intentRegex = /twitter\.com(\:\d{2,4})?\/intent\/(\w+)/,
      windowOptions = 'scrollbars=yes,resizable=yes,toolbar=no,location=yes',
      width = 550,
      height = 420,
      winHeight = screen.height,
      winWidth = screen.width;
 
  function handleIntent(e) {
    e = e || window.event;
    var target = e.target || e.srcElement,
        m, left, top;
 
    while (target && target.nodeName.toLowerCase() !== 'a') {
      target = target.parentNode;
    }
 
    if (target && target.nodeName.toLowerCase() === 'a' && target.href) {
      m = target.href.match(intentRegex);
      if (m) {
        left = Math.round((winWidth / 2) - (width / 2));
        top = 0;
 
        if (winHeight > height) {
          top = Math.round((winHeight / 2) - (height / 2));
        }

        // CUSTOM 
        var title = $("meta[property='twitter:text']").attr("content");
        var via = $("meta[property='twitter:via']").size() > 0
        if(title) { target.href += "&text=" + title; }
        if(via)  { target.href += "&via=exercise"; }
        window.open(target.href, 'intent', windowOptions + ',width=' + width +
                                           ',height=' + height + ',left=' + left + ',top=' + top);
        e.returnValue = false;
        e.preventDefault && e.preventDefault();
      }
    }
  }
 
  if (document.addEventListener) {
    document.addEventListener('click', handleIntent, false);
  } else if (document.attachEvent) {
    document.attachEvent('onclick', handleIntent);
  }
  window.__twitterIntentHandler = true;
}());


// PINTEREST
$('.pinterest-link').on('click', function(e) {
    e.preventDefault();
    var pinterestUrl = $(this).attr('href');
    var url = $("meta[property='og:url']").attr("content")
    var media = $("meta[property='og:image']").attr("content")
    var desc = $("meta[property='pinterest:text']").attr("content")

    var h = 320, w=750;
    var wLeft = window.screenLeft ? window.screenLeft : window.screenX;
    var wTop = window.screenTop ? window.screenTop : window.screenY;

    var left = wLeft + (window.innerWidth / 2) - (w / 2);
    var top = wTop + (window.innerHeight / 2) - (h / 2);

    window.open("//www.pinterest.com/pin/create/button/"+
    "?url="+url+
    "&media="+media+
    "&description="+desc,"_blank", "toolbar=no, scrollbars=no, resizable=no, top=" + top + ", left=" + left + ", width=" + w + ", height=" + h);
    return false;
});


/*!
 * Client Side Validations - v11.1.2 (https://github.com/DavyJonesLocker/client_side_validations)
 * Copyright (c) 2018 Geremia Taglialatela, Brian Cardarella
 * Licensed under MIT (http://opensource.org/licenses/mit-license.php)
 */


(function() {
  var $, ClientSideValidations, initializeOnEvent, validateElement, validateForm, validatorsFor,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  $ = jQuery;

  $.fn.disableClientSideValidations = function() {
    ClientSideValidations.disable(this);
    return this;
  };

  $.fn.enableClientSideValidations = function() {
    this.filter(ClientSideValidations.selectors.forms).each(function() {
      return ClientSideValidations.enablers.form(this);
    });
    this.filter(ClientSideValidations.selectors.inputs).each(function() {
      return ClientSideValidations.enablers.input(this);
    });
    return this;
  };

  $.fn.resetClientSideValidations = function() {
    this.filter(ClientSideValidations.selectors.forms).each(function() {
      return ClientSideValidations.reset(this);
    });
    return this;
  };

  $.fn.validate = function() {
    this.filter(ClientSideValidations.selectors.forms).each(function() {
      return $(this).enableClientSideValidations();
    });
    return this;
  };

  $.fn.isValid = function(validators) {
    var obj;
    obj = $(this[0]);
    if (obj.is('form')) {
      return validateForm(obj, validators);
    } else {
      return validateElement(obj, validatorsFor(this[0].name, validators));
    }
  };

  validatorsFor = function(name, validators) {
    var captures, validator, validator_name;
    if (validators.hasOwnProperty(name)) {
      return validators[name];
    }
    name = name.replace(/\[(\w+_attributes)\]\[[\da-z_]+\](?=\[(?:\w+_attributes)\])/g, '[$1][]');
    if (captures = name.match(/\[(\w+_attributes)\].*\[(\w+)\]$/)) {
      for (validator_name in validators) {
        validator = validators[validator_name];
        if (validator_name.match("\\[" + captures[1] + "\\].*\\[\\]\\[" + captures[2] + "\\]$")) {
          name = name.replace(/\[[\da-z_]+\]\[(\w+)\]$/g, '[][$1]');
        }
      }
    }
    return validators[name] || {};
  };

  validateForm = function(form, validators) {
    var valid;
    form.trigger('form:validate:before.ClientSideValidations');
    valid = true;
    form.find(ClientSideValidations.selectors.validate_inputs).each(function() {
      if (!$(this).isValid(validators)) {
        valid = false;
      }
      return true;
    });
    if (valid) {
      form.trigger('form:validate:pass.ClientSideValidations');
    } else {
      form.trigger('form:validate:fail.ClientSideValidations');
    }
    form.trigger('form:validate:after.ClientSideValidations');
    return valid;
  };

  validateElement = function(element, validators) {
    var afterValidate, destroyInputName, executeValidators, failElement, local, passElement, remote;
    element.trigger('element:validate:before.ClientSideValidations');
    passElement = function() {
      return element.trigger('element:validate:pass.ClientSideValidations').data('valid', null);
    };
    failElement = function(message) {
      element.trigger('element:validate:fail.ClientSideValidations', message).data('valid', false);
      return false;
    };
    afterValidate = function() {
      return element.trigger('element:validate:after.ClientSideValidations').data('valid') !== false;
    };
    executeValidators = function(context) {
      var fn, i, kind, len, message, ref, valid, validator;
      valid = true;
      for (kind in context) {
        fn = context[kind];
        if (validators[kind]) {
          ref = validators[kind];
          for (i = 0, len = ref.length; i < len; i++) {
            validator = ref[i];
            if (message = fn.call(context, element, validator)) {
              valid = failElement(message);
              break;
            }
          }
          if (!valid) {
            break;
          }
        }
      }
      return valid;
    };
    if (element.attr('name').search(/\[([^\]]*?)\]$/) >= 0) {
      destroyInputName = element.attr('name').replace(/\[([^\]]*?)\]$/, '[_destroy]');
      if ($("input[name='" + destroyInputName + "']").val() === '1') {
        passElement();
        return afterValidate();
      }
    }
    if (element.data('changed') === false) {
      return afterValidate();
    }
    element.data('changed', false);
    local = ClientSideValidations.validators.local;
    remote = ClientSideValidations.validators.remote;
    if (executeValidators(local) && executeValidators(remote)) {
      passElement();
    }
    return afterValidate();
  };

  ClientSideValidations = {
    callbacks: {
      element: {
        after: function(element, eventData) {},
        before: function(element, eventData) {},
        fail: function(element, message, addError, eventData) {
          return addError();
        },
        pass: function(element, removeError, eventData) {
          return removeError();
        }
      },
      form: {
        after: function(form, eventData) {},
        before: function(form, eventData) {},
        fail: function(form, eventData) {},
        pass: function(form, eventData) {}
      }
    },
    enablers: {
      form: function(form) {
        var $form, binding, event, ref;
        $form = $(form);
        form.ClientSideValidations = {
          settings: $form.data('clientSideValidations'),
          addError: function(element, message) {
            return ClientSideValidations.formBuilders[form.ClientSideValidations.settings.html_settings.type].add(element, form.ClientSideValidations.settings.html_settings, message);
          },
          removeError: function(element) {
            return ClientSideValidations.formBuilders[form.ClientSideValidations.settings.html_settings.type].remove(element, form.ClientSideValidations.settings.html_settings);
          }
        };
        ref = {
          'submit.ClientSideValidations': function(eventData) {
            if (!$form.isValid(form.ClientSideValidations.settings.validators)) {
              eventData.preventDefault();
              eventData.stopImmediatePropagation();
            }
          },
          'ajax:beforeSend.ClientSideValidations': function(eventData) {
            if (eventData.target === this) {
              $form.isValid(form.ClientSideValidations.settings.validators);
            }
          },
          'form:validate:after.ClientSideValidations': function(eventData) {
            ClientSideValidations.callbacks.form.after($form, eventData);
          },
          'form:validate:before.ClientSideValidations': function(eventData) {
            ClientSideValidations.callbacks.form.before($form, eventData);
          },
          'form:validate:fail.ClientSideValidations': function(eventData) {
            ClientSideValidations.callbacks.form.fail($form, eventData);
          },
          'form:validate:pass.ClientSideValidations': function(eventData) {
            ClientSideValidations.callbacks.form.pass($form, eventData);
          }
        };
        for (event in ref) {
          binding = ref[event];
          $form.on(event, binding);
        }
        return $form.find(ClientSideValidations.selectors.inputs).each(function() {
          return ClientSideValidations.enablers.input(this);
        });
      },
      input: function(input) {
        var $form, $input, binding, event, form, ref;
        $input = $(input);
        form = input.form;
        $form = $(form);
        ref = {
          'focusout.ClientSideValidations': function() {
            $(this).isValid(form.ClientSideValidations.settings.validators);
          },
          'change.ClientSideValidations': function() {
            $(this).data('changed', true);
          },
          'element:validate:after.ClientSideValidations': function(eventData) {
            ClientSideValidations.callbacks.element.after($(this), eventData);
          },
          'element:validate:before.ClientSideValidations': function(eventData) {
            ClientSideValidations.callbacks.element.before($(this), eventData);
          },
          'element:validate:fail.ClientSideValidations': function(eventData, message) {
            var element;
            element = $(this);
            ClientSideValidations.callbacks.element.fail(element, message, function() {
              return form.ClientSideValidations.addError(element, message);
            }, eventData);
          },
          'element:validate:pass.ClientSideValidations': function(eventData) {
            var element;
            element = $(this);
            ClientSideValidations.callbacks.element.pass(element, function() {
              return form.ClientSideValidations.removeError(element);
            }, eventData);
          }
        };
        for (event in ref) {
          binding = ref[event];
          $input.filter(':not(:radio):not([id$=_confirmation])').each(function() {
            return $(this).attr('data-validate', true);
          }).on(event, binding);
        }
        $input.filter(':checkbox').on('change.ClientSideValidations', function() {
          $(this).isValid(form.ClientSideValidations.settings.validators);
        });
        return $input.filter('[id$=_confirmation]').each(function() {
          var confirmationElement, element, ref1, results;
          confirmationElement = $(this);
          element = $form.find("#" + (this.id.match(/(.+)_confirmation/)[1]) + ":input");
          if (element[0]) {
            ref1 = {
              'focusout.ClientSideValidations': function() {
                element.data('changed', true).isValid(form.ClientSideValidations.settings.validators);
              },
              'keyup.ClientSideValidations': function() {
                element.data('changed', true).isValid(form.ClientSideValidations.settings.validators);
              }
            };
            results = [];
            for (event in ref1) {
              binding = ref1[event];
              results.push($("#" + (confirmationElement.attr('id'))).on(event, binding));
            }
            return results;
          }
        });
      }
    },
    formBuilders: {
      'ActionView::Helpers::FormBuilder': {
        add: function(element, settings, message) {
          var form, inputErrorField, label, labelErrorField;
          form = $(element[0].form);
          if (element.data('valid') !== false && (form.find("label.message[for='" + (element.attr('id')) + "']")[0] == null)) {
            inputErrorField = $(settings.input_tag);
            labelErrorField = $(settings.label_tag);
            label = form.find("label[for='" + (element.attr('id')) + "']:not(.message)");
            if (element.attr('autofocus')) {
              element.attr('autofocus', false);
            }
            element.before(inputErrorField);
            inputErrorField.find('span#input_tag').replaceWith(element);
            inputErrorField.find('label.message').attr('for', element.attr('id'));
            labelErrorField.find('label.message').attr('for', element.attr('id'));
            labelErrorField.insertAfter(label);
            labelErrorField.find('label#label_tag').replaceWith(label);
          }
          return form.find("label.message[for='" + (element.attr('id')) + "']").text(message);
        },
        remove: function(element, settings) {
          var errorFieldClass, form, inputErrorField, label, labelErrorField;
          form = $(element[0].form);
          errorFieldClass = $(settings.input_tag).attr('class');
          inputErrorField = element.closest("." + (errorFieldClass.replace(/\ /g, ".")));
          label = form.find("label[for='" + (element.attr('id')) + "']:not(.message)");
          labelErrorField = label.closest("." + errorFieldClass);
          if (inputErrorField[0]) {
            inputErrorField.find("#" + (element.attr('id'))).detach();
            inputErrorField.replaceWith(element);
            label.detach();
            return labelErrorField.replaceWith(label);
          }
        }
      }
    },
    patterns: {
      numericality: {
        "default": new RegExp('^[-+]?[0-9]*\\.?[0-9]+([eE][-+]?[0-9]+)?$'),
        only_integer: new RegExp('^[+-]?\\d+$')
      }
    },
    selectors: {
      inputs: ':input:not(button):not([type="submit"])[name]:visible:enabled',
      validate_inputs: ':input:enabled:visible[data-validate]',
      forms: 'form[data-client-side-validations]'
    },
    validators: {
      all: function() {
        return $.extend({}, local, remote);
      },
      local: {
        absence: function(element, options) {
          if (!/^\s*$/.test(element.val() || '')) {
            return options.message;
          }
        },
        presence: function(element, options) {
          if (/^\s*$/.test(element.val() || '')) {
            return options.message;
          }
        },
        acceptance: function(element, options) {
          var ref;
          switch (element.attr('type')) {
            case 'checkbox':
              if (!element.prop('checked')) {
                return options.message;
              }
              break;
            case 'text':
              if (element.val() !== (((ref = options.accept) != null ? ref.toString() : void 0) || '1')) {
                return options.message;
              }
          }
        },
        format: function(element, options) {
          var message;
          message = this.presence(element, options);
          if (message) {
            if (options.allow_blank === true) {
              return;
            }
            return message;
          }
          if (options["with"] && !new RegExp(options["with"].source, options["with"].options).test(element.val())) {
            return options.message;
          }
          if (options.without && new RegExp(options.without.source, options.without.options).test(element.val())) {
            return options.message;
          }
        },
        numericality: function(element, options) {
          var $form, CHECKS, check, checkValue, fn, number_format, operator, val;
          if (options.allow_blank === true && this.presence(element, {
            message: options.messages.numericality
          })) {
            return;
          }
          $form = $(element[0].form);
          number_format = $form[0].ClientSideValidations.settings.number_format;
          val = $.trim(element.val()).replace(new RegExp("\\" + number_format.separator, 'g'), '.');
          if (options.only_integer && !ClientSideValidations.patterns.numericality.only_integer.test(val)) {
            return options.messages.only_integer;
          }
          if (!ClientSideValidations.patterns.numericality["default"].test(val)) {
            return options.messages.numericality;
          }
          CHECKS = {
            greater_than: '>',
            greater_than_or_equal_to: '>=',
            equal_to: '==',
            less_than: '<',
            less_than_or_equal_to: '<='
          };
          for (check in CHECKS) {
            operator = CHECKS[check];
            if (!(options[check] != null)) {
              continue;
            }
            checkValue = !isNaN(parseFloat(options[check])) && isFinite(options[check]) ? options[check] : $form.find("[name*=" + options[check] + "]").length === 1 ? $form.find("[name*=" + options[check] + "]").val() : void 0;
            if ((checkValue == null) || checkValue === '') {
              return;
            }
            fn = new Function("return " + val + " " + operator + " " + checkValue);
            if (!fn()) {
              return options.messages[check];
            }
          }
          if (options.odd && !(parseInt(val, 10) % 2)) {
            return options.messages.odd;
          }
          if (options.even && (parseInt(val, 10) % 2)) {
            return options.messages.even;
          }
        },
        length: function(element, options) {
          var CHECKS, blankOptions, check, fn, message, operator, tokenized_length, tokenizer;
          tokenizer = options.js_tokenizer || "split('')";
          tokenized_length = new Function('element', "return (element.val()." + tokenizer + " || '').length")(element);
          CHECKS = {
            is: '==',
            minimum: '>=',
            maximum: '<='
          };
          blankOptions = {};
          blankOptions.message = options.is ? options.messages.is : options.minimum ? options.messages.minimum : void 0;
          message = this.presence(element, blankOptions);
          if (message) {
            if (options.allow_blank === true) {
              return;
            }
            return message;
          }
          for (check in CHECKS) {
            operator = CHECKS[check];
            if (!options[check]) {
              continue;
            }
            fn = new Function("return " + tokenized_length + " " + operator + " " + options[check]);
            if (!fn()) {
              return options.messages[check];
            }
          }
        },
        exclusion: function(element, options) {
          var lower, message, option, ref, upper;
          message = this.presence(element, options);
          if (message) {
            if (options.allow_blank === true) {
              return;
            }
            return message;
          }
          if (options["in"]) {
            if (ref = element.val(), indexOf.call((function() {
              var i, len, ref1, results;
              ref1 = options["in"];
              results = [];
              for (i = 0, len = ref1.length; i < len; i++) {
                option = ref1[i];
                results.push(option.toString());
              }
              return results;
            })(), ref) >= 0) {
              return options.message;
            }
          }
          if (options.range) {
            lower = options.range[0];
            upper = options.range[1];
            if (element.val() >= lower && element.val() <= upper) {
              return options.message;
            }
          }
        },
        inclusion: function(element, options) {
          var lower, message, option, ref, upper;
          message = this.presence(element, options);
          if (message) {
            if (options.allow_blank === true) {
              return;
            }
            return message;
          }
          if (options["in"]) {
            if (ref = element.val(), indexOf.call((function() {
              var i, len, ref1, results;
              ref1 = options["in"];
              results = [];
              for (i = 0, len = ref1.length; i < len; i++) {
                option = ref1[i];
                results.push(option.toString());
              }
              return results;
            })(), ref) >= 0) {
              return;
            }
            return options.message;
          }
          if (options.range) {
            lower = options.range[0];
            upper = options.range[1];
            if (element.val() >= lower && element.val() <= upper) {
              return;
            }
            return options.message;
          }
        },
        confirmation: function(element, options) {
          var confirmation_value, value;
          value = element.val();
          confirmation_value = $("#" + (element.attr('id')) + "_confirmation").val();
          if (!options.case_sensitive) {
            value = value.toLowerCase();
            confirmation_value = confirmation_value.toLowerCase();
          }
          if (value !== confirmation_value) {
            return options.message;
          }
        },
        uniqueness: function(element, options) {
          var form, matches, name, name_prefix, name_suffix, valid, value;
          name = element.attr('name');
          if (/_attributes\]\[\d/.test(name)) {
            matches = name.match(/^(.+_attributes\])\[\d+\](.+)$/);
            name_prefix = matches[1];
            name_suffix = matches[2];
            value = element.val();
            if (name_prefix && name_suffix) {
              form = element.closest('form');
              valid = true;
              form.find(":input[name^=\"" + name_prefix + "\"][name$=\"" + name_suffix + "\"]").each(function() {
                if ($(this).attr('name') !== name) {
                  if ($(this).val() === value) {
                    valid = false;
                    return $(this).data('notLocallyUnique', true);
                  } else {
                    if ($(this).data('notLocallyUnique')) {
                      return $(this).removeData('notLocallyUnique').data('changed', true);
                    }
                  }
                }
              });
              if (!valid) {
                return options.message;
              }
            }
          }
        }
      },
      remote: {}
    },
    disable: function(target) {
      var $target;
      $target = $(target);
      $target.off('.ClientSideValidations');
      if ($target.is('form')) {
        return ClientSideValidations.disable($target.find(':input'));
      } else {
        $target.removeData('valid');
        $target.removeData('changed');
        return $target.filter(':input').each(function() {
          return $(this).removeAttr('data-validate');
        });
      }
    },
    reset: function(form) {
      var $form, key;
      $form = $(form);
      ClientSideValidations.disable(form);
      for (key in form.ClientSideValidations.settings.validators) {
        form.ClientSideValidations.removeError($form.find("[name='" + key + "']"));
      }
      return ClientSideValidations.enablers.form(form);
    }
  };

  if ((window.Turbolinks != null) && window.Turbolinks.supported) {
    initializeOnEvent = window.Turbolinks.EVENTS != null ? 'page:change' : 'turbolinks:load';
    $(document).on(initializeOnEvent, function() {
      return $(ClientSideValidations.selectors.forms).validate();
    });
  } else {
    $(function() {
      return $(ClientSideValidations.selectors.forms).validate();
    });
  }

  window.ClientSideValidations = ClientSideValidations;

}).call(this);
