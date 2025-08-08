/*
 * Added page-bridge to access in-page variables (clsyDataLayer)
 */
(function() {
  try {
    const dataLayer = (window.clsyDataLayer && window.clsyDataLayer[0]) ? window.clsyDataLayer[0] : null;
    const ownUserId = dataLayer && dataLayer.loggedInUserId ? String(dataLayer.loggedInUserId) : null;
    window.postMessage({ type: 'MARKTDE_OWN_USER_ID', ownUserId }, '*');
  } catch (_) {}
})(); 