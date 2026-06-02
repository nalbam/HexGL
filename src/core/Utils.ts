/*
 * Various useful methods. (createNormalMaterial moved to threejs/materials/NormalMaterial.ts;
 * projectOnScreen dropped — it was never called.)
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 */

let urlParameters: Record<string, string> | null = null;

/** Get a URL query parameter by name. */
export function getURLParameter(name: string): string | undefined {
  if (urlParameters == null) {
    urlParameters = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, (_m, key: string, val: string) => {
      urlParameters![key] = val;
      return '';
    });
  }
  return urlParameters[name];
}

/** Get the cumulative top offset of an element. */
export function getOffsetTop(obj: HTMLElement | null): number {
  let curtop = obj ? obj.offsetTop : 0;
  if (obj && obj.offsetParent) {
    while ((obj = obj.offsetParent as HTMLElement)) {
      curtop += obj.offsetTop;
    }
  }
  return curtop;
}

/** Scrolls the page to the element with the given id. */
export function scrollTo(id: string): void {
  window.scroll(0, getOffsetTop(document.getElementById(id)));
}

/** Add or remove a CSS class on an element by id. */
export function updateClass(id: string, cssclass: string, active: boolean): void {
  const e = document.getElementById(id);
  if (e == null) return;
  if (active) e.classList.add(cssclass);
  else e.classList.remove(cssclass);
}

/** Performs an XMLHttpRequest (GET, or POST when postData is set). */
export function request(
  url: string,
  postData: boolean | null,
  callback?: (req: XMLHttpRequest) => void,
  data?: Record<string, string>
): XMLHttpRequest | undefined {
  const req = new XMLHttpRequest();
  if (req == null) return;
  const method = postData != null ? 'POST' : 'GET';
  let qdata = 'o=bk';
  if (data != null) {
    for (const i in data) {
      qdata += '&' + i + '=' + data[i];
      if (postData != null) url += '?' + qdata;
    }
  }
  req.open(method, url, true);
  if (postData != null) {
    req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  }
  req.onreadystatechange = () => {
    if (req.readyState !== 4) return;
    if (!(req.status === 200 || req.status === 304)) return;
    if (typeof callback === 'function') callback(req);
  };
  req.send(qdata);
  return req;
}

/** Checks whether the device supports touch input. */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    (navigator as any).MaxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}
